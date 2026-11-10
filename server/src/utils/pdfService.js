import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { config } from './config.js';
import { sanitizeFormPayload } from './sanitizer.js';
import { prepareRenderData, pairTwoColumns, adaptWorkshopSchedule, adaptWorkshopAssignment } from '../services/documentService.js';

const pdfDir = path.join(config.uploadDir, 'pdf');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

/**
 * Load system TrueType fonts (Times New Roman) for full Vietnamese diacritics support.
 */
async function loadFonts(pdfDoc) {
  try {
    pdfDoc.registerFontkit(fontkit);

    const timesPath = 'C:\\Windows\\Fonts\\times.ttf';
    const timesBoldPath = 'C:\\Windows\\Fonts\\timesbd.ttf';
    const timesItalicPath = 'C:\\Windows\\Fonts\\timesi.ttf';
    const timesBoldItalicPath = 'C:\\Windows\\Fonts\\timesbi.ttf';

    if (fs.existsSync(timesPath) && fs.existsSync(timesBoldPath)) {
      const regular = await pdfDoc.embedFont(fs.readFileSync(timesPath));
      const bold = await pdfDoc.embedFont(fs.readFileSync(timesBoldPath));
      const italic = fs.existsSync(timesItalicPath)
        ? await pdfDoc.embedFont(fs.readFileSync(timesItalicPath))
        : regular;
      const boldItalic = fs.existsSync(timesBoldItalicPath)
        ? await pdfDoc.embedFont(fs.readFileSync(timesBoldItalicPath))
        : bold;
      return { regular, bold, italic, boldItalic };
    }
  } catch (err) {
    console.warn('[pdfService] Không tải được font Times New Roman từ hệ thống, fallback sang StandardFonts:', err.message);
  }

  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const boldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  return { regular, bold, italic, boldItalic };
}

/**
 * Helper to break an ultra-long single word/token that exceeds maxWidth
 */
