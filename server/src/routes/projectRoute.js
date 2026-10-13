import { Router } from 'express';
import { projectController } from '../controllers/projectController.js';
import { uploadDeanSigned, uploadProjectFiles } from '../config/multer.js';

const router = Router();

/**
 * 1. POST /api/projects
 * Tiếp nhận form từ React -> mapping Word -> lưu DB (transfer_projects, attachments, audit_logs)
 */
router.post('/', uploadProjectFiles, projectController.create);

/**
 * 2. GET /api/projects
 * Lấy danh sách hồ sơ chuyển giao công nghệ
 */
router.get('/', projectController.getAll);

/**
 * 3. GET /api/projects/:id
 * Lấy chi tiết hồ sơ và timeline log cho component dossiers & timeline
 */
router.get('/:id', projectController.getById);

/**
 * 4. POST /api/projects/:id/review
 * Admin duyệt hoặc yêu cầu sửa
 */
router.post('/:id/review', projectController.review);

/**
 * 5. POST /api/projects/:id/upload-dean-signed
 * Cán bộ upload PDF ký Khoa (multer lưu vào server/uploads/pdf/)
 */
router.post('/:id/upload-dean-signed', uploadDeanSigned, projectController.uploadDeanSigned);

/**
 * 6. POST /api/projects/:id/complete
 * Admin đóng hồ sơ
 */
router.post('/:id/complete', projectController.complete);

export default router;
