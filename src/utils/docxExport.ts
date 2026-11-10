import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Dossier, WordTemplate } from '../types';
import { normalizeNFC } from './textUtils';
import { isMau2aTemplateOrDossier } from './templateUtils';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/**
 * Step 3.1 & 3.2: Chuẩn hóa chuỗi nhiều dòng:
 * - Chuyển null / undefined -> ""
 * - Chuẩn hóa \r\n hoặc \r -> \n (để Docxtemplater linebreaks: true chuyển thành <w:br/>)
 * - Loại bỏ các thẻ HTML vô tình lọt vào
 */

export function formatAuthorsGroupText(rawInput: any, fallbackName = ''): string {
  if (!rawInput && !fallbackName) return '';
  if (Array.isArray(rawInput)) {
    const valid = rawInput.filter((r) => r && (r.ho_ten || r.name));
    if (valid.length > 0) {
      return valid
        .map((r, idx) => {
          const name = String(r.ho_ten || r.name || '').trim();
          const unit = String(r.chuc_vu || r.don_vi || r.unit || '').trim();
          const role = String(r.vai_tro || r.role || '').trim();
          const parts = [name, unit, role].filter(Boolean);
          const punct = idx === valid.length - 1 ? '.' : ';';
          return `${idx + 1}. ${parts.join(' – ').replace(/[;.,]+$/, '')}${punct}`;
        })
        .join('\n');
    }
  }
  const str = normalizeMultiline(rawInput || fallbackName);
  const lines = str
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  return lines
    .map((line, idx) => {
      const stt = idx + 1;
      let clean = line.replace(/^\d+\.\s*/, '').replace(/[;.,]+$/, '').trim();
      const parenMatch = clean.match(/^(.*?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        const personName = parenMatch[1].trim();
        const inside = parenMatch[2].split(',').map((s) => s.trim()).filter(Boolean);
        const rawRole = inside[0] || 'Thành viên';
        const rawUnit = inside.slice(1).join(', ') || 'Trường ĐHYD Cần Thơ';
        const stdRole = /chủ nhiệm|tác giả chính/i.test(rawRole)
          ? 'Tác giả chính, chủ trì xây dựng nội dung và triển khai chuyển giao kỹ thuật'
          : /đồng nghiên cứu|thành viên/i.test(rawRole)
          ? 'Thành viên'
          : rawRole;
        clean = `${personName} – ${rawUnit} – ${stdRole}`;
      } else {
        clean = clean.replace(/\s+-\s+/g, ' – ');
      }
      const punct = idx === lines.length - 1 ? '.' : ';';
      return `${stt}. ${clean}${punct}`;
    })
    .join('\n');
}

export function normalizeMultiline(str: any): string {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, '');
}

/**
 * Đệ quy làm sạch toàn bộ payload JSON:
 * - Chuyển mọi giá trị null / undefined thành ""
 * - Chuẩn hóa xuống dòng \r\n | \r -> \n và xóa thẻ HTML
 */
export function sanitizePayload(input: any): any {
  if (input === null || input === undefined) return '';
  if (typeof input === 'string') return normalizeMultiline(input);
  if (typeof input === 'number' || typeof input === 'boolean') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item));
  }
  if (typeof input === 'object') {
    const out: Record<string, any> = {};
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
export function formatDocumentNumber(
  rawNumber?: any,
  soHieuInput?: any,
  docType = 'KH',
  unitAbbr = 'ĐV'
): { so_hieu: string; ten_don_vi: string; formatted: string } {
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

function parseStringLinesToTwoColumns(rawLines: string[]): { stt: number | string; col1: string; col2: string }[] {
  const lines = rawLines
    .flatMap((l) => String(l).split(/[\n;]+/))
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ stt: '', col1: '', col2: '' }];
  }

  return lines.map((line, idx) => {
    const stt = idx + 1;
    const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
    const match = cleanLine.match(/^(.*?)(?:\s+[-–|]\s+|\s*:\s+)(.+)$/);
    if (match) {
      const left = match[1].trim();
      const right = match[2].trim();
      return { stt, col1: `${stt}. ${left}`, col2: right };
    }
    let inferredRole = '';
    if (/Ban Giám Hiệu/i.test(cleanLine)) inferredRole = 'Chủ tọa';
    else if (/Ban Chủ nhiệm Khoa|Trưởng Khoa|Lãnh đạo Khoa/i.test(cleanLine)) inferredRole = 'Đồng Chủ tọa';
    else if (/Chủ nhiệm đề tài/i.test(cleanLine)) inferredRole = 'Báo cáo viên chính';
    else if (/Báo cáo viên/i.test(cleanLine)) inferredRole = 'Báo cáo viên';
    else if (/Nhóm tác giả|Thành viên/i.test(cleanLine)) inferredRole = 'Thành viên thực hiện';
    return { stt, col1: `${stt}. ${cleanLine}`, col2: inferredRole };
  });
}

