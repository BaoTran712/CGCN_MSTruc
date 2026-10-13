import { Router } from 'express';
import { dossierController } from '../controllers/dossierController.js';

const router = Router();

// GET /api/dossiers
router.get('/', dossierController.getAll);

// GET /api/dossiers/:id
router.get('/:id', dossierController.getById);

// POST /api/dossiers (Bước 1 & 2: Khởi tạo hồ sơ, sinh mã CGCN-XXXX, mapping Word)
router.post('/', dossierController.create);

// PUT /api/dossiers/:id (Cập nhật form khi có yêu cầu sửa đổi hoặc lưu nháp)
router.put('/:id', dossierController.updateFormData);

// POST /api/dossiers/:id/precheck (Bước 2: Admin Tiền kiểm)
router.post('/:id/precheck', dossierController.adminPrecheck);

// POST /api/dossiers/:id/faculty-signed (Bước 3 & 6: User upload bản ký cấp Khoa + Minh chứng)
router.post('/:id/faculty-signed', dossierController.uploadFacultySignature);

// POST /api/dossiers/:id/school-signing (Bước 4 & 7: Admin cập nhật tiến độ ký số cấp Trường)
router.post('/:id/school-signing', dossierController.updateSchoolSigning);

// POST /api/dossiers/:id/complete (Bước 4 & 8: Ban hành Quyết định CGCN & Đóng hồ sơ)
router.post('/:id/complete', dossierController.completeDossier);

export default router;
