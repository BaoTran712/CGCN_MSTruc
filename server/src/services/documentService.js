import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.resolve(__dirname, '../../../docs/templates');
const UPLOADS_DOCX_DIR = path.resolve(__dirname, '../../uploads/docx');
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function ensureUploadDir() {
  if (!fs.existsSync(UPLOADS_DOCX_DIR)) {
    fs.mkdirSync(UPLOADS_DOCX_DIR, { recursive: true });
  }
}

/**
 * Tìm file template chuẩn tương ứng (Mẫu 1a hoặc Mẫu 2a)
 * Chỉ chấp nhận file chuẩn ECMA-376 .docx (ZIP magic 50 4B 03 04), tuyệt đối không dùng .doc nhị phân
 */
export function findTemplateFile(templateId = '') {
  const is1a =
    String(templateId).includes('1a') ||
    String(templateId).toLowerCase().includes('tt') ||
    String(templateId).toLowerCase().includes('tri-thuc');

  const candidates = is1a
    ? [
        path.join(TEMPLATES_DIR, 'mau_1a_chuan.docx'),
        path.join(TEMPLATES_DIR, 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx'),
        path.resolve(__dirname, '../../templates/mau_1a_chuan.docx'),
      ]
    : [
        path.join(TEMPLATES_DIR, 'mau_2a_chuan.docx'),
        path.join(TEMPLATES_DIR, 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx'),
        path.resolve(__dirname, '../../templates/mau_2a_chuan.docx'),
      ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const magic = fs.readFileSync(p).slice(0, 4).toString('hex');
      if (magic === '504b0304') {
        return { filePath: p, is1a };
      }
    }
  }

  throw new Error(`Không tìm thấy file mẫu biểu Word (.docx ECMA-376) cho templateId: ${templateId}`);
}

/**
 * Step 3.1 & 3.2: Chuẩn hóa chuỗi, chuyển null/undefined -> "", chuẩn hóa \r\n -> \n, xóa thẻ HTML
 */
export function normalizeMultiline(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, '');
}

/**
 * Đệ quy làm sạch toàn bộ payload JSON:
 * - Chuyển mọi giá trị null / undefined thành ""
 * - Chuẩn hóa xuống dòng \r\n | \r -> \n và loại bỏ thẻ HTML vô tình lọt vào
 */
export function sanitizePayload(input) {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return normalizeMultiline(input);
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item));
  }
  if (typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = sanitizePayload(v);
    }
    return out;
  }
  return '';
}

/**
 * Step 3.3: Xử lý Số văn bản hành chính: Số: {so_hieu}/KH-{ten_don_vi} hoặc {so_hieu}/TTr-{ten_don_vi}
 * Nếu so_hieu trống, mặc định là "      " (6 khoảng trắng) để chừa chỗ ghi số khi in.
 */
export function formatDocumentNumber(rawNumber, soHieuInput, docType = 'KH', unitAbbr = 'ĐV') {
  const cleanUnit = normalizeMultiline(unitAbbr).trim() || 'ĐV';
  const explicitSoHieu = normalizeMultiline(soHieuInput).trim();
  const raw = normalizeMultiline(rawNumber).trim();

  if (raw) {
    if (raw.includes('/')) {
      const idx = raw.indexOf('/');
      const left = raw.slice(0, idx).replace(/^\.+$/, '').trim();
      const right = raw.slice(idx + 1).trim();
      const finalLeft = left || explicitSoHieu || '      ';
      return {
        so_hieu: finalLeft,
        ten_don_vi: cleanUnit,
        formatted: `${finalLeft}/${right || `${docType}-${cleanUnit}`}`,
      };
    }
    const cleanNum = raw.replace(/^\.+$/, '').trim() || explicitSoHieu || '      ';
    return {
      so_hieu: cleanNum,
      ten_don_vi: cleanUnit,
      formatted: `${cleanNum}/${docType}-${cleanUnit}`,
    };
  }

  const finalSoHieu = explicitSoHieu.replace(/^\.+$/, '').trim() || '      ';
  return {
    so_hieu: finalSoHieu,
    ten_don_vi: cleanUnit,
    formatted: `${finalSoHieu}/${docType}-${cleanUnit}`,
  };
}

/**
 * Step 3.4: Adapter gom mảng nhân sự thành 2 cột trên mỗi hàng (8.1, 8.2, 8.3, 9.1, 9.2)
 * Tự động đánh số stt (1, 2, 3...) và áp dụng Empty Table Safeguard nếu mảng rỗng.
 */
