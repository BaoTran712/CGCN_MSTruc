import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const targetDb = config.db.database;
  console.log(`[Migration] Bắt đầu khởi tạo dữ liệu cho database: ${targetDb}...`);

  // Kết nối MySQL server không chỉ định db để đảm bảo database tồn tại
  const adminConn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });

  await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await adminConn.end();

  // Đọc file schema.sql
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  let sql = fs.readFileSync(schemaPath, 'utf8');

  // Thay thế tên database trong schema nếu có
  sql = sql.replace(/`ctump_cgcn`/g, `\`${targetDb}\``);
  sql = sql.replace(/ctump_cgcn/g, targetDb);

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: targetDb,
    multipleStatements: true,
  });

  console.log(`[Migration] Đang thực thi toàn bộ bảng và dữ liệu mẫu trong schema.sql...`);
  await conn.query(sql);

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`[Migration] Thành công! Danh sách bảng:`, tables.map(t => Object.values(t)[0]));

  const [dossiers] = await conn.query('SELECT count(*) as cnt FROM dossiers');
  console.log(`[Migration] Số lượng hồ sơ đã nạp:`, dossiers[0].cnt);

  const [templates] = await conn.query('SELECT count(*) as cnt FROM document_templates');
  console.log(`[Migration] Số lượng biểu mẫu đã nạp:`, templates[0].cnt);

  await conn.end();
  console.log(`[Migration] Hoàn tất 100%!`);
}

runMigration().catch((err) => {
  console.error('[Migration Error Message]:', err.message);
  console.error('[Migration Error Code]:', err.code);
  process.exit(1);
});
