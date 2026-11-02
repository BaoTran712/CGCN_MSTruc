import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';
import { dossierRepository } from '../repositories/dossierRepository.js';
import { documentService } from './documentService.js';
import { emailService } from './emailService.js';
import { config } from '../utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '../..');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

const STATUS_LABELS_VI = {
  DRAFT: 'Đang lưu nháp (Bước 1)',
  PENDING_PRECHECK: 'Chờ Admin tiền kiểm (Bước 2)',
  NEEDS_REVISION: 'Yêu cầu chỉnh sửa / Bổ sung',
  PRECHECK_PASSED: 'Đã duyệt thể thức - Chờ ký Khoa (Bước 3)',
  EVIDENCE_UPLOADED: 'Đã nộp hồ sơ ký Khoa & Minh chứng (Bước 4)',
  SCHOOL_PROCESSING: 'Đang trình Hiệu trưởng ký (Bước 4)',
  COMPLETED: 'Hoàn tất & Đã ban hành Quyết định (Bước 5)',
};

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(Number(bytes))) return '0 KB';
  const kb = Number(bytes) / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function groupFilesByCategory(files = []) {
  const grouped = {
    AUTO_PROPOSAL_DOCX: [],
    AUTO_PLAN_DOCX: [],
    ADMIN_FIXED_DOC: [],
    FACULTY_SIGNED_PDF: [],
    CONTRACT_DOC: [],
    ACCEPTANCE_MINUTES: [],
    EVIDENCE_FILE: [],
    FINAL_DECISION_PDF: [],
  };

  for (const file of files) {
    if (!grouped[file.file_category]) {
      grouped[file.file_category] = [];
    }
    grouped[file.file_category].push(file);
  }

  return grouped;
}

