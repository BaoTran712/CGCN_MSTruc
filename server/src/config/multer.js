import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_BASE = path.resolve(__dirname, '../../uploads');
export const PDF_DIR = path.join(UPLOADS_BASE, 'pdf');
export const ATTACHMENTS_DIR = path.join(UPLOADS_BASE, 'attachments');
export const DOCX_DIR = path.join(UPLOADS_BASE, 'docx');

[PDF_DIR, ATTACHMENTS_DIR, DOCX_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      file.fieldname === 'faculty_signed_pdf' ||
      file.fieldname === 'final_decision_pdf' ||
      ext === '.pdf'
    ) {
      cb(null, PDF_DIR);
    } else if (ext === '.docx' || ext === '.doc') {
      cb(null, DOCX_DIR);
    } else {
      cb(null, ATTACHMENTS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 60);

    cb(null, `${timestamp}-${baseName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExts = /\.(pdf|docx|doc|xlsx|xls|png|jpg|jpeg|zip|rar)$/i;
  if (!allowedExts.test(path.extname(file.originalname))) {
    return cb(
      new Error('Loại file không được hỗ trợ. Vui lòng chọn file PDF, Word, Excel, Ảnh hoặc File nén (.zip/.rar).')
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter,
});

// Middleware cho API 2: Admin Tiền kiểm upload file chỉnh tay (fixed_files)
export const uploadPrecheckFixedFiles = upload.array('fixed_files', 5);

// Middleware cho API 3: User upload hồ sơ đã ký cấp Khoa & Minh chứng
export const uploadDossierEvidence = upload.fields([
  { name: 'faculty_signed_pdf', maxCount: 2 },
  { name: 'contract_doc', maxCount: 2 },
  { name: 'acceptance_minutes', maxCount: 2 },
  { name: 'evidence_files', maxCount: 15 },
]);

// Middleware cho API 5: Admin upload Quyết định cuối cùng
export const uploadFinalDecision = upload.single('final_decision_pdf');

export default upload;
