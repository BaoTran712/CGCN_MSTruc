import { Router } from 'express';
import { dossierController } from '../controllers/dossierController.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middlewares/authMiddleware.js';
import {
  uploadPrecheckFixedFiles,
  uploadDossierEvidence,
  uploadFinalDecision,
} from '../config/multer.js';

const router = Router();

// =========================================================================
// NHÓM ROUTE TĨNH / TIỆN ÍCH (Đặt trước /:id để tránh xung đột tham số)
// =========================================================================

// Danh sách Khoa/Đơn vị chuẩn (Dropdown chống gõ sai tên đơn vị)
router.get('/departments', optionalAuth, dossierController.getDepartments);

// API 6.3: Xuất Báo cáo Thống kê Excel cho Admin
router.get('/export-excel', requireAuth, requireAdmin, dossierController.exportExcel);

// API 6.2: Stream file vật lý về trình duyệt bằng res.download()
router.get(['/download/:fileId', '/Download/:fileId'], optionalAuth, dossierController.downloadFile);

// =========================================================================
// 6 API CỐT LÕI CỦA LUỒNG TINH GỌN (LEAN WORKFLOW)
// =========================================================================

// Lấy danh sách hồ sơ (hỗ trợ filter)
router.get('/', requireAuth, dossierController.getAll);

// API 1.1: Nộp mới Web Form & Tự động Sinh File Word (Tờ trình 1a & Kế hoạch 2a)
router.post('/submit', requireAuth, dossierController.submit);
router.post('/', requireAuth, dossierController.submit); // Alias

// API 1.2: Cập nhật & Nộp lại Web Form sau khi bị trả về sửa chữa
router.put('/:id/resubmit', requireAuth, dossierController.resubmit);
router.put('/:id', requireAuth, dossierController.resubmit); // Alias

// API 2: Admin Tiền kiểm: Duyệt / Trả về sửa chữa / Upload file chỉnh tay (multipart/form-data)
router.post(
  '/:id/precheck',
  requireAuth,
  requireAdmin,
  uploadPrecheckFixedFiles,
  dossierController.precheck
);

// API 3: User Upload Hồ sơ đã ký cấp Khoa & Minh chứng (multipart/form-data với multer.fields)
router.post(
  '/:id/upload-evidence',
  requireAuth,
  uploadDossierEvidence,
  dossierController.uploadEvidence
);
router.post(
  '/:id/faculty-signed',
  requireAuth,
  uploadDossierEvidence,
  dossierController.uploadEvidence
); // Alias

// API 4: Admin Kiểm duyệt Bộ File Upload & Cập nhật Tiến độ Trình Hiệu trưởng
router.post(
  '/:id/review-evidence',
  requireAuth,
  requireAdmin,
  dossierController.reviewEvidence
);

// API 5: Admin Upload Quyết định Cuối cùng & Đóng Hồ sơ (multipart/form-data)
router.post(
  '/:id/complete',
  requireAuth,
  requireAdmin,
  uploadFinalDecision,
  dossierController.complete
);

// API 6.1: Lấy Chi tiết Hồ sơ (Kèm Thanh tiến độ Progress Stepper, Danh sách Download & Audit Logs)
router.get('/:id/download-standard', optionalAuth, dossierController.downloadStandardFile);
router.get('/:id', requireAuth, dossierController.getById);

export default router;
