import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { hashPassword,verifyPassword } from '../src/utils/passwords.js';
import { transitions,assertWorkflowTransition } from '../src/services/workflowPolicy.js';
import { resolveUploadAbsolutePath } from '../src/utils/cleanupGarbageData.js';
import { config } from '../src/utils/config.js';
import { schemaTables } from '../src/config/schema.js';
import { publicUploadUrl } from '../src/utils/storagePaths.js';

const root=path.resolve(import.meta.dirname,'../..');
async function frontend(entry='src/services/api.ts'){
 const values=new Map(),events=[],calls=[],transport={response:null,error:null};
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
 const context=vm.createContext({
  console,URL,Headers,Response,FormData,Blob,AbortController,AbortSignal,Event,TypeError,setTimeout,clearTimeout,
  localStorage:storage,window:{location:{hostname:'example.test',origin:'https://example.test'},dispatchEvent:event=>events.push(event.type)},
  fetch:async(url,options={})=>{calls.push({url,...options});if(transport.error)throw transport.error;return transport.response?.clone()||new Response(JSON.stringify({success:true,data:[]}),{headers:{'Content-Type':'application/json'}});}
 });
 const cache=new Map();
 function load(file){
  if(cache.has(file))return cache.get(file);
  let source=fs.readFileSync(file,'utf8').replace(/import\s+\{[^}]*\}\s+from\s+['"][^'"]*\/types['"];?/g,'');
  source=stripTypeScriptTypes(source,{mode:'transform'});
  const module=new vm.SourceTextModule(source,{context,identifier:pathToFileURL(file).href,initializeImportMeta:meta=>{meta.env={VITE_API_BASE_URL:'/api'};}});
  cache.set(file,module);return module;
 }
 const module=load(path.join(root,entry));
 await module.link((specifier,parent)=>{
  const base=path.resolve(path.dirname(fileURLToPath(parent.identifier)),specifier);
  const file=[base+'.ts',path.join(base,'index.ts'),base].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile());
  if(!file)throw new Error('Missing import '+specifier);
  return load(file);
 });
 await module.evaluate();
 return {api:module.namespace,storage,values,events,calls,transport};
}
test('password hashing uses unique salts, verifies correctly and rejects invalid inputs',async()=>{
 const one=await hashPassword('A-strong-password-123');
 const two=await hashPassword('A-strong-password-123');
 assert.notEqual(one,two);
 assert.ok(await verifyPassword('A-strong-password-123',one));
 assert.equal(await verifyPassword('wrong',one),false);
 assert.equal(await verifyPassword('anything','dev-token-admin'),false);
 await assert.rejects(hashPassword('123456'));
});
test('server enforces exactly the existing frontend workflow matrix',async()=>{
 const {api}=await frontend('src/services/workflowEngine.ts');
 const statuses=Object.keys(transitions);
 for(const from of statuses)for(const to of statuses)for(const role of ['USER','ADMIN']){
  const allowed=api.canTransition(from,to,role);
  if(allowed)assert.doesNotThrow(()=>assertWorkflowTransition(from,to,role),from+' -> '+to+' '+role);
  else assert.throws(()=>assertWorkflowTransition(from,to,role),from+' -> '+to+' '+role);
 }
 assert.equal(api.normalizeStatus('EVIDENCE_UPLOADED'),'PENDING_SIGNED_REVIEW');
 assert.equal(api.normalizeStatus('SCHOOL_PROCESSING'),'WAITING_RECTOR_SIGNATURE');
});
test('schema verifier includes the numbered 1a/2a columns',()=>{
 const dossiers=schemaTables().find(table=>table.name==='dossiers');
 for(const key of ['status_1a','status_2a','form_data_1a','form_data_2a','rejection_reason_1a','rejection_reason_2a'])assert.ok(dossiers.columns.includes(key));
});
test('Google origin validation distinguishes localhost, LAN IP and HTTPS domain',async()=>{
 const {api}=await frontend('src/utils/googleAuth.ts');
 for(const origin of ['http://localhost:5001','http://127.0.0.1:5001','https://cgcn.example.com','https://temporary-cgcn.trycloudflare.com'])assert.equal(api.getGoogleOriginIssue(origin),null);
 for(const origin of ['http://192.168.2.2:5001','https://192.168.2.2:5001','http://cgcn.example.com','https://server.local','invalid'])assert.ok(api.getGoogleOriginIssue(origin));
});
test('upload paths cannot escape persistent storage',()=>{
 assert.equal(publicUploadUrl('server/uploads/pdf/old.pdf'),'/uploads/pdf/old.pdf');
 assert.equal(publicUploadUrl('uploads/pdf/old.pdf'),'/uploads/pdf/old.pdf');
 assert.equal(resolveUploadAbsolutePath('../../outside.txt'),null);
 assert.equal(resolveUploadAbsolutePath('C:/Windows/win.ini'),null);
 assert.equal(resolveUploadAbsolutePath('/uploads/../../outside.txt'),null);
 assert.equal(resolveUploadAbsolutePath('/uploads/pdf/valid.pdf'),path.join(config.uploadDir,'pdf','valid.pdf'));
});
test('API failure cannot create a local successful dossier or a demo login',async()=>{
 const client=await frontend();
 client.storage.setItem('ctump_dossiers_cache_v3','[{"id":"old-local-only-data"}]');
 client.transport.error=new TypeError('Network down');
 await assert.rejects(client.api.createApplication({formData:{full_name:'Audit'}}),/kiểm tra danh sách hồ sơ/);
 await assert.rejects(client.api.login('admin@example.test',{password:'bad'}));
 await assert.rejects(client.api.getAllApplications());
 assert.equal(client.storage.getItem('ctump_dossiers_cache_v3'),'[{"id":"old-local-only-data"}]');
 assert.equal(client.api.getAuthToken(),null);
});
test('HTTP authorization and storage errors propagate instead of local fallback',async()=>{
 for(const status of [401,403,500,503]){
  const client=await frontend();
  client.transport.response=new Response(JSON.stringify({success:false,message:'Expected error'}),{status});
  await assert.rejects(client.api.updateDossierFields('dossier',{title:'Changed'}),error=>error.status===status);
  assert.equal(client.storage.getItem('ctump_dossiers_cache_v3'),null);
 }
});
test('tokens are sent only to the configured API origin',async()=>{
 const client=await frontend();client.api.setAuthToken('test-token');
 await client.api.authorizedFetch('https://unrelated.invalid/file.pdf');
 assert.equal(client.calls[0].headers.has('Authorization'),false);
 await client.api.authorizedFetch('/uploads/pdf/file.pdf');
 assert.equal(client.calls[1].headers.get('Authorization'),'Bearer test-token');
});
test('expired sessions clear the token and notify the auth provider',async()=>{
 const client=await frontend();client.api.setAuthToken('expired-token');
 client.transport.response=new Response(JSON.stringify({success:false}),{status:401});
 await client.api.authorizedFetch('/api/applications');
 assert.equal(client.api.getAuthToken(),null);
 assert.deepEqual(client.events,['ctump-auth-expired']);
});
test('multipart upload preserves browser boundary and transmits actual file bytes',async()=>{
 const client=await frontend();
 client.transport.response=new Response(JSON.stringify({success:true,data:{id:'saved'}}));
 // Data URLs are resolved by the native fetch in the browser; use an already uploaded reference here.
 const data=new FormData();data.append('file',new Blob(['%PDF-fixture'],{type:'application/pdf'}),'signed.pdf');
 await client.api.request('/api/applications/id/confirm-signed',{method:'POST',body:data});
 assert.equal(client.calls[0].headers.has('Content-Type'),false);
 assert.equal(client.calls[0].body,data);
});

