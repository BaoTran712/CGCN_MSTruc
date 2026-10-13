import { spawn } from 'child_process';

console.log('=======================================================');
console.log('  CTUMP DocuGov - Khởi động đồng thời Frontend & Backend');
console.log('  1. Backend NodeJS API: http://localhost:5000');
console.log('  2. Frontend React Client: http://localhost:3000');
console.log('=======================================================\n');

// 1. Chạy Backend NodeJS Server (Port 5000)
const server = spawn('node', ['server/src/server.js'], {
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
