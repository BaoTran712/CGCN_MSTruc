import { pool } from '../src/config/database.js';
import { maintenanceConnection, snapshotDatabase } from '../src/db/maintenance.js';
let connection;
try {
  connection = await maintenanceConnection();
  const result = await snapshotDatabase(connection);
  console.log('[Backup] ' + result.file);
} catch (error) { console.error('[Backup]', error.message); process.exitCode=1; }
finally { if (connection) await connection.end(); await pool.end(); }