export function pairTwoColumns(input) {
  if (!input || (Array.isArray(input) && input.length === 0) || (typeof input === 'string' && !input.trim())) {
    return [{ stt: '', col1: '', col2: '' }];
  }

  if (Array.isArray(input)) {
    const valid = input.filter((item) => {
      if (item === null || item === undefined) return false;
      if (typeof item === 'string') return item.trim().length > 0;
      if (typeof item === 'object') {
        return Object.values(item).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
      }
      return String(item).trim().length > 0;
    });

    if (valid.length === 0) {
      return [{ stt: '', col1: '', col2: '' }];
    }

    // Nếu phần tử đã có cấu trúc { col1, col2 }
    if (typeof valid[0] === 'object' && ('col1' in valid[0] || 'col2' in valid[0])) {
      return valid.map((r, idx) => ({
        stt: r.stt !== undefined && r.stt !== '' ? r.stt : idx + 1,
        col1: normalizeMultiline(r.col1 || ''),
        col2: normalizeMultiline(r.col2 || ''),
      }));
    }

    // Nếu phần tử có cấu trúc { ho_ten/name, chuc_vu/role/don_vi }
    if (
      typeof valid[0] === 'object' &&
      ('ho_ten' in valid[0] || 'name' in valid[0] || 'chuc_vu' in valid[0] || 'role' in valid[0])
    ) {
      return valid.map((r, idx) => {
        const rawName = normalizeMultiline(r.ho_ten || r.name || '').trim();
        const rawRole = normalizeMultiline(r.chuc_vu || r.role || r.don_vi || '').trim();
        const stt = idx + 1;
        const numberedName = rawName ? (/^\d+\./.test(rawName) ? rawName : `${stt}. ${rawName}`) : '';
        return {
          stt,
          col1: numberedName,
          col2: rawRole,
        };
      });
    }

    // Mảng chuỗi
    const strItems = valid.map((item) => normalizeMultiline(String(item)).trim()).filter(Boolean);
    return parseStringLinesToTwoColumns(strItems);
  }

  if (typeof input === 'string') {
    const lines = normalizeMultiline(input)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      return [{ stt: '', col1: '', col2: '' }];
    }
    return parseStringLinesToTwoColumns(lines);
  }

  return [{ stt: '', col1: '', col2: '' }];
}

function parseStringLinesToTwoColumns(lines) {
  if (lines.length === 0) {
    return [{ stt: '', col1: '', col2: '' }];
  }

  // Nếu các dòng phân tách tên và chức vụ bằng " - " hoặc " – "
  const hasDashSeparator = lines.some((l) => /\s[-–]\s/.test(l));
  if (hasDashSeparator) {
    return lines.map((line, idx) => {
      const stt = idx + 1;
      const match = line.match(/^(.*?)\s+[-–]\s+(.+)$/);
      if (match) {
        const left = match[1].trim();
        const right = match[2].trim();
        const numberedLeft = /^\d+\./.test(left) ? left : `${stt}. ${left}`;
        return { stt, col1: numberedLeft, col2: right };
      }
      const numbered = /^\d+\./.test(line) ? line : `${stt}. ${line}`;
      return { stt, col1: numbered, col2: '' };
    });
  }

  const pairs = [];
  for (let i = 0; i < lines.length; i += 2) {
    pairs.push({
      stt: Math.floor(i / 2) + 1,
      col1: lines[i] || '',
      col2: lines[i + 1] || '',
    });
  }
  return pairs;
}

/**
 * Phân loại rủi ro dựa trên giá trị R = P * S (thang 1 - 25)
 */
export function getRiskLevel(r) {
  const val = Number(r);
  if (val <= 4) return 'Thấp';
  if (val <= 9) return 'Trung bình';
  if (val <= 15) return 'Cao';
  return 'Rất cao';
}

