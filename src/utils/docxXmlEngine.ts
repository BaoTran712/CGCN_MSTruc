import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dossier, WordTemplate } from '../types';
import { normalizeNFC } from './textUtils';
import {
  generateAndDownloadDocx,
  applyPaginationAndSignatureProtection,
  buildDocxRenderData,
} from './docxExport';

/**
 * Interface cho thông tin bóc tách từ XML của file Word (.docx)
 */
export interface ExtractedDocxInfo {
  fileName: string;
  documentXml: string;
  placeholders: string[];
  totalParagraphs: number;
  totalTables: number;
  xmlSize: number;
}

/**
 * Làm sạch các thẻ XML phân mảnh của Word (<w:t> bị cắt nhỏ giữa chừng)
 * Hỗ trợ cả cú pháp {tag} và {{tag}}
 */
export function cleanWordXmlPlaceholders(xmlString: string): string {
  const withoutDouble = xmlString.replace(/\{\{[^}]*\}\}/g, (match) => {
    return match.replace(/<[^>]+>/g, '');
  });
  return withoutDouble.replace(/\{[^{}<>]*\}/g, (match) => {
    return match.replace(/<[^>]+>/g, '');
  });
}

/**
 * Trích xuất toàn bộ biến động {ten_bien} hoặc {{ten_bien}} từ chuỗi XML của Word
 */
export function extractPlaceholdersFromXml(xmlString: string): string[] {
  const plainText = xmlString.replace(/<[^>]+>/g, '');
  const regex = /\{+([^{}]+)\}+/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(plainText)) !== null) {
    const key = match[1].trim();
    if (
      key &&
      !key.startsWith('#') &&
      !key.startsWith('/') &&
      !key.startsWith('^') &&
      !key.startsWith('>') &&
      /^[a-zA-Z0-9_]+$/.test(key)
    ) {
      matches.add(key);
    }
  }
  return Array.from(matches);
}

/**
 * 1. BÓC TÁCH FILE WORD (.docx) -> TRÍCH XUẤT CẤU TRÚC XML & BIẾN ĐỘNG
 */
export async function unpackDocxAndAnalyze(
  file: File | Blob | ArrayBuffer,
  fileName = 'template.docx'
): Promise<ExtractedDocxInfo> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('File không hợp lệ: Không tìm thấy file word/document.xml trong cấu trúc .docx!');
  }

  const documentXml = await documentXmlFile.async('string');
  const placeholders = extractPlaceholdersFromXml(documentXml);

  const totalParagraphs = (documentXml.match(/<w:p[\s>]/g) || []).length;
  const totalTables = (documentXml.match(/<w:tbl[\s>]/g) || []).length;

  return {
    fileName,
    documentXml,
    placeholders,
    totalParagraphs,
    totalTables,
    xmlSize: documentXml.length,
  };
}

/**
 * 2. ĐIỀN DỮ LIỆU VÀO XML & ĐÓNG GÓI LẠI THÀNH FILE .DOCX
 * Sử dụng PizZip + Docxtemplater (paragraphLoop: true, linebreaks: true) và khóa kích thước bảng OpenXML
 */
export async function fillDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: Record<string, any>,
  _outputFileName = 'output.docx'
): Promise<Blob> {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  doc.render(data);

  // Hậu xử lý DOM OpenXML: khóa cấu trúc bảng (fixed dxa), cantSplit và bảo vệ chữ ký
  applyPaginationAndSignatureProtection(doc.getZip());

  const outBlob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  return outBlob;
}

/**
 * 3. HÀM XUẤT VÀ TẢI FILE WORD CHO HỒ SƠ (DOSSIER)
 * Tự động nạp biểu mẫu chuẩn gốc (/templates/mau_1a_chuan.docx hoặc /templates/mau_2a_chuan.docx)
 * và mapping dữ liệu người dùng nhập mà không gây lỗi định dạng.
 */
export async function exportDossierDocxWithXmlEngine(
  rawDossier: Dossier,
  rawTemplate?: WordTemplate,
  customTemplateFile?: ArrayBuffer
): Promise<void> {
  const dossier = normalizeNFC(rawDossier);
  const template = rawTemplate ? normalizeNFC(rawTemplate) : undefined;
  const data = prepareDossierTemplateData(dossier, template);

  if (customTemplateFile) {
    const outputBlob = await fillDocxTemplate(customTemplateFile, data, `${dossier.code}.docx`);
    const outName = dossier.docxFileName || `${dossier.code}_bieu_mau.docx`;
    saveAs(outputBlob, outName);
    return;
  }

  await generateAndDownloadDocx(dossier, template);
}

/**
 * Chuẩn bị mapping dữ liệu đầy đủ từ Hồ sơ thành key-value cho template
 */
export function prepareDossierTemplateData(rawDossier: Dossier, rawTemplate?: WordTemplate): Record<string, any> {
  const dossier = normalizeNFC(rawDossier);
  const template = rawTemplate ? normalizeNFC(rawTemplate) : undefined;
  const templateCode = template?.code || dossier.templateId || dossier.templateCode || '';
  const isMau1a =
    templateCode.includes('1a') ||
    templateCode.toLowerCase().includes('ttr') ||
    templateCode.toLowerCase().includes('tri-thuc');

  return buildDocxRenderData(dossier, isMau1a);
}
