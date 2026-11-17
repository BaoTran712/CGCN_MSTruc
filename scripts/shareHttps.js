import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { readProcessIdentity, matchesTunnelProcess } from './lib/processIdentity.js';

const root=path.resolve(import.meta.dirname,'..');
const local=path.join(root,'.local');
const manifestPath=path.join(local,'tunnel-process.json');
const releasePath=path.join(local,'cloudflared-release.json');
const binary=path.join(local,'bin','cloudflared.exe');
if(!fs.existsSync(releasePath)||!fs.existsSync(binary))throw new Error('Chưa có cloudflared đã xác minh trong .local/bin. Xem docs/google-oauth-https.md.');
const release=JSON.parse(fs.readFileSync(releasePath,'utf8'));
if(createHash('sha256').update(fs.readFileSync(binary)).digest('hex')!==release.sha256)throw new Error('Checksum cloudflared không khớp.');
let state=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const actual=state.pid?await readProcessIdentity(Number(state.pid)):null;
const running=matchesTunnelProcess(state,actual,binary);
if(running)state.processStartedAt=actual.startedAt;
if(!running){
  const out=fs.openSync(path.join(local,'tunnel.stdout.log'),'w');
  const err=fs.openSync(path.join(local,'tunnel.stderr.log'),'w');
  const child=spawn(binary,['--no-autoupdate','tunnel','--url','http://127.0.0.1:5001','--protocol','http2'],{
    cwd:root,detached:true,windowsHide:true,stdio:['ignore',out,err],
  });
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});
  child.unref();fs.closeSync(out);fs.closeSync(err);
  state={pid:child.pid,backend:'http://127.0.0.1:5001',startedAt:new Date().toISOString(),version:release.version};
  fs.writeFileSync(manifestPath,JSON.stringify(state,null,2));
  const identity=await readProcessIdentity(child.pid);
  if(identity)state.processStartedAt=identity.startedAt;
  fs.writeFileSync(manifestPath,JSON.stringify(state,null,2));
}
let url=state.url;
for(let attempt=0;!url&&attempt<60;attempt++){
 const logs=['tunnel.stderr.log','tunnel.stdout.log'].map(name=>{try{return fs.readFileSync(path.join(local,name),'utf8');}catch{return '';}}).join('\n');
 url=[...logs.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/g)].find(match=>!['api','www'].includes(match[1]))?.[0];
 if(!url)await delay(1000);
}
if(!url)throw new Error('Chưa nhận được URL. Xem .local/tunnel.stderr.log; không tạo tunnel thứ hai khi tiến trình đang chạy.');
state.url=url;fs.writeFileSync(manifestPath,JSON.stringify(state,null,2));
const file=path.join(root,'server','.env');
let content=fs.readFileSync(file,'utf8');
const existing=content.match(/^APP_URL\s*=\s*(.*)$/m)?.[1]?.trim();
if(existing && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(existing) && !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com\/?$/.test(existing) && existing!==url)throw new Error('APP_URL đã dùng một tên miền khác. Không tự thay thế cấu hình đó.');
function setValue(key,value){
 const pattern=new RegExp('^'+key+'\\s*=.*$','m');
 if(pattern.test(content))content=content.replace(pattern,()=>key+'='+value);
 else content+='\n'+key+'='+value+'\n';
}
setValue('APP_URL',url);
const origins=new Set((content.match(/^ALLOWED_ORIGINS\s*=\s*(.*)$/m)?.[1]||'').split(',').map(value=>value.trim()).filter(Boolean));
for(const origin of origins)if(/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)&&origin!==url)origins.delete(origin);
origins.add(url);setValue('ALLOWED_ORIGINS',[...origins].join(','));
fs.writeFileSync(file,content);
const clientId=content.match(/^GOOGLE_CLIENT_ID\s*=\s*(.*)$/m)?.[1]?.trim()||'';
fs.writeFileSync(path.join(local,'google-origins.txt'),[
 'Client ID: '+clientId,
 '',
 'Thêm các dòng sau vào Authorized JavaScript origins của đúng OAuth client:',
 'http://localhost',
 'http://localhost:5001',
 url,
 '',
 'Không xóa origin của project khác. Không thêm IP LAN. Không thêm đường dẫn /api.',
 'Sau khi lưu, mở cùng URL HTTPS trên cả hai máy. Khởi động lại backend sau khi APP_URL thay đổi.',
 'URL này là đường hầm kiểm thử tạm; thay đổi khi tạo một tunnel mới.',
].join('\n'));
console.log('URL HTTPS: '+url);
console.log('OAuth origin: '+url);
console.log('Hướng dẫn sao chép: '+path.join(local,'google-origins.txt'));
console.log('Đã cập nhật APP_URL/ALLOWED_ORIGINS. Backend cần được khởi động lại để nạp cấu hình.');
