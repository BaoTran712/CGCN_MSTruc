import { sendWorkflowEmail } from '../src/utils/mailer.js';
import { config } from '../src/utils/config.js';

console.log('=== KIỂM TRA CẤU HÌNH GỬI MAIL ===');
console.log('SMTP Host:', config.smtp.host);
console.log('SMTP Port:', config.smtp.port);
console.log('SMTP User:', config.smtp.user ? config.smtp.user : '(Chưa cấu hình - ĐANG TRỐNG)');
console.log('SMTP Pass:', config.smtp.pass ? '******' : '(Chưa cấu hình - ĐANG TRỐNG)');
console.log('Admin Notification Email:', config.smtp.adminNotificationEmail);

console.log(`\n--- Thử nghiệm gửi email tới ${config.smtp.adminNotificationEmail} ---`);
const result = await sendWorkflowEmail({
  to: config.smtp.adminNotificationEmail,
  subject: '[Test] Thử nghiệm gửi email hệ thống CTUMP DocuGov',
  html: '<p>Đây là email kiểm tra hệ thống.</p>',
});

console.log('\nKết quả:', result);

