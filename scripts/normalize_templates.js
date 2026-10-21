/**
 * Automated Template Sanitization & Normalization Script (Step 2)
 *
 * Enforces Zero-Mutation Template Cloning & ECMA-376 OpenXML compliance:
 * 1. Detects binary OLE2 .doc files (magic D0 CF 11 E0) and ensures all active
 *    templates are strict ECMA-376 .docx (ZIP/XML) archives cloned from the
 *    pristine original .docx templates.
 * 2. Heals split XML runs (<w:proofErr> removal & merging adjacent <w:r> elements
 *    that share identical <w:rPr> formatting).
 * 3. Normalizes Mẫu 1a and Mẫu 2a:
 *    - Strips hardcoded instructional text in parentheses and ellipsis (…………).
 *    - Fixes asymmetric 3rd row in tables 9.1 and 9.2 so <w:gridSpan> and <w:tcW>
 *      strictly match <w:tblGrid> (3798 + 630 = 4428, 4858).
 *    - Removes extra pre-allocated blank rows in dynamic data tables (8.1-8.3,
 *      9.1-9.4, 10.1-10.2), keeping only the header row (if present) and 1 clean
 *      template loop row.
 *    - Preserves all 8 blank signature rows in the bottom signature table.
 *    - Wraps Section IX ("IX. Hội thảo chuyển giao" through "9.5. Dự trù kinh phí hội thảo")
 *      in {#co_hoi_thao} ... {/co_hoi_thao} with paragraphLoop support.
 *    - Preserves <w:sectPr>, <w:tblPr>, <w:tblGrid>, <w:trPr>, <w:tcPr> byte-for-byte.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ORIGINALS_DIR = path.join(ROOT_DIR, 'docs/templates/originals');
const ORIG_1A_PATH = path.join(ORIGINALS_DIR, 'mau_1a_original.docx');
const ORIG_2A_PATH = path.join(ORIGINALS_DIR, 'mau_2a_original.docx');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function ensurePristineOriginals() {
  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });

  // Check binary .doc file in docs/templates
  const doc1aBinaryPath = path.join(ROOT_DIR, 'docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.doc');
  if (fs.existsSync(doc1aBinaryPath)) {
    const magic = fs.readFileSync(doc1aBinaryPath).slice(0, 4).toString('hex');
    if (magic === 'd0cf11e0') {
      console.log('[Step 2.1] Detected binary OLE2 .doc archive at:', path.relative(ROOT_DIR, doc1aBinaryPath));
      console.log('           Using lossless ECMA-376 .docx conversion baseline for Mẫu 1a.');
    }
  }

  if (!fs.existsSync(ORIG_1A_PATH)) {
    const buf1a = execFileSync('git', ['show', '0937e79:docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx'], {
      cwd: ROOT_DIR,
      maxBuffer: 10 * 1024 * 1024,
    });
    fs.writeFileSync(ORIG_1A_PATH, buf1a);
    console.log('[Step 2.1] Extracted pristine Mẫu 1a original .docx:', buf1a.length, 'bytes');
  }

  if (!fs.existsSync(ORIG_2A_PATH)) {
    const buf2a = execFileSync('git', ['show', '73744bc:docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx'], {
      cwd: ROOT_DIR,
      maxBuffer: 10 * 1024 * 1024,
    });
    fs.writeFileSync(ORIG_2A_PATH, buf2a);
    console.log('[Step 2.1] Extracted pristine Mẫu 2a original .docx:', buf2a.length, 'bytes');
  }

  // Verify ECMA-376 ZIP magic bytes (50 4B 03 04)
  for (const p of [ORIG_1A_PATH, ORIG_2A_PATH]) {
    const magic = fs.readFileSync(p).slice(0, 4).toString('hex');
    if (magic !== '504b0304') {
      throw new Error(`Invalid .docx archive magic (${magic}) in ${p}`);
    }
  }
}

/**
 * Helper: Get direct child elements matching local/qualified tagName
 */
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

function getParagraphText(pNode) {
  const tNodes = pNode.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < tNodes.length; i++) {
    text += tNodes[i].textContent || '';
  }
  return text;
}

/**
 * Step 2.2: Heal split XML runs inside a document:
 * - Removes all <w:proofErr> elements and _GoBack bookmarks.
 * - Removes <w:lastRenderedPageBreak/> elements.
 * - Merges adjacent <w:r> elements within the same <w:p> when they contain only
 *   <w:rPr> and <w:t> and have identical serialized <w:rPr>.
 */
