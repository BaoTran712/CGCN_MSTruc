import { Router } from 'express';
import { emailController } from '../controllers/emailController.js';

const router = Router();

// GET /api/email-logs
router.get('/', emailController.getAll);

// POST /api/email-logs
router.post('/', emailController.sendEmail);

export default router;
