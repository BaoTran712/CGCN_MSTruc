import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { dbConfig } from '../config/database.js';
import { config } from '../utils/config.js';
import { projectRoot } from '../config/env.js';

export const identifier = value => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) throw new Error('Tên database/bảng không hợp lệ.');
  return String.fromCharCode(96) + value + String.fromCharCode(96);
};
export async function maintenanceConnection(database = dbConfig.database) {
  const connection = await mysql.createConnection({
    host: dbConfig.host, port: dbConfig.port, user: dbConfig.user,
    password: dbConfig.password, database, charset: 'utf8mb4',
    timezone: 'Z', dateStrings: true, connectTimeout: 5000,
  });
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}
export async function snapshotDatabase(connection, { copyUploads = true } = {}) {
  await connection.query("SET time_zone = '+00:00'");
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const [database] = await connection.query('SELECT DATABASE() AS name');
  const directory = path.join(projectRoot, 'backups', database[0].name + '-' + stamp);
  fs.mkdirSync(directory, { recursive: true });
  const snapshot = { database: database[0].name, createdAt: new Date().toISOString(), timezone:'+00:00', tables: {} };
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  try {
    const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = ?', ['BASE TABLE']);
    for (const row of tables) {
      const name = Object.values(row)[0];
      const [ddl] = await connection.query('SHOW CREATE TABLE ' + identifier(name));
      const [rows] = await connection.query('SELECT * FROM ' + identifier(name));
      snapshot.tables[name] = { create: ddl[0]['Create Table'], rows };
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  const content = JSON.stringify(snapshot, null, 2);
  const file = path.join(directory, 'database.json');
  fs.writeFileSync(file, content, { mode: 0o600 });
  fs.writeFileSync(path.join(directory, 'database.sha256'), createHash('sha256').update(content).digest('hex'));
  if (copyUploads && fs.existsSync(config.uploadDir)) fs.cpSync(config.uploadDir, path.join(directory, 'uploads'), { recursive: true, errorOnExist: true });
  return { file, directory, snapshot };
}
export async function restoreIntoEmptyDatabase(connection, snapshot) {
  const [existing] = await connection.query('SHOW TABLES');
  if (existing.length) throw new Error('Chỉ được phục hồi vào database trống.');
  if (!/^[+-][0-9]{2}:[0-9]{2}$/.test(snapshot.timezone || '')) throw new Error('Backup không có múi giờ hợp lệ.');
  await connection.query('SET time_zone = ?', [snapshot.timezone]);
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    for (const table of Object.values(snapshot.tables)) await connection.query(table.create);
    for (const [name, table] of Object.entries(snapshot.tables)) {
      for (const row of table.rows) {
        const keys = Object.keys(row);
        const values = keys.map(key => {
          const value = row[key];
          if (value?.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data);
          return value && typeof value === 'object' ? JSON.stringify(value) : value;
        });
        await connection.query('INSERT INTO ' + identifier(name) + ' (' + keys.map(identifier).join(',') + ') VALUES (' + keys.map(() => '?').join(',') + ')', values);
      }
    }
  } finally { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); }
}