/**
 * Step 3.4: Adapter gom mảng nhân sự thành cặp 2 cột trên mỗi hàng (8.1, 8.2, 8.3, 9.1, 9.2)
 * Tự động đánh số stt (1, 2, 3...) và áp dụng Empty Table Safeguard nếu mảng rỗng.
 */
export function pairTwoColumns(input: any): { stt: number | string; col1: string; col2: string }[] {
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

    if (typeof valid[0] === 'object' && ('col1' in valid[0] || 'col2' in valid[0])) {
      const needsReparse = valid.some(
        (r) => !String(r.col2 || '').trim() && /[;-–|]/.test(String(r.col1 || ''))
      );
      if (needsReparse) {
        const lines = valid.map((r) =>
          String(r.col2 || '').trim() ? `${r.col1} - ${r.col2}` : String(r.col1 || '')
        );
        return parseStringLinesToTwoColumns(lines);
      }
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

/**
 * Phân loại rủi ro theo R = P * S
 */
export function getRiskLevel(r: number): string {
  const val = Number(r);
  if (val <= 4) return 'Thấp';
  if (val <= 9) return 'Trung bình';
  if (val <= 15) return 'Cao';
  return 'Rất cao';
}

/**
 * Adapter bảng đánh giá rủi ro 10.1:
 * - Tự động đánh số stt (1, 2, 3...)
 * - Tự động tính r = Number(p) * Number(s)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptRiskTable(risks: any): any[] {
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

/**
 * Adapter bảng biện pháp kiểm soát rủi ro 10.2
 * - Tự động đánh số stt (1, 2, 3...)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptRiskControlTable(controls: any): any[] {
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
function parseScheduleLine(line: string, idx: number) {
  if (line.includes('|')) {
    const parts = line.split('|').map((s) => s.trim());
    return {
      stt: idx + 1,
      thoi_gian: parts[0] || '',
      noi_dung: parts[1] || '',
      thanh_phan: parts[2] || 'Đại biểu tham dự',
    };
  }
  const colonIdx = line.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 25) {
    const timePart = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();
    const dashMatch = rest.match(/^(.*?)\s+[-–]\s+(.+)$/);
    return {
      stt: idx + 1,
      thoi_gian: timePart,
      noi_dung: dashMatch ? dashMatch[1].trim() : rest,
      thanh_phan: dashMatch ? dashMatch[2].trim() : 'Ban Tổ chức và đại biểu',
    };
  }
  return {
    stt: idx + 1,
    thoi_gian: 'Theo chương trình',
    noi_dung: line,
    thanh_phan: 'Ban Tổ chức và đại biểu',
  };
}

export function adaptWorkshopSchedule(schedule: any): any[] {
  if (Array.isArray(schedule)) {
    if (schedule.length === 0) {
      return [{ stt: '', thoi_gian: '', noi_dung: '', thanh_phan: '' }];
    }
    return schedule.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return parseScheduleLine(normalizeMultiline(item), idx);
      }
      const thoi_gian = normalizeMultiline(item.thoi_gian ?? item.time ?? '');
      const noi_dung = normalizeMultiline(item.noi_dung ?? item.content ?? '');
      const thanh_phan = normalizeMultiline(item.thanh_phan ?? item.attendees ?? '');
      if (!thoi_gian && noi_dung && (noi_dung.includes('|') || (noi_dung.indexOf(':') > 0 && noi_dung.indexOf(':') <= 25))) {
        const parsed = parseScheduleLine(noi_dung, idx);
        return {
          stt: item.stt || idx + 1,
          thoi_gian: parsed.thoi_gian,
          noi_dung: parsed.noi_dung,
          thanh_phan: thanh_phan || parsed.thanh_phan,
        };
      }
      const isAllBlank = !thoi_gian && !noi_dung && !thanh_phan;
      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        thoi_gian,
        noi_dung: noi_dung.replace(/^\d{1,2}[h:]\d{0,2}\s*[-–]\s*\d{1,2}[h:]\d{0,2}\s*:\s*/i, ''),
        thanh_phan: thanh_phan || (noi_dung ? 'Ban Tổ chức và đại biểu' : ''),
      };
    });
  }

  if (typeof schedule === 'string' && schedule.trim()) {
    const lines = normalizeMultiline(schedule).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => parseScheduleLine(line, idx));
    }
  }

  return [{ stt: '', thoi_gian: '', noi_dung: '', thanh_phan: '' }];
}

