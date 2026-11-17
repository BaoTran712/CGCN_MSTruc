import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth, requireAdmin, limitLogin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/users — Yêu cầu đăng nhập
router.get('/', requireAuth, userController.getAll);
router.get('/me', requireAuth, (req, res) => res.json({ success: true, data: req.user }));

// GET /api/users/:id — Yêu cầu đăng nhập
router.get('/:id', requireAuth, userController.getById);

// POST /api/users — Chỉ ADMIN mới được tạo/sửa user
router.post('/', requireAuth, requireAdmin, userController.save);

// POST /api/users/login — PUBLIC (endpoint đăng nhập)
router.post('/login', limitLogin, userController.login);

export default router;
