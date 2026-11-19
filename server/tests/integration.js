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
 const secondPdf=fs.readFileSync(path.join(uploads,'pdf',dossier.code+'-2a-v'+approved.current_version+'.pdf'));
 const signed=Buffer.concat([pdf,Buffer.from('\n% integration signature 1a bytes\n')]);
 const signed2a=Buffer.concat([secondPdf,Buffer.from('\n% integration signature 2a bytes\n')]);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRX0AAAAASUVORK5CYII=','base64');
 const proof=Buffer.concat([pdf,Buffer.from('\n% evidence PDF, not a signed form\n')]);
 const endpoint='/api/applications/'+dossier.id;
 const diskFiles=()=>fs.readdirSync(uploads,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).length;
 const makePacket=(one=signed,two=signed2a)=>{
  const data=new FormData();
  if(one)data.append('signed1a',new Blob([one],{type:'application/pdf'}),'signed-1a.pdf');
  if(two)data.append('signed2a',new Blob([two],{type:'application/pdf'}),'signed-2a.pdf');
  return data;
 };
 const stableKeys=['formData','formData1a','formData2a','status_1a','status_2a','current_version','signature_config','generated_pdf_path','generated_docx_path'];
 const original=await request(endpoint,{token:user.token});
 const versionRows=(await query('SELECT COUNT(*) AS count FROM dossier_versions WHERE dossier_id=?',[dossier.id]))[0].count;
 const sameForms=async()=>{const current=await request(endpoint,{token:user.token});for(const key of stableKeys)assert.deepEqual(current[key],original[key],key);assert.equal((await query('SELECT COUNT(*) AS count FROM dossier_versions WHERE dossier_id=?',[dossier.id]))[0].count,versionRows);return current;};
 const countBefore=diskFiles();
 const imageOnly=new FormData();imageOnly.append('evidence',new Blob([png],{type:'image/png'}),'only-evidence.png');
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:imageOnly,expected:400});
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:makePacket(signed,null),expected:400});
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:makePacket(signed,signed),expected:400});
 const bad=makePacket(Buffer.from('fake pdf'),signed2a);
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:bad,expected:400});
 const imageAsSigned=new FormData();imageAsSigned.append('signed1a',new Blob([png],{type:'image/png'}),'wrong.png');imageAsSigned.append('signed2a',new Blob([signed2a],{type:'application/pdf'}),'2a.pdf');
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:imageAsSigned,expected:400});
 assert.equal(diskFiles(),countBefore);assert.equal((await sameForms()).status,'VALIDATED');
 pass('missing/duplicate/single/image-only signed packets and mismatched files are rejected without leaving uploads');
 const body=makePacket();body.append('evidence',new Blob([png],{type:'image/png'}),'evidence.png');body.append('evidence',new Blob([proof],{type:'application/pdf'}),'evidence.pdf');
 const uploaded=await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body});
 assert.equal(uploaded.status,'PENDING_SIGNED_REVIEW');
 assert.equal(uploaded.department_signed_files.length,4);assert.equal(uploaded.evidence_files.length,2);
 const one=uploaded.department_signed_files.find(file=>file.form==='1a'),two=uploaded.department_signed_files.find(file=>file.form==='2a');
 assert.equal(uploaded.faculty_signed_pdf_url,one.url);assert.notEqual(one.url,two.url);
 assert.ok(uploaded.evidence_files.every(file=>file.type==='EVIDENCE'&&!file.form));
 const physical=path.join(uploads,one.url.replace('/uploads/',''));
 assert.deepEqual(fs.readFileSync(physical),signed);
 const downloaded=await fetch(base+one.url,{headers:{Authorization:'Bearer '+user.token}});
 assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),signed);
 assert.equal((await fetch(base+one.url,{headers:{Authorization:'Bearer '+other.token}})).status,403);
 assert.equal((await fetch(base+one.url)).status,401);
 await sameForms();
 pass('explicit 1a/2a uploads preserve signed bytes and keep PDF evidence separate with file ownership');
 const legacyFiles=uploaded.department_signed_files.map(({form,...file})=>file);
 const beforeLegacy=diskFiles();
 await execute('UPDATE dossiers SET department_signed_files=? WHERE id=?',[JSON.stringify(legacyFiles),dossier.id]);
 try{
  await request(endpoint+'/submit-to-rector',{method:'PATCH',token:admin.token,body:{},expected:400});
  const blockedFinal=new FormData();blockedFinal.append('file',new Blob([signed],{type:'application/pdf'}),'blocked-final.pdf');
  await request(endpoint+'/confirm-signed',{method:'PATCH',token:admin.token,body:blockedFinal,expected:400});
  assert.equal(diskFiles(),beforeLegacy);
 }finally{await execute('UPDATE dossiers SET department_signed_files=? WHERE id=?',[JSON.stringify(uploaded.department_signed_files),dossier.id]);}
 pass('legacy/unclassified packets cannot advance or archive until both signed forms are identified');
 const pendingCount=diskFiles();
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:makePacket(),expected:409});
 assert.equal(diskFiles(),pendingCount);
 await request(endpoint+'/return-signed',{method:'PATCH',token:user.token,body:{reason:'Forged return'},expected:403});
 await request(endpoint+'/return-signed',{method:'PATCH',token:other.token,body:{reason:'Foreign dossier'},expected:403});
 await request(endpoint+'/return-signed',{method:'PATCH',token:admin.token,body:{reason:'   '},expected:400});
 await request(endpoint+'/return-signed',{method:'PATCH',token:admin.token,body:{reason:'x'.repeat(4001)},expected:400});
 await request(endpoint,{method:'PUT',token:admin.token,body:{status:'VALIDATED'},expected:400});
 await request(endpoint,{method:'PUT',token:admin.token,body:{department_signed_files:[]},expected:400});
 assert.equal((await sameForms()).status,'PENDING_SIGNED_REVIEW');
 pass('pending review blocks upload replacement, forged returns, reasonless reset and generic file overwrite');
 const emailsBefore=(await query('SELECT COUNT(*) AS count FROM email_notifications WHERE dossier_id=?',[dossier.id]))[0].count;
 await execute('RENAME TABLE audit_logs TO unavailable_audit');
 try{await request(endpoint+'/return-signed',{method:'PATCH',token:admin.token,body:{reason:'Rollback return'},expected:500});}
 finally{await execute('RENAME TABLE unavailable_audit TO audit_logs');}
 assert.equal((await sameForms()).status,'PENDING_SIGNED_REVIEW');
 assert.equal((await query('SELECT COUNT(*) AS count FROM email_notifications WHERE dossier_id=?',[dossier.id]))[0].count,emailsBefore);
 pass('failed audit rolls back return and notification atomically');
 const reason='PDF minh chứng chưa rõ; thay file minh chứng, giữ hai bản ký hợp lệ.';
 const returned=await request(endpoint+'/return-signed',{method:'PATCH',token:admin.token,body:{reason}});
 assert.equal(returned.status,'VALIDATED');await sameForms();
 let detail=await request(endpoint,{token:user.token});
 const firstReturn=detail.timeline_logs.filter(event=>event.type==='SIGNED_UPLOAD_RETURNED').at(-1);
 assert.equal(firstReturn.note,reason);assert.equal(firstReturn.files.length,4);
 const returnAudit=detail.auditLogs.find(event=>event.action==='RETURN_SIGNED_EVIDENCE');
 assert.equal(returnAudit.notes,reason);assert.equal(returnAudit.metadata.files.length,4);
 const returnMail=await query('SELECT content,status FROM email_notifications WHERE dossier_id=? AND step_name=?',[dossier.id,'Bước 4 - Yêu cầu tải lại bản ký/minh chứng']);
 assert.equal(returnMail.length,1);assert.equal(returnMail[0].status,'PENDING');assert.ok(returnMail[0].content.includes(reason));
 await request(endpoint+'/return-signed',{method:'PATCH',token:admin.token,body:{reason:'Repeated return'},expected:409});
 pass('admin return persists exact reason, audit and email while preserving approved forms/version and old packet');
 const invalidRetain=makePacket(null,signed2a);invalidRetain.set('retainedSigned1a',two.url);
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:invalidRetain,expected:400});
 const missingRetain=makePacket(null,signed2a);missingRetain.set('retainedSigned1a',one.url);
 fs.renameSync(physical,physical+'.saved');
 try{await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:missingRetain,expected:400});}
 finally{fs.renameSync(physical+'.saved',physical);}
 assert.equal((await sameForms()).status,'VALIDATED');
 pass('retained file must belong to the same form/current dossier and exist physically');
 const newTwo=Buffer.concat([signed2a,Buffer.from('\n% corrected upload round 2\n')]);
 const corrected=makePacket(null,newTwo);corrected.set('retainedSigned1a',one.url);
 corrected.set('retainedEvidence',JSON.stringify([{url:uploaded.evidence_files.find(file=>file.name==='evidence.png').url}]));
 corrected.append('evidence',new Blob([Buffer.concat([proof,Buffer.from('\n% clearer evidence\n')])],{type:'application/pdf'}),'clear-evidence.pdf');
 const reuploaded=await request(endpoint+'/faculty-signed',{method:'POST',token:user.token,body:corrected});
 assert.equal(reuploaded.status,'PENDING_SIGNED_REVIEW');assert.equal(reuploaded.faculty_signed_pdf_url,one.url);
 assert.notEqual(reuploaded.department_signed_files.find(file=>file.form==='2a').url,two.url);
 await sameForms();
 const oldBytes={'signed-1a.pdf':signed,'signed-2a.pdf':signed2a,'evidence.png':png,'evidence.pdf':proof};
 for(const old of uploaded.department_signed_files){const response=await fetch(base+old.url,{headers:{Authorization:'Bearer '+user.token}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),oldBytes[old.name]);}
 const retention=await request('/api/applications/cleanup-garbage',{method:'POST',token:admin.token,body:{}});
 for(const old of uploaded.department_signed_files)assert.equal(retention.orphanFiles.includes(old.url),false);
 assert.equal((await fetch(base+two.url,{headers:{Authorization:'Bearer '+other.token}})).status,403);
 detail=await request(endpoint,{token:user.token});assert.equal(detail.timeline_logs.filter(event=>event.type==='SIGNED_UPLOAD_SUBMITTED').length,2);
 pass('reupload can keep valid files and replace selected files; old round stays downloadable only by owner/admin');
 const nextReason='Kiểm tra lại lượt nộp mới';
 await request(endpoint,{method:'PUT',token:admin.token,body:{status:'VALIDATED',reason:nextReason}});
 await stop();await start();
 detail=await sameForms();assert.equal(detail.status,'VALIDATED');
 assert.equal(detail.timeline_logs.filter(event=>event.type==='SIGNED_UPLOAD_RETURNED').at(-1).note,nextReason);
 assert.equal(detail.auditLogs.filter(event=>event.action==='RETURN_SIGNED_EVIDENCE').length,2);
 const kept=new FormData();kept.set('retainedSigned1a',reuploaded.department_signed_files.find(file=>file.form==='1a').url);kept.set('retainedSigned2a',reuploaded.department_signed_files.find(file=>file.form==='2a').url);kept.set('retainedEvidence',JSON.stringify(reuploaded.evidence_files.map(file=>({url:file.url}))));
 await request(endpoint+'/reupload-signed',{method:'POST',token:user.token,body:kept});
 await sameForms();
 pass('return/resubmit loop and complete file history survive backend restart without changing form versions');
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
