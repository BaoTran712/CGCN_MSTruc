import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';

const router = Router();

// GET /api/audit-logs
router.get('/', auditController.getAll);

// POST /api/audit-logs
router.post('/', auditController.create);

export default router;
