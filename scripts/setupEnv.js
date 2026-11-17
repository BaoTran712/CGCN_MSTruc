import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
for(const [file,example]of [['.env','.env.example'],['server/.env','server/.env.example']])if(!fs.existsSync(file))fs.copyFileSync(example,file);
let content=fs.readFileSync('server/.env','utf8');
const value=content.match(/^JWT_SECRET\s*=\s*(.*)$/m)?.[1]?.trim();
if(!value||value.length<32||value.includes('dev-only')){
  content=content.replace(/^JWT_SECRET\s*=.*\r?\n?/m,'');
  content+='\nJWT_SECRET='+randomBytes(48).toString('hex')+'\n';
  fs.writeFileSync('server/.env',content);
}
console.log('Đã chuẩn bị .env; giữ nguyên cấu hình hiện có và tạo JWT_SECRET nếu chưa có.');
