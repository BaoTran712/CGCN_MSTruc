/**
 * Model Entity đại diện cho bảng email_notifications trong MySQL
 */
export class EmailModel {
  constructor({
    id,
    dossierId = null,
    dossierCode = null,
    recipientEmail,
    recipientName = '',
    subject,
    content,
    stepName = 'Thông báo hệ thống',
    status = 'SENT',
    sentAt = null,
  }) {
    this.id = id;
    this.dossierId = dossierId;
    this.dossierCode = dossierCode;
    this.recipientEmail = recipientEmail;
    this.recipientName = recipientName;
    this.subject = subject;
    this.content = content;
    this.stepName = stepName;
    this.status = status;
    this.sentAt = sentAt;
  }

  static fromRow(row) {
    if (!row) return null;
    return new EmailModel({
      id: row.id,
      dossierId: row.dossier_id,
      dossierCode: row.dossier_code || null,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name || '',
      subject: row.subject,
      content: row.content,
      stepName: row.step_name,
      status: row.status,
      sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    });
  }

  toObject() {
    return {
      id: this.id,
      dossierId: this.dossierId,
      dossierCode: this.dossierCode,
      recipientEmail: this.recipientEmail,
      recipientName: this.recipientName,
      subject: this.subject,
      content: this.content,
      stepName: this.stepName,
      status: this.status,
      sentAt: this.sentAt,
    };
  }
}