export const dossierService = {
  async getAll(filters = {}) {
    return await dossierRepository.findAll(filters);
  },

  async getDepartments() {
    return await dossierRepository.findAllDepartments();
  },

  // API 6.1: Lấy Chi tiết Hồ sơ (Kèm Thanh tiến độ, Danh sách Download gom nhóm & Audit Logs)
  async getById(id) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) return null;

    const [latestFiles, auditLogs] = await Promise.all([
      dossierRepository.findLatestFilesByDossierId(dossier.id),
      dossierRepository.findAuditLogsByDossierId(dossier.id),
    ]);

    const filesByCategory = groupFilesByCategory(latestFiles);

    // Bước 3: Ưu tiên lấy bản ADMIN_FIXED_DOC nếu Admin có sửa tay, nếu không thì lấy bản tự sinh (AUTO_PROPOSAL_DOCX & AUTO_PLAN_DOCX)
    const standardFiles =
      filesByCategory.ADMIN_FIXED_DOC.length > 0
        ? filesByCategory.ADMIN_FIXED_DOC
        : [
            ...filesByCategory.AUTO_PROPOSAL_DOCX,
            ...filesByCategory.AUTO_PLAN_DOCX,
          ];

    return {
      ...dossier,
      progress_stepper: {
        current_step: dossier.current_step,
        total_steps: 5,
        status: dossier.status,
        status_label: STATUS_LABELS_VI[dossier.status] || dossier.status,
      },
      files: latestFiles,
      files_by_category: filesByCategory,
      standard_files: standardFiles,
      standard_download_url: `/api/dossiers/${dossier.id}/download-standard`,
      audit_logs: auditLogs,
    };
  },

  // API 1.1: Nộp mới Web Form & Tự động Sinh File Word (POST /api/dossiers/submit)
  async submitDossier(payload, user) {
    const {
      department_id,
      technology_name,
      transfer_type = 'APPLICATION',
      transfer_target = '',
      purpose = '',
      has_workshop = 0,
      has_budget = 0,
      form_data = {},
      is_draft = false,
    } = payload;

    const deptId = Number(department_id || form_data?.department_id || 1);
    const department = await dossierRepository.findDepartmentById(deptId);
    if (!department) {
      throw new Error(`Khoa/Đơn vị (department_id = ${deptId}) không tồn tại trong danh mục.`);
    }

    const techName =
      technology_name ||
      form_data?.technology_name ||
      form_data?.product_name ||
      form_data?.research_title ||
      'Công nghệ / Quy trình chuyển giao';

    const trackingCode = await dossierRepository.getNextTrackingCode();
    const dossierId = `dos-${uuidv4()}`;
    const version = 1;
    const status = is_draft ? 'DRAFT' : 'PENDING_PRECHECK';
    const currentStep = is_draft ? 1 : 2;

    const enrichedFormData = {
      ...form_data,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      dean_title: department.dean_title,
      technology_name: techName,
      transfer_type,
      transfer_target: transfer_target || form_data?.transfer_target || '',
      purpose: purpose || form_data?.purpose || '',
      has_workshop: Number(has_workshop) ? 1 : 0,
      has_budget: Number(has_budget) ? 1 : 0,
    };

    await dossierRepository.create({
      id: dossierId,
      tracking_code: trackingCode,
      user_id: user?.id || payload.user_id || 'usr-user',
      department_id: department.id,
      technology_name: techName,
      transfer_type: transfer_type === 'KNOWLEDGE' ? 'KNOWLEDGE' : 'APPLICATION',
      transfer_target: enrichedFormData.transfer_target,
      purpose: enrichedFormData.purpose,
      has_workshop: enrichedFormData.has_workshop,
      has_budget: enrichedFormData.has_budget,
      form_data: enrichedFormData,
      current_step: currentStep,
      status,
      current_version: version,
      drive_folder_url: config.driveFolderUrl,
      submitted_at: is_draft ? null : new Date(),
    });

    // Sinh đồng thời cả file Tờ trình (AUTO_PROPOSAL_DOCX) và Kế hoạch (AUTO_PLAN_DOCX)
    const generated = await documentService.generateDossierDocuments(trackingCode, enrichedFormData, {
      departmentName: department.name,
      departmentCode: department.code,
      deanTitle: department.dean_title,
      technologyName: techName,
      transferTarget: enrichedFormData.transfer_target,
      purpose: enrichedFormData.purpose,
      hasWorkshop: enrichedFormData.has_workshop,
      hasBudget: enrichedFormData.has_budget,
      version,
    });

    await dossierRepository.markOldFilesNotLatest(dossierId, ['AUTO_PROPOSAL_DOCX', 'AUTO_PLAN_DOCX']);

    for (const docFile of generated.files) {
      await dossierRepository.addFile({
        id: `file-${uuidv4()}`,
        dossier_id: dossierId,
        version,
        file_category: docFile.fileCategory,
        file_name: docFile.fileName,
        file_path: docFile.filePath,
        file_size: docFile.fileSize,
        uploaded_by: user?.id || payload.user_id || 'usr-user',
        is_latest: 1,
      });
    }

    await dossierRepository.createAuditLog({
      dossier_id: dossierId,
      actor_id: user?.id || payload.user_id || 'usr-user',
      actor_name: user?.full_name || user?.name || enrichedFormData.full_name || 'Cán bộ nộp hồ sơ',
      actor_role: user?.role || 'USER',
      action: is_draft ? 'SAVE_DRAFT' : 'SUBMIT_DOSSIER',
      from_status: null,
      to_status: status,
      comment: is_draft
        ? `Lưu nháp hồ sơ ${trackingCode} và khởi tạo bộ file Word nháp.`
        : `Nộp hồ sơ ${trackingCode} và tự động sinh bộ file Word chuẩn (Tờ trình 1a & Kế hoạch 2a) chờ Admin tiền kiểm.`,
    });

    if (!is_draft) {
      await emailService.sendEmail({
        dossierId,
        recipientEmail: 'admin@ctump.edu.vn',
        recipientName: 'Quản trị viên Phòng KH&CN',
        subject: `[CTUMP CGCN] Hồ sơ mới ${trackingCode} chờ tiền kiểm`,
        content: `Kính gửi Admin Phòng KH&CN,\n\nHồ sơ Chuyển giao Công nghệ mã ${trackingCode} ("${techName}") thuộc ${department.name} vừa được nộp lên hệ thống.\nHệ thống đã tự động ánh xạ đầy đủ Tờ trình (Mẫu 1a) và Kế hoạch (Mẫu 2a).\nVui lòng đăng nhập để tải file Word tiền kiểm.\n\nTrân trọng.`,
        stepName: 'Bước 2: Chờ Admin tiền kiểm',
      });
    }

    return await this.getById(dossierId);
  },

  // API 1.2: Cập nhật & Nộp lại Web Form sau khi bị trả về (PUT /api/dossiers/:id/resubmit)
  async resubmitDossier(id, payload, user) {
    const existing = await dossierRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy hồ sơ cần cập nhật.');
    }

    const deptId = Number(payload.department_id || existing.department_id);
    const department = await dossierRepository.findDepartmentById(deptId);
    if (!department) {
      throw new Error(`Khoa/Đơn vị (department_id = ${deptId}) không tồn tại trong danh mục.`);
    }

    const nextVersion = Number(existing.current_version || 1) + 1;
    const prevStatus = existing.status;

    const mergedFormData = {
      ...(existing.form_data || {}),
      ...(payload.form_data || {}),
    };

    const techName =
      payload.technology_name ||
      mergedFormData.technology_name ||
      existing.technology_name;
    const transferType = payload.transfer_type || existing.transfer_type || 'APPLICATION';
    const transferTarget =
      payload.transfer_target !== undefined ? payload.transfer_target : existing.transfer_target;
    const purpose = payload.purpose !== undefined ? payload.purpose : existing.purpose;
    const hasWorkshop =
      payload.has_workshop !== undefined ? (Number(payload.has_workshop) ? 1 : 0) : (existing.has_workshop ? 1 : 0);
    const hasBudget =
      payload.has_budget !== undefined ? (Number(payload.has_budget) ? 1 : 0) : (existing.has_budget ? 1 : 0);

    const enrichedFormData = {
      ...mergedFormData,
      department_id: department.id,
      department_name: department.name,
      department_code: department.code,
      dean_title: department.dean_title,
      technology_name: techName,
      transfer_type: transferType,
      transfer_target: transferTarget,
      purpose,
      has_workshop: hasWorkshop,
      has_budget: hasBudget,
    };

    await dossierRepository.update(existing.id, {
      department_id: department.id,
      technology_name: techName,
      transfer_type: transferType === 'KNOWLEDGE' ? 'KNOWLEDGE' : 'APPLICATION',
      transfer_target: transferTarget,
      purpose,
      has_workshop: hasWorkshop,
      has_budget: hasBudget,
      form_data: enrichedFormData,
      current_version: nextVersion,
      current_step: 2,
      status: 'PENDING_PRECHECK',
      submitted_at: new Date(),
    });

    const generated = await documentService.generateDossierDocuments(
      existing.tracking_code,
      enrichedFormData,
      {
        departmentName: department.name,
        departmentCode: department.code,
        deanTitle: department.dean_title,
        technologyName: techName,
        transferTarget,
        purpose,
        hasWorkshop,
        hasBudget,
        version: nextVersion,
      }
    );

    await dossierRepository.markOldFilesNotLatest(existing.id, [
      'AUTO_PROPOSAL_DOCX',
      'AUTO_PLAN_DOCX',
    ]);

    for (const docFile of generated.files) {
      await dossierRepository.addFile({
        id: `file-${uuidv4()}`,
        dossier_id: existing.id,
        version: nextVersion,
        file_category: docFile.fileCategory,
        file_name: docFile.fileName,
        file_path: docFile.filePath,
        file_size: docFile.fileSize,
        uploaded_by: user?.id || existing.user_id,
        is_latest: 1,
      });
    }

    await dossierRepository.createAuditLog({
      dossier_id: existing.id,
      actor_id: user?.id || existing.user_id,
      actor_name: user?.full_name || user?.name || existing.creator?.full_name || 'Cán bộ',
      actor_role: user?.role || 'USER',
      action: 'RESUBMIT_DOSSIER',
      from_status: prevStatus,
      to_status: 'PENDING_PRECHECK',
      comment: `Cán bộ đã chỉnh sửa Web Form và nộp lại hồ sơ (Phiên bản v${nextVersion}) chờ Admin tiền kiểm.`,
    });

    await emailService.sendEmail({
      dossierId: existing.id,
      recipientEmail: 'admin@ctump.edu.vn',
      recipientName: 'Quản trị viên Phòng KH&CN',
      subject: `[CTUMP CGCN] Hồ sơ ${existing.tracking_code} (v${nextVersion}) đã được sửa và nộp lại`,
      content: `Kính gửi Admin Phòng KH&CN,\n\nHồ sơ ${existing.tracking_code} ("${techName}") đã được cán bộ cập nhật lên phiên bản v${nextVersion} theo yêu cầu chỉnh sửa.\nHệ thống đã sinh mới bộ file Word chuẩn.\nVui lòng kiểm tra và duyệt tiền kiểm.\n\nTrân trọng.`,
      stepName: 'Bước 2: Nộp lại hồ sơ sau chỉnh sửa',
    });

    return await this.getById(existing.id);
  },

  // API 2: Admin Tiền kiểm: Duyệt / Trả về sửa chữa / Upload file chỉnh tay (POST /api/dossiers/:id/precheck)
  async precheckDossier(id, { action, admin_note, fixedFiles = [] }, adminUser) {
    const existing = await dossierRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy hồ sơ.');
    }

    const normalizedAction = String(action || '').toUpperCase().trim();
    if (!['APPROVE', 'REJECT'].includes(normalizedAction)) {
      throw new Error(`Hành động tiền kiểm không hợp lệ: "${action}". Chỉ chấp nhận 'APPROVE' hoặc 'REJECT'.`);
    }

    const prevStatus = existing.status;

    if (normalizedAction === 'REJECT') {
      const note = admin_note || 'Hồ sơ cần chỉnh sửa lại thể thức hoặc nội dung trên Web Form.';
      await dossierRepository.update(existing.id, {
        status: 'NEEDS_REVISION',
        current_step: 2,
        admin_note: note,
        reviewed_at: new Date(),
      });

      await dossierRepository.createAuditLog({
        dossier_id: existing.id,
        actor_id: adminUser?.id || 'usr-admin',
        actor_name: adminUser?.full_name || adminUser?.name || 'Admin Phòng KH&CN',
        actor_role: adminUser?.role || 'ADMIN',
        action: 'PRECHECK_REJECT',
        from_status: prevStatus,
        to_status: 'NEEDS_REVISION',
        comment: `Admin trả hồ sơ về yêu cầu sửa chữa. Nhận xét: ${note}`,
      });

      await emailService.sendEmail({
        dossierId: existing.id,
        recipientEmail: existing.creator?.email || 'canbo@ctump.edu.vn',
        recipientName: existing.creator?.full_name || 'Thầy/Cô',
        subject: `[CTUMP CGCN] Yêu cầu chỉnh sửa hồ sơ ${existing.tracking_code}`,
        content: `Kính gửi Thầy/Cô ${existing.creator?.full_name},\n\nHồ sơ ${existing.tracking_code} ("${existing.technology_name}") cần chỉnh sửa ở bước Tiền kiểm với nội dung sau:\n"${note}"\n\nVui lòng đăng nhập hệ thống để cập nhật lại Web Form và gửi lại.\n\nTrân trọng,\nPhòng Khoa học Công nghệ.`,
        stepName: 'Bước 2: Trả về chỉnh sửa tiền kiểm',
      });

      return await this.getById(existing.id);
    }

    if (Array.isArray(fixedFiles) && fixedFiles.length > 0) {
      await dossierRepository.markOldFilesNotLatest(existing.id, ['ADMIN_FIXED_DOC']);

      for (const f of fixedFiles) {
        const relativePath = path.relative(PROJECT_ROOT, f.path).replace(/\\/g, '/');
        await dossierRepository.addFile({
          id: `file-${uuidv4()}`,
          dossier_id: existing.id,
          version: existing.current_version,
          file_category: 'ADMIN_FIXED_DOC',
          file_name: f.originalname || f.filename,
          file_path: relativePath,
          file_size: formatFileSize(f.size),
          uploaded_by: adminUser?.id || 'usr-admin',
          is_latest: 1,
        });
      }
    }

    const note = admin_note || 'Đã duyệt thể thức hồ sơ. Mời Thầy/Cô tải file chuẩn về trình ký cấp Khoa.';
    await dossierRepository.update(existing.id, {
      current_step: 3,
      status: 'PRECHECK_PASSED',
      admin_note: note,
      reviewed_at: new Date(),
    });

    await dossierRepository.createAuditLog({
      dossier_id: existing.id,
      actor_id: adminUser?.id || 'usr-admin',
      actor_name: adminUser?.full_name || adminUser?.name || 'Admin Phòng KH&CN',
      actor_role: adminUser?.role || 'ADMIN',
      action: 'PRECHECK_APPROVE',
      from_status: prevStatus,
      to_status: 'PRECHECK_PASSED',
      comment:
        fixedFiles.length > 0
          ? `Admin đã duyệt tiền kiểm và tải lên ${fixedFiles.length} file chỉnh tay chuẩn (${note}).`
          : `Admin đã duyệt tiền kiểm thể thức hồ sơ (${note}).`,
    });

    const latestFiles = await dossierRepository.findLatestFilesByDossierId(existing.id);
    const grouped = groupFilesByCategory(latestFiles);
    const prioritizedStandardFiles =
      grouped.ADMIN_FIXED_DOC.length > 0
        ? grouped.ADMIN_FIXED_DOC
        : [...grouped.AUTO_PROPOSAL_DOCX, ...grouped.AUTO_PLAN_DOCX];

    const downloadLinksText =
      prioritizedStandardFiles.length > 0
        ? prioritizedStandardFiles
            .map((f) => `- ${f.file_name}: /api/dossiers/download/${f.id}`)
            .join('\n')
        : `- Link tải bản chuẩn: /api/dossiers/${existing.id}/download-standard`;

    await emailService.sendEmail({
      dossierId: existing.id,
      recipientEmail: existing.creator?.email || 'canbo@ctump.edu.vn',
      recipientName: existing.creator?.full_name || 'Thầy/Cô',
      subject: `[CTUMP CGCN] Hồ sơ ${existing.tracking_code} đã qua Tiền kiểm - Mời tải file xin chữ ký Khoa`,
      content: `Kính gửi Thầy/Cô ${existing.creator?.full_name},\n\nHồ sơ ${existing.tracking_code} ("${existing.technology_name}") đã được Admin duyệt thể thức thành công.\nNhận xét: "${note}"\n\nLink Download bản chuẩn (ưu tiên bản Admin đã chuẩn hóa):\n${downloadLinksText}\nHoặc tải trực tiếp tại: /api/dossiers/${existing.id}/download-standard\n\nVui lòng tải bản chuẩn về, trình ký lãnh đạo Khoa và upload lại bản PDF đã ký kèm minh chứng lên hệ thống.\n\nTrân trọng,\nPhòng Khoa học Công nghệ.`,
      stepName: 'Bước 3: Duyệt tiền kiểm - Chờ ký cấp Khoa',
    });

    return await this.getById(existing.id);
  },

  // API 3: User Upload Hồ sơ đã ký cấp Khoa & Minh chứng (POST /api/dossiers/:id/upload-evidence)
  async uploadEvidence(id, uploadedFilesMap = {}, user, bodyPayload = {}) {
    const existing = await dossierRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy hồ sơ.');
    }

    const fieldToCategoryMap = {
      faculty_signed_pdf: 'FACULTY_SIGNED_PDF',
      contract_doc: 'CONTRACT_DOC',
      acceptance_minutes: 'ACCEPTANCE_MINUTES',
      evidence_files: 'EVIDENCE_FILE',
    };

    let totalUploaded = 0;

    for (const [fieldName, category] of Object.entries(fieldToCategoryMap)) {
      const files = uploadedFilesMap[fieldName];
      if (Array.isArray(files) && files.length > 0) {
        await dossierRepository.markOldFilesNotLatest(existing.id, [category]);

        for (const f of files) {
          const relativePath = path.relative(PROJECT_ROOT, f.path).replace(/\\/g, '/');
          await dossierRepository.addFile({
            id: `file-${uuidv4()}`,
            dossier_id: existing.id,
            version: existing.current_version,
            file_category: category,
            file_name: f.originalname || f.filename,
            file_path: relativePath,
            file_size: formatFileSize(f.size),
            uploaded_by: user?.id || existing.user_id,
            is_latest: 1,
          });
          totalUploaded++;
        }
      }
    }

    // Nếu không có file từ multipart, hỗ trợ fallback từ body JSON (tương thích React Modal)
    if (totalUploaded === 0) {
      const pdfUrl = bodyPayload.facultySignedPdfUrl || bodyPayload.faculty_signed_pdf_url;
      if (pdfUrl) {
        await dossierRepository.markOldFilesNotLatest(existing.id, ['FACULTY_SIGNED_PDF']);
        const fileName = path.basename(pdfUrl) || `${existing.tracking_code}-faculty-signed.pdf`;
        await dossierRepository.addFile({
          id: `file-${uuidv4()}`,
          dossier_id: existing.id,
          version: existing.current_version,
          file_category: 'FACULTY_SIGNED_PDF',
          file_name: fileName,
          file_path: pdfUrl.startsWith('/') ? pdfUrl.slice(1) : pdfUrl,
          file_size: 'PDF Document',
          uploaded_by: user?.id || existing.user_id,
          is_latest: 1,
        });
        totalUploaded++;
      }
      const evidenceList = bodyPayload.evidenceFiles || bodyPayload.evidence_files;
      if (Array.isArray(evidenceList) && evidenceList.length > 0) {
        for (const ev of evidenceList) {
          const evUrl = typeof ev === 'string' ? ev : (ev.url || ev.path || '');
          const evName = typeof ev === 'string' ? path.basename(ev) : (ev.name || path.basename(evUrl) || 'minh_chung.pdf');
          await dossierRepository.addFile({
            id: `file-${uuidv4()}`,
            dossier_id: existing.id,
            version: existing.current_version,
            file_category: 'EVIDENCE_FILE',
            file_name: evName,
            file_path: evUrl.startsWith('/') ? evUrl.slice(1) : evUrl,
            file_size: ev.size || 'Attachment',
            uploaded_by: user?.id || existing.user_id,
            is_latest: 1,
          });
          totalUploaded++;
        }
      }
    }

    if (totalUploaded === 0) {
      throw new Error(
        'Vui lòng đính kèm ít nhất 1 file (faculty_signed_pdf, contract_doc, acceptance_minutes hoặc evidence_files).'
      );
    }

    const prevStatus = existing.status;
    await dossierRepository.update(existing.id, {
      current_step: 4,
      status: 'EVIDENCE_UPLOADED',
    });

    await dossierRepository.createAuditLog({
      dossier_id: existing.id,
      actor_id: user?.id || existing.user_id,
      actor_name: user?.full_name || user?.name || existing.creator?.full_name || 'Cán bộ',
      actor_role: user?.role || 'USER',
      action: 'UPLOAD_EVIDENCE',
      from_status: prevStatus,
      to_status: 'EVIDENCE_UPLOADED',
      comment: `Cán bộ đã tải lên ${totalUploaded} tệp hồ sơ có chữ ký cấp Khoa và minh chứng nghiệm thu.`,
    });

    await emailService.sendEmail({
      dossierId: existing.id,
      recipientEmail: 'admin@ctump.edu.vn',
      recipientName: 'Quản trị viên Phòng KH&CN',
      subject: `[CTUMP CGCN] Hồ sơ ${existing.tracking_code} đã tải lên PDF ký Khoa & Minh chứng`,
      content: `Kính gửi Admin Phòng KH&CN,\n\nCán bộ ${existing.creator?.full_name} vừa tải lên ${totalUploaded} tệp hồ sơ đã ký cấp Khoa và minh chứng cho hồ sơ ${existing.tracking_code}.\nVui lòng đăng nhập hệ thống để kiểm duyệt bộ file upload.\n\nTrân trọng.`,
      stepName: 'Bước 4: Đã tải lên hồ sơ ký Khoa & Minh chứng',
    });

    return await this.getById(existing.id);
  },

  // API 4: Admin Kiểm duyệt Bộ File Upload & Cập nhật Tiến độ Trình Hiệu trưởng (POST /api/dossiers/:id/review-evidence)
  async reviewEvidence(id, { action, admin_note }, adminUser) {
    const existing = await dossierRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy hồ sơ.');
    }

    const normalizedAction = String(action || '').toUpperCase().trim();
    if (!['APPROVE_FILES', 'REQUEST_REUPLOAD'].includes(normalizedAction)) {
      throw new Error(
        `Hành động kiểm duyệt không hợp lệ: "${action}". Chỉ chấp nhận 'APPROVE_FILES' hoặc 'REQUEST_REUPLOAD'.`
      );
    }

    const prevStatus = existing.status;

    if (normalizedAction === 'REQUEST_REUPLOAD') {
      const note =
        admin_note || 'File minh chứng bị thiếu hoặc chữ ký cấp Khoa chưa hợp lệ. Vui lòng kiểm tra và upload lại.';

      await dossierRepository.update(existing.id, {
        current_step: 3,
        status: 'NEEDS_REVISION',
        admin_note: note,
        reviewed_at: new Date(),
      });

      await dossierRepository.createAuditLog({
        dossier_id: existing.id,
        actor_id: adminUser?.id || 'usr-admin',
        actor_name: adminUser?.full_name || adminUser?.name || 'Admin Phòng KH&CN',
        actor_role: adminUser?.role || 'ADMIN',
        action: 'REQUEST_REUPLOAD',
        from_status: prevStatus,
        to_status: 'NEEDS_REVISION',
        comment: `Admin yêu cầu upload lại bộ file minh chứng/chữ ký Khoa. Lý do: ${note}`,
      });

      await emailService.sendEmail({
        dossierId: existing.id,
        recipientEmail: existing.creator?.email || 'canbo@ctump.edu.vn',
        recipientName: existing.creator?.full_name || 'Thầy/Cô',
        subject: `[CTUMP CGCN] Yêu cầu upload lại hồ sơ ký Khoa / Minh chứng (${existing.tracking_code})`,
        content: `Kính gửi Thầy/Cô ${existing.creator?.full_name},\n\nQua kiểm tra bộ file upload của hồ sơ ${existing.tracking_code}, Admin Phòng KH&CN có nhận xét:\n"${note}"\n\nVui lòng đăng nhập hệ thống để tải lên lại bộ file hợp lệ.\n\nTrân trọng.`,
        stepName: 'Bước 3: Yêu cầu upload lại file minh chứng',
      });

      return await this.getById(existing.id);
    }

    const note =
      admin_note || 'Đã duyệt hồ sơ minh chứng, đang trình Ban Giám hiệu/Hiệu trưởng ký ban hành Quyết định.';

    await dossierRepository.update(existing.id, {
      current_step: 4,
      status: 'SCHOOL_PROCESSING',
      admin_note: note,
      reviewed_at: new Date(),
    });

    await dossierRepository.createAuditLog({
      dossier_id: existing.id,
      actor_id: adminUser?.id || 'usr-admin',
      actor_name: adminUser?.full_name || adminUser?.name || 'Admin Phòng KH&CN',
      actor_role: adminUser?.role || 'ADMIN',
      action: 'APPROVE_EVIDENCE_FILES',
      from_status: prevStatus,
      to_status: 'SCHOOL_PROCESSING',
      comment: 'Đã duyệt hồ sơ minh chứng, đang trình Ban Giám hiệu/Hiệu trưởng',
    });

    await emailService.sendEmail({
      dossierId: existing.id,
      recipientEmail: existing.creator?.email || 'canbo@ctump.edu.vn',
      recipientName: existing.creator?.full_name || 'Thầy/Cô',
      subject: `[CTUMP CGCN] Hồ sơ ${existing.tracking_code} đang được trình Ban Giám hiệu / Hiệu trưởng`,
      content: `Kính gửi Thầy/Cô ${existing.creator?.full_name},\n\nBộ hồ sơ chữ ký cấp Khoa và minh chứng của hồ sơ ${existing.tracking_code} đã được duyệt hợp lệ.\nPhòng KH&CN đang tiến hành trình Ban Giám hiệu / Hiệu trưởng ký ban hành Quyết định.\n\nTrân trọng.`,
      stepName: 'Bước 4: Đang trình Hiệu trưởng ký',
    });

    return await this.getById(existing.id);
  },

  // API 5: Admin Upload Quyết định Cuối cùng & Đóng Hồ sơ (POST /api/dossiers/:id/complete)
  async completeDossier(id, { decision_number, decision_date, drive_folder_url, finalDecisionFile }, adminUser) {
    const existing = await dossierRepository.findById(id);
    if (!existing) {
      throw new Error('Không tìm thấy hồ sơ.');
    }

    if (!decision_number) {
      throw new Error('Vui lòng nhập Số Quyết định (decision_number).');
    }

    let uploadedDecisionRecord = null;
    if (finalDecisionFile) {
      await dossierRepository.markOldFilesNotLatest(existing.id, ['FINAL_DECISION_PDF']);
      const relativePath = path.relative(PROJECT_ROOT, finalDecisionFile.path).replace(/\\/g, '/');

      uploadedDecisionRecord = await dossierRepository.addFile({
        id: `file-${uuidv4()}`,
        dossier_id: existing.id,
        version: existing.current_version,
        file_category: 'FINAL_DECISION_PDF',
        file_name: finalDecisionFile.originalname || finalDecisionFile.filename,
        file_path: relativePath,
        file_size: formatFileSize(finalDecisionFile.size),
        uploaded_by: adminUser?.id || 'usr-admin',
        is_latest: 1,
      });
    }

    const prevStatus = existing.status;
    const finalDecisionDate = decision_date || new Date().toISOString().slice(0, 10);

    await dossierRepository.update(existing.id, {
      current_step: 5,
      status: 'COMPLETED',
      decision_number,
      decision_date: finalDecisionDate,
      drive_folder_url: drive_folder_url || existing.drive_folder_url || config.driveFolderUrl,
      completed_at: new Date(),
    });

    await dossierRepository.createAuditLog({
      dossier_id: existing.id,
      actor_id: adminUser?.id || 'usr-admin',
      actor_name: adminUser?.full_name || adminUser?.name || 'Admin Phòng KH&CN',
      actor_role: adminUser?.role || 'ADMIN',
      action: 'COMPLETE_DOSSIER',
      from_status: prevStatus,
      to_status: 'COMPLETED',
      comment: `Đã ban hành Quyết định số ${decision_number} (ngày ${finalDecisionDate}) và đóng hồ sơ hoàn tất.`,
    });

    const downloadLink = uploadedDecisionRecord
      ? `/api/dossiers/download/${uploadedDecisionRecord.id}`
      : `/api/dossiers/${existing.id}`;

    await emailService.sendEmail({
      dossierId: existing.id,
      recipientEmail: existing.creator?.email || 'canbo@ctump.edu.vn',
      recipientName: existing.creator?.full_name || 'Thầy/Cô',
      subject: `[CTUMP CGCN] Chúc mừng! Quyết định số ${decision_number} cho hồ sơ ${existing.tracking_code} đã được ban hành`,
      content: `Kính gửi Thầy/Cô ${existing.creator?.full_name},\n\nChúc mừng Thầy/Cô! Hồ sơ Chuyển giao Công nghệ mã ${existing.tracking_code} ("${existing.technology_name}") đã được Hiệu trưởng ký ban hành Quyết định số ${decision_number} ngày ${finalDecisionDate}.\n\nThầy/Cô có thể tải Quyết định chính thức tại đường dẫn: ${downloadLink}\n\nTrân trọng,\nPhòng Khoa học Công nghệ - Trường Đại học Y Dược Cần Thơ.`,
      stepName: 'Bước 5: Ban hành Quyết định & Đóng hồ sơ',
    });

    return await this.getById(existing.id);
  },

  // API 6.2: Tìm đường dẫn file vật lý phục vụ Download (GET /api/dossiers/download/:fileId)
  async getFileForDownload(fileId) {
    const fileRecord = await dossierRepository.findFileById(fileId);
    if (!fileRecord) {
      return null;
    }

    const candidates = [
      path.resolve(PROJECT_ROOT, fileRecord.file_path),
      path.resolve(SERVER_ROOT, fileRecord.file_path),
      fileRecord.file_path,
    ];

    for (const absPath of candidates) {
      if (fs.existsSync(absPath)) {
        return {
          ...fileRecord,
          absolutePath: absPath,
        };
      }
    }

    throw new Error(`File vật lý không tồn tại trên máy chủ: ${fileRecord.file_name}`);
  },

  // API 6.2b: Tải bản chuẩn ở Bước 3 (Ưu tiên ADMIN_FIXED_DOC nếu Admin có sửa tay, nếu không lấy bản tự sinh)
  async getStandardFileForDownload(dossierId, docType = '') {
    const dossier = await dossierRepository.findById(dossierId);
    if (!dossier) return null;

    const latestFiles = await dossierRepository.findLatestFilesByDossierId(dossier.id);
    const grouped = groupFilesByCategory(latestFiles);

    let targetFile = null;
    if (grouped.ADMIN_FIXED_DOC.length > 0) {
      targetFile = grouped.ADMIN_FIXED_DOC[0];
    } else if (String(docType).toLowerCase() === '1a' || String(docType).toLowerCase() === 'proposal') {
      targetFile = grouped.AUTO_PROPOSAL_DOCX[0] || grouped.AUTO_PLAN_DOCX[0];
    } else {
      targetFile = grouped.AUTO_PLAN_DOCX[0] || grouped.AUTO_PROPOSAL_DOCX[0];
    }

    if (!targetFile) return null;
    return await this.getFileForDownload(targetFile.id);
  },

  // API 6.3: Xuất Báo cáo Thống kê Excel (.xlsx / .csv chuẩn UTF-8 BOM) (GET /api/dossiers/export-excel)
  async exportExcelReport(filters = {}) {
    const dossiers = await dossierRepository.findAll(filters);
    const format = String(filters.format || 'csv').toLowerCase();

    const headers = [
      'STT',
      'Mã hồ sơ',
      'Họ tên tác giả',
      'MSCB',
      'Đơn vị (Khoa)',
      'Tên công nghệ',
      'Loại hình',
      'Đơn vị tiếp nhận',
      'Mục đích',
      'Ngày nộp',
      'Trạng thái',
      'Số Quyết định',
      'Ngày ban hành',
    ];

    const formatDateStr = (dt) => {
      if (!dt) return '';
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return String(dt);
      return d.toLocaleDateString('vi-VN');
    };

    const dataRows = dossiers.map((d, index) => {
      const transferTypeVi =
        d.transfer_type === 'KNOWLEDGE'
          ? 'Chuyển giao tri thức (Mẫu 1a)'
          : 'Chuyển giao ứng dụng (Mẫu 2a)';

      return [
        index + 1,
        d.tracking_code || '',
        d.creator?.full_name || '',
        d.creator?.staff_code || '',
        d.department_name || '',
        d.technology_name || '',
        transferTypeVi,
        d.transfer_target || '',
        d.purpose || '',
        formatDateStr(d.submitted_at || d.created_at),
        STATUS_LABELS_VI[d.status] || d.status || '',
        d.decision_number || '',
        formatDateStr(d.decision_date),
      ];
    });

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CTUMP CGCN System';
      workbook.created = new Date();
      const sheet = workbook.addWorksheet('Thống kê Hồ sơ CGCN');

      sheet.addRow(headers);
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      for (const rowValues of dataRows) {
        sheet.addRow(rowValues);
      }

      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      const fileName = `Bao_cao_CGCN_CTUMP_${new Date().toISOString().slice(0, 10)}.xlsx`;
      return {
        fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(xlsxBuffer),
        csvBuffer: Buffer.from(xlsxBuffer),
        totalRecords: dossiers.length,
      };
    }

    const escapeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const cleaned = String(val).replace(/\r\n|\r|\n/g, ' ').replace(/"/g, '""');
      return `"${cleaned}"`;
    };

    const rows = dataRows.map((r) => r.map(escapeCsvCell).join(','));
    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
    const fileName = `Bao_cao_CGCN_CTUMP_${new Date().toISOString().slice(0, 10)}.csv`;
    const buffer = Buffer.from(csvContent, 'utf-8');

    return {
      fileName,
      contentType: 'text/csv; charset=utf-8',
      buffer,
      csvBuffer: buffer,
      totalRecords: dossiers.length,
    };
  },
};

export default dossierService;
