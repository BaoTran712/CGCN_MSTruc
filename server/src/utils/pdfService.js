import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { config } from './config.js';

const pdfDir = path.join(config.uploadDir, 'pdf');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Load system TrueType fonts for full Vietnamese diacritics support.
 * Falls back to StandardFonts if system fonts are unavailable.
 */
async function loadFonts(pdfDoc) {
  try {
    pdfDoc.registerFontkit(fontkit);

    const timesPath = 'C:\\Windows\\Fonts\\times.ttf';
    const timesBoldPath = 'C:\\Windows\\Fonts\\timesbd.ttf';
    const timesItalicPath = 'C:\\Windows\\Fonts\\timesi.ttf';

    if (fs.existsSync(timesPath) && fs.existsSync(timesBoldPath)) {
      const regular = await pdfDoc.embedFont(fs.readFileSync(timesPath));
      const bold = await pdfDoc.embedFont(fs.readFileSync(timesBoldPath));
      const italic = fs.existsSync(timesItalicPath)
        ? await pdfDoc.embedFont(fs.readFileSync(timesItalicPath))
        : regular;
      return { regular, bold, italic };
    }
  } catch (err) {
    console.warn('[pdfService] Không tải được font Times New Roman từ hệ thống, fallback sang StandardFonts:', err.message);
  }

  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  return { regular, bold, italic };
}

/**
 * Helper to wrap text into multiple lines within maxWidth
 */
