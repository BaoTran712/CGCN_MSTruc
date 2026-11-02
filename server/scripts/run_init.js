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

  const sqlPath = path.resolve(__dirname, '../schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[InitDB] Executing server/schema.sql (Lean Workflow 5 tables)...');
  await conn.query(sql);

  const [tables] = await conn.query('SHOW TABLES FROM `' + database + '`');
  console.log('[InitDB] Initialized tables successfully:');
  console.log(tables.map((t) => Object.values(t)[0]));

  await conn.changeUser({ database });
  const [deptCount] = await conn.query('SELECT COUNT(*) as count FROM departments');
  const [usersCount] = await conn.query('SELECT COUNT(*) as count FROM users');
  const [dossiersCount] = await conn.query('SELECT COUNT(*) as count FROM dossiers');

  console.log(`[InitDB] Data stats:`);
  console.log(` - departments: ${deptCount[0].count}`);
  console.log(` - users: ${usersCount[0].count}`);
  console.log(` - dossiers: ${dossiersCount[0].count}`);

  await conn.end();
  console.log('[InitDB] Khởi tạo Database theo schema mới thành công 100%!');
}

main().catch((err) => {
  console.error('[InitDB Error]:', err.message);
  process.exit(1);
});
