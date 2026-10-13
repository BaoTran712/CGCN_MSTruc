import { query, execute } from '../utils/db.js';
import { EmailModel } from '../models/emailModel.js';

export const emailRepository = {
  // Ghi nhật ký email
  async create(emailLog) {
    const id = emailLog.id || `em-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await execute(`
      INSERT INTO email_notifications (id, dossier_id, recipient_email, recipient_name, subject, content, step_name, status, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      emailLog.dossierId || emailLog.dossier_id || null,
      emailLog.recipientEmail || emailLog.recipient_email,
      emailLog.recipientName || emailLog.recipient_name,
      emailLog.subject,
      emailLog.content,
      emailLog.stepName || emailLog.step_name || 'Thông báo hệ thống',
      emailLog.status || 'SENT',
      new Date(),
    ]);

    return { id, ...emailLog, sentAt: new Date().toISOString() };
  },

  // Lấy danh sách email theo hồ sơ
  async findByDossierId(dossierId) {
    const rows = await query(`
      SELECT * FROM email_notifications 
      WHERE dossier_id = ?
      ORDER BY sent_at DESC
    `, [dossierId]);

    return rows.map((r) => EmailModel.fromRow(r).toObject());
  },

  // Lấy tất cả email
  async findAll() {
    const rows = await query(`
      SELECT e.*, d.code as dossier_code
      FROM email_notifications e
      LEFT JOIN dossiers d ON e.dossier_id = d.id
      ORDER BY e.sent_at DESC
      LIMIT 100
    `);

    return rows.map((r) => EmailModel.fromRow(r).toObject());
  },
};
