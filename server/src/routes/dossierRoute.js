import { Router } from 'express';
import { dossierController } from '../controllers/dossierController.js';
import { uploadSignedAndEvidence, uploadFinalSignedPdf } from '../middlewares/uploadMiddleware.js';
import { sanitizePayloadMiddleware } from '../utils/sanitizer.js';
import { optionalAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Áp dụng middleware làm sạch payload & nhận diện token cho toàn bộ route quản lý đơn
router.use(sanitizePayloadMiddleware);
router.use(optionalAuth);

// Dọn dẹp dữ liệu rác & file mồ côi
router.post('/cleanup-garbage', requireAdmin, dossierController.cleanupGarbage);

// Lấy danh sách & chi tiết đơn
router.get('/', dossierController.getAll);
router.get('/:id', dossierController.getById);

// BƯỚC 1: Thầy/Cô gửi đơn mới (SUBMITTED - v1)
router.post('/', dossierController.create);

// BƯỚC 2A [LUỒNG FALSE]: Admin trả về sửa lỗi (RETURNED_FOR_REVISION)
router.patch('/:id/return-revision', requireAdmin, dossierController.returnForRevision);
router.post('/:id/return-revision', requireAdmin, dossierController.returnForRevision);
router.post('/:id/precheck', requireAdmin, dossierController.adminPrecheck);

// BƯỚC 2B [LUỒNG FALSE]: Thầy/Cô chỉnh sửa & nộp lại (SUBMITTED - v2, v3...)
router.patch('/:id/resubmit-1a', dossierController.resubmit1a);
router.put('/:id/resubmit-1a', dossierController.resubmit1a);
router.post('/:id/resubmit-1a', dossierController.resubmit1a);
router.patch('/:id/resubmit-2a', dossierController.resubmit2a);
router.put('/:id/resubmit-2a', dossierController.resubmit2a);
router.post('/:id/resubmit-2a', dossierController.resubmit2a);
router.put('/:id/resubmit', dossierController.resubmit);
router.post('/:id/resubmit', dossierController.resubmit);
router.patch('/:id/resubmit', dossierController.resubmit);
router.put('/:id', dossierController.updateFormData);

// BƯỚC 3 [LUỒNG TRUE / SAU KHI SỬA XONG]: Admin nhấn Duyệt (VALIDATED + gửi Mail kèm PDF v{current_version})
router.patch('/:id/approve', requireAdmin, dossierController.approve);
router.post('/:id/approve', requireAdmin, dossierController.approve);

// BƯỚC 4: Thầy/Cô upload bản ký phòng ban + minh chứng (PENDING_SIGNED_REVIEW - Chờ duyệt)
router.post('/:id/reupload-signed', uploadSignedAndEvidence.array('files', 10), dossierController.reuploadSigned);
router.post('/:id/faculty-signed', uploadSignedAndEvidence.array('files', 10), dossierController.uploadFacultySignature);

// BƯỚC 5: Admin chuyển sang Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
router.patch('/:id/submit-to-rector', requireAdmin, dossierController.submitToRector);
router.post('/:id/submit-to-rector', requireAdmin, dossierController.submitToRector);
router.post('/:id/school-signing', requireAdmin, dossierController.updateSchoolSigning);

// BƯỚC 6: Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED + gửi Mail kèm PDF cuối cùng)
router.patch('/:id/confirm-signed', uploadFinalSignedPdf.single('file'), requireAdmin, dossierController.confirmSigned);
router.post('/:id/confirm-signed', uploadFinalSignedPdf.single('file'), requireAdmin, dossierController.confirmSigned);
router.post('/:id/complete', uploadFinalSignedPdf.single('file'), requireAdmin, dossierController.completeDossier);

// Xuất file PDF chuẩn theo phiên bản mới nhất
router.get('/:id/export-pdf', dossierController.exportPdf);
router.post('/:id/export-pdf', dossierController.exportPdf);

export default router;
