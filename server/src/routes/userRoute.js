import { Router } from 'express';
import { userController } from '../controllers/userController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// GET /api/users — Yêu cầu đăng nhập
router.get('/', requireAuth, userController.getAll);

// GET /api/users/:id — Yêu cầu đăng nhập
router.get('/:id', requireAuth, userController.getById);

// POST /api/users — Chỉ ADMIN mới được tạo/sửa user
router.post('/', requireAuth, requireAdmin, userController.save);

// POST /api/users/login — PUBLIC (endpoint đăng nhập)
router.post('/login', userController.login);

export default router;
