import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/audit-logs — Yêu cầu quyền ADMIN
router.get('/', requireAuth, requireAdmin, auditController.getAll);

// POST /api/audit-logs — Yêu cầu đăng nhập
router.post('/', requireAuth, auditController.create);

export default router;
