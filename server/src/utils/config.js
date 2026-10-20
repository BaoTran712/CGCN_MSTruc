import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (supports both server/.env and root .env)
const serverEnvPath = path.resolve(__dirname, '../../.env');
const fallbackEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config({ path: fallbackEnvPath });
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
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
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"CTUMP DocuGov" <khcn@ctump.edu.vn>',
  },
  driveFolderUrl:
    process.env.GOOGLE_DRIVE_FOLDER_URL ||
    'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  jwtSecret: process.env.JWT_SECRET || 'ctump-docugov-jwt-secret-dev-only-change-in-production',
};