function parseAssignmentLine(line: string, idx: number) {
  const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
  if (cleanLine.includes('|')) {
    const parts = cleanLine.split('|').map((s) => s.trim());
    return {
      stt: idx + 1,
      noi_dung: parts[0] || '',
      phu_trach: parts[1] || 'Ban Tổ chức',
    };
  }
  const dashMatch = cleanLine.match(/^(.*?)\s+[-–]\s+(.+)$/);
  if (dashMatch) {
    return {
      stt: idx + 1,
      noi_dung: dashMatch[1].trim(),
      phu_trach: dashMatch[2].trim(),
    };
  }
  return {
    stt: idx + 1,
    noi_dung: cleanLine,
    phu_trach: 'Nhóm tác giả & Ban Tổ chức',
  };
}

/**
 * Adapter phân công nhiệm vụ tổ chức 9.4
 * - Tự động đánh số stt (1, 2, 3...)
 * - Empty Table Safeguard: nếu mảng rỗng, trả về 1 hàng trống giữ nguyên độ rộng cột
 */
export function adaptWorkshopAssignment(assignments: any): any[] {
  if (Array.isArray(assignments)) {
    if (assignments.length === 0) {
      return [{ stt: '', noi_dung: '', phu_trach: '' }];
    }
    return assignments.map((item, idx) => {
      if (!item || typeof item !== 'object') {
        return parseAssignmentLine(normalizeMultiline(item), idx);
      }
      const noi_dung = normalizeMultiline(item.noi_dung ?? item.task ?? item.cong_viec ?? '');
      const phu_trach = normalizeMultiline(item.phu_trach ?? item.person ?? '');
      if (!phu_trach && noi_dung && (noi_dung.includes('|') || /\s+[-–]\s+/.test(noi_dung))) {
        return parseAssignmentLine(noi_dung, idx);
      }
      const isAllBlank = !noi_dung && !phu_trach;
      return {
        stt: isAllBlank ? (item.stt ?? '') : (item.stt || idx + 1),
        noi_dung: noi_dung.replace(/^\d+\.\s*/, ''),
        phu_trach: phu_trach || (noi_dung ? 'Nhóm tác giả & Ban Tổ chức' : ''),
      };
    });
  }

  if (typeof assignments === 'string' && assignments.trim()) {
    const lines = normalizeMultiline(assignments).split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      return lines.map((line, idx) => parseAssignmentLine(line, idx));
    }
  }

  return [{ stt: '', noi_dung: '', phu_trach: '' }];
}

