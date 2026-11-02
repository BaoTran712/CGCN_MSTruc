import { isDbConnected } from '../config/database.js';

const inMemoryEmailLogs = [];

export const emailRepository = {
  async create(emailLog) {
    const id = emailLog.id || `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const record = {
      id,
      dossierId: emailLog.dossierId || emailLog.dossier_id || null,
      recipientEmail: emailLog.recipientEmail || emailLog.recipient_email,
      recipientName: emailLog.recipientName || emailLog.recipient_name,
      subject: emailLog.subject,
      content: emailLog.content,
      stepName: emailLog.stepName || emailLog.step_name || 'Thông báo hệ thống',
      status: emailLog.status || 'SENT',
      sentAt: new Date().toISOString(),
    };
    inMemoryEmailLogs.unshift(record);
    return record;
  },

  async findByDossierId(dossierId) {
    return inMemoryEmailLogs.filter((e) => e.dossierId === dossierId);
  },

  async findAll() {
    return inMemoryEmailLogs.slice(0, 100);
  },
};
