import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbConfig } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importDatabase() {
  const backupPath = path.resolve(__dirname, '../ctump_docugov_backup.sql');
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  const targetFile = fs.existsSync(backupPath) ? backupPath : schemaPath;

  if (!fs.existsSync(targetFile)) {
    console.error('[importDb] Không tìm thấy file SQL để nạp database!');
    process.exit(1);
  }

  console.log(`[importDb] Đang nạp cơ sở dữ liệu từ: ${path.basename(targetFile)}...`);
  const sqlContent = fs.readFileSync(targetFile, 'utf8');

  const conn = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  });

  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.query(`USE \`${dbConfig.database}\`;`);
    await conn.query(sqlContent);
    console.log(`[importDb] Đã nạp thành công toàn bộ bảng và dữ liệu vào database '${dbConfig.database}'!`);
  } finally {
    await conn.end();
  }
}

importDatabase().catch((err) => {
  console.error('[importDb] Lỗi khi nạp database:', err.message);
  process.exit(1);
});