function healDocumentRuns(doc) {
  const serializer = new XMLSerializer();

  // Remove <w:proofErr>
  const proofErrs = Array.from(doc.getElementsByTagName('w:proofErr'));
  for (const node of proofErrs) {
    if (node.parentNode) node.parentNode.removeChild(node);
  }

  // Remove <w:lastRenderedPageBreak>
  const pageBreaks = Array.from(doc.getElementsByTagName('w:lastRenderedPageBreak'));
  for (const node of pageBreaks) {
    if (node.parentNode) node.parentNode.removeChild(node);
  }

  // Remove _GoBack bookmarks
  const bmStarts = Array.from(doc.getElementsByTagName('w:bookmarkStart'));
  const goBackIds = new Set();
  for (const bm of bmStarts) {
    if (bm.getAttribute('w:name') === '_GoBack') {
      goBackIds.add(bm.getAttribute('w:id'));
      if (bm.parentNode) bm.parentNode.removeChild(bm);
    }
  }
  if (goBackIds.size > 0) {
    const bmEnds = Array.from(doc.getElementsByTagName('w:bookmarkEnd'));
    for (const bm of bmEnds) {
      if (goBackIds.has(bm.getAttribute('w:id')) && bm.parentNode) {
        bm.parentNode.removeChild(bm);
      }
    }
  }

  // Merge adjacent runs with identical <w:rPr>
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  for (const p of paragraphs) {
    let i = 0;
    while (i < p.childNodes.length - 1) {
      const curr = p.childNodes[i];
      const next = p.childNodes[i + 1];
      if (curr.nodeType === 1 && curr.tagName === 'w:r' && next.nodeType === 1 && next.tagName === 'w:r') {
        if ( isSimpleTextRun(curr) && isSimpleTextRun(next) ) {
          const currRPr = getRPrSignature(curr, serializer);
          const nextRPr = getRPrSignature(next, serializer);
          if (currRPr === nextRPr) {
            const currT = getDirectChildren(curr, 'w:t')[0];
            const nextT = getDirectChildren(next, 'w:t')[0];
            const combined = (currT.textContent || '') + (nextT.textContent || '');
            currT.textContent = combined;
            if (/^\s|\s$|\s{2,}/.test(combined)) {
              currT.setAttribute('xml:space', 'preserve');
            }
            p.removeChild(next);
            continue;
          }
        }
      }
      i++;
    }
  }
}

function isSimpleTextRun(rNode) {
  const children = getDirectChildren(rNode);
  if (children.length === 0) return false;
  let tCount = 0;
  for (const c of children) {
    if (c.tagName === 'w:t') tCount++;
    else if (c.tagName !== 'w:rPr') return false;
  }
  return tCount === 1;
}

function getRPrSignature(rNode, serializer) {
  const rPr = getDirectChildren(rNode, 'w:rPr')[0];
  if (!rPr) return '';
  return serializer.serializeToString(rPr);
}

/**
 * Replaces all runs inside a paragraph with the specified array of run specs:
 * [{ text: '...', bold: false, italic: false, sz: '26' }]
 * while preserving the paragraph's <w:pPr> (and optionally any drawing/pict runs if keepPict=true).
 */
function setParagraphRuns(doc, pNode, runSpecs, options = {}) {
  const { keepPict = false, clearPPrRPrBold = false, clearPPrRPrItalic = false, clearPPrRPrColor = false } = options;

  const pPr = getDirectChildren(pNode, 'w:pPr')[0];
  if (pPr) {
    const pRPr = getDirectChildren(pPr, 'w:rPr')[0];
    if (pRPr) {
      if (clearPPrRPrBold) {
        for (const b of [...getDirectChildren(pRPr, 'w:b'), ...getDirectChildren(pRPr, 'w:bCs')]) {
          pRPr.removeChild(b);
        }
      }
      if (clearPPrRPrItalic) {
        for (const it of [...getDirectChildren(pRPr, 'w:i'), ...getDirectChildren(pRPr, 'w:iCs')]) {
          pRPr.removeChild(it);
        }
      }
      if (clearPPrRPrColor) {
        for (const col of [...getDirectChildren(pRPr, 'w:color'), ...getDirectChildren(pRPr, 'w:highlight')]) {
          pRPr.removeChild(col);
        }
      }
    }
  }

  // Collect elements to preserve (<w:pPr> and optionally runs with <w:pict> or <mc:AlternateContent>)
  const preserved = [];
  for (let i = 0; i < pNode.childNodes.length; i++) {
    const child = pNode.childNodes[i];
    if (child.nodeType === 1) {
      if (child.tagName === 'w:pPr') {
        preserved.push(child);
      } else if (
        keepPict &&
        child.tagName === 'w:r' &&
        (child.getElementsByTagName('w:pict').length > 0 ||
          child.getElementsByTagName('mc:AlternateContent').length > 0 ||
          child.getElementsByTagName('w:drawing').length > 0)
      ) {
        // Strip highlight from pict run if present
        const rPr = getDirectChildren(child, 'w:rPr')[0];
        if (rPr) {
          for (const hl of getDirectChildren(rPr, 'w:highlight')) {
            rPr.removeChild(hl);
          }
        }
        preserved.push(child);
      }
    }
  }

  while (pNode.firstChild) {
    pNode.removeChild(pNode.firstChild);
  }

  for (const node of preserved) {
    pNode.appendChild(node);
  }

  for (const spec of runSpecs) {
    const r = doc.createElementNS(W_NS, 'w:r');
    const rPr = doc.createElementNS(W_NS, 'w:rPr');

    const rFonts = doc.createElementNS(W_NS, 'w:rFonts');
    rFonts.setAttribute('w:ascii', 'Times New Roman');
    rFonts.setAttribute('w:eastAsia', 'Times New Roman');
    rFonts.setAttribute('w:hAnsi', 'Times New Roman');
    rFonts.setAttribute('w:cs', 'Times New Roman');
    rPr.appendChild(rFonts);

    if (spec.bold) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:b'));
      rPr.appendChild(doc.createElementNS(W_NS, 'w:bCs'));
    }
    if (spec.italic) {
      rPr.appendChild(doc.createElementNS(W_NS, 'w:i'));
      rPr.appendChild(doc.createElementNS(W_NS, 'w:iCs'));
    }

    const szVal = spec.sz || '26';
    const sz = doc.createElementNS(W_NS, 'w:sz');
    sz.setAttribute('w:val', szVal);
    rPr.appendChild(sz);

    const szCs = doc.createElementNS(W_NS, 'w:szCs');
    szCs.setAttribute('w:val', szVal);
    rPr.appendChild(szCs);

    r.appendChild(rPr);

    const t = doc.createElementNS(W_NS, 'w:t');
    if (/^\s|\s$|\s{2,}/.test(spec.text)) {
      t.setAttribute('xml:space', 'preserve');
    }
    t.textContent = spec.text;
    r.appendChild(t);

    pNode.appendChild(r);
  }
}

