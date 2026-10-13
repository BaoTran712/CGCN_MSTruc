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
  return xmlString.replace(/\{\{[^}]*\}\}/g, (match) => {
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
 * Sử dụng delimiters {{ }} và tự động chuyển dòng \n thành <w:br/>
 */
export async function fillDocxTemplate(
  templateBuffer: ArrayBuffer,
  data: Record<string, any>,
  _outputFileName = 'output.docx'
): Promise<Blob> {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '', // Trả về rỗng nếu không có dữ liệu, tránh văng lỗi
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

  const templateCode = template?.code || dossier.templateId || dossier.templateCode || '';
  const isMau1a = templateCode.includes('1a') || templateCode.includes('TTR') || templateCode.includes('tri-thuc');
  const targetTemplateUrl = isMau1a ? '/templates/mau_1a_chuan.docx' : '/templates/mau_2a_chuan.docx';

  let outputBlob: Blob | null = null;

  if (customTemplateFile) {
    outputBlob = await fillDocxTemplate(customTemplateFile, data, `${dossier.code}.docx`);
  } else {
    try {
      const resp = await fetch(targetTemplateUrl);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        outputBlob = await fillDocxTemplate(buffer, data, `${dossier.code}.docx`);
      }
    } catch (err) {
      console.warn(`[exportDossierDocxWithXmlEngine] Fetching ${targetTemplateUrl} failed, fallback to programmatic docx:`, err);
    }
  }

  if (outputBlob) {
    const outName = dossier.docxFileName || `${dossier.code}_bieu_mau.docx`;
    saveAs(outputBlob, outName);
    return;
  }

  // Fallback programmatic nếu không tải được template file
  await generateAndDownloadDocx(dossier, template);
}

/**
 * Chuẩn bị mapping dữ liệu đầy đủ từ Hồ sơ thành key-value cho template
 */
export function prepareDossierTemplateData(rawDossier: Dossier, _rawTemplate?: WordTemplate): Record<string, any> {
  const dossier = normalizeNFC(rawDossier);
  const fd = dossier.formData || {};
  const d = new Date(dossier.createdAt || Date.now());

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString();

  const dept = fd.department || dossier.createdBy.department || 'Khoa Công nghệ Thông tin';
  const fullName = fd.full_name || dossier.createdBy.name || '';

  return {
    // Thông tin chung hồ sơ & ngày tháng
    ma_ho_so: dossier.code,
    so_to_trinh: fd.proposal_number || `${dossier.code}/TTr`,
    so_ke_hoach: fd.plan_code || `${dossier.code}/KH`,
    ngay: day,
    thang: month,
    nam: year,
    ngay_tao: d.toLocaleDateString('vi-VN'),
    don_vi: dept,
    don_vi_uppercase: dept.toUpperCase(),
    don_vi_viet_tat: dept.split(' ').map((w: string) => w[0]).join('').toUpperCase() || 'ĐV',

    // Thông tin người lập & phòng ban
    ho_ten: fullName,
    nguoi_trinh: fullName,
    email: fd.email || dossier.createdBy.email || '',
    so_dien_thoai: fd.phone || dossier.createdBy.phone || '',
    chuc_vu: fd.position || dossier.createdBy.title || 'Giảng viên chính',
    chuc_danh: fd.position || dossier.createdBy.title || 'Giảng viên chính',
    dien_thoai: fd.phone || dossier.createdBy.phone || '',
    truong_don_vi: dossier.assignedManager?.name || 'Trưởng Đơn vị',
    truong_don_vi_nhan: fd.receiver_manager || 'Trưởng Đơn vị nhận',

    // Dữ liệu chi tiết từ Form Mẫu 1a (Tờ trình)
    muc_dich: fd.purpose || '',
    nhu_cau_tiep_nhan: fd.receiver_needs || '',
    dap_ung_thuc_hien: fd.provider_capacity || '',
    nang_luc_chuyen_giao: fd.provider_capacity || '',
    muc_tieu: fd.transfer_goals || '',
    doi_tuong: fd.transfer_target || '',
    phuong_thuc: fd.transfer_method || '',
    hinh_thuc: fd.transfer_form || 'Chuyển giao công nghệ độc lập.',
    quyen_chuyen_giao: fd.transfer_rights || '',
    thoi_gian: fd.transfer_time || (fd.transfer_date ? new Date(fd.transfer_date).toLocaleDateString('vi-VN') : ''),
    dia_diem: fd.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
    thanh_phan: fd.attendees || '',
    kinh_phi: fd.funding_source || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',

    // Dữ liệu chi tiết từ Form Mẫu 2a (Kế hoạch)
    ten_san_pham: fd.product_name || fd.research_title || 'Sản phẩm chuyển giao công nghệ',
    nhom_tac_gia: fd.authors_group || fullName,
    loai_hinh_san_pham: fd.product_type || 'Hệ thống phần mềm ứng dụng y tế',
    ben_nhan_chuyen_giao: fd.receiving_party || 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
    chi_phi: fd.transfer_cost !== undefined && fd.transfer_cost !== null
      ? Number(fd.transfer_cost) === 0
        ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
        : `${Number(fd.transfer_cost).toLocaleString('vi-VN')} VNĐ`
      : 'Theo thỏa thuận',
    ban_chi_dao: fd.steering_committee || '',
    ban_to_chuc: fd.organizing_committee || '',
    nhan_su: fd.implementing_staff || '',
    chu_toa: fd.workshop_chair || '',
    bao_cao_vien: fd.workshop_speaker || '',
    kinh_phi_hoi_thao: fd.workshop_budget || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',

    // Flatten toàn bộ formData gốc để match với mọi tên biến tuỳ biến
    ...fd,
  };
}
