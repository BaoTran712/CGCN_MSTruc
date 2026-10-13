import { query, execute } from '../utils/db.js';
import { AuditModel } from '../models/auditModel.js';

export const auditRepository = {
  // Ghi nhật ký xử lý mới
  async create(log) {
    const id = log.id || `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await execute(`
      INSERT INTO audit_logs (id, dossier_id, actor_id, actor_name, actor_role, action, from_status, to_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.dossierId || log.dossier_id,
      log.actorId || log.actor_id || 'usr-system',
      log.actorName || log.actor_name || 'Hệ thống',
      log.actorRole || log.actor_role || 'SYSTEM',
      log.action,
      log.fromStatus || log.from_status || null,
      log.toStatus || log.to_status || null,
      log.notes || '',
      new Date(),
    ]);

    return { id, ...log, createdAt: new Date().toISOString() };
  },

  // Lấy danh sách lịch sử theo ID hồ sơ
  async findByDossierId(dossierId) {
    const rows = await query(`
      SELECT * FROM audit_logs 
      WHERE dossier_id = ?
      ORDER BY created_at ASC
    `, [dossierId]);

    return rows.map((r) => AuditModel.fromRow(r).toObject());
  },

  // Lấy tất cả lịch sử
  async findAll() {
    const rows = await query(`
      SELECT a.*, d.code as dossier_code, d.title as dossier_title
      FROM audit_logs a
      LEFT JOIN dossiers d ON a.dossier_id = d.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    return rows.map((r) => AuditModel.fromRow(r).toObject());
  },
};