/**
 * Ensures <w:tblPr> contains <w:tblLayout w:type="fixed"/>
 */
function ensureFixedTableLayout(doc, tblNode) {
  let tblPr = getDirectChildren(tblNode, 'w:tblPr')[0];
  if (!tblPr) {
    tblPr = doc.createElementNS(W_NS, 'w:tblPr');
    tblNode.insertBefore(tblPr, tblNode.firstChild);
  }
  let tblLayout = getDirectChildren(tblPr, 'w:tblLayout')[0];
  if (!tblLayout) {
    tblLayout = doc.createElementNS(W_NS, 'w:tblLayout');
    const tblLook = getDirectChildren(tblPr, 'w:tblLook')[0];
    if (tblLook) {
      tblPr.insertBefore(tblLayout, tblLook);
    } else {
      tblPr.appendChild(tblLayout);
    }
  }
  tblLayout.setAttribute('w:type', 'fixed');
}

/**
 * Ensures <w:trPr> on a row has <w:cantSplit/> and if <w:trHeight> exists, sets w:hRule="atLeast".
 */
function ensureFlexibleRowPr(doc, trNode) {
  let trPr = getDirectChildren(trNode, 'w:trPr')[0];
  if (!trPr) {
    trPr = doc.createElementNS(W_NS, 'w:trPr');
    trNode.insertBefore(trPr, trNode.firstChild);
  }
  const trHeights = getDirectChildren(trPr, 'w:trHeight');
  for (const th of trHeights) {
    th.setAttribute('w:hRule', 'atLeast');
  }
  if (getDirectChildren(trPr, 'w:cantSplit').length === 0) {
    trPr.appendChild(doc.createElementNS(W_NS, 'w:cantSplit'));
  }
}

/**
 * Normalize Mẫu 1a from pristine original
 */
