import { Router } from 'express';
import { isDbConnected } from '../config/database.js';
import userRoute from './userRoute.js';
import templateRoute from './templateRoute.js';
import dossierRoute from './dossierRoute.js';
import auditRoute from './auditRoute.js';
import emailRoute from './emailRoute.js';
import { userController } from '../controllers/userController.js';

const router = Router();

// 1. Hệ thống & Giám sát kết nối (Health Check)
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'CTUMP CGCN Backend API (Lean Workflow) đang hoạt động',
    databaseConnected: isDbConnected(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Định tuyến tập trung vào Dossier (Đã loại bỏ hoàn toàn /projects)
router.use('/dossiers', dossierRoute);
router.use('/users', userRoute);
router.use('/templates', templateRoute);
router.use('/audit-logs', auditRoute);
router.use('/email-logs', emailRoute);

// Alias đăng nhập SSO
router.post('/auth/login', userController.login);

export default router;
