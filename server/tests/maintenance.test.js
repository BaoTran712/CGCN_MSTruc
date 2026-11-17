import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../src/config/database.js';
import { maintenanceConnection,identifier,restoreIntoEmptyDatabase } from '../src/db/maintenance.js';
import { migrate } from '../src/db/migrate.js';

let connection;
try{
 connection=await maintenanceConnection(null);
 const fresh='ctump_docugov_fresh_'+Date.now();
 await connection.query('CREATE DATABASE '+identifier(fresh)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await connection.changeUser({database:fresh});
 await connection.query("SET time_zone='+00:00'");
 await migrate(connection,{backup:false});
 for(const table of ['users','dossiers'])assert.equal((await connection.query('SELECT COUNT(*) AS count FROM '+table))[0][0].count,0);
 assert.equal((await connection.query('SELECT COUNT(*) AS count FROM document_templates'))[0][0].count,2);
 console.log('PASS fresh install without sample accounts/dossiers');
 const verification=JSON.parse(fs.readFileSync('.local/production-verification.json','utf8'));
 const snapshot=JSON.parse(fs.readFileSync(path.join(verification.backupDirectory,'database.json'),'utf8'));
 const restored='ctump_docugov_restore_'+Date.now();
 await connection.query('CREATE DATABASE '+identifier(restored)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await connection.changeUser({database:restored});
 await restoreIntoEmptyDatabase(connection,snapshot);
 for(const [name,table]of Object.entries(snapshot.tables)){
  const [rows]=await connection.query('SELECT * FROM '+identifier(name));
  assert.equal(rows.length,table.rows.length);
  for(const old of table.rows)assert.deepEqual(rows.find(row=>String(row.id)===String(old.id)),old);
 }
 const sample=snapshot.tables.audit_logs.rows[0];
 if(sample){
  await connection.query("SET time_zone='+00:00'");
  const [rows]=await connection.query('SELECT created_at FROM audit_logs WHERE id=?',[sample.id]);
  const instant=new Date(sample.created_at.replace(' ','T')+snapshot.timezone).toISOString().slice(0,19).replace('T',' ');
  assert.equal(rows[0].created_at,instant);
 }
 console.log('PASS backup restore preserves values and actual timestamps across timezone changes');
 await assert.rejects(restoreIntoEmptyDatabase(connection,snapshot),/database trống/);
 console.log('PASS restore refuses to overwrite an existing database');
}catch(error){console.error(error);process.exitCode=1;}
finally{if(connection)await connection.end();await pool.end();}
