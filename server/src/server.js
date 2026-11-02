import express from 'express';
import cors from 'cors';
import { config } from './utils/config.js';
import { initDb } from './config/database.js';
import apiRoutes from './routes/api.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file uploads (PDF, DOCX, Evidence)
app.use('/uploads', express.static(config.uploadDir));

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'CTUMP DocuGov Backend Service (Lean Architecture)',
    description: 'Hệ thống Quản lý Hồ sơ Chuyển giao Công nghệ CTUMP',
    status: 'Running',
    endpoints: {
      dossiers: '/api/dossiers',
      users: '/api/users',
      status: '/api/status',
    },
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
});

async function start() {
  await initDb();
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`  CTUMP DocuGov Backend NodeJS Server (Lean Workflow)`);
    console.log(`  Địa chỉ: http://localhost:${config.port}`);
    console.log(`  Tài liệu API: http://localhost:${config.port}/api/status`);
    console.log(`=======================================================`);
  });
}

start();

export default app;
