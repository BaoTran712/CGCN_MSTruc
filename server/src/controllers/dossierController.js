import { dossierService } from '../services/dossierService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const dossierController = {
  // GET /api/dossiers — Lấy danh sách hồ sơ (hỗ trợ filter theo query params)
  async getAll(req, res) {
    try {
      const { fromDate, toDate, department_id, status, user_id } = req.query;
      const dossiers = await dossierService.getAll({
        fromDate,
        toDate,
        department_id,
        status,
        user_id,
      });
      return ApiResponse.success(dossiers, 'Lấy danh sách hồ sơ thành công').send(res);
    } catch (err) {
      console.error('[dossierController.getAll]', err);
      return ApiResponse.error(err.message || 'Lỗi khi lấy danh sách hồ sơ', 500).send(res);
    }
  },

  // GET /api/dossiers/departments — Lấy danh sách 7 Khoa/Đơn vị chuẩn
  async getDepartments(req, res) {
    try {
      const departments = await dossierService.getDepartments();
      return ApiResponse.success(departments, 'Lấy danh mục Khoa/Đơn vị thành công').send(res);
    } catch (err) {
      console.error('[dossierController.getDepartments]', err);
      return ApiResponse.error(err.message || 'Lỗi khi lấy danh mục đơn vị', 500).send(res);
    }
  },

  // GET /api/dossiers/export-excel — API 6.3: Xuất báo cáo thống kê Excel (.xlsx / .csv UTF-8 BOM)
  async exportExcel(req, res) {
    try {
      const { fromDate, toDate, department_id, status, format } = req.query;
      const { fileName, buffer, contentType } = await dossierService.exportExcelReport({
        fromDate,
        toDate,
        department_id,
        status,
        format,
      });

      res.setHeader('Content-Type', contentType || 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      return res.status(200).send(buffer);
    } catch (err) {
      console.error('[dossierController.exportExcel]', err);
      return ApiResponse.error(err.message || 'Lỗi khi xuất báo cáo Excel', 500).send(res);
    }
  },

  // GET /api/dossiers/download/:fileId — API 6.2: Stream file vật lý bằng res.download()
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const fileInfo = await dossierService.getFileForDownload(fileId);
      if (!fileInfo) {
        return ApiResponse.error('Không tìm thấy tệp đính kèm', 404).send(res);
      }

      return res.download(fileInfo.absolutePath, fileInfo.file_name, (err) => {
        if (err && !res.headersSent) {
          console.error('[dossierController.downloadFile]', err);
          return ApiResponse.error('Không thể tải tệp xuống', 500).send(res);
        }
      });
    } catch (err) {
      console.error('[dossierController.downloadFile]', err);
      return ApiResponse.error(err.message || 'Lỗi khi tải tệp đính kèm', 404).send(res);
    }
  },

  // GET /api/dossiers/:id/download-standard — API 6.2b: Tải bản chuẩn Bước 3 (Ưu tiên ADMIN_FIXED_DOC, nếu không lấy bản tự sinh)
  async downloadStandardFile(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.query;
      const fileInfo = await dossierService.getStandardFileForDownload(id, type);
      if (!fileInfo) {
        return ApiResponse.error('Không tìm thấy bản chuẩn để tải xuống', 404).send(res);
      }

      return res.download(fileInfo.absolutePath, fileInfo.file_name, (err) => {
        if (err && !res.headersSent) {
          console.error('[dossierController.downloadStandardFile]', err);
          return ApiResponse.error('Không thể tải bản chuẩn xuống', 500).send(res);
        }
      });
    } catch (err) {
      console.error('[dossierController.downloadStandardFile]', err);
      return ApiResponse.error(err.message || 'Lỗi khi tải bản chuẩn', 404).send(res);
    }
  },

  // GET /api/dossiers/:id — API 6.1: Lấy Chi tiết Hồ sơ (Kèm Thanh tiến độ & Danh sách Download)
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
      return ApiResponse.error(err.message || 'Lỗi khi lấy chi tiết hồ sơ', 500).send(res);
    }
  },

  // POST /api/dossiers/submit — API 1.1: Nộp mới Web Form & Tự động Sinh File Word
  async submit(req, res) {
    try {
      const payload = req.body || {};
      const user = req.user || payload.user || null;

      const deptId =
        payload.department_id ||
        payload.departmentId ||
        payload.form_data?.department_id ||
        payload.formData?.department_id;

      const techName =
        payload.technology_name ||
        payload.technologyName ||
        payload.title ||
        payload.form_data?.technology_name ||
        payload.formData?.technology_name ||
        payload.form_data?.product_name ||
        payload.formData?.product_name ||
        payload.form_data?.research_title ||
        payload.formData?.research_title;

      if (!deptId) {
        return ApiResponse.error('Vui lòng chọn Khoa/Đơn vị (department_id).', 400).send(res);
      }
      if (!techName) {
        return ApiResponse.error(
          'Vui lòng nhập Tên công nghệ / quy trình chuyển giao (technology_name).',
          400
        ).send(res);
      }

      const normalizedPayload = {
        ...payload,
        department_id: Number(deptId),
        technology_name: techName,
        form_data: payload.form_data || payload.formData || {},
        transfer_type: payload.transfer_type || payload.transferType || 'APPLICATION',
        transfer_target: payload.transfer_target || payload.transferTarget || '',
        purpose: payload.purpose || '',
        has_workshop:
          payload.has_workshop !== undefined
            ? payload.has_workshop
            : (payload.hasWorkshop ?? payload.co_hoi_thao ?? 0),
        has_budget:
          payload.has_budget !== undefined ? payload.has_budget : (payload.hasBudget ?? 0),
      };

      const created = await dossierService.submitDossier(normalizedPayload, user);
      return ApiResponse.success(
        created,
        'Nộp hồ sơ và tự động sinh bộ file Word chuẩn thành công',
        201
      ).send(res);
    } catch (err) {
      console.error('[dossierController.submit]', err);
      return ApiResponse.error(err.message || 'Lỗi khi nộp hồ sơ', 500).send(res);
    }
  },

  // PUT /api/dossiers/:id/resubmit — API 1.2: Cập nhật & Nộp lại Web Form sau khi bị trả về
  async resubmit(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body || {};
      const user = req.user || payload.user || null;

      const normalizedPayload = {
        ...payload,
        form_data: payload.form_data || payload.formData || {},
      };

      const updated = await dossierService.resubmitDossier(id, normalizedPayload, user);
      return ApiResponse.success(
        updated,
        `Đã cập nhật hồ sơ lên phiên bản v${updated.current_version} và sinh lại bộ file Word chuẩn`
      ).send(res);
    } catch (err) {
      console.error('[dossierController.resubmit]', err);
      return ApiResponse.error(err.message || 'Lỗi khi nộp lại hồ sơ', 500).send(res);
    }
  },

  // POST /api/dossiers/:id/precheck — API 2: Admin Tiền kiểm (Duyệt / Trả về sửa chữa / Upload file chỉnh tay)
  async precheck(req, res) {
    try {
      const { id } = req.params;
      const action = req.body?.action || (req.body?.isValid === false ? 'REJECT' : req.body?.isValid === true ? 'APPROVE' : null);
      const admin_note = req.body?.admin_note || req.body?.adminNote || req.body?.reviewNotes || '';
      const fixedFiles = Array.isArray(req.files) ? req.files : [];
      const adminUser = req.user || req.body?.adminUser || req.body?.actor || null;

      if (!action) {
        return ApiResponse.error(
          "Vui lòng truyền action ('APPROVE' hoặc 'REJECT').",
          400
        ).send(res);
      }

      const updated = await dossierService.precheckDossier(
        id,
        { action, admin_note, fixedFiles },
        adminUser
      );

      const msg =
        String(action).toUpperCase() === 'APPROVE'
          ? 'Đã duyệt tiền kiểm thể thức hồ sơ thành công (Bước 3).'
          : 'Đã trả hồ sơ về yêu cầu chỉnh sửa.';

      return ApiResponse.success(updated, msg).send(res);
    } catch (err) {
      console.error('[dossierController.precheck]', err);
      return ApiResponse.error(err.message || 'Lỗi khi xử lý tiền kiểm hồ sơ', 500).send(res);
    }
  },

  // POST /api/dossiers/:id/upload-evidence — API 3: User Upload Hồ sơ đã ký cấp Khoa & Minh chứng
  async uploadEvidence(req, res) {
    try {
      const { id } = req.params;
      const uploadedFilesMap = req.files || {};
      const user = req.user || req.body?.user || null;

      const updated = await dossierService.uploadEvidence(id, uploadedFilesMap, user, req.body || {});
      return ApiResponse.success(
        updated,
        'Đã tải lên hồ sơ ký cấp Khoa và minh chứng thành công (Bước 4).'
      ).send(res);
    } catch (err) {
      console.error('[dossierController.uploadEvidence]', err);
      return ApiResponse.error(err.message || 'Lỗi khi tải lên hồ sơ minh chứng', 500).send(res);
    }
  },

  // POST /api/dossiers/:id/review-evidence — API 4: Admin Kiểm duyệt Bộ File Upload & Cập nhật Tiến độ Trình Hiệu trưởng
  async reviewEvidence(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body || {};
      const admin_note = req.body?.admin_note || req.body?.adminNote || req.body?.reviewNotes || '';
      const adminUser = req.user || req.body?.adminUser || req.body?.actor || null;

      if (!action) {
        return ApiResponse.error(
          "Vui lòng truyền action ('APPROVE_FILES' hoặc 'REQUEST_REUPLOAD').",
          400
        ).send(res);
      }

      const updated = await dossierService.reviewEvidence(
        id,
        { action, admin_note },
        adminUser
      );

      const msg =
        String(action).toUpperCase() === 'APPROVE_FILES'
          ? 'Đã duyệt hồ sơ minh chứng, chuyển sang trạng thái đang trình Hiệu trưởng ký.'
          : 'Đã yêu cầu cán bộ upload lại bộ file minh chứng.';

      return ApiResponse.success(updated, msg).send(res);
    } catch (err) {
      console.error('[dossierController.reviewEvidence]', err);
      return ApiResponse.error(err.message || 'Lỗi khi kiểm duyệt bộ file minh chứng', 500).send(res);
    }
  },

  // POST /api/dossiers/:id/complete — API 5: Admin Upload Quyết định Cuối cùng & Đóng Hồ sơ
  async complete(req, res) {
    try {
      const { id } = req.params;
      const decision_number = req.body?.decision_number || req.body?.decisionNumber;
      const decision_date = req.body?.decision_date || req.body?.decisionDate;
      const drive_folder_url = req.body?.drive_folder_url || req.body?.driveFolderUrl;
      const finalDecisionFile = req.file || null;
      const adminUser = req.user || req.body?.adminUser || req.body?.actor || null;

      const updated = await dossierService.completeDossier(
        id,
        {
          decision_number,
          decision_date,
          drive_folder_url,
          finalDecisionFile,
        },
        adminUser
      );

      return ApiResponse.success(
        updated,
        `Đã upload Quyết định số ${updated.decision_number} và hoàn tất đóng hồ sơ (Bước 5).`
      ).send(res);
    } catch (err) {
      console.error('[dossierController.complete]', err);
      return ApiResponse.error(err.message || 'Lỗi khi hoàn tất đóng hồ sơ', 500).send(res);
    }
  },
};

export default dossierController;
