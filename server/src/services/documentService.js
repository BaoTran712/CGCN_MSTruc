import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single Source of Truth cho file mẫu Word (.docx)
const TEMPLATES_DIR = path.resolve(__dirname, '../../templates');
const UPLOADS_DOCX_DIR = path.resolve(__dirname, '../../uploads/docx');
const UPLOADS_PDF_DIR = path.resolve(__dirname, '../../uploads/pdf');
const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function ensureUploadDirs() {
  [UPLOADS_DOCX_DIR, UPLOADS_PDF_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Tìm đường dẫn file mẫu chuẩn trong thư mục duy nhất server/templates/
 * Chỉ đọc buffer bản sao từ file mẫu, tuyệt đối không ghi đè file mẫu gốc.
 */
export function findTemplateFile(templateType = '2a') {
  const str = String(templateType).toLowerCase();
  const is1a =
    str.includes('1a') ||
    str.includes('tt') ||
    str.includes('proposal') ||
    str.includes('knowledge') ||
    str.includes('tri-thuc');

  const fileName = is1a ? 'mau_1a_chuan.docx' : 'mau_2a_chuan.docx';
  const filePath = path.join(TEMPLATES_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file mẫu chuẩn tại: ${filePath}`);
  }

  const magic = fs.readFileSync(filePath).slice(0, 4).toString('hex');
  if (magic !== '504b0304') {
    throw new Error(`File mẫu ${fileName} không đúng chuẩn OpenXML .docx (ZIP magic mismatch)`);
  }

  return { filePath, is1a, fileName };
}

/**
 * Chuẩn hóa chuỗi: null/undefined -> "", chuẩn hóa \r\n -> \n, xóa thẻ HTML
 */
export function normalizeMultiline(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, '');
}

/**
 * Đệ quy làm sạch toàn bộ payload JSON
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
 * Định dạng số hiệu văn bản hành chính: {so_hieu}/TTr-{ten_don_vi} hoặc {so_hieu}/KH-{ten_don_vi}
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
 * Gom mảng nhân sự thành bảng 2 cột (Mục 8.1, 8.2, 8.3, 9.1, 9.2)
 */
export function pairTwoColumns(input) {
  if (
    !input ||
    (Array.isArray(input) && input.length === 0) ||
    (typeof input === 'string' && !input.trim())
  ) {
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

    if (typeof valid[0] === 'object' && ('col1' in valid[0] || 'col2' in valid[0])) {
      return valid.map((r, idx) => ({
        stt: r.stt !== undefined && r.stt !== '' ? r.stt : idx + 1,
        col1: normalizeMultiline(r.col1 || ''),
        col2: normalizeMultiline(r.col2 || ''),
      }));
    }

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

export function getRiskLevel(r) {
  const val = Number(r);
  if (val <= 4) return 'Thấp';
  if (val <= 9) return 'Trung bình';
  if (val <= 15) return 'Cao';
  return 'Rất cao';
}

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
      const hasPS =
        rawP !== '' && rawP !== null && rawP !== undefined && rawS !== '' && rawS !== null && rawS !== undefined;
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
 * OpenXML Post-Processing Dimension Lock (Anti-Skew & Signature Protection)
 */
export function applyPaginationAndSignatureProtection(zip, options = {}) {
  const xmlString = zip.file('word/document.xml').asText();
  const domDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

  // Xử lý cờ điều kiện has_budget: Nếu has_budget === 0 / false -> tự động ẩn/xóa các mục kinh phí/chi phí trong Word
  const hideBudget = options.hideBudget === true;
  if (hideBudget) {
    const bodyEl = domDoc.getElementsByTagName('w:body')[0];
    if (bodyEl) {
      const bodyChildren = getDirectChildren(bodyEl);
      for (let i = 0; i < bodyChildren.length; i++) {
        const node = bodyChildren[i];
        if (node.tagName !== 'w:p') continue;
        const pText = (node.textContent || '').trim();

        // Mẫu 1a: Mục "VI. Kinh phí tổ chức: ..."
        if (/^VI\.\s*Kinh phí tổ chức/i.test(pText)) {
          bodyEl.removeChild(node);
          continue;
        }

        // Mẫu 2a: Mục "VII. Chi phí chuyển giao" và đoạn giá trị chi phí liền kề bên dưới
        if (/^VII\.\s*Chi phí chuyển giao/i.test(pText)) {
          const nextNode = bodyChildren[i + 1];
          bodyEl.removeChild(node);
          if (
            nextNode &&
            nextNode.tagName === 'w:p' &&
            !/^VIII\./i.test((nextNode.textContent || '').trim())
          ) {
            bodyEl.removeChild(nextNode);
            i++;
          }
          continue;
        }

        // Mẫu 2a (nếu có hội thảo nhưng không có kinh phí): "9.5. Dự trù kinh phí hội thảo" và đoạn liền kề
        if (/^9\.5\.\s*Dự trù kinh phí hội thảo/i.test(pText)) {
          const nextNode = bodyChildren[i + 1];
          bodyEl.removeChild(node);
          if (
            nextNode &&
            nextNode.tagName === 'w:p' &&
            !/^X\./i.test((nextNode.textContent || '').trim())
          ) {
            bodyEl.removeChild(nextNode);
            i++;
          }
          continue;
        }
      }
    }
  }

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
    const isSignatureTable = t > 0 && signatureKeywords.some((kw) => text.includes(kw));

    if (isSignatureTable) {
      signatureTables.push(tbl);
    }

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

    const tblGrid = getDirectChildren(tbl, 'w:tblGrid')[0];
    const gridCols = tblGrid
      ? getDirectChildren(tblGrid, 'w:gridCol').map((gc) => Number(gc.getAttribute('w:w') || 0))
      : [];

    const rows = getDirectChildren(tbl, 'w:tr');
    for (let r = 0; r < rows.length; r++) {
      const tr = rows[r];
      let trPr = getDirectChildren(tr, 'w:trPr')[0];
      if (!trPr) {
        trPr = domDoc.createElementNS(W_NS, 'w:trPr');
        tr.insertBefore(trPr, tr.firstChild);
      }

      if (getDirectChildren(trPr, 'w:cantSplit').length === 0) {
        trPr.appendChild(domDoc.createElementNS(W_NS, 'w:cantSplit'));
      }

      if (!isSignatureTable && t > 0) {
        const trHeights = getDirectChildren(trPr, 'w:trHeight');
        for (const th of trHeights) {
          th.setAttribute('w:hRule', 'atLeast');
        }
      }

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
 * Chuẩn bị dữ liệu mapping cho Docxtemplater (Mẫu 1a - Tờ trình & Mẫu 2a - Kế hoạch)
 * Nhận thêm departmentInfo từ bảng departments và cờ hasWorkshop, hasBudget
 */
export function prepareRenderData(code, rawFormData = {}, is1a = false, options = {}) {
  const formData = sanitizePayload(rawFormData || {});
  const now = new Date();
  const day = String(formData.ngay || now.getDate()).padStart(2, '0');
  const month = String(formData.thang || now.getMonth() + 1).padStart(2, '0');
  const year = String(formData.nam || now.getFullYear());

  const deptName =
    options.departmentName ||
    formData.department_name ||
    formData.department ||
    formData.don_vi ||
    formData.ten_don_vi ||
    'KHOA Y';

  const unitAbbr =
    options.departmentCode ||
    formData.don_vi_viet_tat ||
    formData.ten_don_vi ||
    deptName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase() ||
    'ĐV';

  const deanTitle = options.deanTitle || formData.dean_title || 'TRƯỞNG KHOA';
  const techName =
    options.technologyName ||
    formData.technology_name ||
    formData.product_name ||
    formData.research_title ||
    formData.ten_san_pham ||
    formData.title ||
    '';
  const transferTarget =
    options.transferTarget ||
    formData.transfer_target ||
    formData.receiving_party ||
    formData.ben_nhan_chuyen_giao ||
    formData.doi_tuong ||
    '';
  const purposeText =
    options.purpose || formData.purpose || formData.muc_dich || techName || '';

  if (is1a) {
    const docNumInfo = formatDocumentNumber(
      formData.proposal_number || formData.so_to_trinh,
      formData.so_hieu,
      'TTr',
      unitAbbr
    );

    return {
      ...formData,
      don_vi_uppercase: deptName.toUpperCase(),
      dean_title: deanTitle,
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
      muc_dich: normalizeMultiline(purposeText),
      nhu_cau_tiep_nhan: normalizeMultiline(formData.receiver_needs || formData.nhu_cau_tiep_nhan || ''),
      dap_ung_thuc_hien: normalizeMultiline(formData.provider_capacity || formData.dap_ung_thuc_hien || ''),
      muc_tieu: normalizeMultiline(formData.transfer_goals || formData.muc_tieu || ''),
      doi_tuong: normalizeMultiline(transferTarget),
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

  // Mẫu 2a - Kế hoạch CGCN
  const docNumInfo = formatDocumentNumber(
    formData.plan_code || formData.so_ke_hoach,
    formData.so_hieu,
    'KH',
    unitAbbr
  );

  // Xử lý cờ điều kiện has_workshop: Nếu has_workshop === 0 / false -> cắt bỏ hoàn toàn khối Hội thảo trong Word
  let explicitCoHoiThao = false;
  if (options.hasWorkshop !== undefined && options.hasWorkshop !== null) {
    explicitCoHoiThao = Number(options.hasWorkshop) === 1 || options.hasWorkshop === true;
  } else if (rawFormData?.has_workshop !== undefined) {
    explicitCoHoiThao = Number(rawFormData.has_workshop) === 1 || rawFormData.has_workshop === true;
  } else if (rawFormData?.co_hoi_thao !== undefined) {
    explicitCoHoiThao = Boolean(rawFormData.co_hoi_thao);
  } else if (rawFormData?.has_hoi_thao !== undefined) {
    explicitCoHoiThao = Boolean(rawFormData.has_hoi_thao);
  }

  const rawTransferCost = rawFormData?.transfer_cost ?? rawFormData?.chi_phi;
  let formattedChiPhi = '';
  if (options.hasBudget === 0 || options.hasBudget === false) {
    formattedChiPhi = formData.chi_phi || 'Không thu phí (kinh phí hoạt động Nhà trường)';
  } else if (rawTransferCost !== undefined && rawTransferCost !== null && rawTransferCost !== '') {
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
    don_vi_uppercase: deptName.toUpperCase(),
    don_vi_viet_tat: unitAbbr,
    dean_title: deanTitle,
    ngay: day,
    thang: month,
    nam: year,
    ten_san_pham: normalizeMultiline(techName),
    ho_ten: normalizeMultiline(formData.full_name || formData.creator_name || formData.ho_ten || ''),
    truong_don_vi_nhan: normalizeMultiline(formData.receiver_manager || formData.truong_don_vi_nhan || ''),
    dien_thoai: normalizeMultiline(formData.phone || formData.dien_thoai || ''),
    email: normalizeMultiline(formData.email || ''),
    muc_dich: normalizeMultiline(purposeText),
    nhom_tac_gia: normalizeMultiline(formData.authors_group || formData.nhom_tac_gia || formData.full_name || ''),
    loai_hinh_san_pham: normalizeMultiline(formData.product_type || formData.loai_hinh_san_pham || ''),
    phuong_thuc: normalizeMultiline(formData.transfer_method || formData.phuong_thuc || ''),
    ben_nhan_chuyen_giao: normalizeMultiline(transferTarget),
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
    // Khối điều kiện Mục IX (Hội thảo): Tự động cắt bỏ khi explicitCoHoiThao === false
    co_hoi_thao: explicitCoHoiThao,
    has_hoi_thao: explicitCoHoiThao,
    ds_chu_toa: explicitCoHoiThao
      ? pairTwoColumns(rawFormData?.ds_chu_toa ?? rawFormData?.workshop_chair ?? rawFormData?.chu_toa)
      : [],
    ds_bao_cao_vien: explicitCoHoiThao
      ? pairTwoColumns(rawFormData?.ds_bao_cao_vien ?? rawFormData?.workshop_speaker ?? rawFormData?.bao_cao_vien)
      : [],
    ds_chuong_trinh_hoi_thao: explicitCoHoiThao
      ? adaptWorkshopSchedule(
          rawFormData?.ds_chuong_trinh_hoi_thao ?? rawFormData?.workshop_program ?? rawFormData?.chuong_trinh_hoi_thao
        )
      : [],
    ds_phan_cong_hoi_thao: explicitCoHoiThao
      ? adaptWorkshopAssignment(
          rawFormData?.ds_phan_cong_hoi_thao ?? rawFormData?.workshop_assignments ?? rawFormData?.phan_cong_hoi_thao
        )
      : [],
    kinh_phi_hoi_thao: explicitCoHoiThao
      ? normalizeMultiline(formData.workshop_budget || formData.kinh_phi_hoi_thao || '')
      : '',
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
 * Render buffer .docx từ bản sao bộ nhớ của file mẫu chuẩn (tuyệt đối không ghi đè file mẫu gốc)
 */
export function renderDocxBuffer(formData = {}, templateId = '2a', code = 'CGCN-2026-0001', options = {}) {
  const { filePath: templatePath, is1a } = findTemplateFile(templateId);
  // Đọc bản sao vào bộ nhớ (Buffer.from) để đảm bảo file gốc trong server/templates/ bất biến 100%
  const templateBuffer = Buffer.from(fs.readFileSync(templatePath));

  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  const renderData = prepareRenderData(code, formData, is1a, options);
  doc.render(renderData);

  const explicitDisableBudget =
    options.hasBudget === 0 ||
    options.hasBudget === false ||
    formData?.has_budget === 0 ||
    formData?.has_budget === false ||
    formData?.co_kinh_phi === 0 ||
    formData?.co_kinh_phi === false;

  applyPaginationAndSignatureProtection(doc.getZip(), {
    hideBudget: explicitDisableBudget,
  });

  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return { buffer, templatePath, is1a, renderData };
}

/**
 * Sinh 1 file Word .docx từ template chỉ định
 */
export async function generateDocx(code, formData = {}, templateId = '2a', options = {}) {
  ensureUploadDirs();

  const cleanCode = String(code || '').trim();
  const normalizedCode = cleanCode.startsWith('CGCN-') ? cleanCode : `CGCN-${cleanCode}`;
  const { is1a } = findTemplateFile(templateId);
  const suffix = options.fileSuffix || (is1a ? 'ToTrinh_1a' : 'KeHoach_2a');
  const verSuffix = options.version ? `_v${options.version}` : '';
  const fileName = `${normalizedCode}_${suffix}${verSuffix}.docx`;
  const outputPath = path.join(UPLOADS_DOCX_DIR, fileName);

  const { buffer } = renderDocxBuffer(formData, templateId, normalizedCode, options);
  fs.writeFileSync(outputPath, buffer);

  return {
    fileCategory: is1a ? 'AUTO_PROPOSAL_DOCX' : 'AUTO_PLAN_DOCX',
    fileName,
    filePath: `server/uploads/docx/${fileName}`,
    absolutePath: outputPath,
    fileUrl: `/uploads/docx/${fileName}`,
    code: normalizedCode,
    fileSize: `${(buffer.length / 1024).toFixed(1)} KB`,
  };
}

/**
 * Sinh đồng thời cả file Tờ trình (AUTO_PROPOSAL_DOCX - Mẫu 1a) và Kế hoạch (AUTO_PLAN_DOCX - Mẫu 2a)
 * trong 1 lần nộp Web Form
 */
export async function generateDossierDocuments(trackingCode, formData = {}, options = {}) {
  const proposalDoc = await generateDocx(trackingCode, formData, '1a', {
    ...options,
    fileSuffix: 'ToTrinh_1a',
  });

  const planDoc = await generateDocx(trackingCode, formData, '2a', {
    ...options,
    fileSuffix: 'KeHoach_2a',
  });

  return {
    proposalDoc,
    planDoc,
    files: [proposalDoc, planDoc],
  };
}

// =========================================================================
// PHẦN GỘP TỪ pdfService.js: Sinh PDF chuẩn phục vụ Tiền kiểm
// =========================================================================

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
    console.warn('[documentService] Fallback sang StandardFonts:', err.message);
  }

  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  return { regular, bold, italic };
}

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
 * Xuất file PDF chuẩn từ dữ liệu hồ sơ khi Admin Duyệt tiền kiểm nhưng không upload file chỉnh tay
 */
export async function generateLockedPdf(
  trackingCode,
  formData = {},
  templateTitle = 'Hồ sơ Chuyển giao Công nghệ'
) {
  ensureUploadDirs();
  const fileName = `${trackingCode}_Precheck_Standard.pdf`;
  const filePath = path.join(UPLOADS_PDF_DIR, fileName);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`CTUMP CGCN - ${trackingCode}`);
  pdfDoc.setAuthor('Trường Đại học Y Dược Cần Thơ');
  pdfDoc.setSubject(templateTitle);
  pdfDoc.setCreationDate(new Date());

  const { regular, bold, italic } = await loadFonts(pdfDoc);
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  page.drawText('BỘ Y TẾ', { x: margin, y, size: 10, font: regular, color: rgb(0.2, 0.2, 0.2) });
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
  const deptName = formData.department_name || formData.department || 'PHÒNG KHOA HỌC CÔNG NGHỆ';
  page.drawText(String(deptName).toUpperCase(), {
    x: margin,
    y,
    size: 9.5,
    font: bold,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 18;
  page.drawText(`Mã hồ sơ: ${trackingCode}`, {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.3, 0.3, 0.3),
  });

  const now = new Date();
  const dateStr = `Cần Thơ, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(
    now.getMonth() + 1
  ).padStart(2, '0')} năm ${now.getFullYear()}`;
  page.drawText(dateStr, {
    x: width - margin - 180,
    y,
    size: 9,
    font: italic,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 35;
  const mainTitle = (templateTitle || 'HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ').toUpperCase();
  const titleLines = wrapText(mainTitle, contentWidth, bold, 13);
  for (const tLine of titleLines) {
    const tWidth = bold.widthOfTextAtSize(tLine, 13);
    page.drawText(tLine, {
      x: margin + (contentWidth - tWidth) / 2,
      y,
      size: 13,
      font: bold,
      color: rgb(0.1, 0.15, 0.3),
    });
    y -= 18;
  }

  y -= 10;
  const summaryFields = [
    {
      label: 'Tên công nghệ / quy trình:',
      value: formData.technology_name || formData.product_name || formData.research_title || templateTitle,
    },
    { label: 'Chủ nhiệm / Người nộp:', value: formData.full_name || formData.ho_ten || 'Cán bộ CTUMP' },
    { label: 'Đơn vị công tác:', value: deptName },
    {
      label: 'Đơn vị tiếp nhận:',
      value: formData.transfer_target || formData.receiving_party || formData.ben_nhan_chuyen_giao || '',
    },
    { label: 'Mục đích chuyển giao:', value: formData.purpose || formData.muc_dich || '' },
  ];

  for (const item of summaryFields) {
    if (y < 160) break;
    page.drawText(item.label, {
      x: margin,
      y,
      size: 9.5,
      font: bold,
      color: rgb(0.15, 0.15, 0.15),
    });

    const valLines = wrapText(String(item.value || ''), contentWidth - 140, regular, 9.5);
    let valY = y;
    for (let i = 0; i < Math.min(valLines.length, 4); i++) {
      page.drawText(valLines[i], {
        x: margin + 140,
        y: valY,
        size: 9.5,
        font: regular,
        color: rgb(0.2, 0.2, 0.2),
      });
      valY -= 13;
    }
    y = valY - 6;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);

  return {
    fileName,
    fileUrl: `/uploads/pdf/${fileName}`,
    filePath: `server/uploads/pdf/${fileName}`,
    absolutePath: filePath,
    fileSize: `${(pdfBytes.length / 1024).toFixed(1)} KB`,
  };
}

export const documentService = {
  generateDossierDocuments,
  generateDocx,
  generateLockedPdf,
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
