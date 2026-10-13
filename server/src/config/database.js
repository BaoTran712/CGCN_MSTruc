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
    console.warn(`[Database] Chưa thể kết nối MySQL (${err.message}).`);
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
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function execute(sql, params = []) {
  const [result] = await pool.execute(sql, params);
  return result;
}

export async function getConnection() {
  return await pool.getConnection();
}

export default pool;