/**
 * Adapter bảng đánh giá rủi ro 10.1:
 * - Tự động đánh số stt (1, 2, 3...)
 * - Tự động tính r = Number(p) * Number(s) nếu có p và s
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptRiskTable(risks) {
  if (Array.isArray(risks)) {
    if (risks.length === 0) {
      return [{ stt: '', yeu_to_rui_ro: '', p: '', s: '', r: '', phan_loai: '' }];
    }
    return risks.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return { stt: idx + 1, yeu_to_rui_ro: normalizeMultiline(item), p: '', s: '', r: '', phan_loai: '' };
      }
      const yeuTo = normalizeMultiline(item.yeu_to_rui_ro ?? item.risk_factor ?? item.cong_viec ?? item.name ?? '');
      const rawP = item.p ?? item.probability ?? '';
      const rawS = item.s ?? item.severity ?? '';
      const hasPS = rawP !== '' && rawP !== null && rawP !== undefined && rawS !== '' && rawS !== null && rawS !== undefined;
      const p = hasPS ? Number(rawP) : normalizeMultiline(rawP);
      const s = hasPS ? Number(rawS) : normalizeMultiline(rawS);
      const r =
        item.r !== undefined && item.r !== null && item.r !== ''
          ? Number(item.r)
          : hasPS
            ? Number(p) * Number(s)
            : '';
      const phan_loai = normalizeMultiline(
        item.phan_loai || item.risk_level || (r !== '' && !Number.isNaN(Number(r)) ? getRiskLevel(Number(r)) : '')
      );
      const isAllBlank = !yeuTo && p === '' && s === '' && r === '' && !phan_loai;
      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        yeu_to_rui_ro: yeuTo,
        p,
        s,
        r,
        phan_loai,
      };
    });
  }

  if (typeof risks === 'string' && risks.trim()) {
    const lines = normalizeMultiline(risks).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => ({
        stt: idx + 1,
        yeu_to_rui_ro: line,
        p: 2,
        s: 2,
        r: 4,
        phan_loai: 'Thấp',
      }));
    }
  }

  return [{ stt: '', yeu_to_rui_ro: '', p: '', s: '', r: '', phan_loai: '' }];
}

/**
 * Adapter bảng biện pháp kiểm soát rủi ro 10.2
 * - Tự động đánh số stt (1, 2, 3...)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptRiskControlTable(controls) {
  if (Array.isArray(controls)) {
    if (controls.length === 0) {
      return [
        {
          stt: '',
          yeu_to_rui_ro: '',
          bien_phap: '',
          don_vi_phu_trach: '',
          don_vi_phoi_hop: '',
          thoi_gian: '',
          san_pham: '',
        },
      ];
    }
    return controls.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return {
          stt: idx + 1,
          yeu_to_rui_ro: '',
          bien_phap: normalizeMultiline(item),
          don_vi_phu_trach: '',
          don_vi_phoi_hop: '',
          thoi_gian: '',
          san_pham: '',
        };
      }
      const yeu_to_rui_ro = normalizeMultiline(item.yeu_to_rui_ro ?? item.risk_factor ?? '');
      const bien_phap = normalizeMultiline(item.bien_phap ?? item.control_measure ?? '');
      const don_vi_phu_trach = normalizeMultiline(item.don_vi_phu_trach ?? item.responsible_unit ?? '');
      const don_vi_phoi_hop = normalizeMultiline(item.don_vi_phoi_hop ?? item.cooperating_unit ?? '');
      const thoi_gian = normalizeMultiline(item.thoi_gian ?? item.time ?? '');
      const san_pham = normalizeMultiline(item.san_pham ?? item.output ?? '');
      const isAllBlank =
        !yeu_to_rui_ro && !bien_phap && !don_vi_phu_trach && !don_vi_phoi_hop && !thoi_gian && !san_pham;

      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        yeu_to_rui_ro,
        bien_phap,
        don_vi_phu_trach,
        don_vi_phoi_hop,
        thoi_gian,
        san_pham,
      };
    });
  }

  if (typeof controls === 'string' && controls.trim()) {
    const lines = normalizeMultiline(controls).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => ({
        stt: idx + 1,
        yeu_to_rui_ro: '',
        bien_phap: line,
        don_vi_phu_trach: '',
        don_vi_phoi_hop: '',
        thoi_gian: '',
        san_pham: '',
      }));
    }
  }

  return [
    {
      stt: '',
      yeu_to_rui_ro: '',
      bien_phap: '',
      don_vi_phu_trach: '',
      don_vi_phoi_hop: '',
      thoi_gian: '',
      san_pham: '',
    },
  ];
}

/**
 * Adapter chương trình chi tiết hội thảo 9.3
 * - Tự động đánh số stt (1, 2, 3...)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptWorkshopSchedule(schedule) {
  if (Array.isArray(schedule)) {
    if (schedule.length === 0) {
      return [{ stt: '', thoi_gian: '', noi_dung: '', thanh_phan: '' }];
    }
    return schedule.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return { stt: idx + 1, thoi_gian: '', noi_dung: normalizeMultiline(item), thanh_phan: '' };
      }
      const thoi_gian = normalizeMultiline(item.thoi_gian ?? item.time ?? '');
      const noi_dung = normalizeMultiline(item.noi_dung ?? item.content ?? '');
      const thanh_phan = normalizeMultiline(item.thanh_phan ?? item.attendees ?? '');
      const isAllBlank = !thoi_gian && !noi_dung && !thanh_phan;
      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        thoi_gian,
        noi_dung,
        thanh_phan,
      };
    });
  }

  if (typeof schedule === 'string' && schedule.trim()) {
    const lines = normalizeMultiline(schedule).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => ({
        stt: idx + 1,
        thoi_gian: '',
        noi_dung: line,
        thanh_phan: '',
      }));
    }
  }

  return [{ stt: '', thoi_gian: '', noi_dung: '', thanh_phan: '' }];
}

/**
 * Adapter phân công nhiệm vụ tổ chức 9.4
 * - Tự động đánh số stt (1, 2, 3...)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptWorkshopAssignment(assignments) {
  if (Array.isArray(assignments)) {
    if (assignments.length === 0) {
      return [{ stt: '', noi_dung: '', phu_trach: '' }];
    }
    return assignments.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return { stt: idx + 1, noi_dung: normalizeMultiline(item), phu_trach: '' };
      }
      const noi_dung = normalizeMultiline(item.noi_dung ?? item.task ?? item.cong_viec ?? '');
      const phu_trach = normalizeMultiline(item.phu_trach ?? item.person ?? '');
      const isAllBlank = !noi_dung && !phu_trach;
      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        noi_dung,
        phu_trach,
      };
    });
  }

  if (typeof assignments === 'string' && assignments.trim()) {
    const lines = normalizeMultiline(assignments).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => ({
        stt: idx + 1,
        noi_dung: line,
        phu_trach: '',
      }));
    }
  }

  return [{ stt: '', noi_dung: '', phu_trach: '' }];
}

function getDirectChildren(parent, tagName) {
  const result = [];
  if (!parent || !parent.childNodes) return result;
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i];
    if (child.nodeType === 1 && (!tagName || child.tagName === tagName)) {
      result.push(child);
    }
  }
  return result;
}

/**
 * Step 4: OpenXML Post-Processing Dimension Lock (The "Anti-Skew" Layer)
 * 1. Lock All Table Widths & Column Grids:
 *    - Ensure every <w:tblPr> contains <w:tblLayout w:type="fixed"/> (overwriting autofit if present).
 *    - Verify <w:tblGrid> and its <w:gridCol w:w="..."/> children match the template dxa measurements,
 *      and ensure every <w:tcPr> inside every row retains its explicit <w:tcW w:w="..." w:type="dxa"/>.
 * 2. Enforce Flexible Row Heights & Prevent Row Splitting:
 *    - Ensure every <w:trPr> contains <w:cantSplit/>.
 *    - If <w:trHeight> is present in any data table row, set w:hRule="atLeast" (never exact).
 * 3. Protect Signature Blocks from Page Breaks:
 *    - Locate the bottom signature tables ("Trưởng đơn vị nhận", "Trưởng đơn vị", "Phòng KH&CN", "HIỆU TRƯỞNG").
 *    - Inject <w:cantSplit/> into every <w:trPr> and <w:keepNext/> + <w:keepLines/> into <w:pPr>
 *      of the rows in these signature tables so signature titles and their 4+4=8 blank signing rows
 *      are never separated across a page break.
 * 4. Leave <w:sectPr> (<w:pgSz>, <w:pgMar>) 100% untouched byte-for-byte.
 */
