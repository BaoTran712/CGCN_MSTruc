import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'ctump_docugov';

  console.log(`[InitDB] Connecting to MySQL at ${host}:${port} as ${user}...`);
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  // Ensure database exists
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await conn.changeUser({ database });

  // Make sure users table role ENUM has DEAN
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `users` LIKE 'role'");
    if (cols.length > 0) {
      await conn.query("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('USER', 'ADMIN', 'MANAGER', 'DEAN') NOT NULL DEFAULT 'USER';");
      console.log('[InitDB] Updated users.role column enum.');
    }
  } catch (err) {
    console.log('[InitDB] Notice checking users table:', err.message);
  }

  // Make sure audit_logs has project_id column and dossier_id is nullable
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM `audit_logs` LIKE 'project_id'");
    if (cols.length === 0) {
      await conn.query("ALTER TABLE `audit_logs` ADD COLUMN `project_id` VARCHAR(50) NULL AFTER `id`;");
      console.log('[InitDB] Added audit_logs.project_id column.');
    }
    await conn.query("ALTER TABLE `audit_logs` MODIFY COLUMN `dossier_id` VARCHAR(50) NULL;");
    console.log('[InitDB] Updated audit_logs.dossier_id to allow NULL.');
  } catch (err) {
    console.log('[InitDB] Notice checking audit_logs table:', err.message);
  }

  const sqlPath = path.resolve(__dirname, 'init_db.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[InitDB] Executing init_db.sql...');
  await conn.query(sql);

  const [tables] = await conn.query('SHOW TABLES');
  console.log('[InitDB] Initialized tables successfully:');
  console.log(tables.map(t => Object.values(t)[0]));

  const [usersCount] = await conn.query('SELECT COUNT(*) as count FROM users');
  const [projectsCount] = await conn.query('SELECT COUNT(*) as count FROM transfer_projects');
  const [attachmentsCount] = await conn.query('SELECT COUNT(*) as count FROM attachments');
  const [auditLogsCount] = await conn.query('SELECT COUNT(*) as count FROM audit_logs');

  console.log(`[InitDB] Data stats:`);
  console.log(` - users: ${usersCount[0].count}`);
  console.log(` - transfer_projects: ${projectsCount[0].count}`);
  console.log(` - attachments: ${attachmentsCount[0].count}`);
  console.log(` - audit_logs: ${auditLogsCount[0].count}`);

  await conn.end();
  console.log('[InitDB] Hoàn tất nạp dữ liệu Database thành công 100%!');
}

main().catch(err => {
  console.error('[InitDB Error]:', err.message);
  process.exit(1);
});
