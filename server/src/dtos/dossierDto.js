/**
 * DTOs cho module Dossier (Kiến trúc Tinh gọn - Lean Workflow)
 */
export class SubmitDossierRequestDto {
  constructor(payload = {}) {
    this.department_id = Number(payload.department_id || payload.form_data?.department_id || 1);
    this.technology_name = (payload.technology_name || payload.form_data?.technology_name || '').trim();
    this.transfer_type = payload.transfer_type === 'KNOWLEDGE' ? 'KNOWLEDGE' : 'APPLICATION';
    this.transfer_target = (payload.transfer_target || payload.form_data?.transfer_target || '').trim();
    this.purpose = (payload.purpose || payload.form_data?.purpose || '').trim();
    this.has_workshop = Number(payload.has_workshop) ? 1 : 0;
    this.has_budget = Number(payload.has_budget) ? 1 : 0;
    this.form_data = payload.form_data || {};
  }
}

export class DossierResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return model.toObject ? model.toObject() : model;
  }
}