export function applyPaginationAndSignatureProtection(zip) {
  const xmlString = zip.file('word/document.xml').asText();
  const domDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

  const signatureKeywords = [
    'Trưởng đơn vị nhận',
    'Trưởng đơn vị giao',
    'Trưởng đơn vị',
    'Chủ nhiệm đề tài',
    'Phòng KH&CN',
    'Phòng TCKT',
    'Văn Phòng',
    'HIỆU TRƯỞNG',
    'Nơi nhận',
  ];

  const allTables = Array.from(domDoc.getElementsByTagName('w:tbl'));
  const signatureTables = [];

  for (let t = 0; t < allTables.length; t++) {
    const tbl = allTables[t];
    const text = tbl.textContent || '';
    const isSignatureTable =
      t > 0 && signatureKeywords.some((kw) => text.includes(kw));

    if (isSignatureTable) {
      signatureTables.push(tbl);
    }

    // 4.1: Ensure <w:tblPr> has <w:tblLayout w:type="fixed"/>
    let tblPr = getDirectChildren(tbl, 'w:tblPr')[0];
    if (!tblPr) {
      tblPr = domDoc.createElementNS(W_NS, 'w:tblPr');
      tbl.insertBefore(tblPr, tbl.firstChild);
    }
    let tblLayout = getDirectChildren(tblPr, 'w:tblLayout')[0];
    if (!tblLayout) {
      tblLayout = domDoc.createElementNS(W_NS, 'w:tblLayout');
      const tblLook = getDirectChildren(tblPr, 'w:tblLook')[0];
      if (tblLook) {
        tblPr.insertBefore(tblLayout, tblLook);
      } else {
        tblPr.appendChild(tblLayout);
      }
    }
    tblLayout.setAttribute('w:type', 'fixed');

    // Read <w:tblGrid> column widths in dxa
    const tblGrid = getDirectChildren(tbl, 'w:tblGrid')[0];
    const gridCols = tblGrid
      ? getDirectChildren(tblGrid, 'w:gridCol').map((gc) => Number(gc.getAttribute('w:w') || 0))
      : [];

    // 4.1 & 4.2: Check every row <w:tr> and cell <w:tc>
    const rows = getDirectChildren(tbl, 'w:tr');
    for (let r = 0; r < rows.length; r++) {
      const tr = rows[r];
      let trPr = getDirectChildren(tr, 'w:trPr')[0];
      if (!trPr) {
        trPr = domDoc.createElementNS(W_NS, 'w:trPr');
        tr.insertBefore(trPr, tr.firstChild);
      }

      // Ensure <w:cantSplit/>
      if (getDirectChildren(trPr, 'w:cantSplit').length === 0) {
        trPr.appendChild(domDoc.createElementNS(W_NS, 'w:cantSplit'));
      }

      // Ensure <w:trHeight> in data tables uses w:hRule="atLeast" (never exact)
      if (!isSignatureTable && t > 0) {
        const trHeights = getDirectChildren(trPr, 'w:trHeight');
        for (const th of trHeights) {
          th.setAttribute('w:hRule', 'atLeast');
        }
      }

      // Verify every <w:tcPr> retains its explicit <w:tcW w:w="..." w:type="dxa"/>
      const cells = getDirectChildren(tr, 'w:tc');
      let gridIdx = 0;
      for (let c = 0; c < cells.length; c++) {
        const tc = cells[c];
        let tcPr = getDirectChildren(tc, 'w:tcPr')[0];
        if (!tcPr) {
          tcPr = domDoc.createElementNS(W_NS, 'w:tcPr');
          tc.insertBefore(tcPr, tc.firstChild);
        }
        const gridSpanEl = getDirectChildren(tcPr, 'w:gridSpan')[0];
        const span = gridSpanEl ? Number(gridSpanEl.getAttribute('w:val') || 1) : 1;
        let expectedWidth = 0;
        for (let s = 0; s < span && gridIdx + s < gridCols.length; s++) {
          expectedWidth += gridCols[gridIdx + s];
        }
        gridIdx += span;

        let tcW = getDirectChildren(tcPr, 'w:tcW')[0];
        if (!tcW) {
          tcW = domDoc.createElementNS(W_NS, 'w:tcW');
          tcPr.insertBefore(tcW, tcPr.firstChild);
        }
        if (!tcW.getAttribute('w:w') && expectedWidth > 0) {
          tcW.setAttribute('w:w', String(expectedWidth));
        }
        tcW.setAttribute('w:type', 'dxa');
      }
    }
  }

  // 4.3: Protect Signature Blocks from Page Breaks (<w:keepLines/> and <w:keepNext/>)
  for (let sIdx = 0; sIdx < signatureTables.length; sIdx++) {
    const sigTbl = signatureTables[sIdx];
    const isLastSigTable = sIdx === signatureTables.length - 1;
    const rows = getDirectChildren(sigTbl, 'w:tr');

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const tr = rows[rIdx];
      const isVeryLastRow = isLastSigTable && rIdx === rows.length - 1;
      const pNodes = Array.from(tr.getElementsByTagName('w:p'));

      for (let pIdx = 0; pIdx < pNodes.length; pIdx++) {
        const pNode = pNodes[pIdx];
        let pPr = getDirectChildren(pNode, 'w:pPr')[0];
        if (!pPr) {
          pPr = domDoc.createElementNS(W_NS, 'w:pPr');
          pNode.insertBefore(pPr, pNode.firstChild);
        }
        if (getDirectChildren(pPr, 'w:keepLines').length === 0) {
          pPr.appendChild(domDoc.createElementNS(W_NS, 'w:keepLines'));
        }
        if (!isVeryLastRow && getDirectChildren(pPr, 'w:keepNext').length === 0) {
          pPr.appendChild(domDoc.createElementNS(W_NS, 'w:keepNext'));
        }
      }
    }

    // Also keep any spacer paragraph immediately between signature tables glued with <w:keepNext/>
    if (!isLastSigTable && sigTbl.nextSibling && sigTbl.nextSibling.nodeName === 'w:p') {
      const betweenP = sigTbl.nextSibling;
      let pPr = getDirectChildren(betweenP, 'w:pPr')[0];
      if (!pPr) {
        pPr = domDoc.createElementNS(W_NS, 'w:pPr');
        betweenP.insertBefore(pPr, betweenP.firstChild);
      }
      if (getDirectChildren(pPr, 'w:keepNext').length === 0) {
        pPr.appendChild(domDoc.createElementNS(W_NS, 'w:keepNext'));
      }
    }
  }

  // 4.4: Header Table Left Cell Single-Line Unit Name Protection
  // Prevents long department names (e.g. "PHÒNG KHOA HỌC CÔNG NGHỆ") from wrapping onto a 2nd line
  if (allTables.length > 0) {
    const headerTbl = allTables[0];
    const firstRow = getDirectChildren(headerTbl, 'w:tr')[0];
    const leftCell = firstRow ? getDirectChildren(firstRow, 'w:tc')[0] : null;
    if (leftCell) {
      let leftTcPr = getDirectChildren(leftCell, 'w:tcPr')[0];
      if (!leftTcPr) {
        leftTcPr = domDoc.createElementNS(W_NS, 'w:tcPr');
        leftCell.insertBefore(leftTcPr, leftCell.firstChild);
      }
      let leftTcMar = getDirectChildren(leftTcPr, 'w:tcMar')[0];
      if (!leftTcMar) {
        leftTcMar = domDoc.createElementNS(W_NS, 'w:tcMar');
        leftTcPr.appendChild(leftTcMar);
      }
      for (const side of ['w:left', 'w:right']) {
        let mNode = getDirectChildren(leftTcMar, side)[0];
        if (!mNode) {
          mNode = domDoc.createElementNS(W_NS, side);
          leftTcMar.appendChild(mNode);
        }
        mNode.setAttribute('w:w', '0');
        mNode.setAttribute('w:type', 'dxa');
      }

      const leftPs = getDirectChildren(leftCell, 'w:p');
      if (leftPs.length > 1) {
        const unitP = leftPs[1];
        const unitText = (unitP.textContent || '').trim();
        if (unitText && !unitText.includes('TRƯỜNG ĐẠI HỌC')) {
          const targetSz = unitText.length > 28 ? '22' : unitText.length >= 22 ? '23' : '24';
          const targetScale = unitText.length > 28 ? '90' : unitText.length >= 22 ? '95' : null;
          let pPr = getDirectChildren(unitP, 'w:pPr')[0];
          if (!pPr) {
            pPr = domDoc.createElementNS(W_NS, 'w:pPr');
            unitP.insertBefore(pPr, unitP.firstChild);
          }
          let ind = getDirectChildren(pPr, 'w:ind')[0];
          if (!ind) {
            ind = domDoc.createElementNS(W_NS, 'w:ind');
            const jc = getDirectChildren(pPr, 'w:jc')[0];
            if (jc) pPr.insertBefore(ind, jc);
            else pPr.appendChild(ind);
          }
          ind.setAttribute('w:left', '-120');
          ind.setAttribute('w:right', '-120');

          const rNodes = getDirectChildren(unitP, 'w:r');
          for (const r of rNodes) {
            if (r.getElementsByTagName('w:t').length === 0) continue;
            let rPr = getDirectChildren(r, 'w:rPr')[0];
            if (!rPr) {
              rPr = domDoc.createElementNS(W_NS, 'w:rPr');
              r.insertBefore(rPr, r.firstChild);
            }
            for (const tag of ['w:sz', 'w:szCs']) {
              let szEl = getDirectChildren(rPr, tag)[0];
              if (!szEl) {
                szEl = domDoc.createElementNS(W_NS, tag);
                rPr.appendChild(szEl);
              }
              szEl.setAttribute('w:val', targetSz);
            }
            if (targetScale) {
              let wEl = getDirectChildren(rPr, 'w:w')[0];
              if (!wEl) {
                wEl = domDoc.createElementNS(W_NS, 'w:w');
                rPr.appendChild(wEl);
              }
              wEl.setAttribute('w:val', targetScale);
            }
          }
        }
      }
    }
  }

  const updatedXml = new XMLSerializer().serializeToString(domDoc);
  zip.file('word/document.xml', updatedXml);
}

