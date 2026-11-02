import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { documentService } from './documentService.js';
import { generateLockedPdf } from '../utils/pdfService.js';
import { sanitizeFormPayload } from '../utils/sanitizer.js';
import { deletePhysicalFile } from '../utils/cleanupGarbageData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DOCX_DIR = path.resolve(__dirname, '../../uploads/docx');

function ensureDocxDir() {
  if (!fs.existsSync(UPLOADS_DOCX_DIR)) {
    fs.mkdirSync(UPLOADS_DOCX_DIR, { recursive: true });
  }
}

/**
 * DocumentGeneratorService - Cơ chế Đồng bộ Tài liệu Xuyên suốt (Single Source of Truth)
 * - Làm sạch payload (sanitizeFormPayload)
 * - Tự động xóa các file nháp phiên bản cũ bị thay thế (Garbage File Cleanup)
 * - Tự động bơm dữ liệu vào Template gốc sinh ra cặp file Word (.docx) và PDF (.pdf) phiên bản v{current_version}
 */
export const documentGeneratorService = {
  async generateVersionedDocuments({
    code,
    formData = {},
    templateId = 'tmpl-cgcn-1a',
    templateCode = '',
    templateTitle = 'Tờ trình chuyển giao tri thức',
    version = 1,
    previousFiles = [],
    isCompleted = false,
    decisionNumber = '',
  }) {
    ensureDocxDir();

    const safeCode = String(code || 'CGCN-2026-0001').trim();
    const ver = Number(version) > 0 ? Number(version) : 1;

    // 1. Làm sạch toàn bộ dữ liệu đầu vào (loại bỏ null/undefined, thẻ HTML, biến mẫu rác)
    const sanitizedFormData = sanitizeFormPayload(formData);

    // 2. Xóa các file nháp cũ bị thay thế để chống rác lưu trữ
    if (Array.isArray(previousFiles) && previousFiles.length > 0) {
      for (const oldFile of previousFiles) {
        if (oldFile) {
          deletePhysicalFile(oldFile);
        }
      }
    }

    // 3. Sinh file Word (.docx) phiên bản v{ver} bằng cách bơm trực tiếp vào file Template gốc
    const docxFileName = `${safeCode}-v${ver}.docx`;
    const docxOutputPath = path.join(UPLOADS_DOCX_DIR, docxFileName);
    const generatedDocxUrl = `/uploads/docx/${docxFileName}`;

    const effectiveTemplateKey = templateCode || templateId || 'tmpl-cgcn-1a';
    const { buffer: docxBuffer } = documentService.renderDocxBuffer(
      sanitizedFormData,
      effectiveTemplateKey,
      safeCode
    );
    fs.writeFileSync(docxOutputPath, docxBuffer);

    // 4. Sinh file PDF (.pdf) phiên bản v{ver} đồng bộ 100% với nội dung vừa nhập/sửa
    const pdfFileName = isCompleted ? `${safeCode}-signed-v${ver}.pdf` : `${safeCode}-v${ver}.pdf`;
    const pdfFormData = {
      ...sanitizedFormData,
      _version: ver,
      _isCompleted: Boolean(isCompleted),
      _decisionNumber: decisionNumber || sanitizedFormData._decisionNumber || '',
    };

    const pdfResult = await generateLockedPdf(
      safeCode,
      pdfFormData,
      templateTitle,
      effectiveTemplateKey,
      pdfFileName
    );

    return {
      version: ver,
      sanitizedFormData,
      generatedDocxUrl,
      generatedDocxPath: docxOutputPath,
      generatedPdfUrl: pdfResult.fileUrl,
      generatedPdfPath: pdfResult.filePath,
    };
  },
};

export default documentGeneratorService;

