import { Router } from 'express';
import { isDbConnected } from '../utils/db.js';
import userRoute from './userRoute.js';
import templateRoute from './templateRoute.js';
import dossierRoute from './dossierRoute.js';
import auditRoute from './auditRoute.js';
import emailRoute from './emailRoute.js';
import projectRoute from './projectRoute.js';
import { userController } from '../controllers/userController.js';

const router = Router();

// =========================================================================
// 1. Hệ thống & Giám sát kết nối (Health Check)
// =========================================================================
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'CTUMP CGCN Backend API đang hoạt động',
    databaseConnected: isDbConnected(),
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// 2. Định tuyến đồng bộ 3-Layer (Route -> Controller -> Service -> Repository)
// =========================================================================
router.use('/projects', projectRoute);
router.use('/users', userRoute);
router.use('/templates', templateRoute);
router.use('/dossiers', dossierRoute);
router.use('/audit-logs', auditRoute);
router.use('/email-logs', emailRoute);

// Alias backward-compatibility cho endpoint đăng nhập SSO
router.post('/auth/login', userController.login);

export default router;
