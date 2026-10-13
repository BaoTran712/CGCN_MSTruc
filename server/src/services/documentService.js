import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Thư mục templates và uploads
const TEMPLATES_DIR = path.resolve(__dirname, '../../../docs/templates');
const UPLOADS_DOCX_DIR = path.resolve(__dirname, '../../uploads/docx');

/**
 * Đảm bảo thư mục lưu trữ docx tồn tại
 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOADS_DOCX_DIR)) {
    fs.mkdirSync(UPLOADS_DOCX_DIR, { recursive: true });
  }
}

/**
 * Tìm file template phù hợp trong docs/templates
 */
function findTemplateFile(templateId = '') {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    throw new Error(`Thư mục template không tồn tại: ${TEMPLATES_DIR}`);
  }

  const files = fs.readdirSync(TEMPLATES_DIR);
  const docxFiles = files.filter(f => f.endsWith('.docx'));

  if (docxFiles.length === 0) {
    throw new Error(`Không tìm thấy file mẫu .docx nào trong ${TEMPLATES_DIR}`);
  }

  // Nếu có chỉ định templateId (ví dụ '2a-KH.CGCN' hoặc '1a-TT.CGCN')
  if (templateId) {
    const matched = docxFiles.find(f => f.toLowerCase().includes(templateId.toLowerCase().replace(/[^a-z0-9]/gi, '')));
    if (matched) {
      return path.join(TEMPLATES_DIR, matched);
    }
  }

  // Mặc định ưu tiên file Mẫu 2a-KH.CGCN nếu có, hoặc file .docx đầu tiên
  const defaultFile = docxFiles.find(f => f.includes('2a-KH.CGCN')) || docxFiles[0];
  return path.join(TEMPLATES_DIR, defaultFile);
}

/**
 * Chuẩn bị dữ liệu và mapping vào XML docxtemplater
 */
export async function generateDocx(code, formData = {}, templateId = '2a-KH.CGCN') {
  ensureUploadDir();

  // Chuẩn hóa mã hồ sơ CGCN-[code]
  const cleanCode = String(code || '').trim();
  const normalizedCode = cleanCode.startsWith('CGCN-') ? cleanCode : `CGCN-${cleanCode}`;
  const fileName = `${normalizedCode}.docx`;
  const outputPath = path.join(UPLOADS_DOCX_DIR, fileName);

  const templatePath = findTemplateFile(templateId);
  const templateBinary = fs.readFileSync(templatePath, 'binary');

  const zip = new PizZip(templateBinary);

  // Xử lý placeholder trong XML nếu template gốc chưa chứa tag dạng {tag}
  let xml = zip.file('word/document.xml').asText();
  if (!xml.includes('{title}')) {
    xml = xml.replace(/“tên sản phẩm”/g, '“{title}”');
    xml = xml.replace(/\(giới thiệu đôi nét về SPCGCN\) \(giới thiệu mục đích của chuyển giao\)/g, '{target_application}');
    xml = xml.replace(/Số:\s+\/KH-\s+Khoa\/Đơn vị/g, 'Số: {proposal_number}/KH-{department}');
    xml = xml.replace(/Cần Thơ, ngày\s+tháng\s+năm/g, 'Cần Thơ, ngày {day} tháng {month} năm {year}');
    xml = xml.replace(/Loại hình sản phẩm chuyển giao công nghệ/g, 'Loại hình sản phẩm chuyển giao công nghệ: {product_type}');
    xml = xml.replace(/Bên nhận chuyển giao/g, 'Bên nhận chuyển giao: {partner}');
    xml = xml.replace(/Chi phí chuyển giao \(nếu có tùy theo thỏa thuận\)/g, 'Chi phí chuyển giao: {financial_plan}');
    zip.file('word/document.xml', xml);
  }

  // Khởi tạo Docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  // Dữ liệu mapping vào placeholder
  const renderData = {
    code: normalizedCode,
    title: formData.research_title || formData.title || 'Đề án Chuyển giao công nghệ',
    research_title: formData.research_title || formData.title || 'Đề án Chuyển giao công nghệ',
    department: formData.department || formData.department_name || 'Khoa/Đơn vị',
    department_name: formData.department || formData.department_name || 'Khoa/Đơn vị',
    proposal_number: formData.proposal_number || '01',
    author_name: formData.author_name || formData.creator_name || 'Cán bộ phụ trách',
    target_application: formData.target_application || 'Ứng dụng chuyển giao vào thực tiễn y tế',
    financial_plan: formData.financial_plan || 'Theo quy định hiện hành',
    product_type: formData.product_type || 'Quy trình công nghệ / Phần mềm y tế',
    partner: formData.partner || formData.receiving_unit || 'Đơn vị tiếp nhận chuyển giao',
    day,
    month,
    year,
    created_date: `${day}/${month}/${year}`,
    ...formData,
  };

  // Render dữ liệu vào biểu mẫu Word
  doc.render(renderData);

  // Xuất file binary docx
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
