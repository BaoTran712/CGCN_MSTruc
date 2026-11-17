import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pool } from '../src/config/database.js';
import { maintenanceConnection,identifier,restoreIntoEmptyDatabase } from '../src/db/maintenance.js';

let connection;
try {
  const file=process.argv[2];
  const index=process.argv.indexOf('--database');
  const database=index>-1?process.argv[index+1]:null;
  if(!file||!database)throw new Error('Dùng: node server/scripts/restoreDb.js <database.json> --database <database_trống>');
  const content=fs.readFileSync(path.resolve(file),'utf8');
  const expected=fs.readFileSync(path.join(path.dirname(path.resolve(file)),'database.sha256'),'utf8').trim();
  if(createHash('sha256').update(content).digest('hex')!==expected)throw new Error('Checksum backup không khớp.');
  const snapshot=JSON.parse(content);
  if(!/^[+-][0-9]{2}:[0-9]{2}$/.test(snapshot.timezone||''))throw new Error('Backup chưa ghi rõ timezone. Cần đối chiếu timezone trước khi phục hồi.');
  connection=await maintenanceConnection(null);
  await connection.query('CREATE DATABASE IF NOT EXISTS '+identifier(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.changeUser({database});
  await restoreIntoEmptyDatabase(connection,snapshot);
  console.log('Đã phục hồi vào database trống: '+database+'. Bản sao uploads ở: '+path.join(path.dirname(path.resolve(file)),'uploads'));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(connection)await connection.end();await pool.end();}
