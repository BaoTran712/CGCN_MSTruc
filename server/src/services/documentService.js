import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.resolve(__dirname, '../../../docs/templates');
const UPLOADS_DOCX_DIR = path.resolve(__dirname, '../../uploads/docx');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOADS_DOCX_DIR)) {
    fs.mkdirSync(UPLOADS_DOCX_DIR, { recursive: true });
  }
}

/**
 * Tìm file template chuẩn tương ứng (mau_1a_chuan.docx hoặc mau_2a_chuan.docx)
 */
function findTemplateFile(templateId = '') {
  const is1a = String(templateId).includes('1a') || String(templateId).toLowerCase().includes('tt');
  const targetFile = is1a ? 'mau_1a_chuan.docx' : 'mau_2a_chuan.docx';
  const filePath = path.join(TEMPLATES_DIR, targetFile);

  if (fs.existsSync(filePath)) {
    return { filePath, is1a };
  }

  // Fallback to server/templates if docs/templates is not found
  const serverPath = path.resolve(__dirname, '../../templates', targetFile);
  if (fs.existsSync(serverPath)) {
    return { filePath: serverPath, is1a };
  }

  throw new Error(`Không tìm thấy file mẫu biểu Word: ${targetFile}`);
}

/**
 * Sinh file Word .docx mapping dữ liệu từ web form không lỗi định dạng
 */
export async function generateDocx(code, formData = {}, templateId = 'tmpl-cgcn-2a') {
  ensureUploadDir();

  const cleanCode = String(code || '').trim();
  const normalizedCode = cleanCode.startsWith('CGCN-') ? cleanCode : `CGCN-${cleanCode}`;
  const fileName = `${normalizedCode}.docx`;
  const outputPath = path.join(UPLOADS_DOCX_DIR, fileName);

  const { filePath: templatePath, is1a } = findTemplateFile(templateId);
  const templateBinary = fs.readFileSync(templatePath, 'binary');

  const zip = new PizZip(templateBinary);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  let renderData = {};

  if (is1a) {
    renderData = {
      don_vi_uppercase: (formData.department || formData.department_name || 'KHOA CÔNG NGHỆ THÔNG TIN').toUpperCase(),
      so_to_trinh: formData.proposal_number || `${normalizedCode}/TTr`,
      ngay: day,
      thang: month,
      nam: year,
      ho_ten: formData.full_name || formData.creator_name || 'Cán bộ phụ trách',
      chuc_danh: formData.position || '',
      dien_thoai: formData.phone || '',
      email: formData.email || '',
      muc_dich: formData.purpose || formData.research_title || '',
      nhu_cau_tiep_nhan: formData.receiver_needs || '',
      dap_ung_thuc_hien: formData.provider_capacity || '',
      muc_tieu: formData.transfer_goals || '',
      doi_tuong: formData.transfer_target || '',
      phuong_thuc: formData.transfer_method || '',
      hinh_thuc: formData.transfer_form || 'Chuyển giao công nghệ độc lập.',
      quyen_chuyen_giao: formData.transfer_rights || '',
      thoi_gian: formData.transfer_time || '',
      dia_diem: formData.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      thanh_phan: formData.attendees || '',
      kinh_phi: formData.funding_source || formData.financial_plan || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',
      truong_don_vi: formData.assigned_manager || 'Trưởng Đơn vị',
      ...formData,
    };
  } else {
    // 2a
    renderData = {
      so_ke_hoach: formData.plan_code || `${normalizedCode}/KH`,
      ngay: day,
      thang: month,
      nam: year,
      ten_san_pham: formData.product_name || formData.title || formData.research_title || 'Sản phẩm chuyển giao công nghệ',
      ho_ten: formData.full_name || formData.creator_name || 'Cán bộ phụ trách',
      dien_thoai: formData.phone || '',
      email: formData.email || '',
      muc_dich: formData.purpose || '',
      nhom_tac_gia: formData.authors_group || formData.full_name || '',
      loai_hinh_san_pham: formData.product_type || 'Hệ thống phần mềm ứng dụng y tế',
      phuong_thuc: formData.transfer_method || '',
      ben_nhan_chuyen_giao: formData.receiving_party || formData.partner || '',
      thoi_gian: formData.transfer_date ? new Date(formData.transfer_date).toLocaleDateString('vi-VN') : (formData.transfer_time || ''),
      dia_diem: formData.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      chi_phi: formData.transfer_cost !== undefined && formData.transfer_cost !== null
        ? Number(formData.transfer_cost) === 0
          ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
          : `${Number(formData.transfer_cost).toLocaleString('vi-VN')} VNĐ`
        : 'Theo thỏa thuận',
      ban_chi_dao: formData.steering_committee || '',
      ban_to_chuc: formData.organizing_committee || '',
      nhan_su: formData.implementing_staff || '',
      chu_toa: formData.workshop_chair || '',
      bao_cao_vien: formData.workshop_speaker || '',
      kinh_phi_hoi_thao: formData.workshop_budget || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',
      ...formData,
    };
  }

  doc.render(renderData);

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  fs.writeFileSync(outputPath, buffer);

  return {
    fileName,
    filePath: `server/uploads/docx/${fileName}`,
    absolutePath: outputPath,
    fileUrl: `/uploads/docx/${fileName}`,
    code: normalizedCode,
    fileSize: `${(buffer.length / 1024).toFixed(1)} KB`,
  };
}

export const documentService = {
  generateDocx,
};

export default documentService;
