import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './utils/config.js';
import { initDb } from './utils/db.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    name: 'CTUMP DocuGov Backend Service',
    description: 'Hệ thống Quản lý Hồ sơ Chuyển giao Công nghệ CTUMP',
    status: 'Running',
    endpoints: {
      dossiers: '/api/dossiers',
      templates: '/api/templates',
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

import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start Server
async function start() {
  await initDb();
  const localIp = getLocalIp();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  CTUMP DocuGov Backend NodeJS Server`);
    console.log(`  - Local:   http://localhost:${config.port}`);
    console.log(`  - Network: http://${localIp}:${config.port}`);
    console.log(`  - Status:  http://${localIp}:${config.port}/api/status`);
    console.log(`=======================================================`);
  });
}

start();

export default app;
