import { Router } from 'express';
import { templateController } from '../controllers/templateController.js';

const router = Router();

// GET /api/templates
router.get('/', templateController.getAll);

// GET /api/templates/:id
router.get('/:id', templateController.getById);

// POST /api/templates
router.post('/', templateController.save);

export default router;
