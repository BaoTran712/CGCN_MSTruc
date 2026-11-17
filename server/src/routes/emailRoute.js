import { Router } from 'express';
import { emailController } from '../controllers/emailController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/email-logs/verify-smtp
router.get('/verify-smtp', requireAuth, requireAdmin, emailController.verifySmtp);

// POST /api/email-logs/test
router.post('/test', requireAuth, requireAdmin, emailController.testSend);

// GET /api/email-logs — Yêu cầu quyền ADMIN
router.get('/', requireAuth, requireAdmin, emailController.getAll);

// POST /api/email-logs — Yêu cầu đăng nhập
router.post('/', requireAuth, requireAdmin, emailController.sendEmail);

export default router;
