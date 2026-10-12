import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Dossier, WordTemplate } from '../types';
import { normalizeNFC } from './textUtils';
import { generateAndDownloadDocx } from './docxExport';

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
 * Hàm làm sạch các thẻ XML phân mảnh của Word (<w:t> bị cắt nhỏ giữa chừng)
 * Ví dụ: <w:t>{{ho_</w:t></w:r><w:r><w:t>ten}}</w:t> -> {{ho_ten}}
 */
export function cleanWordXmlPlaceholders(xmlString: string): string {
  // Regex tìm và gộp các placeholder bị chia nhỏ qua các thẻ XML w:t/w:r
  return xmlString.replace(/\{\{[^}]*\}\}/g, (match) => {
    // Loại bỏ các thẻ XML bên trong thẻ {{...}} nếu có
    return match.replace(/<[^>]+>/g, '');
  });
}

/**
 * Trích xuất toàn bộ biến động {{ten_bien}} từ chuỗi XML của Word
 */
export function extractPlaceholdersFromXml(xmlString: string): string[] {
  const cleanXml = cleanWordXmlPlaceholders(xmlString);
  const regex = /\{\{([^{}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(cleanXml)) !== null) {
    const key = match[1].trim();
    // Bỏ qua các cú pháp đặc biệt của docxtemplater như {#list}, {/list}, {^cond}, {>partial}
    if (!key.startsWith('#') && !key.startsWith('/') && !key.startsWith('^') && !key.startsWith('>')) {
      matches.add(key);
    }
  }
  return Array.from(matches);
}

/**
 * 1. BĂM FILE WORD (.docx) -> TRÍCH XUẤT CẤU TRÚC XML & BIẾN ĐỘNG
 */
export async function unpackDocxAndAnalyze(file: File | Blob | ArrayBuffer, fileName = 'template.docx'): Promise<ExtractedDocxInfo> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('File không hợp lệ: Không tìm thấy file word/document.xml trong cấu trúc .docx!');
  }

  const documentXml = await documentXmlFile.async('string');
  const placeholders = extractPlaceholdersFromXml(documentXml);

  // Đếm số đoạn văn (<w:p>) và số bảng (<w:tbl>)
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
 */
export async function fillDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: Record<string, any>,
  outputFileName = 'output.docx'
): Promise<Blob> {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '', // Nếu biến không có dữ liệu thì để trống thay vì báo lỗi
    });

    // Điền dữ liệu vào các biến trong XML
    doc.render(data);

    // Đóng gói lại thành file .docx nhị phân
    const outBlob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
    });

    return outBlob;
  } catch (error: any) {
    console.warn('Docxtemplater error, fallbacking to direct XML Replacement Engine:', error);
    // Fallback: Nếu docxtemplater gặp lỗi cú pháp tag, dùng engine XML Regex Replace trực tiếp
    return await fallbackXmlRegexFill(templateBuffer, data);
  }
}

/**
 * Fallback Engine: Thay thế trực tiếp chuỗi XML trong word/document.xml và zip lại
 */
