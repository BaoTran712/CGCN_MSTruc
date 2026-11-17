import { Router } from 'express';
import { checkDb } from '../utils/db.js';
import { limitLogin } from '../middlewares/authMiddleware.js';
import userRoute from './userRoute.js';
import templateRoute from './templateRoute.js';
import dossierRoute from './dossierRoute.js';
import auditRoute from './auditRoute.js';
import emailRoute from './emailRoute.js';
import { userController } from '../controllers/userController.js';

const router = Router();
router.use((_req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });

// =========================================================================
// 1. Hệ thống & Giám sát kết nối (Health Check)
// =========================================================================
router.get('/live', (_req,res) => res.json({success:true}));
router.get('/status', async (req, res) => {
  try { await checkDb(); } catch { return res.status(503).json({success:false,databaseConnected:false,message:'Cơ sở dữ liệu hoặc schema chưa sẵn sàng.'}); }
  res.json({
    success: true,
    message: 'CTUMP CGCN Backend API đang hoạt động',
    databaseConnected: true,
    timestamp: new Date().toISOString(),
  });
});

// =========================================================================
// 2. Định tuyến đồng bộ 3-Layer (Route -> Controller -> Service -> Repository)
// =========================================================================
router.use('/users', userRoute);
router.use('/templates', templateRoute);
router.use('/dossiers', dossierRoute);
router.use('/applications', dossierRoute);
router.use('/projects', dossierRoute);
router.use('/audit-logs', auditRoute);
router.use('/email-logs', emailRoute);

// Alias đăng nhập
router.post('/auth/login', limitLogin, userController.login);

export default router;
