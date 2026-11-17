import fs from 'node:fs';
import path from 'node:path';
import { serverRoot } from './env.js';

export function schemaTables() {
  return Array.from(
    fs.readFileSync(path.join(serverRoot, 'schema.sql'), 'utf8').matchAll(/CREATE TABLE(?: IF NOT EXISTS)? \x60([a-z0-9_]+)\x60\s*\(([\s\S]*?)\) ENGINE[^;]*;/g),
    match => ({
      name: match[1],
      sql: match[0],
      columns: Array.from(match[2].matchAll(/^\s*\x60([a-z0-9_]+)\x60\s+/gm), column => column[1]),
    })
  );
}
export async function assertSchema(connection, { checkVersion = true } = {}) {
  const missing = [];
  for (const table of schemaTables()) {
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM ' + table.name);
      const actual = new Set(columns.map(column => column.Field));
      for (const column of table.columns) if (!actual.has(column)) missing.push(table.name + '.' + column);
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
      missing.push(table.name);
    }
  }
  for (const table of ['schema_migrations', 'dossier_sequences', 'auth_credentials']) {
    const [rows] = await connection.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [table]);
    if (!rows.length) missing.push(table);
  }
  if (missing.length) {
    const error = new Error('Cơ sở dữ liệu cần nâng cấp (' + missing.join(', ') + '). Chạy npm run db:migrate trước khi khởi động.');
    error.code = 'SCHEMA_NOT_READY';
    throw error;
  }
  if (checkVersion) {
    const [versions] = await connection.query("SELECT version FROM schema_migrations WHERE version='20261116_production_storage'");
    if (!versions.length) { const error = new Error('Migration chưa hoàn tất. Chạy npm run db:migrate.'); error.code='SCHEMA_NOT_READY'; throw error; }
  }
}
