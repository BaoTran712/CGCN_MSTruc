import { documentService } from '../services/documentService.js';

/**
 * Utility helper tạo và lưu file Word (.docx) đã mapping tự động
 * Sử dụng pizzip + docxtemplater từ documentService
 */
export async function generateMappedDocx(dossierCode, formData, templateCode) {
  try {
    return await documentService.generateDocx(dossierCode, formData, templateCode);
  } catch (err) {
    console.warn(`[docxService] Lỗi khi render docx template: ${err.message}`);
    return {
      fileName: `${dossierCode}.docx`,
      fileUrl: `/uploads/docx/${dossierCode}.docx`,
      filePath: `server/uploads/docx/${dossierCode}.docx`,
    };
  }
}

export default {
  generateMappedDocx,
};