function getDirectChildren(parent: any, tagName?: string): any[] {
  const result: any[] = [];
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
 * 1. Lock All Table Widths & Column Grids (<w:tblLayout w:type="fixed"/>, <w:tcW w:type="dxa"/>)
 * 2. Enforce Flexible Row Heights (<w:trHeight w:hRule="atLeast"/>) & Prevent Row Splitting (<w:cantSplit/>)
 * 3. Protect Signature Blocks from Page Breaks (<w:keepLines/>, <w:keepNext/>)
 * 4. Preserve <w:sectPr> (<w:pgSz>, <w:pgMar>) 100% untouched byte-for-byte
 */
function updateCellTextContent(element: any, newText: string, domDoc?: any): void {
  const tNodes = element.getElementsByTagName('w:t');
  if (tNodes.length > 0) {
    tNodes[0].textContent = newText;
    for (let i = 1; i < tNodes.length; i++) {
      tNodes[i].textContent = '';
    }
  } else if (domDoc && newText) {
    const r = domDoc.createElementNS(W_NS, 'w:r');
    const t = domDoc.createElementNS(W_NS, 'w:t');
    t.textContent = newText;
    r.appendChild(t);
    element.appendChild(r);
  }
}

export function applyPaginationAndSignatureProtection(zip: any, dossier?: Dossier): void {
  const xmlString = zip.file('word/document.xml').asText();
  const domDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

  // Kiểm tra nếu là Mẫu 2a và không tổ chức hội thảo -> Tự động ẩn luôn Quản lý rủi ro (Tiêu đề và 2 bảng rủi ro)
  const rawData = { ...(dossier?.formData || {}), ...(dossier?.formData2a || {}) };
  const hasHoiThao =
    rawData.co_hoi_thao !== undefined
      ? Boolean(
          rawData.co_hoi_thao &&
            rawData.co_hoi_thao !== 'Không tổ chức hội thảo (ẩn Mục IX)' &&
            rawData.co_hoi_thao !== 'false'
        )
      : rawData.has_hoi_thao !== undefined
        ? Boolean(rawData.has_hoi_thao && rawData.has_hoi_thao !== 'false')
        : rawData.has_workshop !== undefined
          ? Boolean(rawData.has_workshop && rawData.has_workshop !== 'false')
          : Boolean(
              rawData.workshop_chair ||
                rawData.workshop_speaker ||
                rawData.workshop_program ||
                rawData.chu_toa ||
                rawData.bao_cao_vien ||
                (Array.isArray(rawData.ds_chu_toa) && rawData.ds_chu_toa.length > 0) ||
                (Array.isArray(rawData.ds_bao_cao_vien) && rawData.ds_bao_cao_vien.length > 0) ||
                (Array.isArray(rawData.ds_chuong_trinh_hoi_thao) &&
                  rawData.ds_chuong_trinh_hoi_thao.length > 0)
            );

  const body = domDoc.getElementsByTagName('w:body')[0];
  if (!hasHoiThao && body) {
    const nodesToRemove: any[] = [];
    const children = Array.from(body.childNodes);
    for (const node of children) {
      const text = (node.textContent || '').trim();
      if (node.nodeName === 'w:p') {
        if (
          /quản lý rủi ro/i.test(text) ||
          /xác định và đánh giá rủi ro/i.test(text) ||
          /biện pháp kiểm soát rủi ro/i.test(text) ||
          /thang đánh giá:\s*p/i.test(text)
        ) {
          nodesToRemove.push(node);
        }
      } else if (node.nodeName === 'w:tbl') {
        if (
          /khả năng xảy ra\s*\(p\)/i.test(text) ||
          /biện pháp kiểm soát/i.test(text)
        ) {
          nodesToRemove.push(node);
        }
      }
    }
    for (const node of nodesToRemove) {
      body.removeChild(node);
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
  const signatureTables: any[] = [];

  for (let t = 0; t < allTables.length; t++) {
    const tbl = allTables[t];
    const text = tbl.textContent || '';
    const isSignatureTable = t > 0 && signatureKeywords.some((kw) => text.includes(kw));

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

  // 4.3: Protect Signature Blocks from Page Breaks (<w:keepLines/> and <w:keepNext/>)
  for (let sIdx = 0; sIdx < signatureTables.length; sIdx++) {
    const sigTbl = signatureTables[sIdx];
    const isLastSigTable = sIdx === signatureTables.length - 1;
    const rows = getDirectChildren(sigTbl, 'w:tr');

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const tr = rows[rIdx];
      const isVeryLastRow = isLastSigTable && rIdx === rows.length - 1;
      const pNodes: any[] = Array.from(tr.getElementsByTagName('w:p'));

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

  // 4.5: Dynamic Signature Block & Recipient list customization
  const sigConfig = (dossier as any)?.signature_config || (dossier as any)?.signatureConfig;
  if (sigConfig && signatureTables.length >= 2) {
    const table1 = signatureTables[signatureTables.length - 2];
    const table2 = signatureTables[signatureTables.length - 1];

    // Table 1: Department row
    const t1Rows = getDirectChildren(table1, 'w:tr');
    for (const tr of t1Rows) {
      const rowText = tr.textContent || '';
      if (
        rowText.includes('Phòng KH&CN') ||
        rowText.includes('Phòng TCKT') ||
        rowText.includes('Văn Phòng')
      ) {
        const cells = getDirectChildren(tr, 'w:tc');
        const depts: string[] = sigConfig.departments || ['Phòng KH&CN', 'Phòng TCKT'];
        if (cells.length >= 3) {
          updateCellTextContent(cells[0], depts[0] || '', domDoc);
          updateCellTextContent(cells[2], depts[1] || '', domDoc);
        }
        break;
      }
    }

    // Table 2: Nơi nhận & Ban Giám hiệu
    const t2Rows = getDirectChildren(table2, 'w:tr');
    if (t2Rows.length > 0) {
      const firstRow = t2Rows[0];
      const t2Cells = getDirectChildren(firstRow, 'w:tc');
      if (t2Cells.length >= 3) {
        // Cell 0: Nơi nhận
        if (sigConfig.recipients && Array.isArray(sigConfig.recipients)) {
          const c0Ps = getDirectChildren(t2Cells[0], 'w:p');
          if (c0Ps.length > 1) {
            const lines = sigConfig.recipients
              .map((r: string) => {
                const trimmed = String(r || '').trim();
                if (!trimmed) return '';
                const withDash = trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
                return withDash.endsWith(';') || withDash.endsWith('.') ? withDash : `${withDash};`;
              })
              .filter(Boolean);

            for (let i = 0; i < lines.length; i++) {
              if (i + 1 < c0Ps.length) {
                updateCellTextContent(c0Ps[i + 1], lines[i], domDoc);
              } else {
                const newP = c0Ps[1].cloneNode(true) as any;
                updateCellTextContent(newP, lines[i], domDoc);
                t2Cells[0].appendChild(newP);
              }
            }
            for (let i = lines.length + 1; i < c0Ps.length; i++) {
              updateCellTextContent(c0Ps[i], '', domDoc);
            }
          }
        }

        // Cell 2: Rector role & signer name
        const c2Ps = getDirectChildren(t2Cells[2], 'w:p');
        if (c2Ps.length > 0) {
          const rectorRole = sigConfig.rectorRole || 'HIỆU TRƯỞNG';
          updateCellTextContent(c2Ps[0], rectorRole, domDoc);

          if (sigConfig.rectorSignerName) {
            const lastP = c2Ps[c2Ps.length - 1];
            updateCellTextContent(lastP, sigConfig.rectorSignerName, domDoc);
          }
        }
      }
    }
  }

  const updatedXml = new XMLSerializer().serializeToString(domDoc);
  zip.file('word/document.xml', updatedXml);
}

/**
 * Xây dựng tập hợp biến mapping cho Docxtemplater (Mẫu 1a & Mẫu 2a)
 */
export function buildDocxRenderData(dossier: Dossier, isMau1a: boolean): Record<string, any> {
  const rawFormData = {
    ...((dossier as any).form_data || {}),
    ...(dossier.formData || {}),
  };
  const d = sanitizePayload(rawFormData);
  const dateObj = new Date(dossier.createdAt || Date.now());
  const day = String(d.ngay || dateObj.getDate()).padStart(2, '0');
  const month = String(d.thang || dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(d.nam || dateObj.getFullYear());
  const dept =
    d.department ||
    d.department_name ||
    d.don_vi ||
    d.ten_don_vi ||
    dossier.department_name ||
    dossier.createdBy?.department ||
    'Khoa Y';
  const unitAbbr =
    d.don_vi_viet_tat ||
    d.ten_don_vi ||
    dept
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() ||
    'ĐV';
  const fullName = d.full_name || d.ho_ten || dossier.createdBy?.name || '';

  const sigConfig = (dossier as any).signature_config || (dossier as any).signatureConfig;
  const dsPhongBanKy = sigConfig?.departments || ['Phòng KH&CN', 'Phòng TCKT'];
  const chucDanhBgh = sigConfig?.rectorRole || 'HIỆU TRƯỞNG';
  const dsNoiNhan = sigConfig?.recipients || [
    `Như kính gửi (${unitAbbr})`,
    ...(dsPhongBanKy.includes('Phòng TCKT') ? ['TCKT'] : []),
    'TTDV&ĐTTNCXH',
    'Lưu: VT, KHCN.'
  ];
  const tenDeTai = normalizeMultiline(
    d.ten_de_tai || d.research_title || d.product_name || (dossier as any).ten_de_tai || ''
  );
  const rawTruongDonVi = normalizeMultiline(
    d.truong_don_vi || (dossier as any).truong_don_vi || ''
  );
  const truongDonVi =
    rawTruongDonVi.trim() === 'PGS.TS. Nguyễn Văn A' || rawTruongDonVi.trim() === 'Phòng KH&CN'
      ? ''
      : rawTruongDonVi;

  if (isMau1a) {
    const docNumInfo = formatDocumentNumber(
      '',
      '',
      'TTr',
      unitAbbr
    );

    return {
      ...d,
      don_vi_uppercase: dept.toUpperCase(),
      so_hieu: docNumInfo.so_hieu,
      ten_don_vi: docNumInfo.ten_don_vi,
      so_to_trinh: docNumInfo.formatted,
      ngay: day,
      thang: month,
      nam: year,
      ho_ten: fullName,
      chuc_danh: d.position || d.chuc_danh || '',
      dien_thoai: d.phone || d.dien_thoai || '',
      email: d.email || '',
      ten_de_tai: tenDeTai,
      muc_dich: normalizeMultiline(d.purpose || d.muc_dich || ''),
      nhu_cau_tiep_nhan: normalizeMultiline(d.receiver_needs || d.nhu_cau_tiep_nhan || ''),
      dap_ung_thuc_hien: normalizeMultiline(d.provider_capacity || d.dap_ung_thuc_hien || ''),
      muc_tieu: normalizeMultiline(d.transfer_goals || d.muc_tieu || ''),
      doi_tuong: normalizeMultiline(d.transfer_target || d.doi_tuong || ''),
      phuong_thuc: normalizeMultiline(d.transfer_method || d.phuong_thuc || ''),
      hinh_thuc: normalizeMultiline(d.transfer_form || d.hinh_thuc || 'Chuyển giao công nghệ độc lập.'),
      quyen_chuyen_giao: normalizeMultiline(d.transfer_rights || d.quyen_chuyen_giao || ''),
      thoi_gian: normalizeMultiline(d.transfer_time || d.thoi_gian || ''),
      dia_diem: normalizeMultiline(d.transfer_location || d.dia_diem || ''),
      thanh_phan: normalizeMultiline(d.attendees || d.thanh_phan || ''),
      kinh_phi: normalizeMultiline(d.funding_source || d.financial_plan || d.kinh_phi || ''),
      truong_don_vi: truongDonVi,
      noi_nhan_don_vi: `Như kính gửi (${unitAbbr})`,
      ds_phong_ban_ky: dsPhongBanKy,
      chuc_danh_bgh: chucDanhBgh,
      ds_noi_nhan: dsNoiNhan,
    };
  }

  // Mẫu 2a
  const docNumInfo = formatDocumentNumber(
    '',
    '',
    'KH',
    unitAbbr
  );

  const hasHoiThao =
    rawFormData.co_hoi_thao !== undefined
      ? Boolean(
          rawFormData.co_hoi_thao &&
            rawFormData.co_hoi_thao !== 'Không tổ chức hội thảo (ẩn Mục IX)' &&
            rawFormData.co_hoi_thao !== 'false'
        )
      : rawFormData.has_hoi_thao !== undefined
        ? Boolean(rawFormData.has_hoi_thao && rawFormData.has_hoi_thao !== 'false')
        : rawFormData.has_workshop !== undefined
          ? Boolean(rawFormData.has_workshop && rawFormData.has_workshop !== 'false')
          : Boolean(
              d.workshop_chair ||
                d.workshop_speaker ||
                d.workshop_program ||
                d.chu_toa ||
                d.bao_cao_vien ||
                (Array.isArray(d.ds_chu_toa) && d.ds_chu_toa.length > 0) ||
                (Array.isArray(d.ds_bao_cao_vien) && d.ds_bao_cao_vien.length > 0) ||
                (Array.isArray(d.ds_chuong_trinh_hoi_thao) && d.ds_chuong_trinh_hoi_thao.length > 0)
            );

  const rawTransferCost = rawFormData.transfer_cost ?? rawFormData.chi_phi;
  let formattedChiPhi = "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.";
  if (rawTransferCost !== undefined && rawTransferCost !== null && String(rawTransferCost).trim() !== '') {
    const trimmedCost = String(rawTransferCost).trim();
    if (typeof rawTransferCost === 'number' || /^\d+$/.test(trimmedCost)) {
      formattedChiPhi =
        Number(trimmedCost) === 0
          ? "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường."
          : `${Number(trimmedCost).toLocaleString('vi-VN')} đồng. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.`;
    } else if (/không thu phí/i.test(trimmedCost)) {
      formattedChiPhi = "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.";
    } else {
      formattedChiPhi = normalizeMultiline(trimmedCost);
    }
  }

  return {
    ...d,
    so_hieu: docNumInfo.so_hieu,
    ten_don_vi: docNumInfo.ten_don_vi,
    so_ke_hoach: docNumInfo.formatted,
    don_vi_uppercase: dept.toUpperCase(),
    don_vi_viet_tat: unitAbbr,
    ngay: day,
    thang: month,
    nam: year,
    ten_san_pham: normalizeMultiline(d.product_name || d.ten_san_pham || d.research_title || ''),
    ho_ten: fullName,
    truong_don_vi_nhan: normalizeMultiline(d.receiver_manager || d.truong_don_vi_nhan || ''),
    dien_thoai: normalizeMultiline(d.phone || d.dien_thoai || ''),
    email: normalizeMultiline(d.email || ''),
    muc_dich: normalizeMultiline(d.purpose || d.muc_dich || ''),
    nhom_tac_gia: formatAuthorsGroupText(rawFormData.ds_nhom_tac_gia ?? d.authors_group ?? d.nhom_tac_gia, fullName),
    loai_hinh_san_pham: normalizeMultiline(d.product_type || d.loai_hinh_san_pham || ''),
    phuong_thuc: normalizeMultiline(d.transfer_method || d.phuong_thuc || ''),
    ben_nhan_chuyen_giao: normalizeMultiline(d.receiving_party || d.ben_nhan_chuyen_giao || ''),
    noi_nhan_don_vi: `${normalizeMultiline(d.receiving_party || d.ben_nhan_chuyen_giao || 'Đơn vị nhận chuyển giao')}, ${unitAbbr}`,
    thoi_gian: /^\d{4}-\d{2}-\d{2}$/.test(String(d.transfer_date || '').trim())
      ? new Date(d.transfer_date).toLocaleDateString('vi-VN')
      : normalizeMultiline(d.transfer_date || d.transfer_time || d.thoi_gian || ''),
    dia_diem: normalizeMultiline(d.transfer_location || d.dia_diem || ''),
    chi_phi: formattedChiPhi,
    // Nhân sự 2 cột Mục VIII
    ds_ban_chi_dao: pairTwoColumns(
      rawFormData.ds_ban_chi_dao ?? rawFormData.steering_committee ?? rawFormData.ban_chi_dao
    ),
    ds_ban_to_chuc: pairTwoColumns(
      rawFormData.ds_ban_to_chuc ?? rawFormData.organizing_committee ?? rawFormData.ban_to_chuc
    ),
    ds_nhan_su: pairTwoColumns(
      rawFormData.ds_nhan_su ?? rawFormData.implementing_staff ?? rawFormData.nhan_su
    ),
    // Khối điều kiện Mục IX & Mục X
    co_hoi_thao: hasHoiThao,
    has_hoi_thao: hasHoiThao,
    so_la_ma_rui_ro: 'X',
    so_muc_rui_ro: '10',
    ds_chu_toa: pairTwoColumns(rawFormData.ds_chu_toa ?? rawFormData.workshop_chair ?? rawFormData.chu_toa),
    ds_bao_cao_vien: pairTwoColumns(
      rawFormData.ds_bao_cao_vien ?? rawFormData.workshop_speaker ?? rawFormData.bao_cao_vien
    ),
    ds_chuong_trinh_hoi_thao: adaptWorkshopSchedule(
      rawFormData.ds_chuong_trinh_hoi_thao ?? rawFormData.workshop_program ?? rawFormData.chuong_trinh_hoi_thao
    ),
    ds_phan_cong_hoi_thao: adaptWorkshopAssignment(
      rawFormData.ds_phan_cong_hoi_thao ?? rawFormData.workshop_assignments ?? rawFormData.phan_cong_hoi_thao
    ),
    kinh_phi_hoi_thao: normalizeMultiline(d.workshop_budget || d.kinh_phi_hoi_thao || ''),
    // Bảng rủi ro Mục X
    ds_danh_gia_rui_ro: adaptRiskTable(
      rawFormData.ds_danh_gia_rui_ro ?? rawFormData.risks ?? rawFormData.danh_gia_rui_ro ?? rawFormData.risk_management
    ),
    ds_kiem_soat_rui_ro: adaptRiskControlTable(
      rawFormData.ds_kiem_soat_rui_ro ?? rawFormData.risk_controls ?? rawFormData.kiem_soat_rui_ro
    ),
    ten_de_tai: tenDeTai,
    truong_don_vi: truongDonVi,
    ds_phong_ban_ky: dsPhongBanKy,
    chuc_danh_bgh: chucDanhBgh,
    ds_noi_nhan: dsNoiNhan,
  };
}

/**
 * HÀM XUẤT FILE WORD CHUẨN ZERO-MUTATION TEMPLATE CLONING:
 * Nạp biểu mẫu chuẩn gốc (/templates/mau_1a_chuan.docx hoặc /templates/mau_2a_chuan.docx),
 * render bằng PizZip + Docxtemplater và áp dụng khóa cấu trúc bảng OpenXML (Dimension Lock).
 */
export async function generateSingleDocxBlob(
  rawDossier: Dossier,
  isMau1a: boolean
): Promise<{ blob: Blob; fileName: string }> {
  const dossier = normalizeNFC(rawDossier);
  const outFileName = `${dossier.code}_${isMau1a ? 'Mau_1a_To_trinh' : 'Mau_2a_Ke_hoach'}.docx`;
  const templateUrl = isMau1a ? '/templates/mau_1a_chuan.docx' : '/templates/mau_2a_chuan.docx';

  const resp = await fetch(templateUrl, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`Không thể tải biểu mẫu chuẩn từ ${templateUrl} (HTTP ${resp.status})`);
  }

  const buffer = await resp.arrayBuffer();
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter() {
      return '';
    },
  });

  const renderData = buildDocxRenderData(dossier, isMau1a);
  doc.render(renderData);

  // Hậu xử lý DOM OpenXML: khóa kích thước bảng (fixed dxa), cantSplit và bảo vệ chữ ký
  applyPaginationAndSignatureProtection(doc.getZip(), dossier);

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  return { blob, fileName: outFileName };
}

/**
 * Tự động bơm dữ liệu vào CẢ 2 FILE WORD (Tờ trình Mẫu 1a + Kế hoạch Mẫu 2a)
 * Đáp ứng nghiệp vụ Cô Trúc: Tờ trình & Kế hoạch thường đi chung 1 lượt.
 */
export async function generateAndDownloadBothDocx(rawDossier: Dossier): Promise<void> {
  const file1 = await generateSingleDocxBlob(rawDossier, true);
  saveAs(file1.blob, file1.fileName);

  // Nghỉ 450ms để trình duyệt không chặn pop-up multi-download
  setTimeout(async () => {
    try {
      const file2 = await generateSingleDocxBlob(rawDossier, false);
      saveAs(file2.blob, file2.fileName);
    } catch (err) {
      console.error('Lỗi khi tải file thứ hai:', err);
    }
  }, 450);
}

export async function generateAndDownloadDocx(
  rawDossier: Dossier,
  rawTemplate?: WordTemplate,
  forcedType?: '1a' | '2a'
): Promise<void> {
  const dossier = normalizeNFC(rawDossier);
  const isMau2a =
    forcedType === '2a'
      ? true
      : forcedType === '1a'
      ? false
      : isMau2aTemplateOrDossier(dossier, rawTemplate);

  const isMau1a = !isMau2a;

  const { blob, fileName } = await generateSingleDocxBlob(dossier, isMau1a);
  saveAs(blob, fileName);
}
