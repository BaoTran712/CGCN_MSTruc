import { query, execute } from '../config/database.js';
import { AuditModel } from '../models/auditModel.js';

export const auditRepository = {
  async create(log) {
    const comment = log.comment ?? log.notes ?? null;
    const result = await execute(
      `
      INSERT INTO audit_logs (
        dossier_id, actor_id, actor_name, actor_role,
        action, from_status, to_status, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        log.dossier_id || log.dossierId,
        log.actor_id || log.actorId || 'usr-system',
        log.actor_name || log.actorName || 'Hệ thống',
        log.actor_role || log.actorRole || 'SYSTEM',
        log.action,
        log.from_status || log.fromStatus || null,
        log.to_status || log.toStatus || null,
        comment,
      ]
    );

    return {
      id: result.insertId,
      dossier_id: log.dossier_id || log.dossierId,
      actor_id: log.actor_id || log.actorId || 'usr-system',
      actor_name: log.actor_name || log.actorName || 'Hệ thống',
      actor_role: log.actor_role || log.actorRole || 'SYSTEM',
      action: log.action,
      from_status: log.from_status || log.fromStatus || null,
      to_status: log.to_status || log.toStatus || null,
      comment,
      created_at: new Date().toISOString(),
    };
  },

  async findByDossierId(dossierId) {
    const rows = await query(
      `
      SELECT * FROM audit_logs
      WHERE dossier_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [dossierId]
    );

    return rows.map((r) => AuditModel.fromRow(r).toObject());
  },

  async findAll() {
    const rows = await query(
      `
      SELECT a.*, d.tracking_code AS dossier_code, d.technology_name AS dossier_title
      FROM audit_logs a
      LEFT JOIN dossiers d ON a.dossier_id = d.id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 100
      `
    );

    return rows.map((r) => AuditModel.fromRow(r).toObject());
  },
};
