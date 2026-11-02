/**
 * Model Entity đại diện cho bảng dossiers trong MySQL (Kiến trúc Tinh gọn)
 */
export class DossierModel {
  constructor({
    id,
    tracking_code,
    user_id,
    department_id,
    technology_name,
    transfer_type = 'APPLICATION',
    transfer_target = null,
    purpose = null,
    has_workshop = false,
    has_budget = false,
    form_data = {},
    current_step = 1,
    status = 'DRAFT',
    current_version = 1,
    admin_note = null,
    decision_number = null,
    decision_date = null,
    drive_folder_url = null,
    submitted_at = null,
    reviewed_at = null,
    completed_at = null,
    created_at = null,
    updated_at = null,
  }) {
    this.id = id;
    this.tracking_code = tracking_code;
    this.user_id = user_id;
    this.department_id = department_id;
    this.technology_name = technology_name;
    this.transfer_type = transfer_type;
    this.transfer_target = transfer_target;
    this.purpose = purpose;
    this.has_workshop = Boolean(has_workshop);
    this.has_budget = Boolean(has_budget);
    this.form_data = form_data;
    this.current_step = Number(current_step);
    this.status = status;
    this.current_version = Number(current_version);
    this.admin_note = admin_note;
    this.decision_number = decision_number;
    this.decision_date = decision_date;
    this.drive_folder_url = drive_folder_url;
    this.submitted_at = submitted_at;
    this.reviewed_at = reviewed_at;
    this.completed_at = completed_at;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  static fromRow(row) {
    if (!row) return null;
    let formData = {};
    if (row.form_data) {
      try {
        formData = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
      } catch {
        formData = {};
      }
    }
    return new DossierModel({
      ...row,
      form_data: formData,
    });
  }

  toObject() {
    return { ...this };
  }
}
