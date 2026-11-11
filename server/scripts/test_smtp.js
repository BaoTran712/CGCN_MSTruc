import { config } from '../src/utils/config.js';
import { emailService } from '../src/services/emailService.js';

async function main() {
  console.log('=======================================================');
  console.log('  CTUMP DocuGov — KIỂM TRA KẾT NỐI MÁY CHỦ GMAIL SMTP');
  console.log('=======================================================');
  console.log(`- SMTP Host:    ${config.smtp.host}`);
  console.log(`- SMTP Port:    ${config.smtp.port} (Secure: ${config.smtp.secure})`);
  console.log(`- SMTP User:    ${config.smtp.user || '(Chưa cấu hình)'}`);
  console.log(`- SMTP Pass:    ${config.smtp.pass ? '****** (Đã nhập)' : '(Chưa cấu hình)'}`);
  console.log(`- Sender Name:  ${config.smtp.from}`);
  console.log('-------------------------------------------------------');

  if (!config.smtp.user || !config.smtp.pass) {
    console.warn('⚠️  CHÚ Ý: Bạn chưa điền SMTP_USER hoặc SMTP_PASS trong file server/.env');
    console.warn('👉 Hãy mở server/.env và điền:');
    console.warn('   SMTP_USER=email_cua_ban@gmail.com');
    console.warn('   SMTP_PASS=xxxx xxxx xxxx xxxx  (Mật khẩu ứng dụng 16 ký tự của Google)');
    console.log('=======================================================');
    process.exit(0);
  }

  console.log('⏳ Đang tiến hành kết nối và xác thực máy chủ SMTP...');
  const verifyRes = await emailService.verifyConnection();

  if (!verifyRes.success) {
    console.error(`❌ Thất bại: ${verifyRes.message}`);
    console.error('👉 Gợi ý khắc phục:');
    console.error('   1. Đảm bảo đã bật "Xác minh 2 bước" (2FA) trên tài khoản Google.');
    console.error('   2. Mật khẩu phải là "Mật khẩu ứng dụng" (App Password) gồm 16 ký tự, KHÔNG dùng mật khẩu đăng nhập thông thường.');
    console.error('   3. Kiểm tra xem có khoảng trắng thừa hay không.');
    process.exit(1);
  }

  console.log(`✅ ${verifyRes.message}`);

  // Tùy chọn gửi email thử nghiệm nếu có đối số dòng lệnh hoặc gửi cho chính SMTP_USER
  const testRecipient = process.argv[2] || config.smtp.user;
  console.log(`\n⏳ Đang thử gửi 1 email mẫu tới: ${testRecipient}...`);

  const sendRes = await emailService.sendEmail({
    recipientEmail: testRecipient,
    recipientName: 'Quý Thầy/Cô (Test SMTP)',
    subject: '[CTUMP DocuGov] Kiểm tra gửi mail tự động qua SMTP thành công',
    content: `Kính gửi Thầy/Cô,\n\nĐây là email kiểm thử kết nối tự động từ hệ thống CTUMP DocuGov.\nKhi cán bộ đăng nhập bằng Google nộp hồ sơ, toàn bộ thông báo tiếp nhận, yêu cầu bổ sung và phê duyệt sẽ được gửi tự động về đúng hộp thư này.\n\nTrân trọng,\nPhòng Khoa học Công nghệ & HTQT`,
    stepName: 'Kiểm thử hệ thống SMTP',
  });

  if (sendRes?.status === 'SENT') {
    console.log(`🎉 THÀNH CÔNG! Đã gửi email đến ${testRecipient}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư Spam nếu có)!`);
  } else {
    console.error(`❌ Không thể gửi email mẫu: Trạng thái ${sendRes?.status}`);
  }

  console.log('=======================================================');
  process.exit(0);
}

main().catch((err) => {
  console.error('Lỗi không xác định:', err);
  process.exit(1);
});

