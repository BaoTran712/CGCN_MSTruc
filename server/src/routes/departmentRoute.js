import { Router } from 'express';
import { departmentController } from '../controllers/departmentController.js';

const router = Router();

// GET /api/departments
router.get('/', departmentController.getAll);

// GET /api/departments/:id
router.get('/:id', departmentController.getById);

// POST /api/departments
router.post('/', departmentController.save);

export default router;
