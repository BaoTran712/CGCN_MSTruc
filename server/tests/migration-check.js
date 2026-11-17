import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { dbConfig,pool } from '../src/config/database.js';
import { maintenanceConnection,identifier,snapshotDatabase,restoreIntoEmptyDatabase } from '../src/db/maintenance.js';
import { migrate } from '../src/db/migrate.js';
import { assertSchema } from '../src/config/schema.js';
import { projectRoot } from '../src/config/env.js';

let source,clone;
try {
  source=await maintenanceConnection();
  const backup=await snapshotDatabase(source);
  console.log('Backup database và uploads: '+backup.directory);
  const database='ctump_docugov_verify_'+Date.now();
  clone=await maintenanceConnection(null);
  await clone.query('CREATE DATABASE '+identifier(database)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await clone.changeUser({database});
  await restoreIntoEmptyDatabase(clone,backup.snapshot);
  await migrate(clone,{backup:false});
  await assertSchema(clone);
  const second=await migrate(clone,{backup:false});
  assert.equal(second.alreadyApplied,true);
  let preservedRows=0;
  for(const [table,snapshot] of Object.entries(backup.snapshot.tables)){
    const [rows]=await clone.query('SELECT * FROM '+identifier(table));
    assert.equal(rows.length,snapshot.rows.length,table+' row count');
    for(const old of snapshot.rows){
      const current=rows.find(row=>String(row.id)===String(old.id));
      assert.ok(current,table+' preserved primary key');
      for(const [key,value] of Object.entries(old)){
        if(key==='id')assert.equal(String(current[key]),String(value));
        else assert.deepEqual(current[key],value,table+'.'+key+' unchanged');
      }
      preservedRows++;
    }
  }
  const [visible]=await clone.query('SELECT d.code,d.title,u.name,t.code AS template_code FROM dossiers d JOIN users u ON d.user_id=u.id JOIN document_templates t ON d.template_id=t.id');
  assert.equal(visible.length,backup.snapshot.tables.dossiers.rows.length);
  const manifest={database,backupFile:backup.file,backupDirectory:backup.directory,preservedRows};
  fs.mkdirSync(path.join(projectRoot,'.local'),{recursive:true});
  fs.writeFileSync(path.join(projectRoot,'.local','migration-verification.json'),JSON.stringify(manifest,null,2));
  console.log(JSON.stringify({migrationPassed:true,idempotent:true,legacyRowsPreserved:preservedRows,visibleDossiers:visible.length,testDatabase:database}));
}catch(error){console.error(error);process.exitCode=1;}
finally{if(source)await source.end();if(clone)await clone.end();await pool.end();}
