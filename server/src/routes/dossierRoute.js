import { Router } from 'express';
import { dossierController } from '../controllers/dossierController.js';
import { uploadSignedAndEvidence, uploadFinalSignedPdf } from '../middlewares/uploadMiddleware.js';
import { sanitizePayloadMiddleware } from '../utils/sanitizer.js';

const router = Router();

// Áp dụng middleware làm sạch payload cho toàn bộ route quản lý đơn
router.use(sanitizePayloadMiddleware);

// Dọn dẹp dữ liệu rác & file mồ côi
router.post('/cleanup-garbage', dossierController.cleanupGarbage);

// Lấy danh sách & chi tiết đơn
router.get('/', dossierController.getAll);
router.get('/:id', dossierController.getById);

// BƯỚC 1: Thầy/Cô gửi đơn mới (SUBMITTED - v1)
router.post('/', dossierController.create);

// BƯỚC 2A [LUỒNG FALSE]: Admin trả về sửa lỗi (RETURNED_FOR_REVISION)
router.patch('/:id/return-revision', dossierController.returnForRevision);
router.post('/:id/return-revision', dossierController.returnForRevision);
router.post('/:id/precheck', dossierController.adminPrecheck);

// BƯỚC 2B [LUỒNG FALSE]: Thầy/Cô chỉnh sửa & nộp lại (SUBMITTED - v2, v3...)
router.put('/:id/resubmit', dossierController.resubmit);
router.post('/:id/resubmit', dossierController.resubmit);
router.put('/:id', dossierController.updateFormData);

// BƯỚC 3 [LUỒNG TRUE / SAU KHI SỬA XONG]: Admin nhấn Duyệt (VALIDATED + gửi Mail kèm PDF v{current_version})
router.patch('/:id/approve', dossierController.approve);
router.post('/:id/approve', dossierController.approve);

// BƯỚC 4: Thầy/Cô upload bản ký phòng ban + minh chứng (PENDING_SIGNED_REVIEW - Chờ duyệt)
router.post('/:id/reupload-signed', uploadSignedAndEvidence.array('files', 10), dossierController.reuploadSigned);
router.post('/:id/faculty-signed', uploadSignedAndEvidence.array('files', 10), dossierController.uploadFacultySignature);

// BƯỚC 5: Admin chuyển sang Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
router.patch('/:id/submit-to-rector', dossierController.submitToRector);
router.post('/:id/submit-to-rector', dossierController.submitToRector);
router.post('/:id/school-signing', dossierController.updateSchoolSigning);

// BƯỚC 6: Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED + gửi Mail kèm PDF cuối cùng)
router.patch('/:id/confirm-signed', uploadFinalSignedPdf.single('file'), dossierController.confirmSigned);
router.post('/:id/confirm-signed', uploadFinalSignedPdf.single('file'), dossierController.confirmSigned);
router.post('/:id/complete', uploadFinalSignedPdf.single('file'), dossierController.completeDossier);

// Xuất file PDF chuẩn theo phiên bản mới nhất
router.get('/:id/export-pdf', dossierController.exportPdf);
router.post('/:id/export-pdf', dossierController.exportPdf);

export default router;
