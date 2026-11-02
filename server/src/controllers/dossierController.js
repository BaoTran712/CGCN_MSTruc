import { dossierService } from '../services/dossierService.js';
import { ApiResponse } from '../dtos/apiResponse.js';
import { cleanupGarbageData } from '../utils/cleanupGarbageData.js';

export const dossierController = {
  // GET /api/dossiers & GET /api/applications
  async getAll(_req, res) {
    try {
      const dossiers = await dossierService.getAll();
      return ApiResponse.success(dossiers, 'Lấy danh sách hồ sơ thành công').send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/dossiers/:id & GET /api/applications/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const dossier = await dossierService.getById(id);
      if (!dossier) {
        return ApiResponse.error('Không tìm thấy hồ sơ', 404).send(res);
      }
      return ApiResponse.success(dossier, 'Lấy chi tiết hồ sơ thành công').send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // BƯỚC 1: POST /api/applications (Thầy/Cô điền Form & Khởi tạo file v1 - SUBMITTED)
  async create(req, res) {
    try {
      const { templateId, templateTitle, templateCode, formData, form_data, user, status } = req.body;
      const payloadForm = formData || form_data;
      if (!templateId || !payloadForm) {
        return ApiResponse.error('Dữ liệu không hợp lệ: thiếu templateId hoặc formData', 400).send(res);
      }

      const created = await dossierService.createDossier(
        { templateId, templateTitle, templateCode, formData: payloadForm, status },
        user || req.user
      );

      return ApiResponse.success(
        created,
        'Gửi đơn thành công (SUBMITTED - Phiên bản v1). Đã sinh đồng bộ bộ file Word và PDF v1.',
        201
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // BƯỚC 2A [LUỒNG FALSE]: PATCH /api/applications/:id/return-revision (Trả về sửa lỗi)
  async returnForRevision(req, res) {
    try {
      const { id } = req.params;
      const { revisionNote, revision_note, reviewNotes, comment, adminUser } = req.body || {};
      const note = revisionNote || revision_note || reviewNotes || comment || '';

      const updated = await dossierService.returnForRevision(
        id,
        note,
        adminUser || req.user
      );

      return ApiResponse.success(
        updated,
        'Đã chuyển trạng thái đơn sang "Trả về sửa lỗi" (RETURNED_FOR_REVISION) và gửi email kèm gợi ý sửa chữa cho Thầy/Cô.'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // BƯỚC 2B [LUỒNG FALSE]: PUT /api/applications/:id/resubmit (Thầy/Cô sửa lại form & Nộp lại v2, v3...)
  async resubmit(req, res) {
    try {
      const { id } = req.params;
      const { formData, form_data, user } = req.body || {};
      const payloadForm = formData || form_data;

      if (!payloadForm) {
        return ApiResponse.error('Thiếu dữ liệu biểu mẫu chỉnh sửa (formData)', 400).send(res);
      }

      const updated = await dossierService.resubmitDossier(
        id,
        payloadForm,
        user || req.user
      );

      return ApiResponse.success(
        updated,
        `Nộp lại hồ sơ thành công (Phiên bản v${updated.current_version}). Đã dọn file nháp cũ và kết xuất lại bộ file Word + PDF mới nhất.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // PUT /api/applications/:id (Alias cập nhật formData & nộp lại)
  async updateFormData(req, res) {
    return dossierController.resubmit(req, res);
  },

  // POST /api/dossiers/:id/precheck (Hỗ trợ cả Duyệt hợp lệ và Trả về sửa lỗi)
  async adminPrecheck(req, res) {
    try {
      const { id } = req.params;
      const { isValid, reviewNotes, revisionNote, adminUser } = req.body || {};
      const note = revisionNote || reviewNotes || '';

      const updated = await dossierService.adminPrecheck(
        id,
        Boolean(isValid),
        note,
        adminUser || req.user
      );

      const message = isValid
        ? 'Đã duyệt hồ sơ hợp lệ (VALIDATED) và gửi email kèm file PDF chuẩn.'
        : 'Đã trả về sửa lỗi (RETURNED_FOR_REVISION) kèm gợi ý chỗ sai cho Thầy/Cô.';

      return ApiResponse.success(updated, message).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // BƯỚC 3 [LUỒNG TRUE / SAU KHI SỬA XONG]: PATCH /api/applications/:id/approve (Admin nhấn Duyệt)
  async approve(req, res) {
    try {
      const { id } = req.params;
      const { reviewNotes, adminUser } = req.body || {};

      const updated = await dossierService.approveApplication(
        id,
        reviewNotes || 'Hồ sơ đã được duyệt hợp lệ.',
        adminUser || req.user
      );

      return ApiResponse.success(
        updated,
        `Hồ sơ đã hợp lệ (VALIDATED - Phiên bản v${updated.current_version}). Hệ thống đã gửi email SMTP đính kèm trực tiếp file PDF chuẩn mới nhất đến Thầy/Cô.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // BƯỚC 4: POST /api/applications/:id/reupload-signed (Thầy/Cô Upload bản ký phòng ban - PENDING_SIGNED_REVIEW)
  async reuploadSigned(req, res) {
    try {
      const { id } = req.params;
      let facultySignedPdfUrl = req.body.facultySignedPdfUrl;
      let evidenceFiles = [];

      if (req.body.evidenceFiles) {
        try {
          evidenceFiles =
            typeof req.body.evidenceFiles === 'string'
              ? JSON.parse(req.body.evidenceFiles)
              : req.body.evidenceFiles;
        } catch {
          evidenceFiles = [];
        }
      }

      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        for (const file of req.files) {
          const isPdf = file.mimetype === 'application/pdf';
          const fileUrl = isPdf
            ? `/uploads/signed/${file.filename}`
            : `/uploads/evidence/${file.filename}`;

          if (isPdf && !facultySignedPdfUrl) {
            facultySignedPdfUrl = fileUrl;
          } else {
            evidenceFiles.push({
              name: file.originalname,
              url: fileUrl,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              path: file.path,
            });
          }
        }
      }

      const user = req.body.user
        ? typeof req.body.user === 'string'
          ? JSON.parse(req.body.user)
          : req.body.user
        : req.user;

      const updated = await dossierService.uploadFacultySignature(
        id,
        facultySignedPdfUrl,
        evidenceFiles,
        user
      );

      return ApiResponse.success(
        updated,
        'Đã tải lên bản ký phòng ban và minh chứng. Trạng thái đơn chuyển sang "Chờ duyệt" (PENDING_SIGNED_REVIEW) và đã gửi thông báo cho Cô Admin.'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  async uploadFacultySignature(req, res) {
    return dossierController.reuploadSigned(req, res);
  },

  // BƯỚC 5: PATCH /api/applications/:id/submit-to-rector (Admin chuyển sang Chờ ký Hiệu trưởng - WAITING_RECTOR_SIGNATURE)
  async submitToRector(req, res) {
    try {
      const { id } = req.params;
      const { note, adminUser } = req.body || {};

      const updated = await dossierService.submitToRector(
        id,
        note,
        adminUser || req.user
      );

      return ApiResponse.success(
        updated,
        'Đã chuyển trạng thái đơn sang "Chờ ký Hiệu trưởng" (WAITING_RECTOR_SIGNATURE).'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  async updateSchoolSigning(req, res) {
    return dossierController.submitToRector(req, res);
  },

  // BƯỚC 6: PATCH /api/applications/:id/confirm-signed (Hiệu trưởng Đã ký & Lưu trữ - SIGNED_ARCHIVED)
  async confirmSigned(req, res) {
    try {
      const { id } = req.params;
      let finalPdfUrl = req.body?.finalPdfUrl;
      let finalPdfPath = req.body?.finalPdfPath;
      const decisionNumber = req.body?.decisionNumber;
      const decisionDate = req.body?.decisionDate;

      if (req.file) {
        finalPdfUrl = `/uploads/pdf/${req.file.filename}`;
        finalPdfPath = req.file.path;
      } else if (req.files && req.files.length > 0) {
        finalPdfUrl = `/uploads/pdf/${req.files[0].filename}`;
        finalPdfPath = req.files[0].path;
      }

      const adminUser = req.body?.adminUser
        ? typeof req.body.adminUser === 'string'
          ? JSON.parse(req.body.adminUser)
          : req.body.adminUser
        : req.user;

      const updated = await dossierService.completeDossier(
        id,
        { decisionNumber, decisionDate, finalPdfUrl, finalPdfPath },
        adminUser
      );

      return ApiResponse.success(
        updated,
        'Xác nhận "Đã ký và lưu trữ" (SIGNED_ARCHIVED) thành công. Hệ thống đã khóa hồ sơ lưu trữ và gửi email kèm file PDF đã ký cuối cùng cho Thầy/Cô.'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  async completeDossier(req, res) {
    return dossierController.confirmSigned(req, res);
  },

  // GET & POST /api/applications/:id/export-pdf
  async exportPdf(req, res) {
    try {
      const { id } = req.params;
      const pdfRes = await dossierService.exportPdf(id, req.body || {});
      return res.download(pdfRes.filePath, pdfRes.fileName);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/applications/cleanup-garbage
  async cleanupGarbage(_req, res) {
    try {
      const report = await cleanupGarbageData();
      return ApiResponse.success(
        report,
        `Dọn dẹp hoàn tất: Đã xóa ${report.removedDbRecords} bản ghi rác và ${report.removedOrphanFiles} file mồ côi.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
