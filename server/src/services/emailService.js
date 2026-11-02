import { emailRepository } from '../repositories/emailRepository.js';
import { isDbConnected } from '../utils/db.js';
import { sendWorkflowEmail } from '../utils/mailer.js';

export const emailService = {
  // Lấy danh sách email đã gửi (toàn bộ hoặc theo dossierId)
  async getAll(dossierId = null) {
    if (dossierId) {
      return emailRepository.findByDossierId(dossierId);
    }
    return emailRepository.findAll();
  },

  /**
   * Gửi thông báo Gmail qua SMTP thật có hỗ trợ attachments và lưu nhật ký vào database
   */
  async sendEmail({
    dossierId,
    recipientEmail,
    recipientName,
    subject,
    content,
    stepName,
    attachments = [],
  }) {
    // 1. Thực hiện gửi mail qua SMTP thật (hoặc simulated an toàn nếu chưa có credentials)
    const mailResult = await sendWorkflowEmail({
      to: recipientEmail,
      subject,
      html: content,
      attachments,
    });

    // 2. Lưu nhật ký email
    const emailId = `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const emailRecord = {
      id: emailId,
      dossierId,
      recipientEmail,
      recipientName: recipientName || recipientEmail,
      subject,
      content,
      stepName: stepName || 'Thông báo hệ thống',
      status: mailResult.success ? 'SENT' : 'FAILED',
      sentAt: new Date().toISOString(),
      attachmentsCount: attachments.length,
      simulated: mailResult.simulated || false,
    };

    try {
      await emailRepository.create({
        id: emailId,
        dossierId,
        recipientEmail,
        recipientName: recipientName || recipientEmail,
        subject,
        content,
        stepName: stepName || 'Thông báo hệ thống',
        status: mailResult.success ? 'SENT' : 'FAILED',
      });
    } catch (err) {
      console.error('[emailService] Lỗi khi lưu nhật ký email:', err.message);
    }

    return emailRecord;
  },
};
