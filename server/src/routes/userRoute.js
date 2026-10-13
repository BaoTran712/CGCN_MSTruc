import { Router } from 'express';
import { userController } from '../controllers/userController.js';

const router = Router();

// GET /api/users
router.get('/', userController.getAll);

// GET /api/users/:id
router.get('/:id', userController.getById);

// POST /api/users
router.post('/', userController.save);

// POST /api/users/login
router.post('/login', userController.login);

export default router;
