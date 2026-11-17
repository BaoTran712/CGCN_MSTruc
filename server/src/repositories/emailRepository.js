import { randomUUID } from 'node:crypto';
import { query, execute } from '../utils/db.js';
import { EmailModel } from '../models/emailModel.js';

export const emailRepository = {
  // Ghi nhật ký email
  async create(emailLog) {
    const id = emailLog.id || 'em-'+randomUUID();
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
    } catch (error) { throw error; }
  },

  // Lấy danh sách email theo hồ sơ
  async findByDossierId(dossierId) {

    try {
      const rows = await query(`
        SELECT * FROM email_notifications 
        WHERE dossier_id = ?
        ORDER BY sent_at DESC
      `, [dossierId]);

      if (!rows || rows.length === 0) return [];
      return rows.map((r) => EmailModel.fromRow(r).toObject());
    } catch (error) { throw error; }
  },

  // Lấy tất cả email
  async findAll() {

    try {
      const rows = await query(`
        SELECT e.*, d.code as dossier_code
        FROM email_notifications e
        LEFT JOIN dossiers d ON e.dossier_id = d.id
        ORDER BY e.sent_at DESC
        LIMIT 100
      `);

      if (!rows || rows.length === 0) return [];
      return rows.map((r) => EmailModel.fromRow(r).toObject());
    } catch (error) { throw error; }
  },
};
