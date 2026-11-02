import { Router } from 'express';
import { templateController } from '../controllers/templateController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/templates — Đọc danh sách biểu mẫu
router.get('/', templateController.getAll);

// GET /api/templates/:id — Đọc chi tiết biểu mẫu
router.get('/:id', templateController.getById);

// POST /api/templates — Tạo/cập nhật biểu mẫu (Chỉ ADMIN)
router.post('/', requireAuth, requireAdmin, templateController.save);

export default router;
