/**
 * Model Entity đại diện cho bảng dossiers trong MySQL
 */
export class DossierModel {
  constructor({
    id,
    code,
    title,
    userId,
    templateId,
    departmentName,
    status = 'NEW',
    formData = {},
    docxFileUrl = null,
    precheckPdfUrl = null,
    facultySignedPdfUrl = null,
    finalPdfUrl = null,
    hasFinancialImplication = false,
    khcnSigned = false,
    khtcSigned = false,
    bghSigned = false,
    driveFolderUrl = null,
    reviewNotes = null,
    decisionNumber = null,
    decisionDate = null,
    submittedAt = null,
    reviewedAt = null,
    completedAt = null,
    createdAt = null,
    updatedAt = null,
    createdBy = null,
    templateTitle = null,
    templateCode = null,
    versions = [],
    auditLogs = [],
    emailLogs = [],
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
    this.facultySignedPdfUrl = facultySignedPdfUrl;
    this.finalPdfUrl = finalPdfUrl;
    this.hasFinancialImplication = hasFinancialImplication;
    this.khcnSigned = khcnSigned;
    this.khtcSigned = khtcSigned;
    this.bghSigned = bghSigned;
    this.driveFolderUrl = driveFolderUrl;
    this.reviewNotes = reviewNotes;
    this.decisionNumber = decisionNumber;
    this.decisionDate = decisionDate;
    this.submittedAt = submittedAt;
    this.reviewedAt = reviewedAt;
    this.completedAt = completedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.createdBy = createdBy;
    this.templateTitle = templateTitle;
    this.templateCode = templateCode;
    this.versions = versions;
    this.auditLogs = auditLogs;
    this.emailLogs = emailLogs;
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
      id: row.id,
      code: row.code,
      title: row.title,
      userId: row.user_id,
      templateId: row.template_id,
      departmentName: row.department_name,
      status: row.status,
      formData,
      docxFileUrl: row.docx_file_url,
      precheckPdfUrl: row.precheck_pdf_url,
      facultySignedPdfUrl: row.faculty_signed_pdf_url,
      finalPdfUrl: row.final_pdf_url,
      hasFinancialImplication: Boolean(row.has_financial_implication),
      khcnSigned: Boolean(row.khcn_signed),
      khtcSigned: Boolean(row.khtc_signed),
      bghSigned: Boolean(row.bgh_signed),
      driveFolderUrl: row.drive_folder_url,
      reviewNotes: row.review_notes,
      decisionNumber: row.decision_number,
      decisionDate: row.decision_date,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      templateTitle: row.template_title || null,
      templateCode: row.template_code || null,
      createdBy: row.user_name
        ? {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email || '',
            department: row.user_department || row.department_name || '',
            role: row.user_role || 'USER',
            title: row.user_title || '',
          }
        : null,
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
      facultySignedPdfUrl: this.facultySignedPdfUrl,
      finalPdfUrl: this.finalPdfUrl,
      hasFinancialImplication: this.hasFinancialImplication,
      khcnSigned: this.khcnSigned,
      khtcSigned: this.khtcSigned,
      bghSigned: this.bghSigned,
      driveFolderUrl: this.driveFolderUrl,
      reviewNotes: this.reviewNotes,
      decisionNumber: this.decisionNumber,
      decisionDate: this.decisionDate,
      submittedAt: this.submittedAt,
      reviewedAt: this.reviewedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      createdBy: this.createdBy,
      templateTitle: this.templateTitle,
      templateCode: this.templateCode,
      versions: this.versions,
      auditLogs: this.auditLogs,
      emailLogs: this.emailLogs,
    };
  }
}
