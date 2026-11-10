import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tải biến môi trường từ server/.env hoặc fallback
const serverEnvPath = path.resolve(__dirname, '../../.env');
const fallbackEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(fallbackEnvPath)) {
  dotenv.config({ path: fallbackEnvPath });
} else {
  dotenv.config();
}

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ctump_docugov',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// Khởi tạo MySQL Connection Pool bằng mysql2/promise
export const pool = mysql.createPool(dbConfig);

let isConnected = false;

export async function initDb() {
  try {
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.ping();
      conn.release();
    } catch (dbErr) {
      // Nếu lỗi do database chưa tồn tại -> tự động tạo database & nạp schema
      if (
        dbErr.code === 'ER_BAD_DB_ERROR' ||
        (dbErr.message && dbErr.message.includes('Unknown database'))
      ) {
        console.log(
          `[Database] Database '${dbConfig.database}' chưa tồn tại. Đang tự động khởi tạo...`
        );
        const rootConn = await mysql.createConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          password: dbConfig.password,
          multipleStatements: true,
        });
        await rootConn.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await rootConn.query(`USE \`${dbConfig.database}\`;`);

        // Nạp schema.sql nếu có
        const schemaPath = path.resolve(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await rootConn.query(schemaSql);
          console.log(
            `[Database] Đã tự động nạp cấu trúc bảng và dữ liệu mẫu từ schema.sql thành công!`
          );
        }
        await rootConn.end();

        // Thử kết nối lại với pool
        conn = await pool.getConnection();
        await conn.ping();
        conn.release();
      } else {
        throw dbErr;
      }
    }

    // Kiểm tra xem bảng dossiers đã được nạp chưa, nếu chưa có bảng thì tự động nạp schema.sql
    try {
      const [tableCheck] = await pool.query("SHOW TABLES LIKE 'dossiers'");
      if (!tableCheck || tableCheck.length === 0) {
        console.log(`[Database] Bảng 'dossiers' chưa tồn tại. Đang tự động nạp schema.sql...`);
        const schemaPath = path.resolve(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          const rootConn = await mysql.createConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            multipleStatements: true,
          });
          await rootConn.query(schemaSql);
          await rootConn.end();
          console.log(`[Database] Đã tự động khởi tạo cấu trúc bảng chuẩn từ schema.sql!`);
        }
      } else {
        // Tự động bổ sung các cột hỗ trợ trả về/nộp lại độc lập từng biểu mẫu (1a / 2a) nếu bảng cũ chưa có
        const requiredCols = [
          {
            name: 'rejected_target',
            ddl: "ALTER TABLE `dossiers` ADD COLUMN `rejected_target` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Biểu mẫu mục tiêu bị trả về: 1a, 2a, both' AFTER `status_2a`",
          },
          {
            name: 'rejection_reason_1a',
            ddl: "ALTER TABLE `dossiers` ADD COLUMN `rejection_reason_1a` TEXT NULL COMMENT 'Lý do trả về riêng cho Biểu mẫu 1a' AFTER `rejected_target`",
          },
          {
            name: 'rejection_reason_2a',
            ddl: "ALTER TABLE `dossiers` ADD COLUMN `rejection_reason_2a` TEXT NULL COMMENT 'Lý do trả về riêng cho Biểu mẫu 2a' AFTER `rejection_reason_1a`",
          },
        ];
        for (const col of requiredCols) {
          try {
            const [colCheck] = await pool.query(`SHOW COLUMNS FROM \`dossiers\` LIKE ?`, [col.name]);
            if (!colCheck || colCheck.length === 0) {
              await pool.query(col.ddl);
              console.log(`[Database] Đã tự động thêm cột '${col.name}' vào bảng dossiers.`);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (checkErr) {
      console.warn(`[Database] Không thể kiểm tra bảng: ${checkErr.message}`);
    }

    isConnected = true;
    console.log(
      `[Database] Đã kết nối MySQL pool thành công tới database: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`
    );
    return pool;
  } catch (err) {
    isConnected = false;
    console.warn(`[Database] MySQL chưa được khởi động (${err.message}).`);
    console.warn(
      `[Database] Đã tự động kích hoạt In-Memory Store dự phòng: Toàn bộ API hoạt động bình thường.`
    );
    return null;
  }
}

export function getPool() {
  return pool;
}

export function isDbConnected() {
  return isConnected;
}

export async function query(sql, params = []) {
  if (!isConnected) {
    return [];
  }
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      isConnected = false;
      console.warn('[Database] Mất kết nối MySQL (ECONNREFUSED). Chuyển sang In-Memory Store.');
      return [];
    }
    throw err;
  }
}

export async function execute(sql, params = []) {
  if (!isConnected) {
    return [{ affectedRows: 0, insertId: 0 }];
  }
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      isConnected = false;
      console.warn('[Database] Mất kết nối MySQL (ECONNREFUSED). Chuyển sang In-Memory Store.');
      return [{ affectedRows: 0, insertId: 0 }];
    }
    throw err;
  }
}

export async function getConnection() {
  return await pool.getConnection();
}

export default pool;
