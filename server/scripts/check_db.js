import { initDb, isDbConnected, query } from '../src/utils/db.js';

async function checkDatabase() {
  console.log('=======================================================');
  console.log('       KIỂM TRA TRẠNG THÁI DATABASE MYSQL CTUMP');
  console.log('=======================================================');

  try {
    console.log('⏳ Đang kết nối tới MySQL localhost:3306...');
    await initDb();

    if (isDbConnected()) {
      console.log('✅ KẾT NỐI DATABASE THÀNH CÔNG (ONLINE)!\n');

      // 1. Thông tin hệ thống
      const [sysInfo] = await query('SELECT DATABASE() as db, VERSION() as version, NOW() as currentTime');
      console.log(`- Database hiện tại : ${sysInfo.db}`);
      console.log(`- Phiên bản MySQL   : ${sysInfo.version}`);
      console.log(`- Giờ máy chủ CSDL  : ${new Date(sysInfo.currentTime).toLocaleString('vi-VN')}`);
      console.log('-------------------------------------------------------');

      // 2. Thống kê bảng
      const tables = await query('SHOW TABLES');
      console.log(`📊 Tổng số bảng: ${tables.length} bảng`);

      const [users] = await query('SELECT COUNT(*) as count FROM users');
      const [dossiers] = await query('SELECT COUNT(*) as count FROM dossiers');
      const [templates] = await query('SELECT COUNT(*) as count FROM document_templates');
      const [emails] = await query('SELECT COUNT(*) as count FROM email_notifications');

      console.log(`  + Người dùng (users)            : ${users.count}`);
      console.log(`  + Biểu mẫu (document_templates) : ${templates.count}`);
      console.log(`  + Hồ sơ CGCN (dossiers)         : ${dossiers.count}`);
      console.log(`  + Nhật ký Email (email_logs)    : ${emails.count}`);
      console.log('-------------------------------------------------------');

      // 3. Kiểm tra danh sách Admin
      const admins = await query("SELECT email, name, role FROM users WHERE role = 'ADMIN'");
      console.log('👑 Danh sách Quản trị viên (Admin) trong database:');
      admins.forEach((admin, i) => {
        console.log(`  ${i + 1}. ${admin.email} — ${admin.name}`);
      });

      console.log('=======================================================');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ KHÔNG THỂ KẾT NỐI TỚI DATABASE MYSQL!');
    console.error(`Chi tiết lỗi: ${error.message}\n`);
    console.error('👉 Gợi ý kiểm tra:');
    console.error('  1. Đảm bảo dịch vụ MySQL (hoặc XAMPP / Homebrew / Docker) đang chạy.');
    console.error('  2. Kiểm tra thông tin trong file server/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD).');
    console.error('=======================================================');
    process.exit(1);
  }
}

checkDatabase();