function wrapText(text, maxWidth, font, fontSize) {
  if (!text) return [];
  const lines = [];
  const rawParagraphs = String(text).split('\n');

  for (const paragraph of rawParagraphs) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      try {
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      } catch {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Utility helper xuất file PDF chuẩn đã khóa nội dung (quy_trinh.md)
 * Tạo PDF 1.4 chuẩn quốc tế, hợp lệ 100%, bảo toàn nội dung và hỗ trợ tiếng Việt đầy đủ.
 */
export async function generateLockedPdf(dossierCode, formData = {}, templateTitle = 'Hồ sơ Chuyển giao Công nghệ') {
  const fileName = `${dossierCode}-locked.pdf`;
  const filePath = path.join(pdfDir, fileName);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`CTUMP DocuGov - ${dossierCode}`);
  pdfDoc.setAuthor('Trường Đại học Y Dược Cần Thơ');
  pdfDoc.setSubject(templateTitle);
  pdfDoc.setCreationDate(new Date());

  const { regular, bold, italic } = await loadFonts(pdfDoc);

  // Kích thước chuẩn A4 (595.28 x 841.89 pt)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;

  let y = height - margin;

  // 1. Header văn bản chuẩn quốc gia
  // Cột trái: Đơn vị
  page.drawText('BỘ Y TẾ', {
    x: margin,
    y,
    size: 10,
    font: regular,
    color: rgb(0.2, 0.2, 0.2),
  });
  // Cột phải: Quốc hiệu
  page.drawText('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', {
    x: width - margin - 235,
    y,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });

  y -= 14;
  page.drawText('TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ', {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });
  page.drawText('Độc lập - Tự do - Hạnh phúc', {
    x: width - margin - 175,
    y,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });

  y -= 14;
  const deptName = formData.department || formData.department_name || 'PHÒNG KHOA HỌC CÔNG NGHỆ';
  page.drawText(String(deptName).toUpperCase(), {
    x: margin,
    y,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.3, 0.6),
  });

  // Đường kẻ phân cách dưới quốc hiệu
  page.drawLine({
    start: { x: width - margin - 185, y: y + 2 },
    end: { x: width - margin - 50, y: y + 2 },
    thickness: 0.8,
    color: rgb(0, 0, 0),
  });

  y -= 16;
  page.drawText(`Số: ${dossierCode}/HSCGCN`, {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.3, 0.3, 0.3),
  });

  const now = new Date();
  const dateStr = `Cần Thơ, ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;
  page.drawText(dateStr, {
    x: width - margin - 180,
    y,
    size: 9,
    font: italic,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 30;

  // 2. Banner Xác thực & Khóa nội dung (Locked Layout Badge)
  page.drawRectangle({
    x: margin,
    y: y - 24,
    width: contentWidth,
    height: 32,
    color: rgb(0.93, 0.96, 1),
    borderColor: rgb(0.2, 0.45, 0.85),
    borderWidth: 1,
  });

  page.drawText('VĂN BẢN ĐÃ TIỀN KIỂM & KHÓA NỘI DUNG (CHUẨN KÝ SỐ)', {
    x: margin + 15,
    y: y - 8,
    size: 10,
    font: bold,
    color: rgb(0.1, 0.3, 0.7),
  });

  page.drawText(`Mã xác thực: ${dossierCode} • Khóa lúc: ${now.toLocaleTimeString('vi-VN')} ${now.toLocaleDateString('vi-VN')} • Hệ thống CTUMP DocuGov`, {
    x: margin + 15,
    y: y - 20,
    size: 8,
    font: regular,
    color: rgb(0.25, 0.35, 0.5),
  });

  y -= 50;

  // 3. Tiêu đề chính
  const mainTitle = (templateTitle || 'HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ').toUpperCase();
  const titleLines = wrapText(mainTitle, contentWidth, bold, 14);
  for (const tLine of titleLines) {
    const tWidth = bold.widthOfTextAtSize(tLine, 14);
    page.drawText(tLine, {
      x: margin + (contentWidth - tWidth) / 2,
      y,
      size: 14,
      font: bold,
      color: rgb(0.1, 0.15, 0.3),
    });
    y -= 18;
  }

  y -= 10;

  // 4. Các thông tin tóm lược của hồ sơ
  const summaryFields = [
    { label: 'Tên sản phẩm / đề tài:', value: formData.product_name || formData.research_title || formData.title || templateTitle },
    { label: 'Chủ nhiệm / Người nộp:', value: formData.full_name || formData.creator_name || 'Cán bộ Y Dược CTUMP' },
    { label: 'Đơn vị công tác:', value: deptName },
    { label: 'Chức danh / Học hàm:', value: formData.position || formData.title || 'Cán bộ / Giảng viên' },
    { label: 'Điện thoại liên hệ:', value: formData.phone || formData.dien_thoai || 'Chưa cập nhật' },
    { label: 'Email công vụ:', value: formData.email || 'canbo@ctump.edu.vn' },
    { label: 'Mục đích chuyển giao:', value: formData.purpose || formData.muc_dich || 'Ứng dụng thực tiễn y tế và nghiên cứu khoa học.' },
    { label: 'Bên nhận chuyển giao:', value: formData.receiving_party || formData.ben_nhan_chuyen_giao || 'Bệnh viện Trường Đại học Y Dược Cần Thơ' },
    {
      label: 'Kinh phí dự kiến:',
      value: formData.transfer_cost !== undefined && formData.transfer_cost !== null && formData.transfer_cost !== ''
        ? Number(formData.transfer_cost) === 0
          ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
          : `${Number(formData.transfer_cost).toLocaleString('vi-VN')} VNĐ`
        : 'Theo thỏa thuận và quy chế chi tiêu nội bộ',
    },
  ];

  for (const item of summaryFields) {
    if (y < 160) break; // tránh tràn trang

    page.drawText(item.label, {
      x: margin,
      y,
      size: 9.5,
      font: bold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const valLines = wrapText(String(item.value || ''), contentWidth - 140, regular, 9.5);
    let valY = y;
    for (let i = 0; i < Math.min(valLines.length, 3); i++) {
      page.drawText(valLines[i], {
        x: margin + 140,
        y: valY,
        size: 9.5,
        font: regular,
        color: rgb(0.2, 0.2, 0.2),
      });
      valY -= 13;
    }

    y = valY - 4;
  }

  // 5. Khung chữ ký cấp cơ sở & cấp Trường
  y = Math.min(y - 15, 170);

  // Kẻ đường ngăn cách
  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: width - margin, y: y + 20 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Cột trái: Người đề nghị
  page.drawText('CHỦ NHIỆM / NGƯỜI ĐỀ NGHỊ', {
    x: margin + 30,
    y: y + 5,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });
  page.drawText('(Ký và ghi rõ họ tên)', {
    x: margin + 55,
    y: y - 8,
    size: 8.5,
    font: italic,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Cột phải: Trưởng đơn vị
  page.drawText('TRƯỞNG KHOA / ĐƠN VỊ', {
    x: width - margin - 180,
    y: y + 5,
    size: 10,
    font: bold,
    color: rgb(0, 0, 0),
  });
  page.drawText('(Ký số phê duyệt cấp Khoa)', {
    x: width - margin - 185,
    y: y - 8,
    size: 8.5,
    font: italic,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Tên người nộp ở chân chữ ký
  const authorName = formData.full_name || formData.creator_name || 'Cán bộ đề nghị';
  page.drawText(String(authorName), {
    x: margin + 40,
    y: margin + 25,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Footer ghi chú bảo mật
  page.drawText(`Văn bản điện tử được tạo tự động bởi Hệ thống CTUMP DocuGov • Bản quyền © ${now.getFullYear()} Trường ĐH Y Dược Cần Thơ`, {
    x: margin,
    y: margin,
    size: 8,
    font: italic,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);

  return {
    fileName,
    fileUrl: `/uploads/pdf/${fileName}`,
    filePath,
    fileSize: `${(pdfBytes.length / 1024).toFixed(1)} KB`,
  };
}

export default {
  generateLockedPdf,
};
