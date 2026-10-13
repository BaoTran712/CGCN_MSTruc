/**
 * Model Entity đại diện cho bảng audit_logs trong MySQL
 */
export class AuditModel {
  constructor({
    id,
    dossierId,
    dossierCode = null,
    dossierTitle = null,
    actorId,
    actorName,
    actorRole,
    action,
    fromStatus = null,
    toStatus = null,
    notes = '',
    createdAt = null,
  }) {
    this.id = id;
    this.dossierId = dossierId;
    this.dossierCode = dossierCode;
    this.dossierTitle = dossierTitle;
    this.actorId = actorId;
    this.actorName = actorName;
    this.actorRole = actorRole;
    this.action = action;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.notes = notes;
    this.createdAt = createdAt;
  }

  static fromRow(row) {
    if (!row) return null;
    return new AuditModel({
      id: row.id,
      dossierId: row.dossier_id,
      dossierCode: row.dossier_code || null,
      dossierTitle: row.dossier_title || null,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      action: row.action,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      notes: row.notes,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    });
  }

  toObject() {
    return {
      id: this.id,
      dossierId: this.dossierId,
      dossierCode: this.dossierCode,
      dossierTitle: this.dossierTitle,
      actorId: this.actorId,
      actorName: this.actorName,
      actorRole: this.actorRole,
      action: this.action,
      fromStatus: this.fromStatus,
      toStatus: this.toStatus,
      notes: this.notes,
      createdAt: this.createdAt,
    };
  }
}
