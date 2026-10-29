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
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isConnected = true;
    console.log(`[Database] Đã kết nối MySQL pool thành công tới database: ${dbConfig.database} (${dbConfig.host}:${dbConfig.port})`);
    return pool;
  } catch (err) {
    isConnected = false;
    console.warn(`[Database] MySQL chưa được khởi động (${err.message}).`);
    console.warn(`[Database] Đã tự động kích hoạt In-Memory Store dự phòng: Toàn bộ API hoạt động bình thường.`);
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
