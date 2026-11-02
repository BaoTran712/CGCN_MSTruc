import { Router } from 'express';
import { emailController } from '../controllers/emailController.js';

const router = Router();

// GET /api/email-logs/verify-smtp
router.get('/verify-smtp', emailController.verifySmtp);

// POST /api/email-logs/test
router.post('/test', emailController.testSend);

// GET /api/email-logs
router.get('/', emailController.getAll);

// POST /api/email-logs
router.post('/', emailController.sendEmail);

export default router;
