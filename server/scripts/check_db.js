import { checkDb, pool } from '../src/config/database.js';
try {
  await checkDb();
  console.log('MySQL và schema sẵn sàng. Kiểm tra chỉ đọc, không khởi tạo hoặc thay đổi dữ liệu.');
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { await pool.end(); }
