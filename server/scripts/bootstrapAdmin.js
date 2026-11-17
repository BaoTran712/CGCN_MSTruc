import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { initDb,pool,query,execute,transaction } from '../src/config/database.js';
import { projectRoot } from '../src/config/env.js';
import { hashPassword } from '../src/utils/passwords.js';
import { config } from '../src/utils/config.js';

try {
  await initDb();
  const file=path.join(projectRoot,'.local','initial-login.txt');
  let initialized=false;
  await transaction(async()=>{
    const admins=await query("SELECT u.id,u.email,c.password_hash FROM users u LEFT JOIN auth_credentials c ON c.user_id=u.id WHERE u.role='ADMIN' AND u.is_active=1 ORDER BY u.created_at,u.id FOR UPDATE");
    const admin=admins.find(user=>user.email.toLowerCase()===config.adminEmail.toLowerCase()) || admins[0];
    if(!admin)throw new Error('Không có tài khoản ADMIN hiện có. Dùng user:password để tạo tài khoản do bạn chỉ định.');
    if(admin.password_hash){console.log('Admin đã có mật khẩu. Không thay đổi mật khẩu hoặc quyền hiện có.');return;}
    const password=randomBytes(24).toString('base64url');
    await execute('INSERT INTO auth_credentials (user_id,password_hash,token_version) VALUES (?,?,0) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)',[admin.id,await hashPassword(password)]);
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,'Thông tin đăng nhập cục bộ được tạo một lần\nURL: http://localhost:'+config.port+'\nEmail: '+admin.email+'\nMật khẩu: '+password+'\n\nFile này không được đưa vào Git. Các tài khoản và quyền cũ không thay đổi.\n',{mode:0o600,flag:'wx'});
    initialized=true;
  });
  if(initialized)console.log('Đã thiết lập mật khẩu ban đầu cho một admin hiện có. Thông tin tại: '+file);
}catch(error){console.error(error.message);process.exitCode=1;}
finally{await pool.end();}
