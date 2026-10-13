/**
 * DTOs cho module Dossier (Hồ sơ CGCN theo quy_trinh.md)
 */

// Request DTO tạo mới hồ sơ
export class CreateDossierRequestDto {
  constructor({ templateId, templateTitle, templateCode, formData, user, status }) {
    this.templateId = templateId;
    this.templateTitle = templateTitle || 'Biểu mẫu CGCN';
    this.templateCode = templateCode || 'Mẫu CGCN';
    this.formData = formData || {};
    this.user = user || null;
    this.status = status || 'NEW';
  }

  validate() {
    if (!this.templateId) throw new Error('Thiếu templateId của biểu mẫu');
    if (!this.formData || Object.keys(this.formData).length === 0) {
      throw new Error('Dữ liệu formData không được để trống');
    }
  }
}

// Request DTO Admin tiền kiểm
export class AdminPrecheckRequestDto {
  constructor({ isValid, reviewNotes, adminUser }) {
    this.isValid = Boolean(isValid);
    this.reviewNotes = (reviewNotes || '').trim();
    this.adminUser = adminUser || null;
  }
}

// Request DTO nộp chữ ký số cấp Khoa
export class FacultySignatureRequestDto {
  constructor({ facultySignedPdfUrl, evidenceFiles, user }) {
    this.facultySignedPdfUrl = facultySignedPdfUrl || '';
    this.evidenceFiles = Array.isArray(evidenceFiles) ? evidenceFiles : [];
    this.user = user || null;
  }
}

// Request DTO cập nhật ký số cấp Trường
export class SchoolSigningRequestDto {
  constructor({ khcnSigned, khtcSigned, bghSigned, adminUser }) {
    this.khcnSigned = Boolean(khcnSigned);
    this.khtcSigned = Boolean(khtcSigned);
    this.bghSigned = Boolean(bghSigned);
    this.adminUser = adminUser || null;
  }
}

// Request DTO ban hành Quyết định & Đóng hồ sơ
export class CompleteDossierRequestDto {
  constructor({ decisionNumber, decisionDate, finalPdfUrl, adminUser }) {
    this.decisionNumber = decisionNumber || '';
    this.decisionDate = decisionDate || '';
    this.finalPdfUrl = finalPdfUrl || '';
    this.adminUser = adminUser || null;
  }
}

// Response DTO trả về cho Client
export class DossierResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return model.toObject ? model.toObject() : model;
  }
}