test('signed upload sends explicit 1a/2a fields and keeps PDF evidence separate',async()=>{
 const client=await frontend();
 const first=new Blob(['%PDF-first'],{type:'application/pdf'}),second=new Blob(['%PDF-second'],{type:'application/pdf'}),proof=new Blob(['%PDF-proof'],{type:'application/pdf'});
 await client.api.uploadFacultySignature('dossier',{signed1a:{name:'1a.pdf',url:'',file:first},signed2a:{name:'2a.pdf',url:'',file:second},evidenceFiles:[{name:'proof.pdf',url:'',file:proof},{name:'kept.png',url:'/uploads/evidence/kept.png'}]});
 const body=client.calls[0].body;
 assert.equal(client.calls[0].headers.has('Content-Type'),false);
 assert.equal(body.get('signed1a').name,'1a.pdf');assert.equal(body.get('signed2a').name,'2a.pdf');
 assert.equal(body.getAll('evidence').length,1);assert.equal(body.get('evidence').name,'proof.pdf');
 assert.equal(await body.get('signed1a').text(),'%PDF-first');
 assert.equal(body.get('retainedEvidence'),'[{"url":"/uploads/evidence/kept.png"}]');
});

test('signed upload return notice follows the latest upload event without changing form approval',async()=>{
 const {api}=await frontend('src/utils/signedUploads.ts');
 const returned={id:'return-1',type:'SIGNED_UPLOAD_RETURNED',note:'Minh chứng không rõ',timestamp:'2026-11-19T00:00:00Z'};
 const dossier={status:'VALIDATED',status_1a:'APPROVED',status_2a:'APPROVED',timeline_logs:[returned],department_signed_files:[{name:'1a.pdf',url:'/uploads/signed/1a.pdf',form:'1a'},{name:'2a.pdf',url:'/uploads/signed/2a.pdf',form:'2a'}],evidence_files:[{name:'proof.pdf',url:'/uploads/evidence/proof.pdf',type:'EVIDENCE'}]};
 assert.equal(api.signedUploadReturn(dossier).note,'Minh chứng không rõ');
 assert.equal(api.currentSignedPacket(dossier).signed2a.name,'2a.pdf');assert.equal(api.currentSignedPacket(dossier).evidence.length,1);
 dossier.timeline_logs.push({id:'upload-2',type:'SIGNED_UPLOAD_SUBMITTED'});dossier.status='PENDING_SIGNED_REVIEW';
 assert.equal(api.signedUploadReturn(dossier),undefined);assert.equal(api.signedUploadEvents(dossier).length,2);
 assert.equal(dossier.status_1a,'APPROVED');assert.equal(dossier.status_2a,'APPROVED');
});
test('server data remains authoritative when there is stale local browser data',async()=>{
 const client=await frontend();
 client.storage.setItem('ctump_dossiers_cache_v3','[{"id":"stale"}]');
 const result=await client.api.getAllApplications();
 assert.equal(result.length,0);
 assert.equal(client.storage.getItem('ctump_dossiers_cache_v3'),'[{"id":"stale"}]');
});
