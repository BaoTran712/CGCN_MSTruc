import fs from 'node:fs';
import { dossierService } from '../services/dossierService.js';
import { ApiResponse } from '../dtos/apiResponse.js';
import { cleanupGarbageData } from '../utils/cleanupGarbageData.js';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import { ownsDossier } from '../middlewares/dossierAccess.js';
import { canAccessUpload } from '../middlewares/fileAccess.js';
import { removeUploadedFiles } from '../middlewares/uploadMiddleware.js';
import { uploadError } from '../services/signedUploadFiles.js';

export const dossierController = {
  // GET /api/dossiers & GET /api/applications
  async getAll(req, res) {
    try {
      const all = await dossierService.getAll();
      const dossiers = req.user.role === 'ADMIN' ? all : all.filter(dossier => ownsDossier(req.user,dossier));
      return ApiResponse.success(dossiers, 'Lấy danh sách hồ sơ thành công').send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
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
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 1: POST /api/applications (Thầy/Cô điền Form & Khởi tạo file v1 - SUBMITTED)
  async create(req, res) {
    try {
      const {
        templateId,
        templateTitle,
        templateCode,
        formData,
        form_data,
        formData1a,
        form_data_1a,
        formData2a,
        form_data_2a,
        status_1a,
        status_2a,
        ten_de_tai,
        truong_don_vi,
        signature_config,
        signatureConfig,
        user,
        status,
      } = req.body;
      const payloadForm = formData || form_data;
      if (!templateId || !payloadForm) {
        return ApiResponse.error('Dữ liệu không hợp lệ: thiếu templateId hoặc formData', 400).send(res);
      }

      const created = await dossierService.createDossier(
        {
          templateId,
          templateTitle,
          templateCode,
          formData: payloadForm,
          formData1a: formData1a || form_data_1a,
          formData2a: formData2a || form_data_2a,
          status_1a: req.user.role === 'ADMIN' ? status_1a : 'PENDING',
          status_2a: req.user.role === 'ADMIN' ? status_2a : 'PENDING',
          ten_de_tai,
          truong_don_vi,
          signature_config: signature_config || signatureConfig,
          status,
        },
        req.user
      );

      return ApiResponse.success(
        created,
        'Gửi đơn thành công (SUBMITTED - Phiên bản v1). Đã sinh đồng bộ bộ file Word và PDF v1.',
        201
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 2A [LUỒNG FALSE]: PATCH /api/applications/:id/return-revision (Trả về sửa lỗi)
  async returnForRevision(req, res) {
    try {
      const { id } = req.params;
      const {
        revisionNote,
        revision_note,
        reviewNotes,
        rejection_reason,
        comment,
        adminUser,
        status_1a,
        status_2a,
        target_form,
        rejected_target,
        rejectedTarget,
      } = req.body || {};
      const note =
        rejection_reason || revisionNote || revision_note || reviewNotes || comment || '';
      const targetForm = target_form || rejected_target || rejectedTarget || null;

      const updated = await dossierService.returnForRevision(
        id,
        note,
        req.user,
        { status_1a, status_2a, target_form: targetForm, rejected_target: targetForm }
      );

      return ApiResponse.success(
        updated,
        'Đã chuyển trạng thái đơn sang "Trả về sửa lỗi" (RETURNED_FOR_REVISION) và ghi nhận thông báo email kèm gợi ý sửa chữa cho Thầy/Cô.'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 2B [LUỒNG FALSE - RIÊNG BIỂU MẪU 1A]: PATCH /api/applications/:id/resubmit-1a
  async resubmit1a(req, res) {
    try {
      const { id } = req.params;
      const {
        formData1a,
        form_data_1a,
        formData,
        form_data,
        ten_de_tai,
        truong_don_vi,
        user,
      } = req.body || {};
      const payload1a = formData1a || form_data_1a || formData || form_data;

      if (!payload1a) {
        return ApiResponse.error('Thiếu dữ liệu biểu mẫu 1a cần nộp lại (formData1a)', 400).send(res);
      }

      const updated = await dossierService.resubmit1a(
        id,
        payload1a,
        req.user,
        { ten_de_tai, truong_don_vi }
      );

      return ApiResponse.success(
        updated,
        `Nộp lại Biểu mẫu 1a thành công (Phiên bản v${updated.current_version}). Biểu mẫu 2a giữ nguyên phiên bản đã nộp.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 2B [LUỒNG FALSE - RIÊNG BIỂU MẪU 2A]: PATCH /api/applications/:id/resubmit-2a
  async resubmit2a(req, res) {
    try {
      const { id } = req.params;
      const {
        formData2a,
        form_data_2a,
        formData,
        form_data,
        user,
      } = req.body || {};
      const payload2a = formData2a || form_data_2a || formData || form_data;

      if (!payload2a) {
        return ApiResponse.error('Thiếu dữ liệu biểu mẫu 2a cần nộp lại (formData2a)', 400).send(res);
      }

      const updated = await dossierService.resubmit2a(
        id,
        payload2a,
        req.user
      );

      return ApiResponse.success(
        updated,
        `Nộp lại Biểu mẫu 2a thành công (Phiên bản v${updated.current_version}). Biểu mẫu 1a giữ nguyên phiên bản đã nộp.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 2B [LUỒNG FALSE]: PUT /api/applications/:id/resubmit (Thầy/Cô sửa lại form & Nộp lại v2, v3...)
  async resubmit(req, res) {
    try {
      const { id } = req.params;
      const {
        formData,
        form_data,
        formData1a,
        form_data_1a,
        formData2a,
        form_data_2a,
        target_form,
        rejected_target,
        ten_de_tai,
        truong_don_vi,
        user,
      } = req.body || {};

      if (target_form === '1a' || rejected_target === '1a') {
        return dossierController.resubmit1a(req, res);
      }
      if (target_form === '2a' || rejected_target === '2a') {
        return dossierController.resubmit2a(req, res);
      }

      const payloadForm = formData || form_data || formData1a || form_data_1a;

      if (!payloadForm) {
        return ApiResponse.error('Thiếu dữ liệu biểu mẫu chỉnh sửa (formData)', 400).send(res);
      }

      const updated = await dossierService.resubmitDossier(
        id,
        payloadForm,
        req.user,
        {
          formData1a: formData1a || form_data_1a,
          formData2a: formData2a || form_data_2a,
          target_form: target_form || rejected_target,
          ten_de_tai,
          truong_don_vi,
        }
      );

      return ApiResponse.success(
        updated,
        `Nộp lại hồ sơ thành công (Phiên bản v${updated.current_version}). Đã dọn file nháp cũ và kết xuất lại bộ file Word + PDF mới nhất.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // PUT /api/applications/:id (Cập nhật các trường dữ liệu như status_1a, status_2a, signature_config hoặc nộp lại form)
  async updateFormData(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const userFields = ['formData','form_data','formData1a','form_data_1a','formData2a','form_data_2a','target_form','rejected_target','ten_de_tai','truong_don_vi','user'];
      if (req.user.role !== 'ADMIN' && Object.keys(body).some(key => !userFields.includes(key))) return ApiResponse.error('Bạn không có quyền thay đổi các trường này.',403).send(res);
      const { formData, form_data } = body;
      if (formData || form_data) {
        return dossierController.resubmit(req, res);
      }

      const adminProtectedFields = [
        'status',
        'status_1a',
        'status_2a',
        'signature_config',
        'signatureConfig',
        'decision_number',
        'decisionNumber',
        'bgh_signed',
        'khcn_signed',
        'khtc_signed',
      ];
      const touchesAdminField = adminProtectedFields.some((k) => body[k] !== undefined);
      if (touchesAdminField) {
        let allowed = false;
        requireAdmin(req, res, () => {
          allowed = true;
        });
        if (!allowed) return;
      }

      const updated = await dossierService.updateFields(id, body, req.user);
      return ApiResponse.success(updated, 'Cập nhật thông tin hồ sơ thành công').send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // POST /api/dossiers/:id/precheck (Hỗ trợ cả Duyệt hợp lệ và Trả về sửa lỗi)
  async adminPrecheck(req, res) {
    try {
      const { id } = req.params;
      const {
        isValid,
        reviewNotes,
        revisionNote,
        rejection_reason,
        adminUser,
        status_1a,
        status_2a,
        target_form,
        rejected_target,
        rejectedTarget,
      } = req.body || {};
      const note = rejection_reason || revisionNote || reviewNotes || '';
      const targetForm = target_form || rejected_target || rejectedTarget || null;

      const updated = await dossierService.adminPrecheck(
        id,
        Boolean(isValid),
        note,
        req.user,
        { status_1a, status_2a, target_form: targetForm, rejected_target: targetForm }
      );

      const message = isValid
        ? 'Đã duyệt hồ sơ hợp lệ (VALIDATED) và ghi nhận thông báo email kèm file PDF chuẩn.'
        : 'Đã trả về sửa lỗi (RETURNED_FOR_REVISION) kèm gợi ý chỗ sai cho Thầy/Cô.';

      return ApiResponse.success(updated, message).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
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
        req.user
      );

      return ApiResponse.success(
        updated,
        `Hồ sơ đã hợp lệ (VALIDATED - Phiên bản v${updated.current_version}). Hệ thống đã ghi nhận thông báo email đính kèm trực tiếp file PDF chuẩn mới nhất đến Thầy/Cô.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  // BƯỚC 4: POST /api/applications/:id/reupload-signed (Thầy/Cô Upload bản ký phòng ban - PENDING_SIGNED_REVIEW)
  async reuploadSigned(req, res) {
    try {
      let retained=[];
      try { retained=req.body.retainedEvidence?JSON.parse(req.body.retainedEvidence):[]; }
      catch { throw uploadError('Danh sách minh chứng giữ lại không hợp lệ.'); }
      if(!Array.isArray(retained)||retained.some(file=>!file||typeof file.url!=='string'))throw uploadError('Danh sách minh chứng giữ lại không hợp lệ.');
      const selection=(file,retainedUrl)=>{
        if(file)return {name:file.originalname,url:'/uploads/'+(file.mimetype==='application/pdf'?'signed':'evidence')+'/'+file.filename,size:(file.size/1024).toFixed(1)+' KB',mimeType:file.mimetype,fresh:true};
        return retainedUrl?{url:retainedUrl}:null;
      };
      const packet={
        signed1a:selection(req.files?.signed1a?.[0],req.body.retainedSigned1a),
        signed2a:selection(req.files?.signed2a?.[0],req.body.retainedSigned2a),
        evidenceFiles:[...retained.map(file=>({url:file.url})),...(req.files?.evidence||[]).map(file=>selection(file))],
      };
      const updated=await dossierService.uploadFacultySignature(req.params.id,packet,req.user);
      return ApiResponse.success(updated,'Đã nộp hai bản ký 1a/2a và minh chứng để Admin kiểm tra.').send(res);
    } catch(err) {
      removeUploadedFiles(req);
      return ApiResponse.error(err.message,err.statusCode||500).send(res);
    }
  },

  async returnSignedUpload(req,res) {
    try {
      const updated=await dossierService.returnSignedUpload(req.params.id,req.body?.reason,req.user);
      return ApiResponse.success(updated,'Đã trả lại bản ký/minh chứng và ghi nhận yêu cầu tải lại. Nội dung 1a/2a giữ nguyên.').send(res);
    } catch(err) { return ApiResponse.error(err.message,err.statusCode||500).send(res); }
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
        req.user
      );

      return ApiResponse.success(
        updated,
        'Đã chuyển trạng thái đơn sang "Chờ ký Hiệu trưởng" (WAITING_RECTOR_SIGNATURE).'
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
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
      let finalPdfPath;
      if (finalPdfUrl && !(await canAccessUpload(req.user,finalPdfUrl))) throw uploadError('Tệp không hợp lệ.');
      const decisionNumber = req.body?.decisionNumber;
      const decisionDate = req.body?.decisionDate;

      if (req.file) {
        finalPdfUrl = `/uploads/pdf/${req.file.filename}`;
        finalPdfPath = req.file.path;
      } else if (req.files && req.files.length > 0) {
        finalPdfUrl = `/uploads/pdf/${req.files[0].filename}`;
        finalPdfPath = req.files[0].path;
      }

      const adminUser = req.user;

      const updated = await dossierService.completeDossier(
        id,
        { decisionNumber, decisionDate, finalPdfUrl, finalPdfPath },
        adminUser
      );

      return ApiResponse.success(
        updated,
        'Xác nhận "Đã ký và lưu trữ" (SIGNED_ARCHIVED) thành công. Hệ thống đã khóa hồ sơ lưu trữ và ghi nhận thông báo email kèm file PDF đã ký cuối cùng cho Thầy/Cô.'
      ).send(res);
    } catch (err) {
      removeUploadedFiles(req);
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
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
      return res.download(pdfRes.filePath,pdfRes.fileName,error=>{if(pdfRes.temporary)fs.rmSync(pdfRes.filePath,{force:true});if(error&&!res.headersSent)res.status(500).end();});
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },

  async rollback(req,res) {
    try { return ApiResponse.success(await dossierService.rollbackVersion(req.params.id,Number(req.body.targetVersionNumber),req.user),'Đã phục hồi dữ liệu từ phiên bản đã chọn.').send(res); }
    catch(error){return ApiResponse.error(error.message,400).send(res);}
  },

  // POST /api/applications/cleanup-garbage
  async cleanupGarbage(req, res) {
    try {
      const report = await cleanupGarbageData({apply:req.body?.apply === true});
      return ApiResponse.success(
        report,
        `Dọn dẹp hoàn tất: Đã xóa ${report.removedDbRecords} bản ghi rác và ${report.removedOrphanFiles} file mồ côi.`
      ).send(res);
    } catch (err) {
      return ApiResponse.error(err.message, err.statusCode || 500).send(res);
    }
  },
};
