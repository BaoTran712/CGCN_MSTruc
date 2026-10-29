import { query, execute, isDbConnected } from '../utils/db.js';
import { EmailModel } from '../models/emailModel.js';
import { mockStore } from '../utils/mockStore.js';

export const emailRepository = {
  // Ghi nhật ký email
  async create(emailLog) {
    const id = emailLog.id || `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newLog = {
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

    if (!isDbConnected()) {
      mockStore.emailLogs.unshift(newLog);
      return newLog;
    }

    try {
      await execute(`
        INSERT INTO email_notifications (id, dossier_id, recipient_email, recipient_name, subject, content, step_name, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        newLog.dossierId,
        newLog.recipientEmail,
        newLog.recipientName,
        newLog.subject,
        newLog.content,
        newLog.stepName,
        newLog.status,
        new Date(),
      ]);
      return newLog;
    } catch {
      mockStore.emailLogs.unshift(newLog);
      return newLog;
    }
  },

  // Lấy danh sách email theo hồ sơ
  async findByDossierId(dossierId) {
    if (!isDbConnected()) {
      return mockStore.emailLogs.filter(
        (e) => e.dossierId === dossierId || e.dossier_id === dossierId
      );
    }

    try {
      const rows = await query(`
        SELECT * FROM email_notifications 
        WHERE dossier_id = ?
        ORDER BY sent_at DESC
      `, [dossierId]);

      if (!rows || rows.length === 0) {
        return mockStore.emailLogs.filter(
          (e) => e.dossierId === dossierId || e.dossier_id === dossierId
        );
      }
      return rows.map((r) => EmailModel.fromRow(r).toObject());
    } catch {
      return mockStore.emailLogs.filter(
        (e) => e.dossierId === dossierId || e.dossier_id === dossierId
      );
    }
  },

  // Lấy tất cả email
  async findAll() {
    if (!isDbConnected()) {
      return mockStore.emailLogs.map((e) => ({ ...e }));
    }

    try {
      const rows = await query(`
        SELECT e.*, d.code as dossier_code
        FROM email_notifications e
        LEFT JOIN dossiers d ON e.dossier_id = d.id
        ORDER BY e.sent_at DESC
        LIMIT 100
      `);

      if (!rows || rows.length === 0) {
        return mockStore.emailLogs.map((e) => ({ ...e }));
      }
      return rows.map((r) => EmailModel.fromRow(r).toObject());
    } catch {
      return mockStore.emailLogs.map((e) => ({ ...e }));
    }
  },
};
