import { spawn } from 'child_process';
import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

console.log('=======================================================');
console.log('  CTUMP DocuGov - Khởi động đồng thời Frontend & Backend');
console.log(`  - Máy bạn (Local):   http://localhost:3000`);
console.log(`  - Cùng Wi-Fi (LAN):  http://${localIp}:3000`);
console.log(`  - Backend API:       http://${localIp}:5001/api/status`);
console.log('=======================================================\n');

<<<<<<< HEAD
// 1. Chạy Backend NodeJS Server (Port 5000) với chế độ tự động tải lại khi sửa code
const server = spawn('node', ['--watch', 'server/src/server.js'], {
=======
// 1. Chạy Backend NodeJS Server (Port 5001)
const server = spawn('node', ['server/src/server.js'], {
>>>>>>> origin/main
  stdio: 'inherit',
  shell: true,
});

// 2. Chạy Frontend Vite Dev Server (Port 3000)
const client = spawn('npx', ['vite', '--port=3000', '--host=0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
});

const cleanup = () => {
  console.log('\nĐang dừng các dịch vụ...');
  try {
    server.kill();
    client.kill();
  } catch (e) {
    // ignore
  }
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
