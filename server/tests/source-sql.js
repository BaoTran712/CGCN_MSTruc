import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateInitSql } from '../scripts/generateInitSql.js';
import { maintenanceConnection, identifier } from '../src/db/maintenance.js';
import { pool, dbConfig } from '../src/config/database.js';
import { assertSchema } from '../src/config/schema.js';

const root=path.resolve(import.meta.dirname,'../..');
const stamp=Date.now();
const database='ctump_docugov_verify_'+stamp;
assert.match(database,/^ctump_docugov_verify_\d+$/);assert.notEqual(database,dbConfig.database);
let client=process.env.CGCN_MYSQL_CLIENT||'mysql';
if(!process.env.CGCN_MYSQL_CLIENT && process.platform==='win32'){
  const installRoot='C:/Program Files/MySQL';
  const candidates=fs.existsSync(installRoot)?fs.readdirSync(installRoot).map(name=>path.join(installRoot,name,'bin/mysql.exe')).filter(file=>fs.existsSync(file)):[];
  if(candidates.length)client=candidates.at(-1);
}
const local=path.join(root,'.local');fs.mkdirSync(local,{recursive:true});
const optionsFile=path.join(local,'source-sql-'+stamp+'.cnf');
const sqlFile=path.join(local,'source-sql-'+stamp+'.sql');
const quote=value=>'"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\r','\\r').replaceAll('\n','\\n')+'"';
fs.writeFileSync(optionsFile,['[client]','host='+quote(dbConfig.host),'port='+dbConfig.port,'user='+quote(dbConfig.user),'password='+quote(dbConfig.password),''].join('\n'),{mode:0o600});
const results=[];
const pass=name=>{results.push(name);console.log('PASS '+name);};
let connection;
const source=db=>{
  fs.writeFileSync(sqlFile,generateInitSql(db));
  return execFileSync(client,['--defaults-extra-file='+optionsFile,'--default-character-set=utf8mb4','--batch','--execute','source '+sqlFile.replaceAll('\\','/')],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
};
async function rowsByTable(){
  const[tables]=await connection.query('SHOW TABLES');const result={};
  for(const row of tables){const name=Object.values(row)[0];const[values]=await connection.query('SELECT * FROM '+identifier(name));result[name]=values.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));}
  return result;
}
try {
  assert.equal(fs.readFileSync(path.join(root,'server/init-production.sql'),'utf8').replaceAll('\r\n','\n'),generateInitSql());
  const output=source(database);assert.match(output,/READY/);
  connection=await maintenanceConnection(database);await assertSchema(connection);
  const tables=await rowsByTable();assert.equal(Object.keys(tables).length,11);
  for(const table of ['users','auth_credentials','dossiers','dossier_versions','attachments','audit_logs','email_notifications','dossier_sequences'])assert.equal(tables[table].length,0,table);
  assert.equal(tables.document_templates.length,2);assert.equal(tables.departments.length,8);
  assert.ok(tables.departments.every(row=>row.dean_name===null&&row.email===null&&row.phone===null));
  const[version]=await connection.query('SHOW COLUMNS FROM dossier_versions LIKE ?', ['snapshot']);assert.equal(version[0].Type,'json');
  const[mail]=await connection.query('SHOW COLUMNS FROM email_notifications');
  for(const name of ['attachments','attempts','last_error','next_attempt_at'])assert.ok(mail.some(c=>c.Field===name));
  assert.equal(mail.find(c=>c.Field==='sent_at').Default,null);
  pass('actual MySQL SOURCE creates all runtime tables/columns, catalogs and migration version without sample accounts or dossiers');

  await connection.query("INSERT INTO users (id,email,name,role) VALUES ('source-user','source@local.invalid','Source sentinel','USER')");
  await connection.query("INSERT INTO auth_credentials (user_id,token_version) VALUES ('source-user',7)");
  await connection.query("INSERT INTO dossiers (id,code,title,user_id,template_id,form_data) VALUES ('source-dossier','CGCN-2026-9999','Source sentinel','source-user','tmpl-cgcn-1a','{}')");
  await connection.query("INSERT INTO email_notifications (id,dossier_id,recipient_email,recipient_name,subject,content,step_name,status) VALUES ('source-mail','source-dossier','source@local.invalid','Source sentinel','Local test','Local test','Local test','PENDING')");
  const before=await rowsByTable();assert.match(source(database),/READY/);assert.deepEqual(await rowsByTable(),before);
  pass('running SOURCE again preserves existing accounts, dossier, pending mail and all catalog values');

  const incompatible='ctump_docugov_source_legacy_'+stamp;
  await connection.query('CREATE DATABASE '+identifier(incompatible)+' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.changeUser({database:incompatible});
  await connection.query('CREATE TABLE users (id VARCHAR(50) PRIMARY KEY) ENGINE=InnoDB');
  assert.match(source(incompatible),/SCHEMA_INCOMPATIBLE/);
  const[markers]=await connection.query('SELECT * FROM schema_migrations');assert.equal(markers.length,0);
  pass('incomplete existing schema is not marked as successfully migrated');
  await connection.end();connection=null;

  const integration=execFileSync(process.execPath,['server/tests/integration.js'],{cwd:root,env:{...process.env,CGCN_TEST_DB:database},windowsHide:true,encoding:'utf8',maxBuffer:10*1024*1024});
  process.stdout.write(integration);
  pass('full workflow integration passes on the database initialized by SOURCE');
  fs.writeFileSync(path.join(local,'source-sql-results.json'),JSON.stringify({database,passed:results,completedAt:new Date().toISOString(),productionDatabaseModified:false},null,2));
}catch(error){
  // Never print MySQL option-file contents or passwords in errors.
  console.error(error.stderr?.toString()||error.message);process.exitCode=1;
}finally{
  await connection?.end();await pool.end();
  fs.unlinkSync(optionsFile);if(fs.existsSync(sqlFile))fs.unlinkSync(sqlFile);
}
