import { randomUUID } from 'node:crypto';
import { query, execute } from '../utils/db.js';
import { AuditModel } from '../models/auditModel.js';

export const auditRepository = {
  // Ghi nhật ký xử lý mới
  async create(log) {
    const id = log.id || 'aud-'+randomUUID();
    const newLog = {
      id,
      dossierId: log.dossierId || log.dossier_id,
      actorId: log.actorId || log.actor_id || 'usr-system',
      actorName: log.actorName || log.actor_name || 'Hệ thống',
      actorRole: log.actorRole || log.actor_role || 'SYSTEM',
      action: log.action,
      fromStatus: log.fromStatus || log.from_status || null,
      toStatus: log.toStatus || log.to_status || null,
      notes: log.notes || '',
      createdAt: new Date().toISOString(),
    };

    try {
      await execute(`
        INSERT INTO audit_logs (id, dossier_id, actor_id, actor_name, actor_role, action, from_status, to_status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        newLog.dossierId,
        newLog.actorId,
        newLog.actorName,
        newLog.actorRole,
        newLog.action,
        newLog.fromStatus,
        newLog.toStatus,
        newLog.notes,
        new Date(),
      ]);
      return newLog;
    } catch (error) { throw error; }
  },

  // Lấy danh sách lịch sử theo ID hồ sơ
  async findByDossierId(dossierId) {

    try {
      const rows = await query(`
        SELECT * FROM audit_logs 
        WHERE dossier_id = ?
        ORDER BY created_at ASC
      `, [dossierId]);

      if (!rows || rows.length === 0) return [];
      return rows.map((r) => AuditModel.fromRow(r).toObject());
    } catch (error) { throw error; }
  },

  // Lấy tất cả lịch sử
  async findAll() {

    try {
      const rows = await query(`
        SELECT a.*, d.code as dossier_code, d.title as dossier_title
        FROM audit_logs a
        LEFT JOIN dossiers d ON a.dossier_id = d.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `);

      if (!rows || rows.length === 0) return [];
      return rows.map((r) => AuditModel.fromRow(r).toObject());
    } catch (error) { throw error; }
  },
};
