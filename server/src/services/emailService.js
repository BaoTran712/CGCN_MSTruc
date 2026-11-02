import { emailRepository } from '../repositories/emailRepository.js';

export const emailService = {
  async getAll(dossierId = null) {
    if (dossierId) {
      return emailRepository.findByDossierId(dossierId);
    }
    return emailRepository.findAll();
  },

  async sendEmail({
    dossierId,
    recipientEmail,
    recipientName,
    subject,
    content,
    stepName,
  }) {
    const emailRecord = await emailRepository.create({
      dossierId,
      recipientEmail,
      recipientName,
      subject,
      content,
      stepName: stepName || 'Thông báo hệ thống',
      status: 'SENT',
    });

    console.log(
      `[Email Automated Notification] Đã gửi tới ${recipientEmail} [${stepName}]: "${subject}"`
    );
    return emailRecord;
  },
};
