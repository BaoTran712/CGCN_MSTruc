import { emailRepository } from '../repositories/emailRepository.js';
import { isDbConnected } from '../utils/db.js';

export const emailService = {
  // Lấy danh sách email đã gửi (toàn bộ hoặc theo dossierId)
  async getAll(dossierId = null) {
    if (dossierId) {
      return emailRepository.findByDossierId(dossierId);
    }
    return emailRepository.findAll();
  },

  // Gửi thông báo Gmail và lưu vào database
  async sendEmail({
    dossierId,
    recipientEmail,
    recipientName,
    subject,
    content,
    stepName,
  }) {
    const emailId = `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const emailRecord = {
      id: emailId,
      dossierId,
      recipientEmail,
      recipientName,
      subject,
      content,
      stepName: stepName || 'Thông báo hệ thống',
      status: 'SENT',
      sentAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      try {
        await emailRepository.create({
          id: emailId,
          dossierId,
          recipientEmail,
          recipientName,
          subject,
          content,
          stepName,
          status: 'SENT',
        });
      } catch (err) {
        console.error('[emailService] Lỗi khi lưu nhật ký email:', err.message);
      }
    }

    console.log(`[Gmail Automated Notification] Đã gửi tới ${recipientEmail} [${stepName}]: "${subject}"`);
    return emailRecord;
  },
};
