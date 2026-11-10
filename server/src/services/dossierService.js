import path from 'path';
import fs from 'fs';
import { dossierRepository } from '../repositories/dossierRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { emailRepository } from '../repositories/emailRepository.js';
import { documentGeneratorService } from './documentGeneratorService.js';
import { generateLockedPdf } from '../utils/pdfService.js';
import { emailService } from './emailService.js';
import { config } from '../utils/config.js';
import { sanitizeFormPayload, sanitizeStringValue } from '../utils/sanitizer.js';
import { resolveUploadAbsolutePath } from '../utils/cleanupGarbageData.js';

function computeChangedFields(oldForm = {}, newForm = {}) {
  const keys = new Set([...Object.keys(oldForm || {}), ...Object.keys(newForm || {})]);
  const changed = [];
  for (const key of keys) {
    if (key.startsWith('_')) continue;
    const beforeVal = JSON.stringify(oldForm?.[key] ?? '');
    const afterVal = JSON.stringify(newForm?.[key] ?? '');
    if (beforeVal !== afterVal) {
      changed.push(key);
    }
  }
  return changed;
}

export const dossierService = {
  // Lấy danh sách toàn bộ hồ sơ
  async getAll() {
    return dossierRepository.findAll();
  },

  async getAllDossiers() {
    return this.getAll();
  },

  // Lấy chi tiết hồ sơ kèm nhật ký Audit Trail, Email Logs & Lịch sử Phiên bản (Versions)
  async getById(id) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) return null;

    const [auditLogs, emailLogs, versions] = await Promise.all([
      auditRepository.findByDossierId(dossier.id),
      emailRepository.findByDossierId(dossier.id),
      dossierRepository.findVersionsByDossierId(dossier.id),
    ]);

    return {
      ...dossier,
      auditLogs,
      emailLogs,
      versions,
    };
  },

  async getDossierById(id) {
    return this.getById(id);
  },

  async create(payload, user) {
    return this.createDossier(payload, user);
  },

  // =========================================================================
  // BƯỚC 1: Thầy/Cô điền Form & Khởi tạo file (SUBMITTED - Đã gửi / Chờ duyệt)
  // =========================================================================
  async createDossier(payload, user) {
    const { templateId, templateTitle, templateCode } = payload;
    const rawFormData = payload.formData || payload.form_data || {};
    const sanitizedFormData = sanitizeFormPayload(rawFormData);

    const isMau2a =
      String(templateId).includes('2a') ||
      String(templateCode).includes('2a') ||
      String(templateTitle).toLowerCase().includes('kế hoạch') ||
      String(templateTitle).toLowerCase().includes('ke hoach') ||
      Boolean(sanitizedFormData.plan_code || sanitizedFormData.product_name);

    const effectiveTemplateId = isMau2a ? 'tmpl-cgcn-2a' : (templateId || 'tmpl-cgcn-1a');
    const effectiveTemplateCode = isMau2a ? 'Mẫu 2a-KH.CGCN' : (templateCode || 'Mẫu 1a-TT.CGCN');
    const effectiveTemplateTitle = isMau2a
      ? 'Kế hoạch tổ chức chuyển giao công nghệ trong trường'
      : (templateTitle || 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

    const dossierStatus = 'SUBMITTED';
    const currentVersion = 1;
    const code = await dossierRepository.getNextCode();
    const id = `dos-${Date.now()}`;
    const applicantEmail =
      user?.email || sanitizedFormData.email || 'thayco.giangvien@ctump.edu.vn';
    const applicantName =
      user?.name || sanitizedFormData.full_name || 'Thầy/Cô Giảng viên';
    const departmentName =
      sanitizedFormData.department || user?.department || 'Khoa Y';
    const title = isMau2a
      ? (sanitizedFormData.product_name
          ? `Kế hoạch tổ chức chuyển giao công nghệ: “${sanitizedFormData.product_name}”`
          : effectiveTemplateTitle)
      : (sanitizedFormData.research_title ||
         sanitizedFormData.transfer_title ||
         effectiveTemplateTitle ||
         `Hồ sơ CGCN - ${code}`);

    // Tự động bơm dữ liệu vào Template gốc sinh ngay bộ file Word (.docx) và PDF (.pdf) phiên bản v1
    const docGen = await documentGeneratorService.generateVersionedDocuments({
      code,
      formData: sanitizedFormData,
      templateId: effectiveTemplateId,
      templateCode: effectiveTemplateCode,
      templateTitle: effectiveTemplateTitle,
      version: currentVersion,
      previousFiles: [],
    });

    const initialTimeline = [
      {
        step: 1,
        status: 'SUBMITTED',
        title: 'Đã gửi đơn (Phiên bản v1)',
        timestamp: new Date().toISOString(),
        note: `Thầy/Cô điền Web Form và khởi tạo bộ file Word/PDF chuẩn v1 (${effectiveTemplateCode})`,
      },
    ];

    const newDossier = {
      id,
      code,
      title,
      user_id: user?.id || 'usr-canbo',
      template_id: effectiveTemplateId,
      templateId: effectiveTemplateId,
      templateTitle: effectiveTemplateTitle,
      templateCode: effectiveTemplateCode,
      department_name: departmentName,
      status: dossierStatus,
      current_version: currentVersion,
      applicant_email: applicantEmail,
      form_data: docGen.sanitizedFormData,
      form_data_1a: payload.formData1a || null,
      form_data_2a: payload.formData2a || null,
      status_1a: payload.status_1a || 'PENDING',
      status_2a: payload.status_2a || 'PENDING',
      ten_de_tai: payload.ten_de_tai || docGen.sanitizedFormData.ten_de_tai || null,
      truong_don_vi: payload.truong_don_vi || docGen.sanitizedFormData.truong_don_vi || null,
      signature_config: payload.signature_config || null,
      generated_docx_path: docGen.generatedDocxUrl,
      generated_pdf_path: docGen.generatedPdfUrl,
      docx_file_url: docGen.generatedDocxUrl,
      has_financial_implication: Boolean(
        sanitizedFormData.funding_source &&
          !String(sanitizedFormData.funding_source).includes('Không thu phí')
      ),
      has_workshop: Boolean(
        sanitizedFormData.has_workshop || sanitizedFormData.co_hoi_thao
      ),
      khcn_signed: false,
      khtc_signed: false,
      bgh_signed: false,
      timeline_logs: initialTimeline,
      drive_folder_url: config.driveFolderUrl,
      submitted_at: new Date(),
      created_at: new Date(),
      createdBy: {
        id: user?.id || 'usr-canbo',
        name: applicantName,
        email: applicantEmail,
        department: departmentName,
      },
    };

    const saved = await (async () => {
      const existingAll = await dossierRepository.findAll();
      const nowMs = Date.now();
      const targetTopic = String(newDossier.ten_de_tai || '').trim().toLowerCase();
      const targetTitle = String(newDossier.title || '').trim().toLowerCase();
      const recentDup = existingAll.find((d) => {
        const sameUser =
          (d.applicant_email && d.applicant_email.toLowerCase() === applicantEmail.toLowerCase()) ||
          (d.user_id && d.user_id === newDossier.user_id);
        if (!sameUser || d.status !== 'SUBMITTED') return false;
        const createdMs = new Date(d.created_at || d.createdAt || 0).getTime();
        if (!createdMs || Math.abs(nowMs - createdMs) > 45000) return false;
        const dTopic = String(d.ten_de_tai || '').trim().toLowerCase();
        const dTitle = String(d.title || '').trim().toLowerCase();
        return (targetTopic && dTopic === targetTopic) || (targetTitle && dTitle === targetTitle);
      });
      if (recentDup) {
        return dossierRepository.update(recentDup.id, {
          title: newDossier.title,
          ten_de_tai: newDossier.ten_de_tai,
          truong_don_vi: newDossier.truong_don_vi,
          form_data: newDossier.form_data,
          form_data_1a: newDossier.form_data_1a,
          form_data_2a: newDossier.form_data_2a,
          generated_docx_path: newDossier.generated_docx_path,
          generated_pdf_path: newDossier.generated_pdf_path,
          docx_file_url: newDossier.docx_file_url,
        });
      }
      return dossierRepository.create(newDossier);
    })();

    if (saved && saved.id !== id) {
      return saved;
    }

    // Lưu phiên bản v1 vào lịch sử phiên bản
    await dossierRepository.saveVersion({
      id: `ver-${Date.now()}-v1`,
      dossierId: id,
      versionNumber: 1,
      formData: docGen.sanitizedFormData,
      generatedDocxPath: docGen.generatedDocxUrl,
      generatedPdfPath: docGen.generatedPdfUrl,
      editedById: user?.id || 'usr-canbo',
      editedByName: applicantName,
      changeSummary: 'Khởi tạo hồ sơ lần đầu (Phiên bản v1)',
    });

    // Ghi Audit Trail
    await auditRepository.create({
      dossierId: id,
      actorId: user?.id || 'usr-canbo',
      actorName: applicantName,
      actorRole: user?.role || 'USER',
      action: 'SUBMIT',
      fromStatus: null,
      toStatus: 'SUBMITTED',
      notes: `Thầy/Cô ${applicantName} nộp hồ sơ ${code} (v1) qua Web Form. Tự động sinh file Word & PDF v1.`,
    });

    // Gửi Email SMTP báo cho Cô Admin và xác nhận cho Giảng viên
    await emailService.sendEmail({
      dossierId: id,
      recipientEmail: config.smtp.adminNotificationEmail,
      recipientName: 'Cô Admin (Phòng KH&CN)',
      subject: `[CTUMP DocuGov] Hồ sơ mới vừa nộp (v1): ${code} - ${title}`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Cô Admin (Phòng KH&CN),</h3>
          <p>Hệ thống vừa tiếp nhận hồ sơ chuyển giao công nghệ mới do Thầy/Cô <b>${applicantName}</b> (${departmentName}) nộp qua Web Form.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8fafc; width: 32%;"><b>Mã hồ sơ:</b></td><td style="padding: 8px; border: 1px solid #ddd;"><b>${code}</b> (Phiên bản v1)</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8fafc;"><b>Tên đề tài / nội dung:</b></td><td style="padding: 8px; border: 1px solid #ddd;">${title}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8fafc;"><b>Người nộp:</b></td><td style="padding: 8px; border: 1px solid #ddd;">${applicantName} (${applicantEmail})</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8fafc;"><b>Trạng thái:</b></td><td style="padding: 8px; border: 1px solid #ddd; color: #2563eb; font-weight: bold;">SUBMITTED (Đã gửi / Chờ duyệt)</td></tr>
          </table>
          <p>Kính mời Cô Admin truy cập hệ thống để kiểm tra nội dung, nhấn <b>Duyệt (Hồ sơ hợp lệ)</b> hoặc <b>Yêu cầu trả về (Sửa lỗi)</b>.</p>
        </div>
      `,
      stepName: 'Bước 1 - Gửi đơn mới (v1)',
    });

    await emailService.sendEmail({
      dossierId: id,
      recipientEmail: applicantEmail,
      recipientName: applicantName,
      subject: `[CTUMP DocuGov] Tiếp nhận thành công hồ sơ ${code} (v1)`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Thầy/Cô ${applicantName},</h3>
          <p>Hồ sơ chuyển giao công nghệ mã <b>${code}</b> (Phiên bản v1) của Thầy/Cô đã được nộp thành công và đang ở trạng thái <b>Đã gửi / Chờ duyệt</b>.</p>
          <p>Khi hồ sơ được Cô Admin duyệt hợp lệ, hệ thống sẽ gửi email đính kèm trực tiếp bản PDF chuẩn để Thầy/Cô tải về đi trình ký phòng ban.</p>
        </div>
      `,
      stepName: 'Bước 1 - Xác nhận tiếp nhận',
    });

    return saved;
  },

  // =========================================================================
  // BƯỚC 2A [LUỒNG FALSE]: Admin Trả về Sửa lỗi (RETURNED_FOR_REVISION)
  // =========================================================================
  async returnForRevision(id, revisionNote, adminUser, extra = {}) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const cleanNote =
      sanitizeStringValue(revisionNote) ||
      'Nội dung hồ sơ có điểm chưa chính xác, đề nghị Thầy/Cô rà soát và chỉnh sửa lại.';
    const applicantEmail =
      dossier.applicant_email || dossier.createdBy?.email || 'thayco.giangvien@ctump.edu.vn';
    const applicantName = dossier.createdBy?.name || 'Thầy/Cô';
    const prevStatus = dossier.status;
    const currentVer = Number(dossier.current_version || 1);

    // Xác định biểu mẫu mục tiêu bị trả về: '1a' | '2a' | 'both'
    let targetForm =
      extra.target_form ||
      extra.rejected_target ||
      (extra.status_1a === 'RETURNED' && extra.status_2a !== 'RETURNED'
        ? '1a'
        : extra.status_2a === 'RETURNED' && extra.status_1a !== 'RETURNED'
        ? '2a'
        : null);

    if (!targetForm) {
      targetForm = '1a';
    }

    const existingS1a = dossier.status_1a === 'APPROVED' ? 'APPROVED' : 'PENDING';
    const existingS2a = dossier.status_2a === 'APPROVED' ? 'APPROVED' : 'PENDING';

    const nextStatus1a =
      targetForm === '1a' || targetForm === 'both'
        ? 'RETURNED'
        : extra.status_1a && extra.status_1a !== 'RETURNED'
        ? extra.status_1a
        : existingS1a;

    // Khi chỉ trả về 1a, 2a giữ nguyên trạng thái hợp lệ (APPROVED hoặc PENDING), không bao giờ chuyển sang RETURNED
    const nextStatus2a =
      targetForm === '2a' || targetForm === 'both'
        ? 'RETURNED'
        : extra.status_2a && extra.status_2a !== 'RETURNED'
        ? extra.status_2a
        : existingS2a;

    const nextReason1a =
      targetForm === '1a' || targetForm === 'both' ? cleanNote : null;
    const nextReason2a =
      targetForm === '2a' || targetForm === 'both' ? cleanNote : null;

    const targetLabel =
      targetForm === '1a'
        ? 'Biểu mẫu 1a (Tờ trình)'
        : targetForm === '2a'
        ? 'Biểu mẫu 2a (Kế hoạch)'
        : 'Biểu mẫu 1a & 2a';

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 2,
      status: 'RETURNED_FOR_REVISION',
      title: `Trả về chỉnh sửa ${targetLabel} (Phiên bản v${currentVer})`,
      timestamp: new Date().toISOString(),
      note: cleanNote,
    });

    const updated = await dossierRepository.update(id, {
      status: 'RETURNED_FOR_REVISION',
      status_1a: nextStatus1a,
      status_2a: nextStatus2a,
      rejected_target: targetForm,
      rejection_reason_1a: nextReason1a,
      rejection_reason_2a: nextReason2a,
      revision_note: cleanNote,
      review_notes: cleanNote,
      reviewed_at: new Date(),
      timeline_logs: currentTimeline,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      actorRole: 'ADMIN',
      action: 'RETURN_FOR_REVISION',
      fromStatus: prevStatus,
      toStatus: 'RETURNED_FOR_REVISION',
      notes: `Admin yêu cầu trả về chỉnh sửa ${targetLabel} (v${currentVer}): "${cleanNote}"`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: applicantEmail,
      recipientName: applicantName,
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code}: Yêu cầu chỉnh sửa ${targetLabel}`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #b91c1c;">Kính gửi Thầy/Cô ${applicantName},</h3>
          <p>Hồ sơ mã <b>${dossier.code}</b> (Phiên bản v${currentVer}) có yêu cầu chỉnh sửa đối với <b>${targetLabel}</b>.</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 16px 0; color: #991b1b;">
            <b>Gợi ý chỉnh sửa từ Cô Admin (${targetLabel}):</b><br/>
            <div style="margin-top: 6px; white-space: pre-line;">${cleanNote}</div>
          </div>
          <p>Thầy/Cô vui lòng truy cập hệ thống để cập nhật và nộp lại <b>${targetLabel}</b>.</p>
        </div>
      `,
      stepName: `Bước 2A [Luồng False] - Trả về ${targetLabel}`,
    });

    return updated;
  },

  // =========================================================================
  // BƯỚC 2B.1 [LUỒNG FALSE - NỘP LẠI ĐỘC LẬP BIỂU MẪU 1A]
  // Chỉ cập nhật dữ liệu/tệp của 1a, bảo toàn nguyên vẹn 100% Biểu mẫu 2a
  // =========================================================================
  async resubmit1a(id, rawFormData1a, user, extra = {}) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const prevVersion = Number(dossier.current_version || 1);
    const nextVersion = prevVersion + 1;

    const sanitized1a = sanitizeFormPayload({
      ...(dossier.form_data_1a || dossier.formData1a || {}),
      ...(rawFormData1a || {}),
    });

    // Giữ nguyên hoàn toàn dữ liệu và trạng thái của Biểu mẫu 2a đã nộp
    const preservedFormData2a = dossier.form_data_2a || dossier.formData2a || null;
    const preservedStatus2a =
      dossier.status_2a === 'APPROVED' ? 'APPROVED' : 'PENDING';

    // Trong form_data tổng hợp, giữ nguyên dữ liệu 2a, chỉ cập nhật các trường thuộc 1a
    const mergedFormData = sanitizeFormPayload({
      ...(dossier.form_data || dossier.formData || {}),
      ...(preservedFormData2a || {}),
      ...sanitized1a,
    });

    const oldDraftFiles = [
      dossier.generated_docx_path,
      dossier.docx_file_url,
      dossier.generated_pdf_path,
    ].filter(Boolean);

    const effectiveTemplateId = 'tmpl-cgcn-1a';
    const effectiveTemplateCode = 'Mẫu 1a-TT.CGCN';
    const effectiveTemplateTitle =
      'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu';

    const docGen = await documentGeneratorService.generateVersionedDocuments({
      code: dossier.code,
      formData: sanitized1a,
      templateId: effectiveTemplateId,
      templateCode: effectiveTemplateCode,
      templateTitle: effectiveTemplateTitle,
      version: nextVersion,
      previousFiles: oldDraftFiles,
    });

    const topicTitle =
      extra.ten_de_tai ||
      sanitized1a.ten_de_tai ||
      dossier.ten_de_tai ||
      'Hồ sơ chuyển giao tri thức và công nghệ';
    const newTitle = `Bộ hồ sơ kép CGCN: “${topicTitle}” (Mẫu 1a & 2a)`;

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 1,
      status: 'SUBMITTED',
      title: `Đã nộp lại Biểu mẫu 1a (Phiên bản v${nextVersion})`,
      timestamp: new Date().toISOString(),
      note: `Thầy/Cô đã cập nhật và nộp lại Biểu mẫu 1a (v${nextVersion}). Biểu mẫu 2a giữ nguyên phiên bản đã nộp.`,
    });

    const updated = await dossierRepository.update(id, {
      title: newTitle,
      ten_de_tai: extra.ten_de_tai || sanitized1a.ten_de_tai || dossier.ten_de_tai,
      truong_don_vi: extra.truong_don_vi || sanitized1a.truong_don_vi || dossier.truong_don_vi,
      department_name: sanitized1a.department || dossier.department_name,
      form_data: mergedFormData,
      form_data_1a: sanitized1a,
      form_data_2a: preservedFormData2a,
      status_1a: 'PENDING',
      status_2a: preservedStatus2a,
      rejected_target: null,
      rejection_reason_1a: null,
      status: 'SUBMITTED',
      current_version: nextVersion,
      generated_docx_path: docGen.generatedDocxUrl,
      generated_pdf_path: docGen.generatedPdfUrl,
      docx_file_url: docGen.generatedDocxUrl,
      to_trinh_docx_url: docGen.generatedDocxUrl,
      submitted_at: new Date(),
      timeline_logs: currentTimeline,
    });

    const actorName = user?.name || dossier.createdBy?.name || 'Thầy/Cô Giảng viên';
    const changed1aKeys = computeChangedFields(dossier.form_data_1a || dossier.formData1a || {}, sanitized1a);
    const diffLabel1a = changed1aKeys.length > 0 ? ` (Đã sửa: ${changed1aKeys.join(', ')})` : '';

    await dossierRepository.saveVersion({
      id: `ver-${Date.now()}-v${nextVersion}`,
      dossierId: dossier.id,
      versionNumber: nextVersion,
      formData: mergedFormData,
      generatedDocxPath: docGen.generatedDocxUrl,
      generatedPdfPath: docGen.generatedPdfUrl,
      editedById: user?.id || dossier.user_id,
      editedByName: actorName,
      changeSummary: `Chỉnh sửa và nộp lại độc lập Biểu mẫu 1a (Phiên bản v${nextVersion})${diffLabel1a}`,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: user?.id || dossier.user_id,
      actorName,
      actorRole: user?.role || 'USER',
      action: 'RESUBMIT',
      fromStatus: prevStatus,
      toStatus: 'SUBMITTED',
      notes: `Thầy/Cô nộp lại độc lập Biểu mẫu 1a (v${nextVersion})${diffLabel1a}. Biểu mẫu 2a giữ nguyên phiên bản đã nộp.`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: config.smtp.adminNotificationEmail,
      recipientName: 'Cô Admin (Phòng KH&CN)',
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code}: Đã nộp lại Biểu mẫu 1a (Phiên bản v${nextVersion})`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Cô Admin (Phòng KH&CN),</h3>
          <p>Thầy/Cô <b>${actorName}</b> vừa hoàn tất chỉnh sửa và <b>Nộp lại Biểu mẫu 1a (Tờ trình)</b> cho hồ sơ mã <b>${dossier.code}</b> (<b>Phiên bản v${nextVersion}</b>).</p>
          <p>Biểu mẫu 2a được giữ nguyên phiên bản đã nộp trước đó. Kính mời Cô Admin vào kiểm tra và xét duyệt.</p>
        </div>
      `,
      stepName: `Bước 2B - Nộp lại Biểu mẫu 1a (v${nextVersion})`,
    });

    return updated;
  },

  // =========================================================================
  // BƯỚC 2B.2 [LUỒNG FALSE - NỘP LẠI ĐỘC LẬP BIỂU MẪU 2A]
  // =========================================================================
  async resubmit2a(id, rawFormData2a, user) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const prevVersion = Number(dossier.current_version || 1);
    const nextVersion = prevVersion + 1;

    const sanitized2a = sanitizeFormPayload({
      ...(dossier.form_data_2a || dossier.formData2a || {}),
      ...(rawFormData2a || {}),
    });

    const preservedFormData1a = dossier.form_data_1a || dossier.formData1a || null;
    const preservedStatus1a =
      dossier.status_1a === 'APPROVED' ? 'APPROVED' : 'PENDING';

    const mergedFormData = sanitizeFormPayload({
      ...(dossier.form_data || dossier.formData || {}),
      ...(preservedFormData1a || {}),
      ...sanitized2a,
    });

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 1,
      status: 'SUBMITTED',
      title: `Đã nộp lại Biểu mẫu 2a (Phiên bản v${nextVersion})`,
      timestamp: new Date().toISOString(),
      note: `Thầy/Cô đã cập nhật và nộp lại Biểu mẫu 2a (v${nextVersion}). Biểu mẫu 1a giữ nguyên phiên bản đã nộp.`,
    });

    const updated = await dossierRepository.update(id, {
      form_data: mergedFormData,
      form_data_1a: preservedFormData1a,
      form_data_2a: sanitized2a,
      status_1a: preservedStatus1a,
      status_2a: 'PENDING',
      rejected_target: null,
      rejection_reason_2a: null,
      status: 'SUBMITTED',
      current_version: nextVersion,
      submitted_at: new Date(),
      timeline_logs: currentTimeline,
    });

    const actorName = user?.name || dossier.createdBy?.name || 'Thầy/Cô Giảng viên';
    const changed2aKeys = computeChangedFields(dossier.form_data_2a || dossier.formData2a || {}, sanitized2a);
    const diffLabel2a = changed2aKeys.length > 0 ? ` (Đã sửa: ${changed2aKeys.join(', ')})` : '';

    await dossierRepository.saveVersion({
      id: `ver-${Date.now()}-v${nextVersion}`,
      dossierId: dossier.id,
      versionNumber: nextVersion,
      formData: mergedFormData,
      generatedDocxPath: dossier.generated_docx_path || '',
      generatedPdfPath: dossier.generated_pdf_path || '',
      editedById: user?.id || dossier.user_id,
      editedByName: actorName,
      changeSummary: `Chỉnh sửa và nộp lại độc lập Biểu mẫu 2a (Phiên bản v${nextVersion})${diffLabel2a}`,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: user?.id || dossier.user_id,
      actorName,
      actorRole: user?.role || 'USER',
      action: 'RESUBMIT',
      fromStatus: prevStatus,
      toStatus: 'SUBMITTED',
      notes: `Thầy/Cô nộp lại độc lập Biểu mẫu 2a (v${nextVersion})${diffLabel2a}. Biểu mẫu 1a giữ nguyên phiên bản đã nộp.`,
    });

    return updated;
  },

  // =========================================================================
  // BƯỚC 2B [LUỒNG FALSE]: Thầy/Cô Chỉnh sửa & Nộp lại (SUBMITTED - v2, v3...)
  // =========================================================================
  async resubmitDossier(id, rawFormData, user, extra = {}) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus1a = dossier.status_1a || 'PENDING';
    const prevStatus2a = dossier.status_2a || 'PENDING';
    const isOnly1aReturned =
      extra.target_form === '1a' ||
      dossier.rejected_target === '1a' ||
      (prevStatus1a === 'RETURNED' && prevStatus2a !== 'RETURNED');
    const isOnly2aReturned =
      extra.target_form === '2a' ||
      dossier.rejected_target === '2a' ||
      (prevStatus2a === 'RETURNED' && prevStatus1a !== 'RETURNED');

    if (isOnly1aReturned) {
      return this.resubmit1a(id, extra.formData1a || rawFormData, user, extra);
    }
    if (isOnly2aReturned) {
      return this.resubmit2a(id, extra.formData2a || rawFormData, user);
    }

    const prevStatus = dossier.status;
    const prevVersion = Number(dossier.current_version || 1);
    const nextVersion = prevVersion + 1;

    const is1aReturned = prevStatus1a === 'RETURNED';
    const is2aReturned = prevStatus2a === 'RETURNED';
    const hasSpecificReturn = is1aReturned || is2aReturned;

    const is1aEditable = !hasSpecificReturn || is1aReturned;
    const is2aEditable = !hasSpecificReturn || is2aReturned;

    const nextFormData1a = is1aEditable
      ? (extra.formData1a ? sanitizeFormPayload(extra.formData1a) : (dossier.form_data_1a || null))
      : (dossier.form_data_1a || null);

    const nextFormData2a = is2aEditable
      ? (extra.formData2a ? sanitizeFormPayload(extra.formData2a) : (dossier.form_data_2a || null))
      : (dossier.form_data_2a || null);

    const mergedFormData = sanitizeFormPayload({
      ...(dossier.form_data || dossier.formData || {}),
      ...(rawFormData || {}),
      ...(nextFormData2a || {}),
      ...(nextFormData1a || {}),
    });

    const nextStatus1a = prevStatus1a === 'RETURNED' ? 'PENDING' : prevStatus1a;
    const nextStatus2a = prevStatus2a === 'RETURNED' ? 'PENDING' : prevStatus2a;

    // Tập hợp các file nháp phiên bản cũ (v{prevVersion}) để DocumentGeneratorService tự động xóa bỏ
    const oldDraftFiles = [
      dossier.generated_docx_path,
      dossier.docx_file_url,
      dossier.generated_pdf_path,
      dossier.approved_pdf_path,
      dossier.precheck_pdf_url,
    ].filter(Boolean);

    const isMau2a =
      String(dossier.template_id || dossier.templateId).includes('2a') ||
      String(dossier.templateCode).includes('2a') ||
      String(dossier.title || dossier.templateTitle).toLowerCase().includes('kế hoạch') ||
      String(dossier.title || dossier.templateTitle).toLowerCase().includes('ke hoach') ||
      Boolean(mergedFormData.plan_code || mergedFormData.product_name);

    const effectiveTemplateId = isMau2a ? 'tmpl-cgcn-2a' : (dossier.template_id || dossier.templateId || 'tmpl-cgcn-1a');
    const effectiveTemplateCode = isMau2a ? 'Mẫu 2a-KH.CGCN' : (dossier.templateCode || 'Mẫu 1a-TT.CGCN');
    const effectiveTemplateTitle = isMau2a
      ? 'Kế hoạch tổ chức chuyển giao công nghệ trong trường'
      : (dossier.templateTitle || dossier.title || 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

    const newTitle = isMau2a
      ? (mergedFormData.product_name
          ? `Kế hoạch tổ chức chuyển giao công nghệ: “${mergedFormData.product_name}”`
          : effectiveTemplateTitle)
      : (mergedFormData.research_title ||
         mergedFormData.transfer_title ||
         dossier.title ||
         effectiveTemplateTitle);

    // Kết xuất lại (re-render) bộ file Word + PDF phiên bản mới nhất v{nextVersion} khớp 100% nội dung vừa sửa
    const docGen = await documentGeneratorService.generateVersionedDocuments({
      code: dossier.code,
      formData: mergedFormData,
      templateId: effectiveTemplateId,
      templateCode: effectiveTemplateCode,
      templateTitle: effectiveTemplateTitle,
      version: nextVersion,
      previousFiles: oldDraftFiles,
    });

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 1,
      status: 'SUBMITTED',
      title: `Đã nộp lại hồ sơ (Phiên bản v${nextVersion})`,
      timestamp: new Date().toISOString(),
      note: `Thầy/Cô đã chỉnh sửa theo góp ý và nộp lại bản v${nextVersion}. Đã tự động cập nhật file Word & PDF mới.`,
    });

    const updated = await dossierRepository.update(id, {
      title: newTitle,
      department_name: mergedFormData.department || dossier.department_name,
      form_data: docGen.sanitizedFormData,
      form_data_1a: nextFormData1a,
      form_data_2a: nextFormData2a,
      status_1a: nextStatus1a,
      status_2a: nextStatus2a,
      rejected_target: null,
      rejection_reason_1a: null,
      rejection_reason_2a: null,
      status: 'SUBMITTED',
      current_version: nextVersion,
      generated_docx_path: docGen.generatedDocxUrl,
      generated_pdf_path: docGen.generatedPdfUrl,
      docx_file_url: docGen.generatedDocxUrl,
      approved_pdf_path: null,
      precheck_pdf_url: null,
      submitted_at: new Date(),
      timeline_logs: currentTimeline,
    });

    const actorName = user?.name || dossier.createdBy?.name || 'Thầy/Cô Giảng viên';

    await dossierRepository.saveVersion({
      id: `ver-${Date.now()}-v${nextVersion}`,
      dossierId: dossier.id,
      versionNumber: nextVersion,
      formData: docGen.sanitizedFormData,
      generatedDocxPath: docGen.generatedDocxUrl,
      generatedPdfPath: docGen.generatedPdfUrl,
      editedById: user?.id || dossier.user_id,
      editedByName: actorName,
      changeSummary: `Chỉnh sửa và nộp lại phiên bản v${nextVersion}`,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: user?.id || dossier.user_id,
      actorName,
      actorRole: user?.role || 'USER',
      action: 'RESUBMIT',
      fromStatus: prevStatus,
      toStatus: 'SUBMITTED',
      notes: `Thầy/Cô chỉnh sửa và nộp lại hồ sơ phiên bản v${nextVersion}. Đã dọn file nháp v${prevVersion} và kết xuất lại Word/PDF v${nextVersion}.`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: config.smtp.adminNotificationEmail,
      recipientName: 'Cô Admin (Phòng KH&CN)',
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} đã sửa và nộp lại (Phiên bản v${nextVersion})`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Cô Admin (Phòng KH&CN),</h3>
          <p>Thầy/Cô <b>${actorName}</b> vừa hoàn tất chỉnh sửa và <b>Nộp lại</b> hồ sơ mã <b>${dossier.code}</b> (<b>Phiên bản v${nextVersion}</b>).</p>
          <p>Hệ thống đã tự động xóa bản nháp cũ và kết xuất lại bộ file Word (.docx) và PDF (.pdf) phiên bản <b>v${nextVersion}</b> khớp 100% với dữ liệu mới. Kính mời Cô Admin vào kiểm tra và xét duyệt lại.</p>
        </div>
      `,
      stepName: `Bước 2B [Luồng False] - Nộp lại (v${nextVersion})`,
    });

    return updated;
  },

  async updateFormData(id, formData, user, _status = 'SUBMITTED') {
    return this.resubmitDossier(id, formData, user);
  },

  async updateFields(id, fields) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');
    return dossierRepository.update(id, fields);
  },

  // =========================================================================
  // BƯỚC 3 [LUỒNG TRUE / SAU KHI SỬA XONG]: Admin Duyệt & Gửi Mail + PDF chuẩn (VALIDATED)
  // =========================================================================
  async approveApplication(id, reviewNotes, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const currentVer = Number(dossier.current_version || 1);
    const applicantEmail =
      dossier.applicant_email || dossier.createdBy?.email || 'thayco.giangvien@ctump.edu.vn';
    const applicantName = dossier.createdBy?.name || 'Thầy/Cô';
    const cleanNote =
      sanitizeStringValue(reviewNotes) ||
      `Hồ sơ phiên bản v${currentVer} đạt chuẩn thể thức và nội dung quy định.`;

    const currentFormData = dossier.form_data || dossier.formData || {};
    const formData1a = {
      ...currentFormData,
      ...(dossier.form_data_1a || dossier.formData1a || {}),
      _signatureConfig: dossier.signature_config || dossier.signatureConfig || null,
      templateId: 'tmpl-cgcn-1a',
      templateCode: 'Mẫu 1a-TT.CGCN',
    };
    const formData2a = {
      ...currentFormData,
      ...(dossier.form_data_2a || dossier.formData2a || {}),
      _signatureConfig: dossier.signature_config || dossier.signatureConfig || null,
      templateId: 'tmpl-cgcn-2a',
      templateCode: 'Mẫu 2a-KH.CGCN',
    };

    // Sinh đầy đủ 2 file PDF riêng biệt cho Mẫu 1a (Tờ trình) và Mẫu 2a (Kế hoạch) theo cấu hình phê duyệt của Admin
    const latestDocGen1a = await documentGeneratorService.generateVersionedDocuments({
      code: `${dossier.code}-1a`,
      formData: formData1a,
      templateId: 'tmpl-cgcn-1a',
      templateCode: 'Mẫu 1a-TT.CGCN',
      templateTitle: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
      version: currentVer,
      previousFiles: [],
    });

    const latestDocGen2a = await documentGeneratorService.generateVersionedDocuments({
      code: `${dossier.code}-2a`,
      formData: formData2a,
      templateId: 'tmpl-cgcn-2a',
      templateCode: 'Mẫu 2a-KH.CGCN',
      templateTitle: 'Kế hoạch tổ chức chuyển giao công nghệ trong trường',
      version: currentVer,
      previousFiles: [],
    });

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 3,
      status: 'VALIDATED',
      title: `Hồ sơ đã được duyệt (Phiên bản v${currentVer})`,
      timestamp: new Date().toISOString(),
      note: cleanNote,
    });

    const updated = await dossierRepository.update(id, {
      status: 'VALIDATED',
      status_1a: 'APPROVED',
      status_2a: 'APPROVED',
      rejected_target: null,
      rejection_reason_1a: null,
      rejection_reason_2a: null,
      review_notes: cleanNote,
      generated_docx_path: latestDocGen1a.generatedDocxUrl,
      generated_pdf_path: latestDocGen1a.generatedPdfUrl,
      docx_file_url: latestDocGen1a.generatedDocxUrl,
      approved_pdf_path: latestDocGen1a.generatedPdfUrl,
      precheck_pdf_url: latestDocGen1a.generatedPdfUrl,
      reviewed_at: new Date(),
      timeline_logs: currentTimeline,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      actorRole: 'ADMIN',
      action: 'APPROVE_VALIDATED',
      fromStatus: prevStatus,
      toStatus: 'VALIDATED',
      notes: `Admin nhấn Duyệt (VALIDATED) cho phiên bản v${currentVer}. Đã chốt 2 file PDF chuẩn (Mẫu 1a & Mẫu 2a) v${currentVer} và gửi Gmail SMTP kèm attachment.`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: applicantEmail,
      recipientName: applicantName,
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} (v${currentVer}) ĐÃ ĐƯỢC DUYỆT - Kèm PDF Mẫu 1a & Mẫu 2a đi trình ký`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Thầy/Cô ${applicantName},</h3>
          <p>Hồ sơ CGCN mã <b>${dossier.code}</b> (<b>Phiên bản v${currentVer}</b>) đã được Cô Admin xét duyệt <b>ĐÃ HỢP LỆ (VALIDATED)</b>.</p>
          <p>Hai file PDF chuẩn (<b>Mẫu 1a - Tờ trình</b> và <b>Mẫu 2a - Kế hoạch</b>) của phiên bản <b>v${currentVer}</b> theo cấu hình duyệt của Admin đã được <b>đính kèm trực tiếp trong email này</b>.</p>
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
            <b>Hướng dẫn bước tiếp theo:</b>
            <ol style="margin: 8px 0 0 16px; padding: 0;">
              <li>Tải 2 file PDF chuẩn (Mẫu 1a & Mẫu 2a) đính kèm trong email (hoặc bấm nút <b>"Tải PDF Mẫu 1a" / "Tải PDF Mẫu 2a"</b> trên trang Chi tiết đơn).</li>
              <li>Đem trình ký Lãnh đạo Khoa / Phòng ban.</li>
              <li>Sau khi có chữ ký phòng ban, vào khung thao tác bên phải trên trang Chi tiết đơn để <b>Upload lại file đã ký + minh chứng</b>.</li>
            </ol>
          </div>
        </div>
      `,
      stepName: `Bước 3 - Duyệt hợp lệ & Gửi PDF 1a + 2a (v${currentVer})`,
      attachments: [
        {
          filename: `${dossier.code}_Mau_1a_v${currentVer}.pdf`,
          path: latestDocGen1a.generatedPdfPath,
          contentType: 'application/pdf',
        },
        {
          filename: `${dossier.code}_Mau_2a_v${currentVer}.pdf`,
          path: latestDocGen2a.generatedPdfPath,
          contentType: 'application/pdf',
        },
      ],
    });

    return updated;
  },

  // Hàm điều phối chung cho cả Duyệt (isValid = true) và Trả về sửa lỗi (isValid = false)
  async adminPrecheck(id, isValid, reviewNotes, adminUser, extra = {}) {
    if (!isValid) {
      return this.returnForRevision(id, reviewNotes, adminUser, extra);
    }
    return this.approveApplication(id, reviewNotes, adminUser);
  },

  // =========================================================================
  // BƯỚC 4: Thầy/Cô Upload bản ký phòng ban (PENDING_SIGNED_REVIEW - Chờ duyệt)
  // =========================================================================
  async uploadFacultySignature(id, facultySignedPdfUrl, evidenceFiles = [], user) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const applicantName = user?.name || dossier.createdBy?.name || 'Thầy/Cô Giảng viên';
    const rawEvidence = Array.isArray(evidenceFiles) ? evidenceFiles : [];

    const signedDir = path.join(config.uploadDir, 'signed');
    if (!fs.existsSync(signedDir)) {
      fs.mkdirSync(signedDir, { recursive: true });
    }

    const cleanEvidence = rawEvidence.map((ev, idx) => {
      const rawName = String(ev?.name || `minh-chung-${idx + 1}.pdf`);
      const safeFileName = `${dossier.code}-${Date.now()}-${rawName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let resolvedUrl = ev?.url || `/uploads/signed/${safeFileName}`;

      if (typeof ev?.dataUrl === 'string' && ev.dataUrl.includes('base64,')) {
        try {
          const base64Part = ev.dataUrl.split('base64,')[1];
          const fileBuffer = Buffer.from(base64Part, 'base64');
          const destPath = path.join(signedDir, safeFileName);
          fs.writeFileSync(destPath, fileBuffer);
          resolvedUrl = `/uploads/signed/${safeFileName}`;
        } catch (writeErr) {
          console.warn('[uploadFacultySignature] Không ghi được file base64:', writeErr.message);
        }
      }

      return {
        name: rawName,
        url: resolvedUrl,
        size: ev?.size || '',
        mimeType: ev?.mimeType || (rawName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : ''),
        type: rawName.toLowerCase().endsWith('.pdf') ? 'DEPARTMENT_SIGNED_PDF' : 'EVIDENCE',
        uploadedAt: new Date().toISOString(),
      };
    });

    const signedUrl =
      cleanEvidence.find((f) => f.url?.toLowerCase().endsWith('.pdf'))?.url ||
      facultySignedPdfUrl ||
      `/uploads/signed/${dossier.code}-department-signed.pdf`;

    const departmentSignedFiles =
      cleanEvidence.length > 0
        ? cleanEvidence
        : [
            {
              name: `${dossier.code}_Ban_Ky_Phong_Ban.pdf`,
              url: signedUrl,
              type: 'DEPARTMENT_SIGNED_PDF',
              uploadedAt: new Date().toISOString(),
            },
          ];

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 4,
      status: 'PENDING_SIGNED_REVIEW',
      title: 'Chờ duyệt (Đã tải lên bản ký phòng ban)',
      timestamp: new Date().toISOString(),
      note: `Thầy/Cô đã upload bản PDF có chữ ký phòng ban kèm ${cleanEvidence.length} tệp minh chứng`,
    });

    const updated = await dossierRepository.update(id, {
      status: 'PENDING_SIGNED_REVIEW',
      faculty_signed_pdf_url: signedUrl,
      evidence_files: cleanEvidence,
      department_signed_files: departmentSignedFiles,
      resubmitted_signed_files: departmentSignedFiles,
      timeline_logs: currentTimeline,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: user?.id || dossier.user_id,
      actorName: applicantName,
      actorRole: 'USER',
      action: 'UPLOAD_DEPARTMENT_SIGNED',
      fromStatus: prevStatus,
      toStatus: 'PENDING_SIGNED_REVIEW',
      notes: `Thầy/Cô upload file PDF đã ký phòng ban (${signedUrl}) và ${cleanEvidence.length} file minh chứng. Trạng thái: PENDING_SIGNED_REVIEW (Chờ duyệt).`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: config.smtp.adminNotificationEmail,
      recipientName: 'Cô Admin (Phòng KH&CN)',
      subject: `[CTUMP DocuGov] Thầy/Cô đã upload bản ký phòng ban: ${dossier.code} - Chờ duyệt`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Cô Admin (Phòng KH&CN),</h3>
          <p>Thầy/Cô <b>${applicantName}</b> vừa tải lên <b>bản PDF đã có chữ ký phòng ban</b> và <b>${cleanEvidence.length} tệp minh chứng</b> cho hồ sơ mã <b>${dossier.code}</b>.</p>
          <p>Trạng thái hiện tại: <b style="color: #d97706;">PENDING_SIGNED_REVIEW (Chờ duyệt)</b>.</p>
          <p>Kính mời Cô Admin kiểm tra file ký phòng ban và nhấn nút <b>"Chuyển sang Chờ ký Hiệu trưởng"</b>.</p>
        </div>
      `,
      stepName: 'Bước 4 - Upload bản ký phòng ban (Chờ duyệt)',
    });

    return updated;
  },

  // =========================================================================
  // BƯỚC 5: Admin Chuyển Trình ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
  // =========================================================================
  async submitToRector(id, note, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const applicantEmail =
      dossier.applicant_email || dossier.createdBy?.email || 'thayco.giangvien@ctump.edu.vn';
    const applicantName = dossier.createdBy?.name || 'Thầy/Cô';
    const cleanNote =
      sanitizeStringValue(note) ||
      'Đã kiểm tra hợp lệ chữ ký phòng ban, hồ sơ đang được trình Hiệu trưởng ký ban hành.';

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 5,
      status: 'WAITING_RECTOR_SIGNATURE',
      title: 'Chờ ký Hiệu trưởng',
      timestamp: new Date().toISOString(),
      note: cleanNote,
    });

    const updated = await dossierRepository.update(id, {
      status: 'WAITING_RECTOR_SIGNATURE',
      khcn_signed: true,
      timeline_logs: currentTimeline,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      actorRole: 'ADMIN',
      action: 'SUBMIT_TO_RECTOR',
      fromStatus: prevStatus,
      toStatus: 'WAITING_RECTOR_SIGNATURE',
      notes: `Admin chuyển trạng thái sang WAITING_RECTOR_SIGNATURE (Chờ ký Hiệu trưởng). Ghi chú: "${cleanNote}"`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: applicantEmail,
      recipientName: applicantName,
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} đã chuyển sang Chờ ký Hiệu trưởng`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #1e3a8a;">Kính gửi Thầy/Cô ${applicantName},</h3>
          <p>Bản ký phòng ban và minh chứng của hồ sơ <b>${dossier.code}</b> đã được Phòng KH&CN kiểm tra hợp lệ.</p>
          <p>Hồ sơ hiện đã được chuyển sang trạng thái <b>Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)</b>. Ngay khi có chữ ký Hiệu trưởng, hệ thống sẽ gửi email kèm bản PDF hoàn tất đến Thầy/Cô.</p>
        </div>
      `,
      stepName: 'Bước 5 - Chờ ký Hiệu trưởng',
    });

    return updated;
  },

  async updateSchoolSigning(id, signingFlags = {}, adminUser) {
    return this.submitToRector(id, signingFlags.note || '', adminUser);
  },

  // =========================================================================
  // BƯỚC 6: Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED - Đã ký và lưu trữ)
  // =========================================================================
  async completeDossier(id, completionData = {}, adminUser) {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) throw new Error('Không tìm thấy hồ sơ');

    const prevStatus = dossier.status;
    const currentVer = Number(dossier.current_version || 1);
    const { decisionNumber, decisionDate, finalPdfUrl, finalPdfPath } = completionData;
    const applicantEmail =
      dossier.applicant_email || dossier.createdBy?.email || 'thayco.giangvien@ctump.edu.vn';
    const applicantName = dossier.createdBy?.name || 'Thầy/Cô';
    const effectiveDecisionNumber =
      sanitizeStringValue(decisionNumber) || `${dossier.code}/QĐ-ĐHYDCT`;
    const effectiveDecisionDate =
      decisionDate || new Date().toISOString().slice(0, 10);

    // Luôn đảm bảo có file PDF đã ký vật lý trên ổ đĩa để đính kèm vào Gmail SMTP
    let resolvedPdfPath = finalPdfPath || resolveUploadAbsolutePath(finalPdfUrl);
    let resolvedPdfUrl = finalPdfUrl;

    if (!resolvedPdfPath || !fs.existsSync(resolvedPdfPath)) {
      const currentFormData = dossier.form_data || dossier.formData || {};
      const isMau2a =
        String(dossier.template_id || dossier.templateId).includes('2a') ||
        String(dossier.templateCode).includes('2a') ||
        String(dossier.title || dossier.templateTitle).toLowerCase().includes('kế hoạch') ||
        Boolean(currentFormData.plan_code || currentFormData.product_name);

      const effectiveTemplateId = dossier.template_id || dossier.templateId || (isMau2a ? 'tmpl-cgcn-2a' : 'tmpl-cgcn-1a');
      const effectiveTemplateCode = dossier.templateCode || (isMau2a ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN');
      const effectiveTemplateTitle =
        dossier.templateTitle ||
        dossier.title ||
        (isMau2a
          ? 'Kế hoạch tổ chức chuyển giao công nghệ trong trường'
          : 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

      const signedGen = await documentGeneratorService.generateVersionedDocuments({
        code: dossier.code,
        formData: currentFormData,
        templateId: effectiveTemplateId,
        templateCode: effectiveTemplateCode,
        templateTitle: effectiveTemplateTitle,
        version: currentVer,
        previousFiles: [],
        isCompleted: true,
        decisionNumber: effectiveDecisionNumber,
      });
      resolvedPdfPath = signedGen.generatedPdfPath;
      resolvedPdfUrl = finalPdfUrl || signedGen.generatedPdfUrl;
    }

    const currentTimeline = Array.isArray(dossier.timeline_logs) ? [...dossier.timeline_logs] : [];
    currentTimeline.push({
      step: 6,
      status: 'SIGNED_ARCHIVED',
      title: 'Đã ký và lưu trữ',
      timestamp: new Date().toISOString(),
      note: `Hoàn tất ký Hiệu trưởng (Số QĐ: ${effectiveDecisionNumber}) và lưu trữ hồ sơ vĩnh viễn`,
    });

    const updated = await dossierRepository.update(id, {
      status: 'SIGNED_ARCHIVED',
      decision_number: effectiveDecisionNumber,
      decision_date: effectiveDecisionDate,
      final_signed_pdf_path: resolvedPdfUrl,
      final_pdf_url: resolvedPdfUrl,
      khcn_signed: true,
      bgh_signed: true,
      completed_at: new Date(),
      timeline_logs: currentTimeline,
    });

    await auditRepository.create({
      dossierId: dossier.id,
      actorId: adminUser?.id || 'usr-admin',
      actorName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      actorRole: 'ADMIN',
      action: 'SIGN_AND_ARCHIVE',
      fromStatus: prevStatus,
      toStatus: 'SIGNED_ARCHIVED',
      notes: `Xác nhận "Đã ký và lưu trữ" (SIGNED_ARCHIVED). Số QĐ: ${effectiveDecisionNumber}. Đã gửi Gmail SMTP đính kèm bản PDF có chữ ký cuối cùng.`,
    });

    await emailService.sendEmail({
      dossierId: dossier.id,
      recipientEmail: applicantEmail,
      recipientName: applicantName,
      subject: `[CTUMP DocuGov] Hồ sơ ${dossier.code} ĐÃ KÝ VÀ LƯU TRỮ - Kèm file PDF chính thức`,
      content: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h3 style="color: #047857;">Kính gửi Thầy/Cô ${applicantName},</h3>
          <p>Chúc mừng Thầy/Cô! Hồ sơ chuyển giao công nghệ mã <b>${dossier.code}</b> (${dossier.title}) đã được Hiệu trưởng ký duyệt hoàn tất và lưu trữ chính thức (<b>SIGNED_ARCHIVED</b>).</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #ecfdf5; width: 32%;"><b>Số Quyết định:</b></td><td style="padding: 8px; border: 1px solid #ddd;"><b>${effectiveDecisionNumber}</b></td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #ecfdf5;"><b>Ngày ký ban hành:</b></td><td style="padding: 8px; border: 1px solid #ddd;">${effectiveDecisionDate}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #ecfdf5;"><b>Trạng thái:</b></td><td style="padding: 8px; border: 1px solid #ddd; color: #047857; font-weight: bold;">Đã ký và lưu trữ (SIGNED_ARCHIVED)</td></tr>
          </table>
          <p>Văn bản PDF có chữ ký cuối cùng đã được <b>đính kèm trực tiếp trong email này</b> và sẵn sàng tải về tại trang <b>"Chi tiết đơn"</b> hoặc <b>"Hồ sơ của tôi"</b>.</p>
        </div>
      `,
      stepName: 'Bước 6 - Đã ký và lưu trữ (Kèm PDF chính thức)',
      attachments: [
        {
          filename: `${dossier.code}_Da_Ky_Luu_Tru.pdf`,
          path: resolvedPdfPath,
          contentType: 'application/pdf',
        },
      ],
    });

    return updated;
  },

  async confirmSigned(id, completionData, adminUser) {
    return this.completeDossier(id, completionData, adminUser);
  },

  // =========================================================================
  // Xuất trực tiếp file PDF của phiên bản mới nhất khớp 100% với dữ liệu Web Form & Cấu hình duyệt của Admin
  // =========================================================================
  async exportPdf(id, overrideData = {}) {
    const dossier = await dossierRepository.findById(id);
    const code = dossier?.code || overrideData.code || 'CGCN-2026-0001';
    const currentVer = Number(dossier?.current_version || overrideData.version || 1);

    const requestedCheck = `${overrideData.templateId || ''} ${overrideData.templateCode || ''} ${overrideData.templateTitle || ''} ${overrideData.formTarget || ''}`.toLowerCase();
    let isMau2a = false;
    if (requestedCheck.includes('1a') || requestedCheck.includes('tờ trình') || requestedCheck.includes('to trinh')) {
      isMau2a = false;
    } else if (requestedCheck.includes('2a') || requestedCheck.includes('kế hoạch') || requestedCheck.includes('ke hoach')) {
      isMau2a = true;
    } else {
      const fallbackCheck = `${dossier?.template_id || ''} ${dossier?.templateCode || ''} ${dossier?.title || ''}`.toLowerCase();
      isMau2a =
        fallbackCheck.includes('2a') ||
        fallbackCheck.includes('kế hoạch') ||
        fallbackCheck.includes('ke hoach');
    }

    const baseForm = dossier?.form_data || dossier?.formData || {};
    const specificForm = isMau2a
      ? (dossier?.form_data_2a || dossier?.formData2a || {})
      : (dossier?.form_data_1a || dossier?.formData1a || {});
    const overrideForm =
      overrideData.formData && Object.keys(overrideData.formData).length > 0
        ? overrideData.formData
        : {};

    const formData = sanitizeFormPayload({
      ...baseForm,
      ...specificForm,
      ...overrideForm,
    });

    const sigConfig =
      overrideData.signatureConfig ||
      overrideData.signature_config ||
      overrideForm._signatureConfig ||
      dossier?.signature_config ||
      dossier?.signatureConfig ||
      null;

    const templateTitle = isMau2a
      ? 'Kế hoạch tổ chức chuyển giao công nghệ trong trường'
      : 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu';

    const templateCode = isMau2a ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN';

    const statusUpper = String(dossier?.status || '').toUpperCase();
    const isCompleted =
      statusUpper === 'SIGNED_ARCHIVED' ||
      statusUpper === 'SIGNED' ||
      statusUpper === 'COMPLETED';

    const pdfRes = await generateLockedPdf(
      code,
      {
        ...formData,
        templateId: isMau2a ? 'tmpl-cgcn-2a' : 'tmpl-cgcn-1a',
        templateCode,
        _signatureConfig: sigConfig,
        _version: currentVer,
        _isCompleted: isCompleted,
        _decisionNumber: dossier?.decision_number || '',
      },
      templateTitle,
      templateCode,
      `${code}-${isMau2a ? '2a' : '1a'}-v${currentVer}.pdf`
    );

    return {
      ...pdfRes,
      filename: pdfRes.fileName,
    };
  },
};
