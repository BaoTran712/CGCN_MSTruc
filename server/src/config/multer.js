import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Các thư mục lưu trữ file
const UPLOADS_BASE = path.resolve(__dirname, '../../uploads');
export const PDF_DIR = path.join(UPLOADS_BASE, 'pdf');
export const ATTACHMENTS_DIR = path.join(UPLOADS_BASE, 'attachments');
export const DOCX_DIR = path.join(UPLOADS_BASE, 'docx');

// Đảm bảo thư mục tồn tại
[PDF_DIR, ATTACHMENTS_DIR, DOCX_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Cấu hình storage linh hoạt phân loại theo field hoặc extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Nếu upload file ký Khoa (dean_signed_pdf) hoặc file PDF chỉ định
    if (
      file.fieldname === 'dean_signed_pdf' ||
      file.fieldname === 'pdf_file' ||
      file.fieldname === 'signed_pdf' ||
      (file.mimetype === 'application/pdf' && file.fieldname.includes('pdf'))
    ) {
      cb(null, PDF_DIR);
    } else {
      // Mặc định các minh chứng và tệp khác lưu vào attachments
      cb(null, ATTACHMENTS_DIR);
    }
  },
  filename: (req, file, cb) => {
    // Chuẩn hóa tên file an toàn, tránh ký tự đặc biệt
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 50);

    const finalName = `${timestamp}-${baseName}${ext}`;
    cb(null, finalName);
  },
});

// Giới hạn kích thước file 50MB
const fileFilter = (req, file, cb) => {
  // Cho phép pdf, doc, docx, xls, xlsx, zip, rar, png, jpg, jpeg
  const allowedExts = /\.(pdf|docx|doc|xlsx|xls|png|jpg|jpeg|zip|rar)$/i;
  if (!allowedExts.test(path.extname(file.originalname))) {
    return cb(new Error('Loại file không được hỗ trợ. Vui lòng chọn file PDF, Word, Excel, Ảnh hoặc File nén.'));
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

// Middleware chuyên dụng cho PDF ký Khoa
export const uploadDeanSigned = upload.single('dean_signed_pdf');

// Middleware chuyên dụng cho đính kèm minh chứng
export const uploadAttachments = upload.array('attachments', 10);

// Middleware tổng hợp hỗ trợ cả 2
export const uploadProjectFiles = upload.fields([
  { name: 'dean_signed_pdf', maxCount: 1 },
  { name: 'attachments', maxCount: 10 },
  { name: 'evidence', maxCount: 10 },
  { name: 'file', maxCount: 1 },
]);

export default upload;
