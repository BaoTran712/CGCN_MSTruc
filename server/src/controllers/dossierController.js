import { dossierService } from '../services/dossierService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const dossierController = {
  // GET /api/dossiers
  async getAll(req, res) {
    try {
      const dossiers = await dossierService.getAll();
      return ApiResponse.success(dossiers, 'Lấy danh sách hồ sơ thành công').send(res);
    } catch (err) {
      console.error('[dossierController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/dossiers/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const dossier = await dossierService.getById(id);
      if (!dossier) {
        return ApiResponse.error('Không tìm thấy hồ sơ', 404).send(res);
      }
      return ApiResponse.success(dossier, 'Lấy chi tiết hồ sơ thành công').send(res);
    } catch (err) {
      console.error('[dossierController.getById]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/dossiers (Bước 1 & 2: Khởi tạo hồ sơ, sinh mã CGCN-XXXX, mapping Word)
  async create(req, res) {
    try {
      const { templateId, templateTitle, templateCode, formData, user, status } = req.body;
      if (!templateId || !formData) {
        return ApiResponse.error('Dữ liệu không hợp lệ: thiếu templateId hoặc formData', 400).send(res);
      }

      const created = await dossierService.create(
        { templateId, templateTitle, templateCode, formData, status },
        user
      );

      return ApiResponse.success(created, 'Khởi tạo hồ sơ CGCN thành công', 201).send(res);
    } catch (err) {
      console.error('[dossierController.create]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/dossiers/:id/precheck (Bước 2: Admin Tiền kiểm)
  async adminPrecheck(req, res) {
    try {
      const { id } = req.params;
      const { isValid, reviewNotes, adminUser } = req.body;

      const updated = await dossierService.adminPrecheck(
        id,
        Boolean(isValid),
        reviewNotes,
        adminUser
      );

      const message = isValid
        ? 'Đã duyệt hợp lệ thể thức và tự động xuất bản file PDF chuẩn.'
        : 'Đã gửi yêu cầu bổ sung chỉnh sửa hồ sơ qua Gmail.';

      return ApiResponse.success(updated, message).send(res);
    } catch (err) {
      console.error('[dossierController.adminPrecheck]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // PUT /api/dossiers/:id (Bước 1 chỉnh sửa: User cập nhật lại form khi có yêu cầu)
  async updateFormData(req, res) {
    try {
      const { id } = req.params;
      const { formData, user, status } = req.body;

      if (!formData) {
        return ApiResponse.error('Thiếu dữ liệu formData', 400).send(res);
      }

      const updated = await dossierService.updateFormData(id, formData, user, status);
      const message = status === 'DRAFT' ? 'Đã lưu bản nháp thành công.' : 'Đã nộp lại hồ sơ thành công.';

      return ApiResponse.success(updated, message).send(res);
    } catch (err) {
      console.error('[dossierController.updateFormData]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/dossiers/:id/faculty-signed (Bước 3 & 6: Cán bộ tải PDF ký Khoa + Minh chứng)
  async uploadFacultySignature(req, res) {
    try {
      const { id } = req.params;
      const { facultySignedPdfUrl, evidenceFiles, user } = req.body;

      const updated = await dossierService.uploadFacultySignature(
        id,
        facultySignedPdfUrl,
        evidenceFiles,
        user
      );

      return ApiResponse.success(updated, 'Đã nộp bản ký cấp Khoa và minh chứng thành công.').send(res);
    } catch (err) {
      console.error('[dossierController.uploadFacultySignature]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/dossiers/:id/school-signing (Bước 4 & 7: Admin cập nhật tiến độ ký cấp Trường)
  async updateSchoolSigning(req, res) {
    try {
      const { id } = req.params;
      const { khcnSigned, khtcSigned, bghSigned, adminUser } = req.body;

      const updated = await dossierService.updateSchoolSigning(
        id,
        { khcnSigned, khtcSigned, bghSigned },
        adminUser
      );

      return ApiResponse.success(updated, 'Đã cập nhật tiến độ ký số cấp Trường.').send(res);
    } catch (err) {
      console.error('[dossierController.updateSchoolSigning]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/dossiers/:id/complete (Bước 4 & 8: Ban hành Quyết định CGCN & Đóng hồ sơ)
  async completeDossier(req, res) {
    try {
      const { id } = req.params;
      const { decisionNumber, decisionDate, finalPdfUrl, adminUser } = req.body;

      const updated = await dossierService.completeDossier(
        id,
        { decisionNumber, decisionDate, finalPdfUrl },
        adminUser
      );

      return ApiResponse.success(updated, 'Đã ban hành Quyết định CGCN và hoàn tất hồ sơ.').send(res);
    } catch (err) {
      console.error('[dossierController.completeDossier]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
