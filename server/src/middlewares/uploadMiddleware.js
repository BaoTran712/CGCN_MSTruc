import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../utils/config.js';

// Đảm bảo các thư mục upload tồn tại
const uploadBasePath = config.uploadDir;
const pdfDir = path.join(uploadBasePath, 'pdf');
const signedDir = path.join(uploadBasePath, 'signed');
const evidenceDir = path.join(uploadBasePath, 'evidence');

[uploadBasePath, pdfDir, signedDir, evidenceDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, signedDir);
    } else {
      cb(null, evidenceDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|jpe?g|png|webp|docx)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF hoặc định dạng hình ảnh JPG/PNG/WEBP'));
  }
};

export const uploadMulti = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter,
});

export const uploadSignedAndEvidence = uploadMulti;
export const uploadFinalSignedPdf = uploadMulti;


