/**
 * DTOs cho module Email
 */

export class SendEmailRequestDto {
  constructor({ dossierId, recipientEmail, recipientName, subject, content, stepName }) {
    this.dossierId = dossierId || null;
    this.recipientEmail = (recipientEmail || '').trim();
    this.recipientName = (recipientName || '').trim();
    this.subject = (subject || '').trim();
    this.content = (content || '').trim();
    this.stepName = stepName || 'Thông báo hệ thống';
  }

  validate() {
    if (!this.recipientEmail) throw new Error('Email người nhận không được để trống');
    if (!this.subject) throw new Error('Tiêu đề email không được để trống');
  }
}

export class EmailResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return model.toObject ? model.toObject() : model;
  }
}
