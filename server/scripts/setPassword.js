import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/utils/passwords.js';
import { initDb, query, execute, pool, transaction } from '../src/config/database.js';

const emailIndex = process.argv.indexOf('--email');
const email = String(process.argv[emailIndex + 1] || '').trim().toLowerCase();
const roleIndex = process.argv.indexOf('--role');
const role = roleIndex > -1 ? process.argv[roleIndex + 1] : 'USER';
async function readPassword() {
  if (process.env.INITIAL_PASSWORD) return process.env.INITIAL_PASSWORD;
  if (!process.stdin.isTTY) {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    return input.trimEnd();
  }
  process.stdout.write('Mật khẩu mới (tối thiểu 12 ký tự): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let text = '';
    const onData = chunk => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { cleanup(); reject(new Error('Đã hủy.')); return; }
        if (char === '\r' || char === '\n') { cleanup(); resolve(text); return; }
        if (char === '\u007f' || char === '\b') text = text.slice(0,-1);
        else text += char;
      }
    };
    const cleanup = () => { process.stdin.off('data',onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    process.stdin.on('data',onData);
  });
}
try {
  if (emailIndex < 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Dùng: npm run user:password -- --email email@domain [--role ADMIN|USER cho tài khoản mới]');
  if (!['ADMIN','USER'].includes(role)) throw new Error('Vai trò không hợp lệ.');
  await initDb();
  const password = await readPassword();
  const hash = await hashPassword(password);
  await transaction(async () => {
    let [user] = await query('SELECT id,role FROM users WHERE LOWER(email)=? FOR UPDATE',[email]);
    if (!user) {
      user = { id: 'usr-' + randomUUID() };
      await execute('INSERT INTO users (id,email,name,role) VALUES (?,?,?,?)',[user.id,email,email.split('@')[0],role]);
    }
    await execute('INSERT INTO auth_credentials (user_id,password_hash,token_version) VALUES (?,?,1) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash),token_version=token_version+1',[user.id,hash]);
  });
  console.log('Đã thiết lập mật khẩu và thu hồi các phiên cũ. Quyền của tài khoản hiện có được giữ nguyên.');
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { await pool.end(); }