/**
 * Chuẩn bị dữ liệu đã tiền xử lý cho Docxtemplater (Mẫu 1a & Mẫu 2a)
 */
export function prepareRenderData(code, rawFormData = {}, is1a = false) {
  const formData = sanitizePayload(rawFormData || {});
  const now = new Date();
  const day = String(formData.ngay || now.getDate()).padStart(2, '0');
  const month = String(formData.thang || now.getMonth() + 1).padStart(2, '0');
  const year = String(formData.nam || now.getFullYear());

  const dept =
    formData.department ||
    formData.department_name ||
    formData.don_vi ||
    formData.ten_don_vi ||
    'KHOA CÔNG NGHỆ THÔNG TIN';
  const unitAbbr =
    formData.don_vi_viet_tat ||
    formData.ten_don_vi ||
    dept
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase() ||
    'ĐV';

  if (is1a) {
    const docNumInfo = formatDocumentNumber(
      formData.proposal_number || formData.so_to_trinh,
      formData.so_hieu,
      'TTr',
      unitAbbr
    );

    return {
      ...formData,
      don_vi_uppercase: dept.toUpperCase(),
      so_hieu: docNumInfo.so_hieu,
      ten_don_vi: docNumInfo.ten_don_vi,
      so_to_trinh: docNumInfo.formatted,
      ngay: day,
      thang: month,
      nam: year,
      ho_ten: formData.full_name || formData.creator_name || formData.ho_ten || '',
      chuc_danh: formData.position || formData.chuc_danh || '',
      dien_thoai: formData.phone || formData.dien_thoai || '',
      email: formData.email || '',
      muc_dich: normalizeMultiline(formData.purpose || formData.muc_dich || formData.research_title || ''),
      nhu_cau_tiep_nhan: normalizeMultiline(formData.receiver_needs || formData.nhu_cau_tiep_nhan || ''),
      dap_ung_thuc_hien: normalizeMultiline(formData.provider_capacity || formData.dap_ung_thuc_hien || ''),
      muc_tieu: normalizeMultiline(formData.transfer_goals || formData.muc_tieu || ''),
      doi_tuong: normalizeMultiline(formData.transfer_target || formData.doi_tuong || ''),
      phuong_thuc: normalizeMultiline(formData.transfer_method || formData.phuong_thuc || ''),
      hinh_thuc: normalizeMultiline(formData.transfer_form || formData.hinh_thuc || 'Chuyển giao công nghệ độc lập.'),
      quyen_chuyen_giao: normalizeMultiline(formData.transfer_rights || formData.quyen_chuyen_giao || ''),
      thoi_gian: normalizeMultiline(formData.transfer_time || formData.thoi_gian || ''),
      dia_diem: normalizeMultiline(formData.transfer_location || formData.dia_diem || ''),
      thanh_phan: normalizeMultiline(formData.attendees || formData.thanh_phan || ''),
      kinh_phi: normalizeMultiline(
        formData.funding_source || formData.financial_plan || formData.kinh_phi || ''
      ),
      truong_don_vi: formData.assigned_manager || formData.truong_don_vi || '',
    };
  }

  // Mẫu 2a
  const docNumInfo = formatDocumentNumber(
    formData.plan_code || formData.so_ke_hoach,
    formData.so_hieu,
    'KH',
    unitAbbr
  );

  const explicitCoHoiThao =
    rawFormData?.co_hoi_thao !== undefined
      ? Boolean(rawFormData.co_hoi_thao)
      : rawFormData?.has_hoi_thao !== undefined
        ? Boolean(rawFormData.has_hoi_thao)
        : rawFormData?.has_workshop !== undefined
          ? Boolean(rawFormData.has_workshop)
          : Boolean(
              formData.workshop_chair ||
                formData.workshop_speaker ||
                formData.workshop_program ||
                formData.chu_toa ||
                formData.bao_cao_vien ||
                (Array.isArray(formData.ds_chu_toa) && formData.ds_chu_toa.length > 0) ||
                (Array.isArray(formData.ds_bao_cao_vien) && formData.ds_bao_cao_vien.length > 0) ||
                (Array.isArray(formData.ds_chuong_trinh_hoi_thao) && formData.ds_chuong_trinh_hoi_thao.length > 0)
            );

  const rawTransferCost = rawFormData?.transfer_cost ?? rawFormData?.chi_phi;
  let formattedChiPhi = '';
  if (rawTransferCost !== undefined && rawTransferCost !== null && rawTransferCost !== '') {
    if (typeof rawTransferCost === 'number' || /^\d+$/.test(String(rawTransferCost).trim())) {
      formattedChiPhi =
        Number(rawTransferCost) === 0
          ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
          : `${Number(rawTransferCost).toLocaleString('vi-VN')} VNĐ`;
    } else {
      formattedChiPhi = normalizeMultiline(String(rawTransferCost));
    }
  }

  return {
    ...formData,
    so_hieu: docNumInfo.so_hieu,
    ten_don_vi: docNumInfo.ten_don_vi,
    so_ke_hoach: docNumInfo.formatted,
    don_vi_uppercase: dept.toUpperCase(),
    don_vi_viet_tat: unitAbbr,
    ngay: day,
    thang: month,
    nam: year,
    ten_san_pham: normalizeMultiline(
      formData.product_name || formData.ten_san_pham || formData.title || formData.research_title || ''
    ),
    ho_ten: normalizeMultiline(formData.full_name || formData.creator_name || formData.ho_ten || ''),
    truong_don_vi_nhan: normalizeMultiline(formData.receiver_manager || formData.truong_don_vi_nhan || ''),
    dien_thoai: normalizeMultiline(formData.phone || formData.dien_thoai || ''),
    email: normalizeMultiline(formData.email || ''),
    muc_dich: normalizeMultiline(formData.purpose || formData.muc_dich || ''),
    nhom_tac_gia: normalizeMultiline(formData.authors_group || formData.nhom_tac_gia || formData.full_name || ''),
    loai_hinh_san_pham: normalizeMultiline(formData.product_type || formData.loai_hinh_san_pham || ''),
    phuong_thuc: normalizeMultiline(formData.transfer_method || formData.phuong_thuc || ''),
    ben_nhan_chuyen_giao: normalizeMultiline(
      formData.receiving_party || formData.ben_nhan_chuyen_giao || formData.partner || ''
    ),
    thoi_gian: formData.transfer_date
      ? new Date(formData.transfer_date).toLocaleDateString('vi-VN')
      : normalizeMultiline(formData.transfer_time || formData.thoi_gian || ''),
    dia_diem: normalizeMultiline(formData.transfer_location || formData.dia_diem || ''),
    chi_phi: formattedChiPhi,
    // Nhân sự 2 cột Mục VIII
    ds_ban_chi_dao: pairTwoColumns(
      rawFormData?.ds_ban_chi_dao ?? rawFormData?.steering_committee ?? rawFormData?.ban_chi_dao
    ),
    ds_ban_to_chuc: pairTwoColumns(
      rawFormData?.ds_ban_to_chuc ?? rawFormData?.organizing_committee ?? rawFormData?.ban_to_chuc
    ),
    ds_nhan_su: pairTwoColumns(
      rawFormData?.ds_nhan_su ?? rawFormData?.implementing_staff ?? rawFormData?.nhan_su
    ),
    // Khối điều kiện Mục IX
    co_hoi_thao: explicitCoHoiThao,
    has_hoi_thao: explicitCoHoiThao,
    ds_chu_toa: pairTwoColumns(rawFormData?.ds_chu_toa ?? rawFormData?.workshop_chair ?? rawFormData?.chu_toa),
    ds_bao_cao_vien: pairTwoColumns(
      rawFormData?.ds_bao_cao_vien ?? rawFormData?.workshop_speaker ?? rawFormData?.bao_cao_vien
    ),
    ds_chuong_trinh_hoi_thao: adaptWorkshopSchedule(
      rawFormData?.ds_chuong_trinh_hoi_thao ?? rawFormData?.workshop_program ?? rawFormData?.chuong_trinh_hoi_thao
    ),
    ds_phan_cong_hoi_thao: adaptWorkshopAssignment(
      rawFormData?.ds_phan_cong_hoi_thao ?? rawFormData?.workshop_assignments ?? rawFormData?.phan_cong_hoi_thao
    ),
    kinh_phi_hoi_thao: normalizeMultiline(
      formData.workshop_budget || formData.kinh_phi_hoi_thao || ''
    ),
    // Bảng rủi ro Mục X
    ds_danh_gia_rui_ro: adaptRiskTable(
      rawFormData?.ds_danh_gia_rui_ro ?? rawFormData?.risks ?? rawFormData?.danh_gia_rui_ro ?? rawFormData?.risk_management
    ),
    ds_kiem_soat_rui_ro: adaptRiskControlTable(
      rawFormData?.ds_kiem_soat_rui_ro ?? rawFormData?.risk_controls ?? rawFormData?.kiem_soat_rui_ro
    ),
  };
}

