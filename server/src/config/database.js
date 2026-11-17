import './env.js';
import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { assertSchema } from './schema.js';

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ctump_docugov',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 100,
  connectTimeout: 5000,
  timezone: 'Z',
  charset: 'utf8mb4',
  enableKeepAlive: true,
};
export const pool = mysql.createPool(dbConfig);
pool.on('connection', connection => connection.query("SET time_zone = '+00:00'"));
const transactions = new AsyncLocalStorage();
let connected = false;

export async function checkDb() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    await assertSchema(connection);
    connected = true;
    return true;
  } catch (error) {
    connected = false;
    throw error;
  } finally {
    connection.release();
  }
}
export async function initDb() {
  await checkDb();
  return pool;
}
export const isDbConnected = () => connected;
export const getPool = () => pool;
export const getConnection = () => pool.getConnection();

async function run(method, sql, params) {
  try {
    const [result] = await (transactions.getStore()?.connection || pool)[method](sql, params);
    connected = true;
    return result;
  } catch (error) {
    if (['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNRESET'].includes(error.code)) connected = false;
    throw error;
  }
}
export const query = (sql, params = []) => run('query', sql, params);
export const execute = (sql, params = []) => run('execute', sql, params);

export async function transaction(work) {
  if (transactions.getStore()) return work();
  const connection = await pool.getConnection();
  const pending = [];
  const state = { connection, pending, locks: new Set() };
  let result;
  try {
    await connection.beginTransaction();
    result = await transactions.run(state, work);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    for (const name of state.locks) await connection.query('SELECT RELEASE_LOCK(?)', [name]);
    connection.release();
  }
  // External effects must not run before the database commit succeeds.
  for (const callback of pending) {
    try { await callback(); } catch (error) { console.error('[afterCommit]', error.message); }
  }
  return result;
}
export function afterCommit(callback) {
  const state = transactions.getStore();
  if (state) { state.pending.push(callback); return Promise.resolve(); }
  return callback();
}
export async function withDossierLock(id, work) {
  return transaction(async () => {
    const state = transactions.getStore();
    const name = createHash('sha256').update(dbConfig.database + ':dossier:' + id).digest('hex');
    if (state.locks.has(name)) return work();
    const [lock] = await query('SELECT GET_LOCK(?, 30) AS acquired', [name]);
    if (Number(lock.acquired) !== 1) throw new Error('Hồ sơ đang được xử lý. Vui lòng thử lại.');
    state.locks.add(name);
    return work();
  });
}
export default pool;