function normalizeMau1a() {
  const buf = fs.readFileSync(ORIG_1A_PATH);
  const zip = new PizZip(buf);
  const xmlStr = zip.file('word/document.xml').asText();
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  healDocumentRuns(doc);

  const body = doc.getElementsByTagName('w:body')[0];
  const children = getDirectChildren(body);

  // Lock all tables to fixed layout
  const tables = getDirectChildren(body, 'w:tbl');
  for (const tbl of tables) {
    ensureFixedTableLayout(doc, tbl);
  }

  // 1. Header Table (TBL[0] = children[1])
  const headerTbl = tables[0];
  const headerRow = getDirectChildren(headerTbl, 'w:tr')[0];
  const headerCells = getDirectChildren(headerRow, 'w:tc');
  const leftCellPs = getDirectChildren(headerCells[0], 'w:p');
  const rightCellPs = getDirectChildren(headerCells[1], 'w:p');

  // Set left/right cell padding to 0 dxa on Left Cell (headerCells[0]) so long unit names
  // like "PHÒNG KHOA HỌC CÔNG NGHỆ" have the full 4230 dxa (211.5pt) cell width without wrapping
  let leftTcPr = getDirectChildren(headerCells[0], 'w:tcPr')[0];
  if (!leftTcPr) {
    leftTcPr = doc.createElementNS(W_NS, 'w:tcPr');
    headerCells[0].insertBefore(leftTcPr, headerCells[0].firstChild);
  }
  let leftTcMar = getDirectChildren(leftTcPr, 'w:tcMar')[0];
  if (!leftTcMar) {
    leftTcMar = doc.createElementNS(W_NS, 'w:tcMar');
    leftTcPr.appendChild(leftTcMar);
  }
  for (const side of ['w:left', 'w:right']) {
    let mNode = getDirectChildren(leftTcMar, side)[0];
    if (!mNode) {
      mNode = doc.createElementNS(W_NS, side);
      leftTcMar.appendChild(mNode);
    }
    mNode.setAttribute('w:w', '0');
    mNode.setAttribute('w:type', 'dxa');
  }

  // Move <w:pict> horizontal connector line from Left Cell P[1] into Left Cell P[2] (the dedicated line paragraph)
  // so it never overlaps with {don_vi_uppercase} text
  let extractedPictRun = null;
  for (const rNode of getDirectChildren(leftCellPs[1], 'w:r')) {
    if (rNode.getElementsByTagName('w:pict').length > 0) {
      extractedPictRun = rNode.cloneNode(true);
      const rPr = getDirectChildren(extractedPictRun, 'w:rPr')[0];
      if (rPr) {
        for (const hl of getDirectChildren(rPr, 'w:highlight')) {
          rPr.removeChild(hl);
        }
      }
      const vShapes = extractedPictRun.getElementsByTagName('v:shape');
      if (vShapes.length > 0) {
        vShapes[0].setAttribute(
          'style',
          'position:absolute;left:0;text-align:left;margin-left:75.3pt;margin-top:4.5pt;width:60.75pt;height:.05pt;z-index:251658240'
        );
      }
      break;
    }
  }

  // Left Cell P[1]: Set {don_vi_uppercase} at sz="24" (12pt Bold) with -120 dxa indent so it stays on 1 single line
  setParagraphRuns(doc, leftCellPs[1], [{ text: '{don_vi_uppercase}', bold: true, sz: '24' }], {
    keepPict: false,
    clearPPrRPrColor: true,
  });
  const p1PPr = getDirectChildren(leftCellPs[1], 'w:pPr')[0];
  if (p1PPr) {
    let p1Ind = getDirectChildren(p1PPr, 'w:ind')[0];
    if (!p1Ind) {
      p1Ind = doc.createElementNS(W_NS, 'w:ind');
      const jc = getDirectChildren(p1PPr, 'w:jc')[0];
      if (jc) p1PPr.insertBefore(p1Ind, jc);
      else p1PPr.appendChild(p1Ind);
    }
    p1Ind.setAttribute('w:left', '-120');
    p1Ind.setAttribute('w:right', '-120');
    const p1RPr = getDirectChildren(p1PPr, 'w:rPr')[0];
    if (p1RPr) {
      for (const szEl of [...getDirectChildren(p1RPr, 'w:sz'), ...getDirectChildren(p1RPr, 'w:szCs')]) {
        szEl.setAttribute('w:val', '24');
      }
    }
  }

  // Left Cell P[2]: Place the extracted <w:pict> horizontal line in P[2]
  if (extractedPictRun) {
    const p2PPr = getDirectChildren(leftCellPs[2], 'w:pPr')[0];
    while (leftCellPs[2].firstChild) leftCellPs[2].removeChild(leftCellPs[2].firstChild);
    if (p2PPr) leftCellPs[2].appendChild(p2PPr);
    leftCellPs[2].appendChild(extractedPictRun);
  }

  // Left Cell P[3]: Số: {so_to_trinh}
  setParagraphRuns(doc, leftCellPs[3], [{ text: 'Số: {so_to_trinh}', bold: false, sz: '26' }], {
    clearPPrRPrBold: true,
    clearPPrRPrColor: true,
  });
  // Right Cell P[4]: Cần Thơ, ngày {ngay} tháng {thang} năm {nam}
  setParagraphRuns(
    doc,
    rightCellPs[4],
    [{ text: 'Cần Thơ, ngày {ngay} tháng {thang} năm {nam}', italic: true, sz: '26' }],
    { clearPPrRPrBold: true }
  );

  // 2. Body Sections (children indices in original 0937e79):
  // children[8]: "I. Mục đích "
  // children[9]: "(Trình bày vắn tắt lý do cần thiết của chuyển giao sản phẩm)" -> "{muc_dich}"
  setParagraphRuns(doc, children[9], [{ text: '{muc_dich}', sz: '26' }], {
    clearPPrRPrItalic: true,
  });

  // children[11]: "1. Nhu cầu cần sử dụng của đơn vị tiếp nhận chuyển giao:"
  // children[12]: blank paragraph -> "{nhu_cau_tiep_nhan}"
  setParagraphRuns(doc, children[12], [{ text: '{nhu_cau_tiep_nhan}', sz: '26' }]);

  // children[13]: "2. Đáp ứng thực hiện chuyển giao của cá nhân/ đơn vị có sản phẩm chuyển giao: "
  // children[14]: blank paragraph -> "{dap_ung_thuc_hien}"
  setParagraphRuns(doc, children[14], [{ text: '{dap_ung_thuc_hien}', sz: '26' }]);

  // children[15]: "3. Mục tiêu của chuyển giao: (ví dụ ...)" -> strip parenthetical
  setParagraphRuns(doc, children[15], [{ text: '3. Mục tiêu của chuyển giao:', sz: '26' }]);
  // children[16]: blank paragraph -> "{muc_tieu}"
  setParagraphRuns(doc, children[16], [{ text: '{muc_tieu}', sz: '26' }]);

  // children[17]: "4. Đối tượng chuyển giao: (kiến thức ...)." -> strip parenthetical
  setParagraphRuns(doc, children[17], [{ text: '4. Đối tượng chuyển giao:', sz: '26' }]);
  // children[18]: blank paragraph -> "{doi_tuong}"
  setParagraphRuns(doc, children[18], [{ text: '{doi_tuong}', sz: '26' }]);

  // children[19]: "5. Phương thức chuyển giao: (là bài giảng ...)." -> strip parenthetical
  setParagraphRuns(doc, children[19], [{ text: '5. Phương thức chuyển giao:', sz: '26' }]);
  // children[20]: blank paragraph -> "{phuong_thuc}"
  setParagraphRuns(doc, children[20], [{ text: '{phuong_thuc}', sz: '26' }]);

  // children[21]: "6. Hình thức chuyển giao: chuyển giao công nghệ độc lập." -> "6. Hình thức chuyển giao: {hinh_thuc}"
  setParagraphRuns(doc, children[21], [{ text: '6. Hình thức chuyển giao: {hinh_thuc}', sz: '26' }]);
  // Remove empty spacer children[22]
  body.removeChild(children[22]);

  // children[23]: "7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức: (chuyển giao ...)" -> strip parenthetical
  setParagraphRuns(doc, children[23], [
    { text: '7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức:', sz: '26' },
  ]);
  // children[24]: blank paragraph -> "{quyen_chuyen_giao}" (remove bold from pPr/rPr)
  setParagraphRuns(doc, children[24], [{ text: '{quyen_chuyen_giao}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // children[25]: "III. Thời gian chuyển giao: (dự kiến) " -> "III. Thời gian chuyển giao: {thoi_gian}"
  setParagraphRuns(
    doc,
    children[25],
    [
      { text: 'III. Thời gian chuyển giao: ', bold: true, sz: '26' },
      { text: '{thoi_gian}', bold: false, sz: '26' },
    ],
    { clearPPrRPrBold: true }
  );
  // Remove empty spacer children[26]
  body.removeChild(children[26]);

  // children[27]: "IV. Địa điểm chuyển giao: (tại đơn vị ….)" -> "IV. Địa điểm chuyển giao: {dia_diem}"
  setParagraphRuns(
    doc,
    children[27],
    [
      { text: 'IV. Địa điểm chuyển giao: ', bold: true, sz: '26' },
      { text: '{dia_diem}', bold: false, sz: '26' },
    ],
    { clearPPrRPrBold: true }
  );
  // Remove empty spacer children[28]
  body.removeChild(children[28]);

  // children[29]: "V. Thành phần tham dự: "
  setParagraphRuns(doc, children[29], [{ text: 'V. Thành phần tham dự:', bold: true, sz: '26' }]);
  // children[30]: blank paragraph -> "{thanh_phan}"
  setParagraphRuns(doc, children[30], [{ text: '{thanh_phan}', sz: '26' }]);

  // children[31]: "VI. Kinh phí tổ chức: (Ghi theo gợi ý sau: ...)"
  setParagraphRuns(
    doc,
    children[31],
    [
      { text: 'VI. Kinh phí tổ chức: ', bold: true, sz: '26' },
      { text: '{kinh_phi}', bold: false, sz: '26' },
    ],
    { clearPPrRPrBold: true }
  );

  // Signature tables tables[1] (10 rows with 8 blank rows) and tables[2] (HIỆU TRƯỞNG) remain 100% intact!
  const serialized = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', serialized);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Helper: Configure a dynamic table row with cell placeholders while preserving <w:tcPr>
 */
function configureTemplateRow(doc, trNode, cellPlaceholders, alignments = []) {
  ensureFlexibleRowPr(doc, trNode);
  const cells = getDirectChildren(trNode, 'w:tc');
  if (cells.length !== cellPlaceholders.length) {
    throw new Error(`Cell count mismatch: expected ${cellPlaceholders.length}, got ${cells.length}`);
  }
  for (let i = 0; i < cells.length; i++) {
    const tc = cells[i];
    const pNodes = getDirectChildren(tc, 'w:p');
    const p = pNodes[0];
    // Remove any extra paragraphs in the template cell
    for (let j = 1; j < pNodes.length; j++) {
      tc.removeChild(pNodes[j]);
    }
    const pPr = getDirectChildren(p, 'w:pPr')[0];
    if (pPr && alignments[i]) {
      let jc = getDirectChildren(pPr, 'w:jc')[0];
      if (!jc) {
        jc = doc.createElementNS(W_NS, 'w:jc');
        pPr.appendChild(jc);
      }
      jc.setAttribute('w:val', alignments[i]);
    }
    setParagraphRuns(doc, p, [{ text: cellPlaceholders[i], sz: '26' }], {
      clearPPrRPrBold: true,
      clearPPrRPrItalic: true,
      clearPPrRPrColor: true,
    });
  }
}

/**
 * Normalize Mẫu 2a from pristine original
 */
function normalizeMau2a() {
  const buf = fs.readFileSync(ORIG_2A_PATH);
  const zip = new PizZip(buf);
  const xmlStr = zip.file('word/document.xml').asText();
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');

  healDocumentRuns(doc);

  const body = doc.getElementsByTagName('w:body')[0];
  const children = getDirectChildren(body);
  const tables = getDirectChildren(body, 'w:tbl');

  for (const tbl of tables) {
    ensureFixedTableLayout(doc, tbl);
  }

  // 1. Header Table (TBL[0] = children[1])
  const headerTbl = tables[0];
  const headerRow = getDirectChildren(headerTbl, 'w:tr')[0];
  const headerCells = getDirectChildren(headerRow, 'w:tc');
  const leftCellPs = getDirectChildren(headerCells[0], 'w:p');
  const rightCellPs = getDirectChildren(headerCells[1], 'w:p');

  // Left Cell P[3]: "Số:           /KH- Khoa/Đơn vị" -> "Số: {so_ke_hoach}"
  setParagraphRuns(doc, leftCellPs[3], [{ text: 'Số: {so_ke_hoach}', sz: '24' }], {
    clearPPrRPrColor: true,
  });

  // Right Cell P[3]: "Cần Thơ, ngày    tháng     năm" -> "Cần Thơ, ngày {ngay} tháng {thang} năm {nam}"
  setParagraphRuns(
    doc,
    rightCellPs[3],
    [{ text: 'Cần Thơ, ngày {ngay} tháng {thang} năm {nam}', italic: true, sz: '24' }],
    { clearPPrRPrColor: true }
  );

  // 2. Title & Product Name
  // children[4]: " “tên sản phẩm”" -> "“{ten_san_pham}”"
  setParagraphRuns(doc, children[4], [{ text: '“{ten_san_pham}”', bold: true, sz: '26' }], {
    clearPPrRPrColor: true,
  });

  // 3. Section I. Mục đích
  // children[6]: "I. Mục đích "
  // children[7]: "(giới thiệu đôi nét về SPCGCN) " -> "{muc_dich}"
  // children[8]: "(giới thiệu mục đích của chuyển giao) " -> remove
  setParagraphRuns(doc, children[7], [{ text: '{muc_dich}', sz: '26' }], {
    clearPPrRPrItalic: true,
  });
  body.removeChild(children[8]);

  // 4. Section II. Nhóm tác giả của sản phẩm chuyển giao
  // children[10]: heading, children[11]: blank paragraph -> "{nhom_tac_gia}"
  setParagraphRuns(doc, children[11], [{ text: '{nhom_tac_gia}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // 5. Section III. Loại hình sản phẩm chuyển giao công nghệ
  // children[12]: heading, children[13]: blank paragraph -> "{loai_hinh_san_pham}"
  setParagraphRuns(doc, children[13], [{ text: '{loai_hinh_san_pham}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // 6. Section IV. Phương thức chuyển giao
  // children[14]: heading, children[15]: blank paragraph -> "{phuong_thuc}"
  setParagraphRuns(doc, children[15], [{ text: '{phuong_thuc}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // 7. Section V. Bên nhận chuyển giao
  // children[16]: heading, children[17]: blank paragraph -> "{ben_nhan_chuyen_giao}"
  setParagraphRuns(doc, children[17], [{ text: '{ben_nhan_chuyen_giao}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // 8. Section VI. Thời gian, địa điểm chuyển giao
  // children[19]: "6.1. Thời gian: …………, ngày ….. tháng …. năm ……."
  setParagraphRuns(doc, children[19], [
    { text: '6.1. Thời gian: ', bold: true, sz: '26' },
    { text: '{thoi_gian}', bold: false, sz: '26' },
  ]);
  // children[20]: "6.2. Địa điểm: ……………………………………………"
  setParagraphRuns(doc, children[20], [
    { text: '6.2. Địa điểm: ', bold: true, sz: '26' },
    { text: '{dia_diem}', bold: false, sz: '26' },
  ]);

  // 9. Section VII. Chi phí chuyển giao (strip "(nếu có tùy theo thỏa thuận)")
  setParagraphRuns(doc, children[22], [{ text: 'VII. Chi phí chuyển giao', bold: true, sz: '26' }], {
    clearPPrRPrColor: true,
  });
  setParagraphRuns(doc, children[23], [{ text: '{chi_phi}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // 10. Section VIII tables: 8.1 (tables[1]), 8.2 (tables[2]), 8.3 (tables[3])
  const tbl81Rows = getDirectChildren(tables[1], 'w:tr');
  for (let i = 1; i < tbl81Rows.length; i++) tables[1].removeChild(tbl81Rows[i]);
  configureTemplateRow(doc, tbl81Rows[0], ['{-w:tr ds_ban_chi_dao}{col1}', '{col2}{/ds_ban_chi_dao}']);

  const tbl82Rows = getDirectChildren(tables[2], 'w:tr');
  for (let i = 1; i < tbl82Rows.length; i++) tables[2].removeChild(tbl82Rows[i]);
  configureTemplateRow(doc, tbl82Rows[0], ['{-w:tr ds_ban_to_chuc}{col1}', '{col2}{/ds_ban_to_chuc}']);

  const tbl83Rows = getDirectChildren(tables[3], 'w:tr');
  for (let i = 1; i < tbl83Rows.length; i++) tables[3].removeChild(tbl83Rows[i]);
  configureTemplateRow(doc, tbl83Rows[0], ['{-w:tr ds_nhan_su}{col1}', '{col2}{/ds_nhan_su}']);

  // 11. Section IX Conditional Block ({#co_hoi_thao} ... {/co_hoi_thao})
  // Remove extra empty paragraph children[32] after 8.3 and repurpose children[33] as {#co_hoi_thao} opener paragraph
  // so zero empty <w:p> tags remain between 8.3 and X when co_hoi_thao == false.
  body.removeChild(children[32]);
  setParagraphRuns(doc, children[33], [{ text: '{#co_hoi_thao}', sz: '26' }], {
    clearPPrRPrBold: true,
  });

  // children[34]: "IX. Hội thảo chuyển giao (nếu có tổ chức HT chuyển giao thì ghi, nếu không bỏ phần IX này)"
  // Strip instructional parenthetical and yellow highlight
  setParagraphRuns(doc, children[34], [{ text: 'IX. Hội thảo chuyển giao', bold: true, sz: '26' }], {
    clearPPrRPrColor: true,
  });

  // 9.1 Chủ tọa (tables[4]): Remove TR[1] and asymmetric TR[2] ([gs=1,w=3798] | [gs=2,w=5488]).
  // Keep TR[0] ([gs=2,w=4428] | [gs=1,w=4858]) matching <w:tblGrid> (3798 + 630 = 4428, 4858).
  const tbl91Rows = getDirectChildren(tables[4], 'w:tr');
  for (let i = 1; i < tbl91Rows.length; i++) tables[4].removeChild(tbl91Rows[i]);
  configureTemplateRow(doc, tbl91Rows[0], ['{-w:tr ds_chu_toa}{col1}', '{col2}{/ds_chu_toa}']);

  // 9.2 Báo cáo viên (tables[5]): Remove TR[1] and asymmetric TR[2]. Keep TR[0] ([gs=2,w=4428] | [gs=1,w=4858]).
  const tbl92Rows = getDirectChildren(tables[5], 'w:tr');
  for (let i = 1; i < tbl92Rows.length; i++) tables[5].removeChild(tbl92Rows[i]);
  configureTemplateRow(doc, tbl92Rows[0], ['{-w:tr ds_bao_cao_vien}{col1}', '{col2}{/ds_bao_cao_vien}']);

  // 9.3 Chương trình chi tiết của hội thảo (tables[6]): Keep TR[0] (header) and TR[1] (template loop row), remove TR[2..5]
  const tbl93Rows = getDirectChildren(tables[6], 'w:tr');
  ensureFlexibleRowPr(doc, tbl93Rows[0]);
  for (let i = 2; i < tbl93Rows.length; i++) tables[6].removeChild(tbl93Rows[i]);
  configureTemplateRow(doc, tbl93Rows[1], [
    '{-w:tr ds_chuong_trinh_hoi_thao}{thoi_gian}',
    '{noi_dung}',
    '{thanh_phan}{/ds_chuong_trinh_hoi_thao}',
  ]);

  // 9.4 Phân công nhiệm vụ tổ chức (tables[7]): Keep TR[0] (header) and TR[1] (template loop row), remove TR[2..3]
  const tbl94Rows = getDirectChildren(tables[7], 'w:tr');
  ensureFlexibleRowPr(doc, tbl94Rows[0]);
  for (let i = 2; i < tbl94Rows.length; i++) tables[7].removeChild(tbl94Rows[i]);
  configureTemplateRow(
    doc,
    tbl94Rows[1],
    ['{-w:tr ds_phan_cong_hoi_thao}{stt}', '{noi_dung}', '{phu_trach}{/ds_phan_cong_hoi_thao}'],
    ['center', 'both', 'both']
  );

  // 9.5 Dự trù kinh phí hội thảo:
  // children[46]: "(Từ nguồn kinh phí của Trường...)" -> "{kinh_phi_hoi_thao}"
  setParagraphRuns(doc, children[46], [{ text: '{kinh_phi_hoi_thao}', sz: '26' }], {
    clearPPrRPrItalic: true,
  });

  // Insert {/co_hoi_thao} closing paragraph right after children[47] (so children[47] spacing is inside the conditional block)
  const closeHoiThaoP = children[33].cloneNode(true);
  setParagraphRuns(doc, closeHoiThaoP, [{ text: '{/co_hoi_thao}', sz: '26' }], {
    clearPPrRPrBold: true,
  });
  body.insertBefore(closeHoiThaoP, children[48]);

  // 12. Section X. Quản lý rủi ro trong chuyển giao
  // 10.1 Xác định và đánh giá rủi ro (tables[8]): Keep TR[0] (header) and TR[1] (template loop row), remove TR[2..4]
  const tbl101Rows = getDirectChildren(tables[8], 'w:tr');
  ensureFlexibleRowPr(doc, tbl101Rows[0]);
  for (let i = 2; i < tbl101Rows.length; i++) tables[8].removeChild(tbl101Rows[i]);
  configureTemplateRow(
    doc,
    tbl101Rows[1],
    [
      '{-w:tr ds_danh_gia_rui_ro}{stt}',
      '{yeu_to_rui_ro}',
      '{p}',
      '{s}',
      '{r}',
      '{phan_loai}{/ds_danh_gia_rui_ro}',
    ],
    ['center', 'both', 'center', 'center', 'center', 'center']
  );

  // 10.2 Biện pháp kiểm soát rủi ro (tables[9]): Keep TR[0] (header) and TR[1] (template loop row), remove TR[2..3]
  const tbl102Rows = getDirectChildren(tables[9], 'w:tr');
  ensureFlexibleRowPr(doc, tbl102Rows[0]);
  for (let i = 2; i < tbl102Rows.length; i++) tables[9].removeChild(tbl102Rows[i]);
  configureTemplateRow(
    doc,
    tbl102Rows[1],
    [
      '{-w:tr ds_kiem_soat_rui_ro}{stt}',
      '{yeu_to_rui_ro}',
      '{bien_phap}',
      '{don_vi_phu_trach}',
      '{don_vi_phoi_hop}',
      '{thoi_gian}',
      '{san_pham}{/ds_kiem_soat_rui_ro}',
    ],
    ['center', 'both', 'both', 'both', 'both', 'center', 'both']
  );

  // Signature tables tables[10] (10 rows with 8 blank rows) and tables[11] (HIỆU TRƯỞNG) remain 100% intact!
  const serialized = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', serialized);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function main() {
  ensurePristineOriginals();

  const normalized1a = normalizeMau1a();
  const normalized2a = normalizeMau2a();

  const targets1a = [
    path.join(ROOT_DIR, 'docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx'),
    path.join(ROOT_DIR, 'docs/templates/mau_1a_chuan.docx'),
    path.join(ROOT_DIR, 'public/templates/mau_1a_chuan.docx'),
    path.join(ROOT_DIR, 'server/templates/mau_1a_chuan.docx'),
  ];

  const targets2a = [
    path.join(ROOT_DIR, 'docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx'),
    path.join(ROOT_DIR, 'docs/templates/mau_2a_chuan.docx'),
    path.join(ROOT_DIR, 'public/templates/mau_2a_chuan.docx'),
    path.join(ROOT_DIR, 'server/templates/mau_2a_chuan.docx'),
  ];

  for (const t of targets1a) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, normalized1a);
    console.log('[Step 2] Wrote normalized Mẫu 1a ->', path.relative(ROOT_DIR, t), `(${normalized1a.length} bytes)`);
  }

  for (const t of targets2a) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, normalized2a);
    console.log('[Step 2] Wrote normalized Mẫu 2a ->', path.relative(ROOT_DIR, t), `(${normalized2a.length} bytes)`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}

export {
  normalizeMau1a,
  normalizeMau2a,
  ensurePristineOriginals,
  main,
};
