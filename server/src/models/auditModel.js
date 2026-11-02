/**
 * Model Entity đại diện cho bảng audit_logs trong MySQL
 */
export class AuditModel {
  constructor({
    id,
    dossier_id,
    dossier_code = null,
    dossier_title = null,
    actor_id,
    actor_name,
    actor_role,
    action,
    from_status = null,
    to_status = null,
    comment = '',
    created_at = null,
  }) {
    this.id = id;
    this.dossier_id = dossier_id;
    this.dossier_code = dossier_code;
    this.dossier_title = dossier_title;
    this.actor_id = actor_id;
    this.actor_name = actor_name;
    this.actor_role = actor_role;
    this.action = action;
    this.from_status = from_status;
    this.to_status = to_status;
    this.comment = comment;
    this.created_at = created_at;
  }

  static fromRow(row) {
    if (!row) return null;
    return new AuditModel({
      id: row.id,
      dossier_id: row.dossier_id,
      dossier_code: row.dossier_code || null,
      dossier_title: row.dossier_title || null,
      actor_id: row.actor_id,
      actor_name: row.actor_name,
      actor_role: row.actor_role,
      action: row.action,
      from_status: row.from_status,
      to_status: row.to_status,
      comment: row.comment ?? row.notes ?? '',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    });
  }

  toObject() {
    return {
      id: this.id,
      dossier_id: this.dossier_id,
      dossierId: this.dossier_id,
      dossier_code: this.dossier_code,
      dossier_title: this.dossier_title,
      actor_id: this.actor_id,
      actor_name: this.actor_name,
      actor_role: this.actor_role,
      action: this.action,
      from_status: this.from_status,
      to_status: this.to_status,
      comment: this.comment,
      created_at: this.created_at,
    };
  }
}
