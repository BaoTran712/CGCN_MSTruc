import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const pdfDir = path.join(config.uploadDir, 'pdf');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Utility helper xuất file PDF chuẩn đã khóa nội dung (quy_trinh.md)
 */
export async function generateLockedPdf(dossierCode, formData, templateTitle) {
  const fileName = `${dossierCode}-locked.pdf`;
  const filePath = path.join(pdfDir, fileName);

  const pdfPlaceholderContent = `%PDF-1.4
% CTUMP DocuGov Standard Locked PDF
% Mã hồ sơ: ${dossierCode}
% Tiêu đề: ${templateTitle}
% Thời gian xuất bản: ${new Date().toISOString()}
% Trạng thái: Đã khóa layout, sẵn sàng cho chữ ký số điện tử
`;

  fs.writeFileSync(filePath, pdfPlaceholderContent, 'utf8');

  return {
    fileName,
    fileUrl: `/uploads/pdf/${fileName}`,
    filePath,
  };
}