/**
 * Render buffer .docx từ template chuẩn và dữ liệu Web Form
 */
export function renderDocxBuffer(formData = {}, templateId = 'tmpl-cgcn-2a', code = 'CGCN-0001') {
  const { filePath: templatePath, is1a } = findTemplateFile(templateId);
  const templateBuffer = fs.readFileSync(templatePath);

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  const renderData = prepareRenderData(code, formData, is1a);
  doc.render(renderData);

  // Hậu xử lý DOM (Step 4: Anti-Skew & Signature Protection)
  applyPaginationAndSignatureProtection(doc.getZip());

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return { buffer, templatePath, is1a, renderData };
}

/**
 * Sinh file Word .docx mapping dữ liệu từ Web Form không lỗi định dạng
 */
export async function generateDocx(code, formData = {}, templateId = 'tmpl-cgcn-2a') {
  ensureUploadDir();

  const cleanCode = String(code || '').trim();
  const normalizedCode = cleanCode.startsWith('CGCN-') ? cleanCode : `CGCN-${cleanCode}`;
  const fileName = `${normalizedCode}.docx`;
  const outputPath = path.join(UPLOADS_DOCX_DIR, fileName);

  const { buffer } = renderDocxBuffer(formData, templateId, normalizedCode);

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
  renderDocxBuffer,
  prepareRenderData,
  findTemplateFile,
  sanitizePayload,
  normalizeMultiline,
  formatDocumentNumber,
  pairTwoColumns,
  getRiskLevel,
  adaptRiskTable,
  adaptRiskControlTable,
  adaptWorkshopSchedule,
  adaptWorkshopAssignment,
  applyPaginationAndSignatureProtection,
};

export default documentService;
