import { publicUploadUrl } from '../utils/storagePaths.js';
import fs from 'node:fs';
import path from 'node:path';
import { schemaTables, assertSchema } from '../config/schema.js';
import { serverRoot } from '../config/env.js';
import { identifier, snapshotDatabase } from './maintenance.js';

export const migrationVersion = '20261116_production_storage';
async function columns(connection, table) {
  const [rows] = await connection.query('SHOW COLUMNS FROM ' + identifier(table));
  return new Map(rows.map(row => [row.Field, row]));
}
async function ensureIndex(connection, table, name, fields, unique = false) {
  const [indexes] = await connection.query('SHOW INDEX FROM ' + identifier(table));
  if (!indexes.some(index => index.Key_name === name)) {
    await connection.query('ALTER TABLE ' + identifier(table) + ' ADD ' + (unique ? 'UNIQUE ' : '') + 'INDEX ' + identifier(name) + ' (' + fields.map(identifier).join(',') + ')');
  }
}
async function normalizeUploadUrls(connection) {
  const [attachments]=await connection.query('SELECT id,file_url FROM attachments');
  for(const row of attachments){const url=publicUploadUrl(row.file_url);if(url!==row.file_url)await connection.query('UPDATE attachments SET file_url=? WHERE id=?',[url,row.id]);}
  const names=['generated_docx_path','generated_pdf_path','docx_file_url','to_trinh_docx_url','ke_hoach_docx_url','approved_pdf_path','precheck_pdf_url','faculty_signed_pdf_url','final_signed_pdf_path','final_pdf_url'];
  const [dossiers]=await connection.query('SELECT id,'+names.join(',')+' FROM dossiers');
  for(const row of dossiers)for(const name of names){const url=publicUploadUrl(row[name]);if(url!==row[name])await connection.query('UPDATE dossiers SET '+identifier(name)+'=?,updated_at=updated_at WHERE id=?',[url,row.id]);}
}
export async function migrate(connection, { backup = true, copyUploads = true } = {}) {
  const [locked] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':schema'), 30) AS acquired");
  if (Number(locked[0].acquired) !== 1) throw new Error('Database đang được nâng cấp.');
  let backupFile;
  try {
    const [tables] = await connection.query('SHOW TABLES');
    if (tables.length && backup) {
      const result = await snapshotDatabase(connection, { copyUploads });
      backupFile = result.file;
      console.log('[Migration] Bản sao an toàn: ' + backupFile);
    }
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    const [done] = await connection.query('SELECT version FROM schema_migrations WHERE version = ?', [migrationVersion]);
    if (done.length) { await assertSchema(connection); await normalizeUploadUrls(connection); return { alreadyApplied: true, backupFile }; }
    const timestamps = [];
    for (const table of ['users','dossiers']) {
      if (tables.some(row => Object.values(row)[0] === table)) {
        const existing = await columns(connection,table);
        if (existing.has('updated_at')) {
          const [rows] = await connection.query('SELECT id,updated_at FROM '+identifier(table));
          timestamps.push({table,rows});
        }
      }
    }

    const schema = fs.readFileSync(path.join(serverRoot, 'schema.sql'), 'utf8');
    for (const table of schemaTables()) {
      await connection.query(table.sql.replace(/^CREATE TABLE(?: IF NOT EXISTS)? /, 'CREATE TABLE IF NOT EXISTS '));
      const existing = await columns(connection, table.name);
      // Only add columns; existing values and legacy columns are retained.
      for (const match of table.sql.matchAll(/^\s*\x60([a-z0-9_]+)\x60\s+([^\n]+)/gm)) {
        const name = match[1];
        if (existing.has(name)) continue;
        let definition = match[2].trim().replace(/,$/, '');
        if (name === 'status') continue;
        if (definition.includes('NOT NULL') && !definition.includes('DEFAULT')) definition = definition.replace('NOT NULL', 'NULL');
        await connection.query('ALTER TABLE ' + identifier(table.name) + ' ADD COLUMN ' + identifier(name) + ' ' + definition);
      }
    }

    const userCols = await columns(connection, 'users');
    if (userCols.has('full_name')) {
      await connection.query("ALTER TABLE users MODIFY full_name VARCHAR(150) NOT NULL DEFAULT ''");
      await connection.query("UPDATE users u LEFT JOIN departments d ON u.department_id = d.id SET u.name = COALESCE(NULLIF(u.name,''),u.full_name), u.department = COALESCE(u.department,d.name), u.updated_at=u.updated_at");
    }
    const dossierCols = await columns(connection, 'dossiers');
    if (dossierCols.has('tracking_code')) {
      await connection.query('ALTER TABLE dossiers MODIFY tracking_code VARCHAR(50) NULL');
      await connection.query('ALTER TABLE dossiers MODIFY technology_name VARCHAR(500) NULL');
      await connection.query('ALTER TABLE dossiers MODIFY department_id ' + dossierCols.get('department_id').Type + ' NULL');
      await connection.query('ALTER TABLE dossiers MODIFY title VARCHAR(500) NULL');
      await connection.query("UPDATE dossiers d LEFT JOIN users u ON d.user_id=u.id LEFT JOIN departments p ON d.department_id=p.id SET d.code=COALESCE(d.code,d.tracking_code), d.title=COALESCE(d.title,d.technology_name,d.tracking_code), d.template_id=COALESCE(d.template_id,IF(d.transfer_type='KNOWLEDGE','tmpl-cgcn-1a','tmpl-cgcn-2a')), d.department_name=COALESCE(d.department_name,p.name), d.applicant_email=COALESCE(d.applicant_email,u.email), d.has_financial_implication=COALESCE(d.has_budget,0), d.revision_note=COALESCE(d.revision_note,d.admin_note), d.review_notes=COALESCE(d.review_notes,d.admin_note), d.updated_at=d.updated_at");
    }
    const status = dossierCols.get('status');
    const values = Array.from(status.Type.matchAll(/'([^']+)'/g), match => match[1]);
    const modern = ['SUBMITTED','RETURNED_FOR_REVISION','VALIDATED','PENDING_SIGNED_REVIEW','WAITING_RECTOR_SIGNATURE','SIGNED_ARCHIVED','DRAFT','CANCELLED'];
    const enumValues = [...new Set([...values, ...modern])];
    await connection.query('ALTER TABLE dossiers MODIFY status ENUM(' + enumValues.map(value => connection.escape(value)).join(',') + ') NOT NULL DEFAULT ' + connection.escape(status.Default || 'SUBMITTED'));
    await ensureIndex(connection, 'dossiers', 'uk_dossier_code', ['code'], true);
    const auditCols = await columns(connection, 'audit_logs');
    if (auditCols.get('id').Type.startsWith('int') || auditCols.get('id').Type.startsWith('bigint')) await connection.query('ALTER TABLE audit_logs MODIFY id VARCHAR(50) NOT NULL');
    if (auditCols.has('comment')) await connection.query('UPDATE audit_logs SET notes = COALESCE(notes,comment)');

    // Seed the two official templates only. Existing users and their roles remain untouched.
    const templateSeed = schema.match(/INSERT(?: IGNORE)? INTO \x60document_templates\x60[\s\S]*?;/)?.[0];
    if (templateSeed) await connection.query(templateSeed.replace(/^INSERT(?: IGNORE)? INTO/, 'INSERT IGNORE INTO'));
    const [departmentCount] = await connection.query('SELECT COUNT(*) AS count FROM departments');
    if (!Number(departmentCount[0].count)) {
      const seed = schema.match(/INSERT(?: IGNORE)? INTO \x60departments\x60[\s\S]*?;/)?.[0];
      if (seed) await connection.query(seed.replace(/^INSERT(?: IGNORE)? INTO/, 'INSERT IGNORE INTO'));
    }

    const [legacyFiles] = await connection.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dossier_files'");
    if (legacyFiles.length) {
      const [files] = await connection.query('SELECT * FROM dossier_files ORDER BY version,created_at');
      const mapping = { AUTO_PROPOSAL_DOCX: ['to_trinh_docx_url','TO_TRINH_DOCX'], AUTO_PLAN_DOCX: ['ke_hoach_docx_url','KE_HOACH_DOCX'], ADMIN_FIXED_DOC: ['approved_pdf_path','PRECHECK_PDF'], FACULTY_SIGNED_PDF: ['faculty_signed_pdf_url','FACULTY_SIGNED_PDF'], FINAL_DECISION_PDF: ['final_signed_pdf_path','FINAL_DECISION_PDF'] };
      for (const file of files) {
        const [field, type] = mapping[file.file_category] || [null,'EVIDENCE'];
        const url = publicUploadUrl(file.file_path);
        if (field && file.is_latest) await connection.query('UPDATE dossiers SET ' + identifier(field) + '=COALESCE(' + identifier(field) + ',?) WHERE id=?', [url,file.dossier_id]);
        await connection.query('INSERT IGNORE INTO attachments (id,dossier_id,file_name,file_path,file_url,file_type,file_size,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [file.id,file.dossier_id,file.file_name,url,url,type,file.file_size,file.uploaded_by,file.created_at]);
      }
    }
    const versionColumns = await columns(connection,'dossier_versions');
    if(!versionColumns.has('snapshot')) await connection.query('ALTER TABLE dossier_versions ADD COLUMN snapshot JSON NULL');
    const mailColumns = await columns(connection,'email_notifications');
    for(const [name,definition] of Object.entries({attachments:'JSON NULL',attempts:'INT NOT NULL DEFAULT 0',last_error:'TEXT NULL',next_attempt_at:'TIMESTAMP NULL'})) {
      if(!mailColumns.has(name)) await connection.query('ALTER TABLE email_notifications ADD COLUMN '+identifier(name)+' '+definition);
    }
    await connection.query('ALTER TABLE email_notifications MODIFY sent_at TIMESTAMP NULL DEFAULT NULL');
    await connection.query('CREATE TABLE IF NOT EXISTS auth_credentials (user_id VARCHAR(50) PRIMARY KEY, password_hash VARCHAR(255) NULL, token_version INT NOT NULL DEFAULT 0, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_credential_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    await connection.query('CREATE TABLE IF NOT EXISTS dossier_sequences (year INT PRIMARY KEY, last_number INT NOT NULL) ENGINE=InnoDB');
    await connection.query("INSERT INTO dossier_sequences (year,last_number) SELECT CAST(SUBSTRING(code,6,4) AS UNSIGNED),MAX(CAST(SUBSTRING_INDEX(code,'-',-1) AS UNSIGNED)) FROM dossiers WHERE code REGEXP '^CGCN-[0-9]{4}-[0-9]+$' GROUP BY CAST(SUBSTRING(code,6,4) AS UNSIGNED) ON DUPLICATE KEY UPDATE last_number=GREATEST(last_number,VALUES(last_number))");
    await normalizeUploadUrls(connection);
    await assertSchema(connection, {checkVersion:false});
    for (const {table,rows} of timestamps) for (const row of rows) await connection.query('UPDATE '+identifier(table)+' SET updated_at=? WHERE id=?',[row.updated_at,row.id]);
    await connection.query('INSERT IGNORE INTO schema_migrations (version) VALUES (?)', [migrationVersion]);
    return { alreadyApplied: false, backupFile };
  } finally { await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':schema'))"); }
}
