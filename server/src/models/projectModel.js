/**
 * Model Entity đại diện cho bảng transfer_projects, attachments, audit_logs trong MySQL
 */
export class ProjectModel {
  constructor({
    id,
    code,
    title,
    userId,
    templateId = '2a-KH.CGCN',
    departmentName = null,
    status = 'NEW',
    formData = {},
    docxFileUrl = null,
    precheckPdfUrl = null,
    deanSignedPdfUrl = null,
    finalPdfUrl = null,
    hasFinancialImplication = false,
    khcnSigned = false,
    khtcSigned = false,
    bghSigned = false,
    decisionNumber = null,
    decisionDate = null,
    reviewNotes = null,
    submittedAt = null,
    reviewedAt = null,
    completedAt = null,
    createdAt = null,
    updatedAt = null,
    createdBy = null,
    attachments = [],
    timeline = [],
    auditLogs = [],
  }) {
    this.id = id;
    this.code = code;
    this.title = title;
    this.userId = userId;
    this.templateId = templateId;
    this.departmentName = departmentName;
    this.status = status;
    this.formData = formData;
    this.docxFileUrl = docxFileUrl;
    this.precheckPdfUrl = precheckPdfUrl;
    this.deanSignedPdfUrl = deanSignedPdfUrl;
    this.finalPdfUrl = finalPdfUrl;
    this.hasFinancialImplication = hasFinancialImplication;
    this.khcnSigned = khcnSigned;
    this.khtcSigned = khtcSigned;
    this.bghSigned = bghSigned;
    this.decisionNumber = decisionNumber;
    this.decisionDate = decisionDate;
    this.reviewNotes = reviewNotes;
    this.submittedAt = submittedAt;
    this.reviewedAt = reviewedAt;
    this.completedAt = completedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.attachments = attachments;
    this.timeline = timeline.length > 0 ? timeline : auditLogs;
    this.auditLogs = this.timeline;
  }

  static fromRow(row, attachments = [], auditLogs = []) {
    if (!row) return null;

    let formData = {};
    if (row.form_data) {
      try {
        formData = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
      } catch {
        formData = {};
      }
    }

    const createdBy = row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email || '',
          department: row.user_department || row.department_name || '',
          role: row.user_role || 'USER',
          title: row.user_title || '',
        }
      : null;

    return new ProjectModel({
      id: row.id,
      code: row.code,
      title: row.title,
      userId: row.user_id,
      templateId: row.template_id || '2a-KH.CGCN',
      departmentName: row.department_name,
      status: row.status,
      formData,
      docxFileUrl: row.docx_file_url,
      precheckPdfUrl: row.precheck_pdf_url,
      deanSignedPdfUrl: row.dean_signed_pdf_url,
      finalPdfUrl: row.final_pdf_url,
      hasFinancialImplication: Boolean(row.has_financial_implication),
      khcnSigned: Boolean(row.khcn_signed),
      khtcSigned: Boolean(row.khtc_signed),
      bghSigned: Boolean(row.bgh_signed),
      decisionNumber: row.decision_number,
      decisionDate: row.decision_date,
      reviewNotes: row.review_notes,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      createdBy,
      attachments,
      timeline: auditLogs,
      auditLogs,
    });
  }

  toObject() {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      userId: this.userId,
      templateId: this.templateId,
      departmentName: this.departmentName,
      status: this.status,
      formData: this.formData,
      docxFileUrl: this.docxFileUrl,
      precheckPdfUrl: this.precheckPdfUrl,
      deanSignedPdfUrl: this.deanSignedPdfUrl,
      facultySignedPdfUrl: this.deanSignedPdfUrl, // alias tương thích component React
      finalPdfUrl: this.finalPdfUrl,
      hasFinancialImplication: this.hasFinancialImplication,
      khcnSigned: this.khcnSigned,
      khtcSigned: this.khtcSigned,
      bghSigned: this.bghSigned,
      decisionNumber: this.decisionNumber,
      decisionDate: this.decisionDate,
      reviewNotes: this.reviewNotes,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      attachments: this.attachments,
      timeline: this.timeline,
      auditLogs: this.auditLogs,
    };
  }
}

export default ProjectModel;
