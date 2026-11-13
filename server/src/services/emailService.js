import nodemailer from 'nodemailer';
import { emailRepository } from '../repositories/emailRepository.js';
import { isDbConnected } from '../utils/db.js';
import { sendWorkflowEmail } from '../utils/mailer.js';
import { config } from '../utils/config.js';

let transporter = null;
let lastUser = null;
let lastPass = null;

function getTransporter() {
  const currentHost = config.smtp.host;
  const currentPort = config.smtp.port;
  const currentSecure = config.smtp.secure;
  const currentUser = config.smtp.user?.trim();
  const currentPass = config.smtp.pass?.trim();

  if (!currentUser || !currentPass) {
    return null;
  }

  if (!transporter || lastUser !== currentUser || lastPass !== currentPass) {
    transporter = nodemailer.createTransport({
      host: currentHost,
      port: currentPort,
      secure: currentSecure,
      auth: {
        user: currentUser,
        pass: currentPass,
      },
    });
    lastUser = currentUser;
    lastPass = currentPass;
  }

  return transporter;
}

/**
 * Tạo template HTML chuẩn thương hiệu Đại học Y Dược Cần Thơ (CTUMP DocuGov)
 */
function buildHtmlEmail({
  recipientName,
  stepName,
  subject,
  content,
  actionUrl,
  dossierCode,
}) {
  const primaryColor = '#0284c7';
  const displayUrl = actionUrl || config.appUrl;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Thông báo từ CTUMP DocuGov'}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
    }
    .wrapper {
      width: 100%;
      background-color: #f1f5f9;
      padding: 30px 10px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      padding: 26px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.92;
    }
    .body {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 15px;
      margin-top: 0;
      margin-bottom: 16px;
      color: #1e293b;
    }
    .step-badge {
      display: inline-block;
      background-color: #e0f2fe;
      color: #0369a1;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .card {
      background-color: #f8fafc;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0 24px 0;
    }
    .card-content {
      font-size: 14px;
      line-height: 1.65;
      color: #334155;
      white-space: pre-line;
    }
    .cta-container {
      text-align: center;
      margin: 28px 0 20px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 18px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer strong {
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ</h1>
        <p>Hệ thống Quản lý Hồ sơ Chuyển giao Công nghệ (CTUMP DocuGov)</p>
      </div>
      <div class="body">
        <p class="greeting">Kính gửi <strong>${recipientName || 'Thầy/Cô'}</strong>,</p>
        <span class="step-badge">${stepName || 'Thông báo trạng thái'}</span>
        <div class="card">
          <div class="card-content">${content}</div>
        </div>
        ${
          displayUrl
            ? `
        <div class="cta-container">
          <a href="${displayUrl}" class="cta-button" target="_blank">Truy cập Xem Chi Tiết Hồ Sơ</a>
        </div>
        `
            : ''
        }
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;"><strong>Phòng Khoa học Công nghệ & Hợp tác Quốc tế</strong></p>
        <p style="margin: 0 0 8px 0;">Trường Đại học Y Dược Cần Thơ — Số 179, đường Nguyễn Văn Cừ, P. An Khánh, Q. Ninh Kiều, TP. Cần Thơ</p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">Email này được gửi tự động từ hệ thống. Vui lòng không trả lời trực tiếp email này.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const emailService = {
  // Lấy danh sách email đã gửi (toàn bộ hoặc theo dossierId)
  async getAll(dossierId = null) {
    if (dossierId) {
      return emailRepository.findByDossierId(dossierId);
    }
    return emailRepository.findAll();
  },

  /**
   * Kiểm tra kết nối SMTP Transporter
   */
  async verifyConnection() {
    const client = getTransporter();
    if (!client) {
      return {
        success: false,
        message: 'Chưa cấu hình tài khoản SMTP (SMTP_USER hoặc SMTP_PASS còn trống trong .env)',
      };
    }

    try {
      await client.verify();
      return {
        success: true,
        message: 'Kết nối máy chủ SMTP thành công!',
      };
    } catch (err) {
      return {
        success: false,
        message: `Kết nối SMTP thất bại: ${err.message}`,
      };
    }
  },

  /**
   * Gửi thông báo Email qua SMTP có hỗ trợ attachments và lưu nhật ký vào database
   * @param {Object} options
   * @param {string} options.dossierId - ID hồ sơ
   * @param {string} options.recipientEmail - Email người nhận
   * @param {string} options.recipientName - Tên người nhận
   * @param {string} options.subject - Tiêu đề email
   * @param {string} options.content - Nội dung thông báo
   * @param {string} options.stepName - Tên bước quy trình
   * @param {Array} [options.attachments] - Danh sách tệp đính kèm
   * @param {string} [options.actionUrl] - Đường dẫn xem hồ sơ
   * @param {string} [options.dossierCode] - Mã hồ sơ CGCN
   */
  async sendEmail({
    dossierId,
    recipientEmail,
    recipientName,
    subject,
    content,
    stepName,
    attachments = [],
    actionUrl,
    dossierCode,
  }) {
    const targetEmail = (recipientEmail || '').trim();
    if (!targetEmail) {
      console.warn('[emailService] Không thể gửi email: recipientEmail bị trống.');
      return null;
    }

    const emailContent =
      typeof content === 'string' && (content.includes('<div') || content.includes('<html'))
        ? content
        : buildHtmlEmail({
            recipientName,
            stepName,
            subject,
            content,
            actionUrl,
            dossierCode,
          });

    // 1. Thực hiện gửi mail qua SMTP thật (hoặc simulated an toàn nếu chưa có credentials)
    const mailResult = await sendWorkflowEmail({
      to: targetEmail,
      subject,
      html: emailContent,
      attachments,
    });

    // 2. Lưu nhật ký email
    const emailId = `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const emailRecord = {
      id: emailId,
      dossierId,
      recipientEmail: targetEmail,
      recipientName: recipientName || targetEmail,
      subject,
      content,
      stepName: stepName || 'Thông báo hệ thống',
      status: mailResult.success ? 'SENT' : 'FAILED',
      sentAt: new Date().toISOString(),
      attachmentsCount: attachments.length,
      simulated: mailResult.simulated || false,
    };

    if (isDbConnected()) {
      try {
        await emailRepository.create({
          id: emailId,
          dossierId,
          recipientEmail: targetEmail,
          recipientName: recipientName || targetEmail,
          subject,
          content,
          stepName: stepName || 'Thông báo hệ thống',
          status: mailResult.success ? 'SENT' : 'FAILED',
        });
      } catch (err) {
        console.error('[emailService] Lỗi khi lưu nhật ký email:', err.message);
      }
    }

    return emailRecord;
  },
};
