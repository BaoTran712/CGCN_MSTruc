import { dbConfig, pool } from '../src/config/database.js';
import { maintenanceConnection, identifier } from '../src/db/maintenance.js';
import { migrate } from '../src/db/migrate.js';

let connection;
try {
  connection = await maintenanceConnection(null);
  await connection.query('CREATE DATABASE IF NOT EXISTS ' + identifier(dbConfig.database) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.changeUser({ database: dbConfig.database });
  await connection.query("SET time_zone = '+00:00'");
  const result = await migrate(connection);
  console.log('[Migration] ' + (result.alreadyApplied ? 'Schema đã được nâng cấp.' : 'Nâng cấp schema hoàn tất; dữ liệu cũ được giữ nguyên.'));
} catch (error) {
  console.error('[Migration]', error.message);
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
  await pool.end();
}
