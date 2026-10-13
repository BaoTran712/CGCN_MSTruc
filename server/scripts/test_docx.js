import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatePath = path.resolve(__dirname, '../../docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx');
const uploadDir = path.resolve(__dirname, '../uploads/docx');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('Reading template from:', templatePath);
const content = fs.readFileSync(templatePath, 'binary');
const zip = new PizZip(content);

// Inspect and adapt XML placeholders if needed
let xml = zip.file('word/document.xml').asText();
if (!xml.includes('{title}')) {
  xml = xml.replace('“tên sản phẩm”', '“{title}”');
  xml = xml.replace('(giới thiệu đôi nét về SPCGCN) (giới thiệu mục đích của chuyển giao)', '{target_application}');
  xml = xml.replace('Số:           /KH- Khoa/Đơn vị', 'Số: {proposal_number}/KH-{department}');
  zip.file('word/document.xml', xml);
}

const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
  nullGetter: () => '',
});

const renderData = {
  title: 'HỆ THỐNG AI TỰ ĐỘNG CHẨN ĐOÁN HÌNH ẢNH Y TẾ',
  target_application: 'Triển khai thử nghiệm lâm sàng tại Bệnh viện Trường Đại học Y Dược Cần Thơ',
  proposal_number: '28/KH-CNTT',
  department: 'KCNTT',
  author_name: 'TS. Nguyễn Văn Nam',
};

doc.render(renderData);

const buffer = doc.getZip().generate({
  type: 'nodebuffer',
  compression: 'DEFLATE',
});

const outputPath = path.join(uploadDir, 'CGCN-TEST-001.docx');
fs.writeFileSync(outputPath, buffer);
console.log('Successfully wrote generated docx to:', outputPath, 'size:', buffer.length);
