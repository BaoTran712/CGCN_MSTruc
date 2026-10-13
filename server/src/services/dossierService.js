import { v4 as uuidv4 } from 'uuid';
import { dossierRepository } from '../repositories/dossierRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { emailRepository } from '../repositories/emailRepository.js';
import { generateMappedDocx } from '../utils/docxService.js';
import { generateLockedPdf } from '../utils/pdfService.js';
import { emailService } from './emailService.js';
import { config } from '../utils/config.js';

export const dossierService = {
  // Lấy danh sách toàn bộ hồ sơ
  async getAll() {
    return dossierRepository.findAll();
  },

  async getAllDossiers() {
    return this.getAll();
  },

  // Lấy chi tiết hồ sơ kèm nhật ký Audit Trail & Email Logs
  async getById(id) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) return null;

    const [auditLogs, emailLogs] = await Promise.all([
      auditRepository.findByDossierId(dossier.id),
      emailRepository.findByDossierId(dossier.id),
    ]);

    return {
      ...dossier,
      auditLogs,
      emailLogs,
    };
  },

  async getDossierById(id) {
    return this.getById(id);
  },

  async create(payload, user) {
    return this.createDossier(payload, user);
  },

  // BƯỚC 1 & 2: Khởi tạo hồ sơ, sinh mã CGCN-XXXX & Mapping Word tự động
  async createDossier(payload, user) {
    const { templateId, templateTitle, templateCode, formData, status } = payload;
    const isDraft = status === 'DRAFT';
    const dossierStatus = isDraft ? 'DRAFT' : 'NEW';
    const code = await dossierRepository.getNextCode();
    const id = `dos-${Date.now()}`;

    // Mapping file Word (.docx) chuẩn của trường
    const docxRes = await generateMappedDocx(code, formData, templateCode || 'Mẫu CGCN');

    const newDossier = {
      id,
      code,
      title: formData.research_title || formData.product_name || `Hồ sơ CGCN - ${code}`,
      user_id: user?.id || 'usr-canbo',
      template_id: templateId,
      department_name: formData.department || user?.department || 'Khoa chuyên môn',
      status: dossierStatus,
      form_data: formData,
      docx_file_url: docxRes.fileUrl,
      has_financial_implication: Boolean(formData.financial_plan && !formData.financial_plan.includes('Không')),
      khcn_signed: false,
      khtc_signed: false,
      bgh_signed: false,
      drive_folder_url: config.driveFolderUrl,
      submitted_at: isDraft ? null : new Date(),
      created_at: new Date(),
    };

    const saved = await dossierRepository.create(newDossier);

    // Ghi Audit Trail
    await auditRepository.create({
      dossierId: id,
      actorId: user?.id || 'usr-canbo',
      actorName: user?.name || 'Cán bộ / Giảng viên',
      actorRole: user?.role || 'USER',
      action: isDraft ? 'SAVE_DRAFT' : 'CREATE',
      fromStatus: null,
      toStatus: dossierStatus,
      notes: isDraft
        ? `Lưu bản nháp hồ sơ ${code}.`
        : `Khởi tạo hồ sơ ${code} qua Web Form và tự động mapping file Word chuẩn.`,
    });

    // Chỉ gửi Gmail thông báo tiếp nhận khi nộp chính thức (NEW)
    if (!isDraft) {
      await emailService.sendEmail({
        dossierId: id,
        recipientEmail: user?.email || 'canbo@ctump.edu.vn',
        recipientName: user?.name || 'Thầy/Cô',
        subject: `[CTUMP DocuGov] Tiếp nhận thành công hồ sơ ${code}`,
        content: `Kính gửi Thầy/Cô ${user?.name || 'Cán bộ'},\n\nHồ sơ CGCN của Thầy/Cô đã được nộp thành công và cấp mã định danh: ${code}.\nChuyên viên Phòng KH&CN đang tiến hành tiền kiểm thể thức văn bản.\n\nTrân trọng,\nPhòng Khoa học Công nghệ & HTQT`,
        stepName: 'Bước 1: Tiếp nhận hồ sơ',
      });
    }

    return saved;
  },

  // BƯỚC 2: Admin Tiền kiểm hồ sơ bản thảo (Duyệt xuất PDF hoặc Yêu cầu bổ sung gửi Gmail)
  async adminPrecheck(id, isValid, reviewNotes, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) {
      throw new Error('Không tìm thấy hồ sơ');
    }

    if (!isValid) {
      // Yêu cầu sửa đổi (NEEDS_REVISION)
      const prevStatus = dossier.status;
      const updated = await dossierRepository.update(id, {
        status: 'NEEDS_REVISION',
        review_notes: reviewNotes || 'Hồ sơ có sai sót cần chỉnh sửa.',
        reviewed_at: new Date(),
      });

      await auditRepository.create({
        dossierId: id,
        actorId: adminUser?.id || 'usr-admin',
        actorName: adminUser?.name || 'Quản trị viên KH&CN',
        actorRole: 'ADMIN',
        action: 'PRECHECK_REJECT',
        fromStatus: prevStatus,
        toStatus: 'NEEDS_REVISION',
        notes: `Admin tiền kiểm bản thảo Word: Yêu cầu sửa đổi. Lý do: "${reviewNotes}"`,
      });

      await emailService.sendEmail({
        dossierId: id,
        recipientEmail: dossier.createdBy?.email || 'canbo@ctump.edu.vn',
        recipientName: dossier.createdBy?.name || 'Thầy/Cô',
        subject: `[CTUMP DocuGov] Yêu cầu chỉnh sửa bổ sung hồ sơ ${dossier.code}`,
        content: `Kính gửi Thầy/Cô ${dossier.createdBy?.name},\n\nHồ sơ CGCN mã ${dossier.code} qua quá trình tiền kiểm có nội dung cần điều chỉnh:\n"${reviewNotes}"\n\nVui lòng đăng nhập hệ thống CTUMP DocuGov để cập nhật lại thông tin Web Form.\n\nTrân trọng,\nPhòng Khoa học Công nghệ & HTQT`,
        stepName: 'Bước 2: Yêu cầu bổ sung',
      });

      return updated;
    } else {
      // Duyệt hợp lệ (PRECHECK_PASSED) & Tự động xuất PDF chuẩn đã khóa layout
      const prevStatus = dossier.status;
      const pdfRes = await generateLockedPdf(dossier.code, dossier.form_data, dossier.templateTitle);

      const updated = await dossierRepository.update(id, {
        status: 'PRECHECK_PASSED',
        review_notes: reviewNotes || 'Hồ sơ đạt chuẩn thể thức và nội dung.',
        precheck_pdf_url: pdfRes.fileUrl,
        reviewed_at: new Date(),
      });

      await auditRepository.create({
        dossierId: id,
        actorId: adminUser?.id || 'usr-admin',
        actorName: adminUser?.name || 'Quản trị viên KH&CN',
        actorRole: 'ADMIN',
        action: 'PRECHECK_APPROVE',
        fromStatus: prevStatus,
        toStatus: 'PRECHECK_PASSED',
        notes: 'Admin duyệt hợp lệ thể thức. Hệ thống tự động khóa nội dung và xuất bản file PDF chuẩn.',
      });

      await emailService.sendEmail({
        dossierId: id,
        recipientEmail: dossier.createdBy?.email || 'canbo@ctump.edu.vn',
        recipientName: dossier.createdBy?.name || 'Thầy/Cô',
        subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} đã được duyệt hợp lệ - Tải PDF để xin chữ ký số Trưởng Khoa`,
        content: `Kính gửi Thầy/Cô ${dossier.createdBy?.name},\n\nHồ sơ CGCN mã ${dossier.code} đã đạt chuẩn thể thức và được duyệt hợp lệ.\nHệ thống đã tự động xuất bản file PDF chuẩn (đã khóa layout để bảo đảm tính bất biến khi ký số).\n\nThầy/Cô vui lòng tải file PDF từ liên kết bên dưới và tiến hành xin chữ ký số của Trưởng Khoa / Lãnh đạo đơn vị:\nFile PDF: ${pdfRes.fileUrl}\n\nSau khi ký số đủ cấp Khoa, Thầy/Cô vui lòng truy cập lại hệ thống để tải lên bản đã ký kèm minh chứng.\n\nTrân trọng,\nPhòng Khoa học Công nghệ & HTQT`,
        stepName: 'Bước 4: Xuất bản PDF chuẩn',
      });

      return updated;
    }
  },

  // BƯỚC 1 (Chỉnh sửa form khi có yêu cầu sửa đổi hoặc lưu nháp): User sửa form & nộp lại
  async updateFormData(id, formData, user, targetStatus) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const nextStatus = targetStatus || (dossier.status === 'DRAFT' ? 'DRAFT' : 'NEW');
    const isSubmitting = nextStatus === 'NEW';

    // Lưu phiên bản lịch sử
    const versionCount = 2;
    await dossierRepository.saveVersion({
      id: `ver-${Date.now()}`,
      dossierId: id,
      versionNumber: versionCount,
      formData: formData,
      editedById: user?.id || 'usr-canbo',
      editedByName: user?.name || 'Cán bộ',
      changeSummary: isSubmitting
        ? 'Cán bộ cập nhật lại form theo nhận xét tiền kiểm của Admin'
        : 'Cán bộ cập nhật chỉnh sửa bản nháp',
    });

    // Cập nhật lại file Word
    const docxRes = await generateMappedDocx(dossier.code, formData, dossier.templateCode);

    const prevStatus = dossier.status;
    const updated = await dossierRepository.update(id, {
      title: formData.research_title || formData.product_name || dossier.title,
      form_data: formData,
      docx_file_url: docxRes.fileUrl,
      status: nextStatus,
      submitted_at: isSubmitting ? new Date() : dossier.submitted_at,
    });

    await auditRepository.create({
      dossierId: id,
      actorId: user?.id || 'usr-canbo',
      actorName: user?.name || 'Cán bộ',
      actorRole: user?.role || 'USER',
      action: isSubmitting ? 'UPDATE_DATA' : 'SAVE_DRAFT',
      fromStatus: prevStatus,
      toStatus: nextStatus,
      notes: isSubmitting
        ? 'Cán bộ cập nhật lại dữ liệu form và nộp lại hồ sơ cho Admin tiền kiểm.'
        : 'Cán bộ cập nhật thông tin bản nháp.',
    });

    return updated;
  },

  // BƯỚC 3 & 6: Cán bộ tải lên file PDF đã có chữ ký số cấp Khoa + Minh chứng
  async uploadFacultySignature(id, facultySignedPdfUrl, evidenceFiles, user) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const updated = await dossierRepository.update(id, {
      status: 'FACULTY_SIGNED',
      faculty_signed_pdf_url: facultySignedPdfUrl || `/uploads/pdf/${dossier.code}-faculty-signed.pdf`,
      evidence_files: evidenceFiles || dossier.evidence_files,
    });

    await auditRepository.create({
      dossierId: id,
      actorId: user?.id || 'usr-canbo',
      actorName: user?.name || 'Cán bộ',
      actorRole: user?.role || 'USER',
      action: 'UPLOAD_FACULTY_SIGN',
      fromStatus: prevStatus,
      toStatus: 'FACULTY_SIGNED',
      notes: `Cán bộ tải lên bản PDF đã ký số cấp Khoa kèm ${evidenceFiles?.length || 0} tài liệu minh chứng. Chuyển hồ sơ vào luồng trình ký cấp Trường.`,
    });

    await sendEmailNotification({
      dossierId: id,
      recipientEmail: 'admin@ctump.edu.vn',
      recipientName: 'Quản trị viên KH&CN',
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} đã hoàn tất chữ ký số cấp Khoa`,
      content: `Kính gửi Admin Phòng KH&CN,\n\nHồ sơ CGCN ${dossier.code} của cán bộ ${dossier.createdBy?.name} đã được tải lên bản PDF ký số cấp Khoa và các tài liệu minh chứng hợp lệ.\nVui lòng vào hàng đợi phê duyệt để cập nhật tiến độ trình ký cấp Trường.\n\nTrân trọng.`,
      stepName: 'Bước 6: Nộp minh chứng & Ký cấp Khoa',
    });

    return updated;
  },

  // BƯỚC 4 & 7: Admin cập nhật tiến độ trình ký số cấp Trường (KH&CN, KHTC, BGH)
  async updateSchoolSigning(id, flags, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const updateFields = {
      status: 'SCHOOL_SIGNING',
    };
    if (flags.khcnSigned !== undefined) updateFields.khcn_signed = Boolean(flags.khcnSigned);
    if (flags.khtcSigned !== undefined) updateFields.khtc_signed = Boolean(flags.khtcSigned);
    if (flags.bghSigned !== undefined) updateFields.bgh_signed = Boolean(flags.bghSigned);

    const prevStatus = dossier.status;
    const updated = await dossierRepository.update(id, updateFields);

    await auditRepository.create({
      dossierId: id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Quản trị viên KH&CN',
      actorRole: 'ADMIN',
      action: 'SCHOOL_SIGN',
      fromStatus: prevStatus,
      toStatus: 'SCHOOL_SIGNING',
      notes: `Cập nhật tiến độ ký số cấp Trường: KH&CN (${updateFields.khcn_signed ? 'Đã ký' : 'Chưa'}), KHTC (${updateFields.khtc_signed ? 'Đã ký' : 'Chưa'}), BGH (${updateFields.bgh_signed ? 'Đã ký' : 'Chưa'}).`,
    });

    return updated;
  },

  // BƯỚC 4 & 8: Ban hành Quyết định CGCN, lưu trữ Drive và đóng hồ sơ COMPLETED
  async completeDossier(id, payload, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const { decisionNumber, decisionDate, finalPdfUrl } = payload;
    const prevStatus = dossier.status;

    const updated = await dossierRepository.update(id, {
      status: 'COMPLETED',
      decision_number: decisionNumber || `QĐ-CGCN-${Date.now().toString().slice(-4)}/ĐHYDCT`,
      decision_date: decisionDate || new Date().toISOString().slice(0, 10),
      final_pdf_url: finalPdfUrl || `/uploads/pdf/${dossier.code}-decision.pdf`,
      khcn_signed: true,
      khtc_signed: true,
      bgh_signed: true,
      completed_at: new Date(),
    });

    await auditRepository.create({
      dossierId: id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Quản trị viên KH&CN',
      actorRole: 'ADMIN',
      action: 'COMPLETE',
      fromStatus: prevStatus,
      toStatus: 'COMPLETED',
      notes: `Ban hành Quyết định số ${updated.decision_number}. Đóng hồ sơ, đồng bộ lưu trữ Google Drive.`,
    });

    await emailService.sendEmail({
      dossierId: id,
      recipientEmail: dossier.createdBy?.email || 'canbo@ctump.edu.vn',
      recipientName: dossier.createdBy?.name || 'Thầy/Cô',
      subject: `[CTUMP DocuGov] Quyết định CGCN ${updated.decision_number} đã được ban hành chính thức`,
      content: `Kính gửi Thầy/Cô ${dossier.createdBy?.name},\n\nHồ sơ CGCN mã ${dossier.code} đã hoàn tất toàn bộ quy trình trình ký liên cấp và được Hiệu trưởng ký ban hành Quyết định số ${updated.decision_number}.\nHồ sơ đã được lưu trữ vĩnh viễn trên kho số Google Drive của Nhà trường.\n\nChúc mừng Thầy/Cô!\nTrân trọng,\nPhòng Khoa học Công nghệ & HTQT`,
      stepName: 'Bước 8: Ban hành Quyết định & Đóng hồ sơ',
    });

    return updated;
  },
};
