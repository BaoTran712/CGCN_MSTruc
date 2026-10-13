import { projectRepository } from '../repositories/projectRepository.js';
import { documentService } from './documentService.js';

export const projectService = {
  /**
   * Tiếp nhận form từ React -> mapping Word (documentService) -> lưu DB (transfer_projects, attachments, audit_logs)
   */
  async createProject(dto) {
    dto.validate();

    const code = await projectRepository.generateNextCode();

    // 1. Dịch vụ sinh văn bản Word bằng pizzip + docxtemplater
    let docxResult = null;
    try {
      docxResult = await documentService.generateDocx(code, dto.formData, dto.templateId);
    } catch (docxErr) {
      console.warn(`[ProjectService] Không thể sinh Word tự động (${docxErr.message}), tiếp tục tạo bản ghi DB.`);
    }

    // 2. Lưu dự án vào transfer_projects
    const project = await projectRepository.create({
      code,
      title: dto.title,
      userId: dto.userId,
      templateId: dto.templateId,
      departmentName: dto.departmentName,
      status: dto.status || 'NEW',
      formData: dto.formData,
      docxFileUrl: docxResult?.fileUrl || null,
      hasFinancialImplication: dto.hasFinancialImplication,
    });

    // 3. Lưu file docx vào bảng attachments nếu sinh thành công
    if (docxResult) {
      await projectRepository.addAttachment({
        projectId: project.id,
        fileName: docxResult.fileName,
        filePath: docxResult.filePath,
        fileUrl: docxResult.fileUrl,
        fileType: 'docx',
        fileSize: docxResult.fileSize,
        uploadedBy: dto.userId,
      });
    }

    // 4. Ghi nhận log khởi tạo hồ sơ vào audit_logs
    await projectRepository.addAuditLog({
      projectId: project.id,
      dossierId: null,
      actorId: dto.userId,
      actorName: project.createdBy?.name || 'Cán bộ phụ trách',
      actorRole: project.createdBy?.role || 'USER',
      action: 'CREATE',
      fromStatus: null,
      toStatus: project.status,
      notes: `Khởi tạo hồ sơ ${project.code} qua Web Form và tự động mapping file Word chuẩn.`,
    });

    // Lấy lại thông tin đầy đủ kèm attachments và timeline
    return projectRepository.findById(project.id);
  },

  /**
   * Lấy chi tiết hồ sơ và timeline log cho component dossiers & timeline
   */
  async getProjectById(idOrCode) {
    const project = await projectRepository.findById(idOrCode);
    if (!project) {
      throw new Error(`Không tìm thấy hồ sơ dự án với mã/ID: ${idOrCode}`);
    }
    return project;
  },

  /**
   * Lấy danh sách toàn bộ dự án
   */
  async getAllProjects(filter = {}) {
    return projectRepository.findAll(filter);
  },

  /**
   * Admin duyệt hoặc yêu cầu sửa
   */
  async reviewProject(id, dto) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new Error(`Không tìm thấy hồ sơ dự án: ${id}`);
    }

    const fromStatus = project.status;
    let toStatus = 'PRECHECK_PASSED';
    let action = 'REVIEW_APPROVE';
    let precheckPdfUrl = project.precheckPdfUrl;

    if (dto.isValid) {
      toStatus = 'PRECHECK_PASSED';
      action = 'REVIEW_APPROVE';
      // Giả lập đường dẫn PDF khóa layout
      if (!precheckPdfUrl) {
        precheckPdfUrl = `/uploads/pdf/${project.code}-locked.pdf`;
      }
    } else {
      toStatus = 'NEEDS_REVISION';
      action = 'REVIEW_REJECT';
    }

    const updated = await projectRepository.update(project.id, {
      status: toStatus,
      reviewNotes: dto.reviewNotes,
      precheckPdfUrl,
      reviewedAt: new Date(),
    });

    // Ghi audit log
    await projectRepository.addAuditLog({
      projectId: project.id,
      dossierId: null,
      actorId: dto.actor.id,
      actorName: dto.actor.name,
      actorRole: dto.actor.role || 'ADMIN',
      action,
      fromStatus,
      toStatus,
      notes: dto.reviewNotes || (dto.isValid ? 'Admin tiền kiểm đạt chuẩn thể thức.' : 'Admin yêu cầu chỉnh sửa lại hồ sơ.'),
    });

    return projectRepository.findById(project.id);
  },

  /**
   * Cán bộ upload PDF ký Khoa
   */
  async uploadDeanSigned(id, dto) {
    dto.validate();

    const project = await projectRepository.findById(id);
    if (!project) {
      throw new Error(`Không tìm thấy hồ sơ dự án: ${id}`);
    }

    const file = dto.file;
    const fileUrl = `/uploads/pdf/${file.filename}`;
    const fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    // 1. Thêm bản ghi vào attachments
    await projectRepository.addAttachment({
      projectId: project.id,
      fileName: file.originalname,
      filePath: file.path.replace(/\\/g, '/'),
      fileUrl,
      fileType: 'dean_signed_pdf',
      fileSize,
      uploadedBy: dto.actor.id,
    });

    // 2. Cập nhật trạng thái transfer_projects
    const fromStatus = project.status;
    const toStatus = 'FACULTY_SIGNED';

    await projectRepository.update(project.id, {
      status: toStatus,
      deanSignedPdfUrl: fileUrl,
    });

    // 3. Ghi audit log
    await projectRepository.addAuditLog({
      projectId: project.id,
      dossierId: null,
      actorId: dto.actor.id,
      actorName: dto.actor.name,
      actorRole: dto.actor.role || 'USER',
      action: 'UPLOAD_DEAN_SIGNED',
      fromStatus,
      toStatus,
      notes: dto.notes || `Đã tải lên tệp PDF ký số cấp Khoa: ${file.originalname}`,
    });

    return projectRepository.findById(project.id);
  },

  /**
   * Admin đóng hồ sơ hoàn tất
   */
  async completeProject(id, dto) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new Error(`Không tìm thấy hồ sơ dự án: ${id}`);
    }

    const fromStatus = project.status;
    const toStatus = 'COMPLETED';

    await projectRepository.update(project.id, {
      status: toStatus,
      decisionNumber: dto.decisionNumber || project.decisionNumber,
      decisionDate: dto.decisionDate || project.decisionDate,
      finalPdfUrl: dto.finalPdfUrl || project.finalPdfUrl || `/uploads/pdf/${project.code}-final.pdf`,
      completedAt: new Date(),
    });

    // Ghi audit log
    await projectRepository.addAuditLog({
      projectId: project.id,
      dossierId: null,
      actorId: dto.actor.id,
      actorName: dto.actor.name,
      actorRole: dto.actor.role || 'ADMIN',
      action: 'COMPLETE',
      fromStatus,
      toStatus,
      notes: dto.notes || `Ban hành Quyết định ${dto.decisionNumber || ''} và chính thức đóng hoàn tất hồ sơ.`,
    });

    return projectRepository.findById(project.id);
  },
};

export default projectService;
