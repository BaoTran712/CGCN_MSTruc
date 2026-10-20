import { Router } from 'express';
import { dossierController } from '../controllers/dossierController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/dossiers — Yêu cầu đăng nhập
router.get('/', requireAuth, dossierController.getAll);

// GET /api/dossiers/:id — Yêu cầu đăng nhập
router.get('/:id', requireAuth, dossierController.getById);

// POST /api/dossiers (Bước 1 & 2: Khởi tạo hồ sơ) — Yêu cầu đăng nhập
router.post('/', requireAuth, dossierController.create);

// PUT /api/dossiers/:id (Cập nhật form) — Yêu cầu đăng nhập
router.put('/:id', requireAuth, dossierController.updateFormData);

// POST /api/dossiers/:id/precheck (Bước 2: Admin Tiền kiểm) — Chỉ ADMIN
router.post('/:id/precheck', requireAuth, requireAdmin, dossierController.adminPrecheck);

// POST /api/dossiers/:id/faculty-signed (Bước 3 & 6: User upload bản ký) — Yêu cầu đăng nhập
router.post('/:id/faculty-signed', requireAuth, dossierController.uploadFacultySignature);

// POST /api/dossiers/:id/school-signing (Bước 4 & 7: Admin cập nhật ký cấp Trường) — Chỉ ADMIN
router.post('/:id/school-signing', requireAuth, requireAdmin, dossierController.updateSchoolSigning);

// POST /api/dossiers/:id/complete (Bước 4 & 8: Ban hành QĐ & Đóng hồ sơ) — Chỉ ADMIN
router.post('/:id/complete', requireAuth, requireAdmin, dossierController.completeDossier);

export default router;