function splitLongWord(word, maxWidth, font, fontSize) {
  const chunks = [];
  let current = '';
  for (const ch of word) {
    const next = current + ch;
    let w = 0;
    try {
      w = font.widthOfTextAtSize(next, fontSize);
    } catch {
      w = next.length * (fontSize * 0.5);
    }
    if (w > maxWidth && current) {
      chunks.push(current);
      current = ch;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [word];
}

/**
 * Helper to wrap text into multiple lines within maxWidth (never overflows horizontally)
 */
function wrapText(text, maxWidth, font, fontSize) {
  if (text === null || text === undefined || text === '') return [];
  const safeMaxWidth = Math.max(16, maxWidth);
  const lines = [];
  const rawParagraphs = String(text).replace(/\r\n?/g, '\n').split('\n');

  for (const paragraph of rawParagraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const rawWords = trimmed.split(/\s+/);
    const words = [];
    for (const rw of rawWords) {
      try {
        if (font.widthOfTextAtSize(rw, fontSize) > safeMaxWidth) {
          words.push(...splitLongWord(rw, safeMaxWidth, font, fontSize));
        } else {
          words.push(rw);
        }
      } catch {
        words.push(rw);
      }
    }

    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      try {
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > safeMaxWidth && currentLine) {
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

function isRowArrayBlank(rows, keys) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return rows.every((r) => !r || keys.every((k) => !String(r[k] ?? '').trim()));
}

/**
 * Tạo trang A4 chuẩn và trả về context vẽ tự động ngắt trang (Auto Page-Break)
 * Giống hệt bố cục văn bản Word lúc xem lại trên giao diện (WordDocumentPreview.tsx)
 */
function createDocRenderer(pdfDoc, fonts) {
  // Kích thước A4: 595.28 x 841.89 pt (Lề chuẩn Nghị định 30/2020/NĐ-CP)
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 65;   // ~2.3cm
  const MARGIN_RIGHT = 50;  // ~1.8cm
  const MARGIN_TOP = 55;    // ~2.0cm
  const MARGIN_BOTTOM = 55; // ~2.0cm
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 480.28pt

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function ensureSpace(requiredHeight = 20) {
    if (y - requiredHeight < MARGIN_BOTTOM) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
      return true;
    }
    return false;
  }

  function drawCenteredText(text, font, size, spaceAfter = 6, color = rgb(0, 0, 0)) {
    const wrapped = wrapText(text, CONTENT_WIDTH, font, size);
    for (const line of wrapped) {
      ensureSpace(size + 6);
      const w = font.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: MARGIN_LEFT + (CONTENT_WIDTH - w) / 2,
        y,
        size,
        font,
        color,
      });
      y -= size + 4;
    }
    y -= spaceAfter - 4;
  }

  function drawParagraph(
    text,
    font = fonts.regular,
    size = 12,
    indent = 0,
    spaceAfter = 6,
    color = rgb(0, 0, 0),
    firstLineIndent = 0
  ) {
    if (text === null || text === undefined || String(text).trim() === '') return;
    const rawParagraphs = String(text).replace(/\r\n?/g, '\n').split('\n');

    for (const para of rawParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        y -= 6;
        continue;
      }

      if (firstLineIndent > 0) {
        const firstLineAvail = CONTENT_WIDTH - indent - firstLineIndent;
        const words = trimmed.split(/\s+/);
        let firstLine = '';
        let remainingIdx = words.length;

        for (let i = 0; i < words.length; i++) {
          const test = firstLine ? `${firstLine} ${words[i]}` : words[i];
          if (font.widthOfTextAtSize(test, size) > firstLineAvail && firstLine) {
            remainingIdx = i;
            break;
          }
          firstLine = test;
        }

        ensureSpace(size + 6);
        page.drawText(firstLine, {
          x: MARGIN_LEFT + indent + firstLineIndent,
          y,
          size,
          font,
          color,
        });
        y -= size + 5;

        if (remainingIdx < words.length) {
          const restText = words.slice(remainingIdx).join(' ');
          const restLines = wrapText(restText, CONTENT_WIDTH - indent, font, size);
          for (const rl of restLines) {
            ensureSpace(size + 6);
            page.drawText(rl, {
              x: MARGIN_LEFT + indent,
              y,
              size,
              font,
              color,
            });
            y -= size + 5;
          }
        }
      } else {
        const availWidth = CONTENT_WIDTH - indent;
        const wrapped = wrapText(trimmed, availWidth, font, size);
        for (const line of wrapped) {
          ensureSpace(size + 6);
          page.drawText(line, {
            x: MARGIN_LEFT + indent,
            y,
            size,
            font,
            color,
          });
          y -= size + 5;
        }
      }
    }
    y -= spaceAfter - 5;
  }

  function drawLabelValue(label, value, size = 12, spaceAfter = 6, indent = 0) {
    ensureSpace(size + 8);
    const labelStr = `${label}: `;
    const labelWidth = fonts.bold.widthOfTextAtSize(labelStr, size);
    page.drawText(labelStr, {
      x: MARGIN_LEFT + indent,
      y,
      size,
      font: fonts.bold,
      color: rgb(0, 0, 0),
    });

    const valStr =
      value !== undefined && value !== null && String(value).trim() !== ''
        ? String(value).trim()
        : '........................................................................................';

    const firstLineAvail = CONTENT_WIDTH - indent - labelWidth;
    const words = valStr.replace(/\r\n?/g, ' ').split(/\s+/);
    let firstLine = '';
    let remainingIdx = words.length;

    for (let i = 0; i < words.length; i++) {
      const test = firstLine ? `${firstLine} ${words[i]}` : words[i];
      if (fonts.regular.widthOfTextAtSize(test, size) > firstLineAvail && firstLine) {
        remainingIdx = i;
        break;
      }
      firstLine = test;
    }

    page.drawText(firstLine, {
      x: MARGIN_LEFT + indent + labelWidth,
      y,
      size,
      font: fonts.regular,
      color: rgb(0, 0, 0),
    });
    y -= size + 5;

    if (remainingIdx < words.length) {
      const restText = words.slice(remainingIdx).join(' ');
      drawParagraph(restText, fonts.regular, size, indent, spaceAfter);
    } else {
      y -= spaceAfter - 5;
    }
  }

  /**
   * Vẽ bảng chuẩn với tự động xuống dòng trong từng ô (Multi-line cell wrapping),
   * tự động co giãn chiều cao hàng (Dynamic row height) và tự động lặp lại tiêu đề khi sang trang mới.
   */
  function drawTable(columns, rows, options = {}) {
    const {
      fontSize = 9.5,
      headerFontSize = 9.5,
      cellPaddingX = 4,
      cellPaddingY = 5,
      showHeader = true,
      borderWidth = 0.75,
      spaceAfter = 18,
    } = typeof options === 'number' ? { fontSize: options } : options;

    const rawTotalW = columns.reduce((sum, c) => sum + c.width, 0);
    const scale = rawTotalW > 0 ? CONTENT_WIDTH / rawTotalW : 1;
    const normCols = columns.map((c) => ({
      ...c,
      width: c.width * scale,
    }));
    const totalW = CONTENT_WIDTH;
    const startX = MARGIN_LEFT;

    const headerLineHeight = headerFontSize + 3;
    const wrappedHeaders = normCols.map((col) =>
      showHeader ? wrapText(col.header || '', col.width - cellPaddingX * 2, fonts.bold, headerFontSize) : []
    );
    const maxHeaderLines = showHeader
      ? Math.max(1, ...wrappedHeaders.map((lines) => lines.length))
      : 0;
    const headerHeight = showHeader
      ? Math.max(22, maxHeaderLines * headerLineHeight + cellPaddingY * 2)
      : 0;

    const drawHeaderRow = () => {
      if (!showHeader) return;
      page.drawRectangle({
        x: startX,
        y: y - headerHeight,
        width: totalW,
        height: headerHeight,
        color: rgb(0.94, 0.94, 0.94),
        borderColor: rgb(0, 0, 0),
        borderWidth,
      });

      let curX = startX;
      normCols.forEach((col, colIdx) => {
        const hLines = wrappedHeaders[colIdx];
        const blockH = hLines.length * headerLineHeight;
        const firstBaselineY = y - (headerHeight - blockH) / 2 - headerFontSize + 1.5;

        hLines.forEach((line, lIdx) => {
          const hw = fonts.bold.widthOfTextAtSize(line, headerFontSize);
          const textX = curX + Math.max(cellPaddingX, (col.width - hw) / 2);
          page.drawText(line, {
            x: textX,
            y: firstBaselineY - lIdx * headerLineHeight,
            size: headerFontSize,
            font: fonts.bold,
            color: rgb(0, 0, 0),
          });
        });

        if (borderWidth > 0 && colIdx > 0) {
          page.drawLine({
            start: { x: curX, y },
            end: { x: curX, y: y - headerHeight },
            thickness: borderWidth,
            color: rgb(0, 0, 0),
          });
        }
        curX += col.width;
      });

      y -= headerHeight;
    };

    const lineHeight = fontSize + 3.2;

    // Tính trước chiều cao dòng đầu tiên để không bao giờ vẽ header trơ trọi ở cuối trang
    const firstRowCells = rows.length > 0
      ? normCols.map((col) => {
          const rawVal = rows[0][col.key];
          const cellText = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
          return wrapText(cellText, col.width - cellPaddingX * 2, fonts.regular, fontSize);
        })
      : [];
    const firstRowMaxLines = firstRowCells.length > 0
      ? Math.max(1, ...firstRowCells.map((lines) => lines.length))
      : 1;
    const firstRowHeight = Math.max(20, firstRowMaxLines * lineHeight + cellPaddingY * 2);

    ensureSpace(headerHeight + firstRowHeight + 6);
    drawHeaderRow();

    rows.forEach((row) => {
      const wrappedCells = normCols.map((col) => {
        const rawVal = row[col.key];
        const cellText = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        return wrapText(cellText, col.width - cellPaddingX * 2, fonts.regular, fontSize);
      });

      const maxLines = Math.max(1, ...wrappedCells.map((lines) => lines.length));
      const rowHeight = Math.max(20, maxLines * lineHeight + cellPaddingY * 2);

      // Nếu hàng hiện tại tràn xuống lề dưới, ngắt trang và vẽ lại header bảng
      if (y - rowHeight < MARGIN_BOTTOM) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
        drawHeaderRow();
      }

      if (borderWidth > 0) {
        page.drawRectangle({
          x: startX,
          y: y - rowHeight,
          width: totalW,
          height: rowHeight,
          color: rgb(1, 1, 1),
          borderColor: rgb(0, 0, 0),
          borderWidth,
        });
      }

      let curX = startX;
      normCols.forEach((col, colIdx) => {
        const cLines = wrappedCells[colIdx];
        const isCentered = col.align === 'center';
        const blockH = cLines.length * lineHeight;
        const firstBaselineY = isCentered && cLines.length === 1
          ? y - (rowHeight - blockH) / 2 - fontSize + 1.5
          : y - cellPaddingY - fontSize + 1.5;

        cLines.forEach((line, lIdx) => {
          if (!line) return;
          const tw = fonts.regular.widthOfTextAtSize(line, fontSize);
          const textX = isCentered
            ? curX + Math.max(cellPaddingX, (col.width - tw) / 2)
            : curX + cellPaddingX;
          page.drawText(line, {
            x: textX,
            y: firstBaselineY - lIdx * lineHeight,
            size: fontSize,
            font: fonts.regular,
            color: rgb(0, 0, 0),
          });
        });

        if (borderWidth > 0 && colIdx > 0) {
          page.drawLine({
            start: { x: curX, y },
            end: { x: curX, y: y - rowHeight },
            thickness: borderWidth,
            color: rgb(0, 0, 0),
          });
        }
        curX += col.width;
      });

      y -= rowHeight;
    });

    y -= spaceAfter;
  }

  /**
   * Vẽ bảng nhân sự 2 cột cho các mục 8.1, 8.2, 8.3, 9.1, 9.2
   */
  function drawTwoColumnList(rows, fontSize = 11.5) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const validRows = rows.filter(
      (r) => r && (String(r.col1 || '').trim() !== '' || String(r.col2 || '').trim() !== '')
    );
    if (validRows.length === 0) return;

    const col1W = CONTENT_WIDTH * 0.62;
    const col2W = CONTENT_WIDTH * 0.38;
    const lineHeight = fontSize + 3.5;

    for (const row of validRows) {
      const leftLines = wrapText(String(row.col1 || '').trim(), col1W - 8, fonts.regular, fontSize);
      const rightLines = wrapText(String(row.col2 || '').trim(), col2W - 8, fonts.regular, fontSize);
      const maxLines = Math.max(1, leftLines.length, rightLines.length);
      const rowH = maxLines * lineHeight + 2;

      ensureSpace(rowH + 4);

      leftLines.forEach((line, idx) => {
        page.drawText(line, {
          x: MARGIN_LEFT + 16,
          y: y - idx * lineHeight,
          size: fontSize,
          font: fonts.regular,
          color: rgb(0, 0, 0),
        });
      });

      rightLines.forEach((line, idx) => {
        page.drawText(line, {
          x: MARGIN_LEFT + col1W + 6,
          y: y - idx * lineHeight,
          size: fontSize,
          font: fonts.regular,
          color: rgb(0, 0, 0),
        });
      });

      y -= rowH;
    }
    y -= 4;
  }

  function drawHeader({ isMinistry, unitLabel, docNumber, dateObj }) {
    const leftColWidth = CONTENT_WIDTH * 0.45;
    const rightColWidth = CONTENT_WIDTH * 0.55;
    const leftCenterX = MARGIN_LEFT + leftColWidth / 2;
    const rightCenterX = MARGIN_LEFT + leftColWidth + rightColWidth / 2;

    let leftY = y;
    let rightY = y;

    if (isMinistry) {
      const minText = 'BỘ Y TẾ';
      const w = fonts.regular.widthOfTextAtSize(minText, 10.5);
      page.drawText(minText, { x: leftCenterX - w / 2, y: leftY, size: 10.5, font: fonts.regular });
      leftY -= 14;

      const schoolText = 'TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ';
      const sw = fonts.bold.widthOfTextAtSize(schoolText, 10.5);
      page.drawText(schoolText, { x: leftCenterX - sw / 2, y: leftY, size: 10.5, font: fonts.bold });
      leftY -= 6;

      // Đường kẻ ngang bằng 1/3 - 1/2 độ dài tên cơ quan ban hành (NĐ 30/2020/NĐ-CP)
      page.drawLine({
        start: { x: leftCenterX - sw * 0.22, y: leftY },
        end: { x: leftCenterX + sw * 0.22, y: leftY },
        thickness: 0.7,
        color: rgb(0, 0, 0),
      });
      leftY -= 14;
    } else {
      const schoolText = 'TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ';
      const sw = fonts.regular.widthOfTextAtSize(schoolText, 10.5);
      page.drawText(schoolText, { x: leftCenterX - sw / 2, y: leftY, size: 10.5, font: fonts.regular });
      leftY -= 14;

      const unitText = String(unitLabel || 'KHOA / ĐƠN VỊ').toUpperCase();
      const unitFontSize = unitText.length > 28 ? 9.5 : 10.5;
      const uw = fonts.bold.widthOfTextAtSize(unitText, unitFontSize);
      page.drawText(unitText, { x: leftCenterX - uw / 2, y: leftY, size: unitFontSize, font: fonts.bold });
      leftY -= 6;

      page.drawLine({
        start: { x: leftCenterX - uw * 0.22, y: leftY },
        end: { x: leftCenterX + uw * 0.22, y: leftY },
        thickness: 0.7,
        color: rgb(0, 0, 0),
      });
      leftY -= 14;
    }

    const numText = `Số: ${docNumber}`;
    const nw = fonts.regular.widthOfTextAtSize(numText, 11);
    page.drawText(numText, { x: leftCenterX - nw / 2, y: leftY, size: 11, font: fonts.regular });

    // Cột phải: Quốc hiệu & Tiêu ngữ
    const qhText = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    const qhw = fonts.bold.widthOfTextAtSize(qhText, 10.5);
    page.drawText(qhText, { x: rightCenterX - qhw / 2, y: rightY, size: 10.5, font: fonts.bold });
    rightY -= 14;

    const tnText = 'Độc lập – Tự do – Hạnh phúc';
    const tnw = fonts.bold.widthOfTextAtSize(tnText, 11.5);
    page.drawText(tnText, { x: rightCenterX - tnw / 2, y: rightY, size: 11.5, font: fonts.bold });
    rightY -= 6;

    // Đường kẻ ngang bằng đúng độ dài dòng chữ Tiêu ngữ (NĐ 30/2020/NĐ-CP)
    page.drawLine({
      start: { x: rightCenterX - tnw / 2, y: rightY },
      end: { x: rightCenterX + tnw / 2, y: rightY },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
    rightY -= 16;

    const d = dateObj || new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateLine = `Cần Thơ, ngày ${day} tháng ${month} năm ${year}`;
    const dw = fonts.italic.widthOfTextAtSize(dateLine, 11);
    page.drawText(dateLine, { x: rightCenterX - dw / 2, y: rightY, size: 11, font: fonts.italic });

    y = Math.min(leftY, rightY) - 24;
  }

  return {
    get page() { return page; },
    get y() { return y; },
    set y(val) { y = val; },
    PAGE_WIDTH,
    PAGE_HEIGHT,
    MARGIN_LEFT,
    MARGIN_RIGHT,
    CONTENT_WIDTH,
    ensureSpace,
    drawCenteredText,
    drawParagraph,
    drawLabelValue,
    drawTable,
    drawTwoColumnList,
    drawHeader,
  };
}

/**
 * Render Mẫu 1a-TT.CGCN: Tờ trình chuyển giao tri thức (Đồng bộ 100% với documentService)
 */
function renderMau1a(ctx, fonts, dossierCode, rawData) {
  const data = prepareRenderData(dossierCode, rawData, true);
  const unitLabel = data.don_vi_uppercase || 'KHOA / ĐƠN VỊ';
  const docNumber = data.so_to_trinh || `      /TTr-${data.ten_don_vi || 'ĐV'}`;

  ctx.drawHeader({
    isMinistry: false,
    unitLabel,
    docNumber,
    dateObj: new Date(),
  });

  // Tiêu đề TỜ TRÌNH
  ctx.drawCenteredText('TỜ TRÌNH', fonts.bold, 14, 4);
  ctx.drawCenteredText(
    'Về việc chuyển giao tri thức: từ kết quả đề tài nghiên cứu vào bài giảng,',
    fonts.bold,
    12,
    2
  );
  ctx.drawCenteredText('giáo trình, tài liệu tập huấn giảng dạy', fonts.bold, 12, 12);

  // Kính gửi
  ctx.drawCenteredText('Kính gửi: Ban Giám Hiệu trường Đại học Y Dược Cần Thơ', fonts.boldItalic, 12, 14);

  // Người trình & Đơn vị
  ctx.drawLabelValue('Người trình', data.ho_ten || '');
  ctx.drawLabelValue('Đơn vị / Khoa', unitLabel, 12, 10);

  // I. Mục đích
  ctx.ensureSpace(45);
  ctx.drawParagraph('I. Mục đích', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.muc_dich || 'Trình bày lý do cần thiết của chuyển giao sản phẩm từ kết quả đề tài NCKH vào giảng dạy.',
    fonts.regular,
    12,
    0,
    8,
    rgb(0, 0, 0),
    24
  );

  // II. Nội dung chuyển giao bao gồm
  ctx.ensureSpace(45);
  ctx.drawParagraph('II. Nội dung chuyển giao bao gồm:', fonts.bold, 12.5, 0, 6);

  const subItems = [
    {
      title: '1. Nhu cầu cần sử dụng của đơn vị tiếp nhận chuyển giao:',
      val: data.nhu_cau_tiep_nhan || 'Áp dụng kết quả nghiên cứu vào giảng dạy và đào tạo thực tiễn tại đơn vị.',
    },
    {
      title: '2. Đáp ứng thực hiện chuyển giao của cá nhân/ đơn vị có sản phẩm chuyển giao:',
      val: data.dap_ung_thuc_hien || 'Đảm bảo đầy đủ năng lực chuyên môn, sản phẩm đề tài đã nghiệm thu và tài liệu hướng dẫn.',
    },
    {
      title: '3. Mục tiêu của chuyển giao:',
      val: data.muc_tieu || 'Tăng cường tính ứng dụng thực tiễn trong công tác đào tạo và chăm sóc sức khỏe.',
    },
    {
      title: '4. Đối tượng chuyển giao:',
      val: data.doi_tuong || '',
    },
    {
      title: '5. Phương thức chuyển giao:',
      val: data.phuong_thuc || 'Bài giảng, giáo trình, tài liệu tập huấn chuyên môn.',
    },
    {
      title: '6. Hình thức chuyển giao:',
      val: data.hinh_thuc || 'Chuyển giao công nghệ độc lập.',
    },
    {
      title: '7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức:',
      val: data.quyen_chuyen_giao || 'Chuyển giao quyền sử dụng tri thức phục vụ công tác đào tạo của Nhà trường.',
    },
  ];

  for (const item of subItems) {
    ctx.ensureSpace(38);
    ctx.drawParagraph(item.title, fonts.bold, 12, 0, 3);
    ctx.drawParagraph(item.val, fonts.regular, 12, 0, 6, rgb(0, 0, 0), 24);
  }

  // III. Thời gian chuyển giao
  ctx.ensureSpace(42);
  ctx.drawParagraph('III. Thời gian chuyển giao: (dự kiến)', fonts.bold, 12.5, 0, 3);
  ctx.drawParagraph(data.thoi_gian || 'Theo kế hoạch năm học.', fonts.regular, 12, 0, 6, rgb(0, 0, 0), 24);

  // IV. Địa điểm chuyển giao
  ctx.ensureSpace(42);
  ctx.drawParagraph('IV. Địa điểm chuyển giao:', fonts.bold, 12.5, 0, 3);
  ctx.drawParagraph(data.dia_diem || 'Trường Đại học Y Dược Cần Thơ.', fonts.regular, 12, 0, 6, rgb(0, 0, 0), 24);

  // V. Thành phần tham dự
  ctx.ensureSpace(42);
  ctx.drawParagraph('V. Thành phần tham dự:', fonts.bold, 12.5, 0, 3);
  ctx.drawParagraph(data.thanh_phan || 'Giảng viên các bộ môn, sinh viên, học viên sau đại học.', fonts.regular, 12, 0, 6, rgb(0, 0, 0), 24);

  // VI. Kinh phí tổ chức
  ctx.ensureSpace(42);
  ctx.drawParagraph('VI. Kinh phí tổ chức:', fonts.bold, 12.5, 0, 3);
  ctx.drawParagraph(
    data.kinh_phi || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',
    fonts.regular,
    12,
    0,
    10,
    rgb(0, 0, 0),
    24
  );

  ctx.drawParagraph('Kính mong Ban Giám Hiệu xem xét và phê duyệt.', fonts.italic, 12, 0, 3, rgb(0, 0, 0), 24);
  ctx.drawParagraph('Trân trọng./.', fonts.italic, 12, 0, 18, rgb(0, 0, 0), 24);

  // Giữ toàn bộ khối chữ ký trên cùng một mặt trang
  drawDynamicSignatureSection(ctx, fonts, data, rawData, false);
}

/**
 * Render Mẫu 2a-KH.CGCN: Kế hoạch tổ chức chuyển giao công nghệ (Đồng bộ 100% với Mẫu 2a / Mau2b)
 */
function renderMau2a(ctx, fonts, dossierCode, rawData) {
  const data = prepareRenderData(dossierCode, rawData, false);
  const unitLabel = data.don_vi_uppercase || 'KHOA / ĐƠN VỊ';
  const docNumber = data.so_ke_hoach || `      /KH-${data.ten_don_vi || 'ĐV'}`;

  ctx.drawHeader({
    isMinistry: true,
    unitLabel,
    docNumber,
    dateObj: new Date(),
  });

  // Tiêu đề KẾ HOẠCH
  ctx.drawCenteredText('KẾ HOẠCH', fonts.bold, 14, 4);
  ctx.drawCenteredText('Về việc tổ chức chuyển giao công nghệ', fonts.bold, 12.5, 3);
  const prodName = data.ten_san_pham || 'Tên sản phẩm chuyển giao';
  ctx.drawCenteredText(`“${prodName}”`, fonts.bold, 12.5, 6);

  // Đường kẻ ngang ngắn dưới tiêu đề Kế hoạch
  const centerPage = ctx.MARGIN_LEFT + ctx.CONTENT_WIDTH / 2;
  ctx.page.drawLine({
    start: { x: centerPage - 65, y: ctx.y + 4 },
    end: { x: centerPage + 65, y: ctx.y + 4 },
    thickness: 0.7,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 10;

  // I. Mục đích
  ctx.ensureSpace(42);
  ctx.drawParagraph('I. Mục đích', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.muc_dich || 'Giới thiệu sản phẩm chuyển giao công nghệ và mục đích ứng dụng vào thực tiễn.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // II. Nhóm tác giả của sản phẩm chuyển giao (chuẩn Mẫu 2b: 1. Họ tên – Chức vụ/Đơn vị – Vai trò; ... .)
  ctx.ensureSpace(42);
  ctx.drawParagraph('II. Nhóm tác giả của sản phẩm chuyển giao', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.nhom_tac_gia || '1. Nhóm tác giả đề tài nghiên cứu.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // III. Loại hình sản phẩm chuyển giao công nghệ
  ctx.ensureSpace(42);
  ctx.drawParagraph('III. Loại hình sản phẩm chuyển giao công nghệ', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.loai_hinh_san_pham || 'Quy trình kỹ thuật / Tri thức chuyên môn.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // IV. Phương thức chuyển giao
  ctx.ensureSpace(42);
  ctx.drawParagraph('IV. Phương thức chuyển giao', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.phuong_thuc || 'Tập huấn trực tiếp & Bàn giao tài liệu hướng dẫn.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // V. Bên nhận chuyển giao (thụt lề dòng đầu 1cm chuẩn Mẫu 2b)
  ctx.ensureSpace(42);
  ctx.drawParagraph('V. Bên nhận chuyển giao', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.ben_nhan_chuyen_giao || 'Các bộ môn chuyên môn & Bệnh viện Trường Đại học Y Dược Cần Thơ.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // VI. Thời gian, địa điểm chuyển giao (6.1 & 6.2 chuẩn Mẫu 2b)
  ctx.ensureSpace(48);
  ctx.drawParagraph('VI. Thời gian, địa điểm chuyển giao', fonts.bold, 12.5, 0, 4);
  ctx.drawLabelValue('6.1. Thời gian', data.thoi_gian || 'Theo kế hoạch năm học.', 12, 4);
  ctx.drawLabelValue('6.2. Địa điểm', data.dia_diem || 'Trường Đại học Y Dược Cần Thơ.', 12, 6);

  // VII. Chi phí chuyển giao (thụt lề dòng đầu 1cm chuẩn Mẫu 2b)
  ctx.ensureSpace(42);
  ctx.drawParagraph('VII. Chi phí chuyển giao', fonts.bold, 12.5, 0, 4);
  ctx.drawParagraph(
    data.chi_phi || 'Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.',
    fonts.regular,
    12,
    0,
    6,
    rgb(0, 0, 0),
    24
  );

  // VIII. Ban chỉ đạo – tổ chức chuyển giao (bố cục 2 cột chuẩn Mẫu 2a/2b)
  ctx.ensureSpace(65);
  ctx.drawParagraph('VIII. Ban chỉ đạo – tổ chức chuyển giao', fonts.bold, 12.5, 0, 4);

  const steeringRows = !isRowArrayBlank(data.ds_ban_chi_dao, ['col1', 'col2'])
    ? data.ds_ban_chi_dao
    : pairTwoColumns(['1. Đại diện Ban Giám Hiệu - Trưởng ban', '2. Trưởng Phòng KH&CN - Phó Trưởng ban']);
  ctx.drawParagraph('8.1. Ban chỉ đạo', fonts.bold, 12, 16, 3);
  ctx.drawTwoColumnList(steeringRows, 11.5);

  const orgRows = !isRowArrayBlank(data.ds_ban_to_chuc, ['col1', 'col2'])
    ? data.ds_ban_to_chuc
    : pairTwoColumns(['1. Trưởng Khoa / Đơn vị - Trưởng ban', '2. Đại diện Bên nhận chuyển giao - Đồng Trưởng ban']);
  ctx.ensureSpace(42);
  ctx.drawParagraph('8.2. Ban tổ chức', fonts.bold, 12, 16, 3);
  ctx.drawTwoColumnList(orgRows, 11.5);

  const staffRows = !isRowArrayBlank(data.ds_nhan_su, ['col1', 'col2'])
    ? data.ds_nhan_su
    : pairTwoColumns(['1. Chủ nhiệm đề tài - Phụ trách chung', '2. Nhóm tác giả và chuyên viên kỹ thuật - Thực hiện chuyển giao']);
  ctx.ensureSpace(42);
  ctx.drawParagraph('8.3. Nhân sự thực hiện chuyển giao kỹ thuật', fonts.bold, 12, 16, 3);
  ctx.drawTwoColumnList(staffRows, 11.5);

  // IX. Hội thảo chuyển giao (Đầy đủ 9.1 -> 9.5 nếu có tổ chức hội thảo)
  const hasWorkshop =
    data.co_hoi_thao !== undefined
      ? Boolean(data.co_hoi_thao && data.co_hoi_thao !== 'false' && data.co_hoi_thao !== 'Không tổ chức hội thảo (ẩn Mục IX)')
      : data.has_hoi_thao !== undefined
        ? Boolean(data.has_hoi_thao && data.has_hoi_thao !== 'false')
        : data.has_workshop !== undefined
          ? Boolean(data.has_workshop && data.has_workshop !== 'false')
          : Boolean(data.workshop_chair || data.workshop_speaker || data.workshop_program || data.chu_toa || data.bao_cao_vien);

  if (hasWorkshop) {
    ctx.ensureSpace(65);
    ctx.drawParagraph('IX. Hội thảo chuyển giao', fonts.bold, 12.5, 0, 4);

    const chairRows = !isRowArrayBlank(data.ds_chu_toa, ['col1', 'col2'])
      ? data.ds_chu_toa
      : pairTwoColumns(['1. Đại diện Ban Giám Hiệu - Chủ tọa', '2. Đại diện Ban Chủ nhiệm Khoa - Đồng Chủ tọa']);
    ctx.drawParagraph('9.1. Chủ tọa', fonts.bold, 12, 16, 3);
    ctx.drawTwoColumnList(chairRows, 11.5);

    const speakerRows = !isRowArrayBlank(data.ds_bao_cao_vien, ['col1', 'col2'])
      ? data.ds_bao_cao_vien
      : pairTwoColumns(['1. Chủ nhiệm đề tài - Báo cáo viên chính', '2. Thành viên nhóm nghiên cứu - Báo cáo viên chuyên môn']);
    ctx.ensureSpace(42);
    ctx.drawParagraph('9.2. Báo cáo viên', fonts.bold, 12, 16, 3);
    ctx.drawTwoColumnList(speakerRows, 11.5);

    const scheduleRows = !isRowArrayBlank(data.ds_chuong_trinh_hoi_thao, ['thoi_gian', 'noi_dung', 'thanh_phan'])
      ? data.ds_chuong_trinh_hoi_thao
      : adaptWorkshopSchedule([
          '08h00 - 08h30 | Đón tiếp đại biểu, tuyên bố lý do, khai mạc | Ban Tổ chức và đại biểu',
          '08h30 - 10h00 | Báo cáo chuyên đề và hướng dẫn quy trình kỹ thuật | Nhóm tác giả đề tài',
          '10h00 - 11h00 | Thảo luận, thực hành và ký biên bản bàn giao | Toàn thể đại biểu',
        ]);
    ctx.ensureSpace(95);
    ctx.drawParagraph('9.3. Chương trình chi tiết của hội thảo', fonts.bold, 12, 16, 6);
    ctx.drawTable(
      [
        { header: 'Thời gian', key: 'thoi_gian', width: 105, align: 'center' },
        { header: 'Nội dung', key: 'noi_dung', width: 245, align: 'left' },
        { header: 'Thành phần', key: 'thanh_phan', width: 130, align: 'left' },
      ],
      scheduleRows,
      { fontSize: 10, headerFontSize: 10, spaceAfter: 16 }
    );

    const assignmentRows = !isRowArrayBlank(data.ds_phan_cong_hoi_thao, ['noi_dung', 'phu_trach'])
      ? data.ds_phan_cong_hoi_thao
      : adaptWorkshopAssignment([
          'Chuẩn bị nội dung báo cáo và bộ tài liệu hướng dẫn kỹ thuật | Nhóm tác giả đề tài',
          'Công tác hậu cần, hội trường và danh sách đại biểu | Đơn vị tiếp nhận & Ban Tổ chức',
        ]);
    ctx.ensureSpace(95);
    ctx.drawParagraph('9.4. Phân công nhiệm vụ tổ chức', fonts.bold, 12, 16, 6);
    ctx.drawTable(
      [
        { header: 'TT', key: 'stt', width: 38, align: 'center' },
        { header: 'Nội dung công việc', key: 'noi_dung', width: 292, align: 'left' },
        { header: 'Phụ trách', key: 'phu_trach', width: 150, align: 'left' },
      ],
      assignmentRows,
      { fontSize: 10, headerFontSize: 10, spaceAfter: 16 }
    );

    ctx.ensureSpace(45);
    ctx.drawParagraph('9.5. Dự trù kinh phí hội thảo', fonts.bold, 12, 16, 3);
    ctx.drawParagraph(
      data.kinh_phi_hoi_thao || 'Theo quy chế chi tiêu nội bộ của Trường Đại học Y Dược Cần Thơ.',
      fonts.regular,
      12,
      0,
      8,
      rgb(0, 0, 0),
      24
    );
  }

  // X. Quản lý rủi ro trong chuyển giao (Chỉ hiển thị khi có tổ chức hội thảo)
  if (hasWorkshop) {
    ctx.ensureSpace(120);
    ctx.drawParagraph('X. Quản lý rủi ro trong chuyển giao', fonts.bold, 12.5, 0, 4);

    // 10.1. Xác định và đánh giá rủi ro
    ctx.drawParagraph('10.1. Xác định và đánh giá rủi ro', fonts.bold, 12, 16, 3);
    ctx.drawParagraph(
      'Thang đánh giá: P và S chấm từ 1 đến 5; R = P x S; R <= 4: Thấp; 5 <= R <= 9: Trung bình; R >= 10: Cao.',
      fonts.italic,
      10.5,
      16,
      6
    );

    ctx.drawTable(
      [
        { header: 'Stt', key: 'stt', width: 30, align: 'center' },
        { header: 'Công việc / Yếu tố rủi ro', key: 'yeu_to_rui_ro', width: 240, align: 'left' },
        { header: 'P', key: 'p', width: 40, align: 'center' },
        { header: 'S', key: 's', width: 40, align: 'center' },
        { header: 'R=PxS', key: 'r', width: 50, align: 'center' },
        { header: 'Phân loại', key: 'phan_loai', width: 80, align: 'center' },
      ],
      data.ds_danh_gia_rui_ro,
      { fontSize: 9.5, headerFontSize: 9.5, spaceAfter: 18 }
    );

    // 10.2. Biện pháp kiểm soát rủi ro (Đầy đủ 7 cột gồm Thời gian, tự động xuống dòng trong từng ô)
    ctx.ensureSpace(100);
    ctx.drawParagraph('10.2. Biện pháp kiểm soát rủi ro', fonts.bold, 12, 16, 6);

    ctx.drawTable(
      [
        { header: 'Stt', key: 'stt', width: 26, align: 'center' },
        { header: 'Yếu tố rủi ro', key: 'yeu_to_rui_ro', width: 84, align: 'left' },
        { header: 'Biện pháp kiểm soát', key: 'bien_phap', width: 114, align: 'left' },
        { header: 'ĐV phụ trách', key: 'don_vi_phu_trach', width: 64, align: 'center' },
        { header: 'ĐV phối hợp', key: 'don_vi_phoi_hop', width: 64, align: 'center' },
        { header: 'Thời gian', key: 'thoi_gian', width: 64, align: 'center' },
        { header: 'Sản phẩm', key: 'san_pham', width: 64, align: 'center' },
      ],
      data.ds_kiem_soat_rui_ro,
      { fontSize: 9, headerFontSize: 9.2, spaceAfter: 24 }
    );
  }

  // Giữ toàn bộ khối chữ ký trên cùng một mặt trang
  drawDynamicSignatureSection(ctx, fonts, data, rawData, true);
}

/**
 * Vẽ khối chữ ký động & Nơi nhận theo cấu hình phê duyệt của Admin (signature_config)
 * Đồng bộ 100% giữa giao diện WordDocumentPreview.tsx và bản PDF xuất ra cho Mẫu 1a & Mẫu 2a
 */
function drawDynamicSignatureSection(ctx, fonts, data, rawData, is2a = false) {
  const sigConfig = rawData?._signatureConfig || rawData?.signature_config || rawData?.signatureConfig || null;
  const depts =
    Array.isArray(sigConfig?.departments) && sigConfig.departments.length > 0
      ? sigConfig.departments
      : ['Phòng KH&CN', 'Phòng TCKT'];

  const rectorRole = String(sigConfig?.rectorRole || 'HIỆU TRƯỞNG').trim().toUpperCase();
  const rectorSignerName = String(sigConfig?.rectorSignerName || '').trim();

  const deptPairs = [];
  for (let i = 0; i < depts.length; i += 2) {
    deptPairs.push({
      col1: String(depts[i] || '').toUpperCase(),
      col2: depts[i + 1] ? String(depts[i + 1]).toUpperCase() : '',
    });
  }

  const requiredSpace = Math.min(340, 145 + deptPairs.length * 68);
  ctx.ensureSpace(requiredSpace);

  const colW = ctx.CONTENT_WIDTH / 2;
  const leftCenter = ctx.MARGIN_LEFT + colW / 2;
  const rightCenter = ctx.MARGIN_LEFT + colW + colW / 2;

  const drawSigHeader = (title, hint, centerX, topY, fontSize = 10.5) => {
    const tw = fonts.bold.widthOfTextAtSize(title, fontSize);
    ctx.page.drawText(title, { x: centerX - tw / 2, y: topY, size: fontSize, font: fonts.bold });
    const hw = fonts.italic.widthOfTextAtSize(hint, fontSize - 1);
    ctx.page.drawText(hint, { x: centerX - hw / 2, y: topY - 13, size: fontSize - 1, font: fonts.italic });
  };

  // Hàng 1: Đơn vị & Cá nhân/Chủ nhiệm đề tài
  let sigY = ctx.y;
  const receiverManager = String(data.truong_don_vi_nhan || '').trim();
  const rawTruongDonVi = String(data.truong_don_vi || '').trim();
  const truongDonViName = rawTruongDonVi === 'PGS.TS. Nguyễn Văn A' ? '' : rawTruongDonVi;

  const leftRoleTitle = is2a
    ? receiverManager
      ? 'TRƯỞNG ĐƠN VỊ NHẬN'
      : 'TRƯỞNG ĐƠN VỊ'
    : 'TRƯỞNG ĐƠN VỊ';
  const rightRoleTitle = is2a
    ? 'TRƯỞNG ĐƠN VỊ GIAO / CHỦ NHIỆM ĐỀ TÀI'
    : 'CÁ NHÂN/CHỦ NHIỆM ĐỀ TÀI';

  drawSigHeader(leftRoleTitle, '(Ký và ghi rõ họ tên)', leftCenter, sigY);
  drawSigHeader(rightRoleTitle, '(Ký và ghi rõ họ tên)', rightCenter, sigY);

  const leftSignerName = is2a && receiverManager ? receiverManager : truongDonViName;
  if (leftSignerName) {
    const lw = fonts.bold.widthOfTextAtSize(leftSignerName, 11);
    ctx.page.drawText(leftSignerName, { x: leftCenter - lw / 2, y: sigY - 56, size: 11, font: fonts.bold });
  }

  const applicantName = String(data.ho_ten || '').trim();
  if (applicantName) {
    const aw = fonts.bold.widthOfTextAtSize(applicantName, 11);
    ctx.page.drawText(applicantName, { x: rightCenter - aw / 2, y: sigY - 56, size: 11, font: fonts.bold });
  }

  ctx.y = sigY - 72;

  // Các hàng chữ ký phòng ban chức năng theo cấu hình Admin
  for (const pair of deptPairs) {
    sigY = ctx.y;
    if (pair.col1) {
      drawSigHeader(pair.col1, '(Ký và ghi rõ họ tên)', leftCenter, sigY);
    }
    if (pair.col2) {
      drawSigHeader(pair.col2, '(Ký và ghi rõ họ tên)', rightCenter, sigY);
    }
    ctx.y = sigY - 68;
  }

  // Hàng cuối: Nơi nhận & Ban Giám hiệu
  sigY = ctx.y;
  ctx.page.drawText('Nơi nhận:', { x: ctx.MARGIN_LEFT, y: sigY, size: 10.5, font: fonts.boldItalic });

  const cleanNoiNhanDonVi = String(
    data.noi_nhan_don_vi || (is2a ? 'Đơn vị nhận chuyển giao' : 'Như kính gửi')
  ).replace(/\.,\s*/g, ', ');

  const defaultRecipients = [
    `- ${cleanNoiNhanDonVi};`,
    ...(depts.includes('Phòng TCKT') ? ['- TCKT;'] : []),
    '- TTDV&ĐTTNCXH;',
    '- Lưu: VT, KHCN.',
  ];

  const rawRecipients =
    Array.isArray(sigConfig?.recipients) && sigConfig.recipients.length > 0
      ? sigConfig.recipients.map((r) => {
          const t = String(r || '').trim();
          return t.startsWith('-') ? t : `- ${t};`;
        })
      : defaultRecipients;

  let ry = sigY - 13;
  for (const recLine of rawRecipients) {
    const wrappedLines = wrapText(recLine, colW - 8, fonts.regular, 9.5);
    for (const rl of wrappedLines) {
      ctx.page.drawText(rl, { x: ctx.MARGIN_LEFT, y: ry, size: 9.5, font: fonts.regular });
      ry -= 12;
    }
  }

  if (rectorRole.includes('KT.') || rectorRole.includes('PHÓ HIỆU TRƯỞNG')) {
    const line1 = 'KT. HIỆU TRƯỞNG';
    const line2 = 'PHÓ HIỆU TRƯỞNG';
    const w1 = fonts.bold.widthOfTextAtSize(line1, 11);
    const w2 = fonts.bold.widthOfTextAtSize(line2, 11);
    ctx.page.drawText(line1, { x: rightCenter - w1 / 2, y: sigY, size: 11, font: fonts.bold });
    ctx.page.drawText(line2, { x: rightCenter - w2 / 2, y: sigY - 14, size: 11, font: fonts.bold });
  } else {
    const htw = fonts.bold.widthOfTextAtSize(rectorRole, 11.5);
    ctx.page.drawText(rectorRole, { x: rightCenter - htw / 2, y: sigY, size: 11.5, font: fonts.bold });
  }

  if (rectorSignerName) {
    const rnw = fonts.bold.widthOfTextAtSize(rectorSignerName, 11);
    ctx.page.drawText(rectorSignerName, { x: rightCenter - rnw / 2, y: sigY - 58, size: 11, font: fonts.bold });
  }
}

/**
 * Xuất file PDF chuẩn có nội dung và bố cục giống hệt bản Word lúc xem lại (WordDocumentPreview)
 */
export async function generateLockedPdf(
  dossierCode,
  rawFormData = {},
  templateTitle = 'Tờ trình chuyển giao tri thức',
  templateCode = '',
  customFileName = null
) {
  const formData = sanitizeFormPayload(rawFormData || {});
  const fileName = customFileName || `${dossierCode}-locked.pdf`;
  const filePath = path.join(pdfDir, fileName);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${dossierCode} - ${templateTitle}`);
  pdfDoc.setAuthor('Trường Đại học Y Dược Cần Thơ');
  pdfDoc.setSubject(templateTitle);
  pdfDoc.setCreationDate(new Date());

  const fonts = await loadFonts(pdfDoc);
  const ctx = createDocRenderer(pdfDoc, fonts);

  const explicitCodeStr = `${templateCode} ${formData.templateId || ''} ${formData.templateCode || ''}`.toLowerCase();
  const titleStr = `${templateTitle}`.toLowerCase();
  let isMau2a = false;
  if (explicitCodeStr.includes('1a') || titleStr.includes('tờ trình') || titleStr.includes('to trinh')) {
    isMau2a = false;
  } else if (explicitCodeStr.includes('2a') || titleStr.includes('kế hoạch') || titleStr.includes('ke hoach')) {
    isMau2a = true;
  } else {
    isMau2a = Boolean(formData.plan_code || formData.product_name);
  }

  if (isMau2a) {
    renderMau2a(ctx, fonts, dossierCode, formData);
  } else {
    renderMau1a(ctx, fonts, dossierCode, formData);
  }

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
