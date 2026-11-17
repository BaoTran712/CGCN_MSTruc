import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const root=path.resolve(import.meta.dirname,'../..');
const manifest=process.env.CGCN_TEST_DB ? {database:process.env.CGCN_TEST_DB} : JSON.parse(fs.readFileSync(path.join(root,'.local/migration-verification.json'),'utf8'));
if(!/^ctump_docugov_verify_[0-9]+$/.test(manifest.database))throw new Error('Chỉ được kiểm thử trên database bản sao.');
const uploads=path.join(root,'.local','integration-uploads-'+Date.now());
process.env.DB_NAME=manifest.database;
process.env.UPLOAD_DIR=uploads;
process.env.MAIL_DISABLED='true';
process.env.NODE_ENV='production';
process.env.JWT_SECRET=randomBytes(48).toString('hex');
const {query,execute,pool,initDb}=await import('../src/config/database.js');
const {hashPassword}=await import('../src/utils/passwords.js');
const {dossierRepository}=await import('../src/repositories/dossierRepository.js');
const password='Integration-'+randomBytes(16).toString('hex');
const runId=randomUUID().slice(0,8);
let child,base,logs='';
const results=[];
const pass=name=>{results.push(name);console.log('PASS '+name);};
async function start(){
 const reservation=net.createServer();
 await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
 const port=reservation.address().port;
 await new Promise(resolve=>reservation.close(resolve));
 base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server/src/server.js'],{cwd:root,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{logs+=chunk;});
 child.stderr.on('data',chunk=>{logs+=chunk;});
 for(let attempt=0;attempt<100;attempt++){
  if(child.exitCode!==null)throw new Error('Backend stopped: '+logs);
  try{const response=await fetch(base+'/api/status',{signal:AbortSignal.timeout(1000)});if(response.ok)return;}
  catch{}
  await delay(100);
 }
 throw new Error('Backend readiness timeout: '+logs);
}
async function stop(){
 if(!child||child.exitCode!==null)return;
 const current=child;
 const done=new Promise(resolve=>current.once('exit',resolve));
 current.kill('SIGTERM');
 await Promise.race([done,delay(10000).then(()=>current.kill())]);
 child=null;
}
async function request(url,{token,method='GET',body,expected=200}={}){
 const headers={};
 if(token)headers.Authorization='Bearer '+token;
 const data=body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body);
 if(data&&!(body instanceof FormData))headers['Content-Type']='application/json';
 const response=await fetch(base+url,{method,headers,body:data,signal:AbortSignal.timeout(90000)});
 const json=await response.json();
 assert.equal(response.status,expected,method+' '+url+' '+JSON.stringify(json));
 return json.data??json;
}
async function login(email){
 return request('/api/users/login',{method:'POST',body:{email,password}});
}
async function create(token,suffix){
 return request('/api/applications',{method:'POST',token,expected:201,body:{
  templateId:'tmpl-cgcn-1a',formData:{full_name:'Kiểm thử lưu bền vững',department:'Khoa Y',research_title:'Integration '+runId+' '+suffix,ten_de_tai:'Integration '+runId+' '+suffix,truong_don_vi:'Trưởng đơn vị'},
  formData1a:{ten_de_tai:'1a '+runId+' '+suffix,full_name:'Kiểm thử'},
  formData2a:{product_name:'2a '+runId+' '+suffix,transfer_cost:'1000000'},
 }}); 
}
try{
 await initDb();
 const users=[];
 for(const [label,role] of [['admin','ADMIN'],['user','USER'],['other','USER']]){
  const id='usr-'+randomUUID(),email=label+'-'+runId+'@integration.invalid';
  await execute('INSERT INTO users (id,email,name,role,is_active) VALUES (?,?,?,?,1)',[id,email,'Integration '+label,role]);
  await execute('INSERT INTO auth_credentials (user_id,password_hash) VALUES (?,?)',[id,await hashPassword(password)]);
  users.push({id,email,role});
 }
 await start();
 pass('production startup, schema readiness and shared API');
 assert.equal((await fetch(base+'/')).status,200);
 await request('/api/applications',{expected:401});
 await request('/api/applications',{token:'dev-token-admin',expected:401});
 await request('/api/users/login',{method:'POST',body:{email:'admin@integration.invalid',password:'wrong'},expected:401});
 await request('/api/users/login',{method:'POST',body:{email:users[0].email},expected:401});
 pass('no anonymous dossiers, no dev token, no email-only or arbitrary-password login');
 const [admin,user,other]=await Promise.all(users.map(u=>login(u.email)));
 assert.equal(admin.role,'ADMIN');assert.equal(user.role,'USER');
 const smtp = await request('/api/email-logs/verify-smtp',{token:admin.token,expected:503});
 assert.equal(smtp.success,false);assert.equal(smtp.code,'SMTP_DISABLED');
 const queued = await request('/api/email-logs/test',{method:'POST',token:admin.token,body:{email:'mail-'+runId+'@integration.invalid'},expected:202});
 assert.equal(queued.status,'PENDING');assert.equal(queued.sentAt,null);assert.equal(queued.attempts,0);
 const mailLogs = await request('/api/email-logs',{token:admin.token});
 assert.match(mailLogs.find(log=>log.id===queued.id).delivery_issue,/MAIL_DISABLED/);
 pass('SMTP failures return HTTP 503; queued mail returns 202 and shows the delivery issue');
 const dossier=await create(user.token,'initial');
 const [persisted]=await query('SELECT id,code,form_data FROM dossiers WHERE id=?',[dossier.id]);
 assert.equal(persisted.code,dossier.code);
 assert.equal((await query('SELECT * FROM dossier_versions WHERE dossier_id=?',[dossier.id])).length,1);
 assert.equal((await query('SELECT * FROM audit_logs WHERE dossier_id=?',[dossier.id])).length,1);
 const emails=await query('SELECT status FROM email_notifications WHERE dossier_id=?',[dossier.id]);
 assert.ok(emails.length);assert.ok(emails.every(email=>email.status==='PENDING'));
 pass('create commits dossier, version, audit and queued notification in real MySQL');
 const adminList=await request('/api/applications',{token:admin.token});
 assert.ok(adminList.some(item=>item.id===dossier.id));
 assert.ok(!(await request('/api/applications',{token:other.token})).some(item=>item.id===dossier.id));
 await request('/api/applications/'+dossier.id,{token:other.token,expected:403});
 await request('/api/applications/'+dossier.id+'/approve',{method:'PATCH',token:user.token,body:{adminUser:{role:'ADMIN'}},expected:403});
 await request('/api/applications/'+dossier.id,{method:'PUT',token:user.token,body:{user_id:users[2].id},expected:403});
 pass('independent admin session sees user dossier; ownership and body-forged admin blocked');
 await execute("UPDATE users SET role='USER' WHERE id=?",[users[0].id]);
 try{await request('/api/applications/'+dossier.id+'/approve',{method:'PATCH',token:admin.token,body:{},expected:403});}
 finally{await execute("UPDATE users SET role='ADMIN' WHERE id=?",[users[0].id]);}
 pass('existing JWT cannot retain admin permission after the database role changes');
 await request('/api/applications/'+dossier.id,{method:'PUT',token:admin.token,body:{status_2a:'APPROVED'}});
 await request('/api/applications/'+dossier.id+'/return-revision',{method:'PATCH',token:admin.token,body:{target_form:'1a',revisionNote:'Bổ sung 1a'}});
 const before=await request('/api/applications/'+dossier.id,{token:user.token});
 const resubmitted=await request('/api/applications/'+dossier.id+'/resubmit-1a',{method:'PATCH',token:user.token,body:{formData1a:{ten_de_tai:'Đã sửa 1a '+runId}}});
 assert.equal(resubmitted.status,'SUBMITTED');
 assert.equal(resubmitted.status_2a,'APPROVED');
 assert.deepEqual(resubmitted.formData2a,before.formData2a);
 assert.equal(resubmitted.current_version,2);
 assert.ok(fs.existsSync(path.join(uploads,'docx',dossier.code+'-v1.docx')));
 pass('return/resubmit 1a preserves approved 2a and historical version files');
 await request('/api/applications/'+dossier.id,{method:'PUT',token:admin.token,body:{status_1a:'APPROVED'}});
 await request('/api/applications/'+dossier.id+'/return-revision',{method:'PATCH',token:admin.token,body:{target_form:'2a',revisionNote:'Bổ sung 2a'}});
 const before2=await request('/api/applications/'+dossier.id,{token:user.token});
 const updated2=await request('/api/applications/'+dossier.id+'/resubmit-2a',{method:'PATCH',token:user.token,body:{formData2a:{product_name:'Đã sửa 2a '+runId}}});
 assert.deepEqual(updated2.formData1a,before2.formData1a);
 assert.equal(updated2.status_1a,'APPROVED');assert.equal(updated2.current_version,3);
 pass('return/resubmit 2a preserves approved 1a');
 const rolled=await request('/api/applications/'+dossier.id+'/rollback',{method:'POST',token:admin.token,body:{targetVersionNumber:1}});
 assert.equal(rolled.current_version,3);
 assert.equal(rolled.formData1a.ten_de_tai,'1a '+runId+' initial');
 assert.equal(rolled.formData2a.product_name,'2a '+runId+' initial');
 pass('rollback persists both form snapshots without an extra resubmit or version increment');
 const approved=await request('/api/applications/'+dossier.id+'/approve',{method:'PATCH',token:admin.token,body:{reviewNotes:'Hợp lệ'}});
 assert.equal(approved.status,'VALIDATED');
 const pendingAttachments=await query('SELECT attachments FROM email_notifications WHERE dossier_id=?',[dossier.id]);
 for(const email of pendingAttachments)for(const attachment of typeof email.attachments==='string'?JSON.parse(email.attachments):email.attachments||[])assert.ok(attachment.path.startsWith('/uploads/'));
 const pdf=fs.readFileSync(path.join(uploads,approved.generated_pdf_path.replace('/uploads/','')));
 const signed=Buffer.concat([pdf,Buffer.from('\n% integration signature bytes\n')]);
 const body=new FormData();
 body.append('files',new Blob([signed],{type:'application/pdf'}),'signed-faculty.pdf');
 body.append('files',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRX0AAAAASUVORK5CYII=','base64')],{type:'image/png'}),'evidence.png');
 const uploaded=await request('/api/applications/'+dossier.id+'/reupload-signed',{method:'POST',token:user.token,body});
 assert.equal(uploaded.status,'PENDING_SIGNED_REVIEW');
 assert.ok(uploaded.department_signed_files.some(file=>file.url===uploaded.faculty_signed_pdf_url));
 assert.equal(uploaded.department_signed_files.length,2);
 const physical=path.join(uploads,uploaded.faculty_signed_pdf_url.replace('/uploads/',''));
 assert.deepEqual(fs.readFileSync(physical),signed);
 const downloaded=await fetch(base+uploaded.faculty_signed_pdf_url,{headers:{Authorization:'Bearer '+user.token}});
 assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),signed);
 assert.equal((await fetch(base+uploaded.faculty_signed_pdf_url,{headers:{Authorization:'Bearer '+other.token}})).status,403);
 assert.equal((await fetch(base+uploaded.faculty_signed_pdf_url)).status,401);
 pass('multipart upload stores real signed PDF/evidence and enforces file ownership');
 const bad=new FormData();bad.append('files',new Blob(['fake pdf'],{type:'application/pdf'}),'fake.pdf');
 await request('/api/applications/'+dossier.id+'/reupload-signed',{method:'POST',token:user.token,body:bad,expected:400});
 pass('mismatched file contents rejected');
 const rector=await request('/api/applications/'+dossier.id+'/submit-to-rector',{method:'PATCH',token:admin.token,body:{}});
 assert.equal(rector.status,'WAITING_RECTOR_SIGNATURE');
 const finalBytes=Buffer.concat([signed,Buffer.from('\n% final decision signature\n')]);
 const finalBody=new FormData();finalBody.append('file',new Blob([finalBytes],{type:'application/pdf'}),'final-decision.pdf');finalBody.append('decisionNumber','TEST-'+runId);finalBody.append('decisionDate','2026-11-16');
 const archived=await request('/api/applications/'+dossier.id+'/confirm-signed',{method:'PATCH',token:admin.token,body:finalBody});
 assert.equal(archived.status,'SIGNED_ARCHIVED');
 assert.deepEqual(fs.readFileSync(path.join(uploads,archived.final_pdf_url.replace('/uploads/',''))),finalBytes);
 const exported=await fetch(base+'/api/applications/'+dossier.id+'/export-pdf',{method:'POST',headers:{Authorization:'Bearer '+user.token,'Content-Type':'application/json'},body:'{}'});
 assert.equal(exported.status,200);assert.deepEqual(Buffer.from(await exported.arrayBuffer()),finalBytes);
 pass('rector/archive flow retains uploaded final PDF bytes and exports that exact file');
 await request('/api/applications/'+dossier.id+'/resubmit-1a',{method:'PATCH',token:user.token,body:{formData1a:{ten_de_tai:'Unauthorized archived edit'}},expected:409});
 const unchanged=await request('/api/applications/'+dossier.id,{token:user.token});
 assert.equal(unchanged.status,'SIGNED_ARCHIVED');assert.equal(unchanged.current_version,3);
 pass('archived dossier remains locked by existing terminal workflow state');
 const finalPhysical=path.join(uploads,archived.final_pdf_url.replace('/uploads/',''));
 fs.renameSync(finalPhysical,finalPhysical+'.saved');
 try{await request('/api/applications/'+dossier.id+'/export-pdf',{method:'POST',token:user.token,body:{},expected:404});}
 finally{fs.renameSync(finalPhysical+'.saved',finalPhysical);}
 pass('missing signed PDF is reported instead of replaced by an unsigned generated document');
 const concurrent=await Promise.all(['concurrent-a','concurrent-b','concurrent-c'].map(suffix=>create(user.token,suffix)));
 assert.equal(new Set(concurrent.map(item=>item.code)).size,3);
 assert.equal(new Set(concurrent.map(item=>item.id)).size,3);
 pass('concurrent creates allocate unique codes/IDs');
 await request('/api/applications/'+concurrent[0].id+'/submit-to-rector',{method:'PATCH',token:admin.token,body:{},expected:409});
 pass('backend rejects skipped workflow steps using the existing transition matrix');
 const countBeforeFailure=(await query('SELECT COUNT(*) AS count FROM dossiers'))[0].count;
 await execute('RENAME TABLE dossier_versions TO unavailable_versions');
 try{await request('/api/applications',{method:'POST',token:user.token,body:{templateId:'tmpl-cgcn-1a',formData:{full_name:'Atomic rollback',research_title:runId+' atomic failure'}},expected:500});}
 finally{await execute('RENAME TABLE unavailable_versions TO dossier_versions');}
 assert.equal((await query('SELECT COUNT(*) AS count FROM dossiers'))[0].count,countBeforeFailure);
 pass('SQL failure rolls back dossier creation instead of returning RAM success');
 const codes=await Promise.all(Array.from({length:8},()=>dossierRepository.getNextCode()));
 assert.equal(new Set(codes).size,codes.length);
 pass('atomic sequence allocation under parallel requests');
 const originalCount=(await query('SELECT COUNT(*) AS count FROM dossiers'))[0].count;
 await execute("INSERT INTO users (id,email,name,role) VALUES (?,?,?,'USER')",['usr-'+randomUUID(),'rollback-'+runId+'@integration.invalid','Rollback sentinel']);
 await stop();
 await start();
 const restored=await request('/api/applications/'+dossier.id,{token:admin.token});
 assert.equal(restored.status,'SIGNED_ARCHIVED');assert.equal(restored.current_version,3);
 assert.deepEqual(fs.readFileSync(physical),signed);
 assert.equal((await query('SELECT COUNT(*) AS count FROM dossiers'))[0].count,originalCount);
 pass('backend process restart retains MySQL records, versions, status, sessions and uploaded files');
 const orphan=path.join(uploads,'pdf','unreferenced-retained.pdf');fs.writeFileSync(orphan,pdf);fs.utimesSync(orphan,new Date(0),new Date(0));
 const report=await request('/api/applications/cleanup-garbage',{method:'POST',token:admin.token,body:{}});
 assert.equal(report.dryRun,true);assert.ok(fs.existsSync(orphan));assert.ok(fs.existsSync(physical));
 pass('cleanup defaults to read-only and does not delete uploads or dossiers');
 await stop();
 await execute('RENAME TABLE document_templates TO unavailable_templates');
 try {
  await assert.rejects(initDb,/nâng cấp/);
  const reader=await spawn(process.execPath,['server/src/server.js'],{cwd:root,env:{...process.env,PORT:'49999'},windowsHide:true,stdio:'pipe'});
  const exit=await new Promise(resolve=>reader.on('exit',resolve));assert.notEqual(exit,0);
  assert.ok(fs.existsSync(orphan));assert.ok(fs.existsSync(physical));
 } finally {await execute('RENAME TABLE unavailable_templates TO document_templates');}
 pass('schema failure stops startup without deleting files');
 console.log(JSON.stringify({passed:results.length,database:manifest.database,uploads,productionDatabaseModified:false}));
 fs.writeFileSync(path.join(root,'.local/integration-results.json'),JSON.stringify({passed:results,database:manifest.database,uploads,completedAt:new Date().toISOString()},null,2));
}catch(error){console.error(error);console.error(logs.slice(-10000));process.exitCode=1;}
finally{await stop();await pool.end();}
