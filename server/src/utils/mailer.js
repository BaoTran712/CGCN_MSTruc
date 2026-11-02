import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = config.smtp;

  if (!user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587 with STARTTLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Tránh lỗi self-signed cert trong môi trường dev/local
    },
  });

  return transporter;
}

/**
 * Gửi email thật qua Gmail SMTP có hỗ trợ đính kèm trực tiếp file PDF (attachments).
 * An toàn tuyệt đối: Không làm crash API nếu chưa cấu hình mật khẩu ứng dụng hoặc rớt mạng.
 * 
 * @param {Object} options
 * @param {string} options.to - Địa chỉ email người nhận
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.html - Nội dung HTML
 * @param {string} [options.text] - Nội dung text thuần
 * @param {Array<{ filename: string, path?: string, content?: any, contentType?: string }>} [options.attachments]
 * @returns {Promise<{ success: boolean, simulated: boolean, messageId?: string, error?: string }>}
 */
export async function sendWorkflowEmail({ to, subject, html, text, attachments = [] }) {
  try {
    if (!to) {
      console.warn('[WorkflowMailer] Bỏ qua gửi email do thiếu trường recipient (to)');
      return { success: false, simulated: true, error: 'Thiếu email người nhận' };
    }

    // Lọc và kiểm tra các file đính kèm hợp lệ
    const validAttachments = [];
    for (const att of attachments) {
      if (att.content) {
        validAttachments.push(att);
      } else if (att.path) {
        // Kiểm tra xem path là đường dẫn tuyệt đối hay tương đối
        let resolvedPath = att.path;
        if (!path.isAbsolute(resolvedPath)) {
          resolvedPath = path.resolve(process.cwd(), resolvedPath.replace(/^\//, ''));
        }
        if (fs.existsSync(resolvedPath)) {
          validAttachments.push({
            filename: att.filename || path.basename(resolvedPath),
            path: resolvedPath,
            contentType: att.contentType || 'application/pdf',
          });
        } else {
          console.warn(`[WorkflowMailer] File đính kèm không tồn tại trên đĩa: ${resolvedPath}. Sẽ bỏ qua file này.`);
        }
      }
    }

    const mailClient = getTransporter();

    // Nếu chưa cấu hình SMTP_USER / SMTP_PASS thì ghi log mô phỏng an toàn
    if (!mailClient) {
      console.log(`[WorkflowMailer (Simulated)] Email thông báo gửi tới: <${to}>`);
      console.log(`  -> Tiêu đề: "${subject}"`);
      console.log(`  -> Số tệp đính kèm (PDF): ${validAttachments.length}`);
      console.log(`  -> Lưu ý: Để gửi email thật, vui lòng cấu hình SMTP_USER và SMTP_PASS trong file .env`);
      return {
        success: true,
        simulated: true,
        message: 'Email được ghi nhận thành công (Chế độ mô phỏng - Chưa có credentials SMTP trong .env)',
      };
    }

    // Gửi email thật qua Gmail SMTP
    const mailOptions = {
      from: config.smtp.from,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html,
      attachments: validAttachments,
    };

    const info = await mailClient.sendMail(mailOptions);
    console.log(`[WorkflowMailer (Real SMTP)] Đã gửi email thật thành công tới <${to}> - MessageId: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error(`[WorkflowMailer Error] Lỗi khi gửi mail qua SMTP tới <${to}>:`, err.message);
    // Luôn catch lỗi để không làm crash luồng chuyển trạng thái đơn (True Flow)
    return {
      success: false,
      simulated: false,
      error: err.message,
    };
  }
}

