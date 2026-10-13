/**
 * Data Transfer Objects (DTO) cho module Project (Transfer Projects)
 */

export class CreateProjectRequestDto {
  constructor(body = {}) {
    this.title = (body.title || body.formData?.research_title || body.formData?.title || 'Dự án CGCN mới').trim();
    this.templateId = body.templateId || body.template_id || '2a-KH.CGCN';
    this.departmentName = body.departmentName || body.department_name || body.formData?.department || 'Khoa/Bộ môn';
    this.formData = typeof body.formData === 'string' ? JSON.parse(body.formData) : (body.formData || body.form_data || {});
    this.userId = body.userId || body.user_id || body.user?.id || 'usr-canbo';
    this.status = body.status || 'NEW';
    this.hasFinancialImplication = Boolean(body.hasFinancialImplication ?? body.has_financial_implication ?? false);
  }

  validate() {
    if (!this.formData || typeof this.formData !== 'object') {
      throw new Error('Dữ liệu formData không hợp lệ');
    }
  }
}

export class ReviewProjectRequestDto {
  constructor(body = {}) {
    this.isValid = Boolean(body.isValid ?? body.is_valid ?? (body.status === 'PRECHECK_PASSED' || body.status === 'APPROVED'));
    this.reviewNotes = (body.reviewNotes || body.review_notes || body.notes || '').trim();
    this.actor = body.actor || body.adminUser || body.user || {
      id: 'usr-admin',
      name: 'Quản trị viên KH&CN',
      role: 'ADMIN',
    };
  }
}

export class UploadDeanSignedDto {
  constructor(req) {
    this.file = req.file;
    this.actor = req.body?.actor ? (typeof req.body.actor === 'string' ? JSON.parse(req.body.actor) : req.body.actor) : {
      id: req.body?.userId || 'usr-canbo',
      name: req.body?.userName || 'Cán bộ phụ trách',
      role: 'USER',
    };
    this.notes = req.body?.notes || 'Nộp bản scan PDF đã có chữ ký số Trưởng khoa';
  }

  validate() {
    if (!this.file) {
      throw new Error('Vui lòng chọn file PDF đã ký Khoa để tải lên');
    }
  }
}

export class CompleteProjectRequestDto {
  constructor(body = {}) {
    this.decisionNumber = (body.decisionNumber || body.decision_number || '').trim();
    this.decisionDate = (body.decisionDate || body.decision_date || '').trim();
    this.finalPdfUrl = (body.finalPdfUrl || body.final_pdf_url || '').trim();
    this.actor = body.actor || body.adminUser || body.user || {
      id: 'usr-admin',
      name: 'Quản trị viên KH&CN',
      role: 'ADMIN',
    };
    this.notes = (body.notes || 'Ban hành Quyết định phê duyệt và hoàn tất đóng hồ sơ').trim();
  }
}

export class ProjectResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return typeof model.toObject === 'function' ? model.toObject() : model;
  }
}