async function fallbackXmlRegexFill(
  templateBuffer: ArrayBuffer,
  data: Record<string, any>
): Promise<Blob> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Invalid docx archive');

  let xml = await docFile.async('string');
  xml = cleanWordXmlPlaceholders(xml);

  // Thay thế từng biến
  Object.entries(data).forEach(([key, val]) => {
    const searchTag = `{{${key}}}`;
    const replacement = escapeXmlString(String(val ?? ''));
    xml = xml.split(searchTag).join(replacement);
  });

  zip.file('word/document.xml', xml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function escapeXmlString(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 3. HÀM XUẤT VÀ TẢI FILE WORD CHO HỒ SƠ (DOSSIER)
 */
export async function exportDossierDocxWithXmlEngine(
  dossier: Dossier,
  template?: WordTemplate,
  customTemplateFile?: ArrayBuffer
): Promise<void> {
  const data = prepareDossierTemplateData(dossier, template);

  let outputBlob: Blob;

  if (customTemplateFile) {
    // Nếu có file mẫu Word thực tế được tải lên
    outputBlob = await fillDocxTemplate(customTemplateFile, data, `${dossier.code}.docx`);
  } else {
    // Nếu dùng template mặc định của hệ thống
    await generateAndDownloadDocx(dossier, template);
    return;
  }

  saveAs(outputBlob, dossier.docxFileName || `${dossier.code}_hoan_chinh.docx`);
}

/**
 * Chuẩn bị mapping dữ liệu đầy đủ từ Hồ sơ thành key-value cho template
 */
export function prepareDossierTemplateData(rawDossier: Dossier, rawTemplate?: WordTemplate): Record<string, any> {
  const dossier = normalizeNFC(rawDossier);
  const fd = dossier.formData || {};
  const d = new Date(dossier.createdAt || Date.now());

  return {
    // Thông tin chung hồ sơ
    ma_ho_so: dossier.code,
    so_to_trinh: fd.proposal_number || dossier.code,
    so_ke_hoach: fd.plan_code || dossier.code,
    ngay: d.getDate().toString().padStart(2, '0'),
    thang: (d.getMonth() + 1).toString().padStart(2, '0'),
    nam: d.getFullYear().toString(),
    ngay_tao: d.toLocaleDateString('vi-VN'),

    // Thông tin người lập & phòng ban
    ho_ten: fd.full_name || dossier.createdBy.name || '',
    nguoi_trinh: fd.full_name || dossier.createdBy.name || '',
    email: fd.email || dossier.createdBy.email || '',
    so_dien_thoai: fd.phone || dossier.createdBy.phone || '',
    don_vi: fd.department || dossier.createdBy.department || 'Khoa / Phòng ban',
    chuc_vu: fd.position || dossier.createdBy.title || 'Giảng viên / Chuyên viên',
    truong_don_vi: dossier.assignedManager?.name || 'Trưởng Đơn vị',

    // Dữ liệu chi tiết từ Form Mẫu 1a (Tờ trình)
    muc_dich: fd.purpose || '',
    nhu_cau_tiep_nhan: fd.receiver_needs || '',
    nang_luc_chuyen_giao: fd.provider_capacity || '',
    muc_tieu: fd.transfer_goals || '',
    doi_tuong: fd.transfer_target || '',
    phuong_thuc: fd.transfer_method || '',
    hinh_thuc: fd.transfer_form || 'Chuyển giao công nghệ độc lập',
    quyen_chuyen_giao: fd.transfer_rights || '',
    thoi_gian: fd.transfer_time || '',
    dia_diem: fd.transfer_location || '',
    thanh_phan: fd.attendees || '',
    kinh_phi: fd.funding_source || 'Từ nguồn kinh phí của Trường',

    // Dữ liệu chi tiết từ Form Mẫu 2a (Kế hoạch)
    ten_san_pham: fd.product_name || '',
    nhom_tac_gia: fd.authors_group || '',
    loai_hinh_san_pham: fd.product_type || '',
    ben_nhan_chuyen_giao: fd.receiving_party || '',
    thoi_gian_chuyen_giao: fd.transfer_date ? new Date(fd.transfer_date).toLocaleDateString('vi-VN') : '',
    dia_diem_chuyen_giao: fd.transfer_location || '',
    chi_phi_chuyen_giao: fd.transfer_cost ? Number(fd.transfer_cost).toLocaleString('vi-VN') + ' VNĐ' : 'Theo thỏa thuận',
    ban_chi_dao: fd.steering_committee || '',
    hoi_thao: fd.workshop_program || '',
    quan_ly_rui_ro: fd.risk_management || '',

    // Flatten toàn bộ formData gốc để match với mọi tên biến tuỳ biến
    ...fd,
  };
}
