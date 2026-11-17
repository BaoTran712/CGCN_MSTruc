import '../config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:' + (process.env.PORT || '5001'),
  adminEmail: process.env.ADMIN_EMAIL || 'tranthibaotran.2k@gmail.com',
  adminEmails: (
    process.env.ADMIN_EMAILS ||
    'tranthibaotran.2k@gmail.com,toanhkhai@gmail.com,toanhkhai12345@gmail.com,admin@ctump.edu.vn,heykagvip@gmail.com'
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ctump_docugov',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Hệ thống Hỗ trợ Quy trình" <email_he_thong@gmail.com>',
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'tranthibaotran.2k@gmail.com',
  },
  driveFolderUrl:
    process.env.GOOGLE_DRIVE_FOLDER_URL ||
    'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link',
  uploadDir: process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(__dirname, '../../uploads'),
  jwtSecret: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.APP_URL || '').split(',').map(value => value.trim()).filter(Boolean),
  mailDisabled: process.env.MAIL_DISABLED === 'true',
};

export function validateConfig() {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('PORT không hợp lệ.');
  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('dev-only')) throw new Error('Production yêu cầu JWT_SECRET riêng, tối thiểu 32 ký tự.');
    if (!config.smtp.user || !config.smtp.pass) console.warn('[SMTP] Chưa cấu hình gửi email. Thông báo sẽ được lưu PENDING để gửi lại.');
  }
}
