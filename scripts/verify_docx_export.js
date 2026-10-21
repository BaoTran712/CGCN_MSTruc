/**
 * Step 5: Automated Verification & Regression Test Script
 * Renders sample .docx outputs for Mẫu 1a & Mẫu 2a (Full Data & Partial Data with co_hoi_thao = false / empty arrays)
 * and asserts all 5 structural & content guarantees defined in SYSTEM ROLE & OBJECTIVE.txt.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  findTemplateFile,
  renderDocxBuffer,
} from '../server/src/services/documentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'server/uploads/docx');

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

function parseDocXml(buffer) {
  const zip = new PizZip(buffer);
  const xmlText = zip.file('word/document.xml').asText();
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  return { zip, xmlText, doc };
}

function getSectPrBytes(doc) {
  const sectPr = doc.getElementsByTagName('w:sectPr')[0];
  assert(sectPr, 'Missing <w:sectPr> in document.xml');
  return new XMLSerializer().serializeToString(sectPr);
}

function extractTableGridSignatures(doc) {
  const tbls = Array.from(doc.getElementsByTagName('w:tbl'));
  return tbls.map((tbl) => {
    const tblPr = getDirectChildren(tbl, 'w:tblPr')[0];
    const tblLayout = tblPr ? getDirectChildren(tblPr, 'w:tblLayout')[0] : null;
    const layoutType = tblLayout ? tblLayout.getAttribute('w:type') : null;
    const tblGrid = getDirectChildren(tbl, 'w:tblGrid')[0];
    const gridCols = tblGrid
      ? getDirectChildren(tblGrid, 'w:gridCol').map((gc) => gc.getAttribute('w:w'))
      : [];
    return {
      layoutType,
      gridKey: gridCols.join(','),
      rowCount: getDirectChildren(tbl, 'w:tr').length,
      text: (tbl.textContent || '').trim(),
    };
  });
}

function assertNoUnrenderedPlaceholdersOrNulls(doc, label) {
  const tNodes = Array.from(doc.getElementsByTagName('w:t'));
  for (const t of tNodes) {
    const text = t.textContent || '';
    assert(!text.includes('{'), `[${label}] Unrendered '{' found in <w:t>: "${text}"`);
    assert(!text.includes('}'), `[${label}] Unrendered '}' found in <w:t>: "${text}"`);
    assert(!/\bnull\b/i.test(text), `[${label}] Literal "null" found in <w:t>: "${text}"`);
    assert(!/\bundefined\b/i.test(text), `[${label}] Literal "undefined" found in <w:t>: "${text}"`);
  }
}

function assertTablesLockedAndIntact(outputDoc, templateDoc, label, expectedTableCount) {
  const outTables = Array.from(outputDoc.getElementsByTagName('w:tbl'));
  const tplGrids = extractTableGridSignatures(templateDoc);

  if (expectedTableCount !== undefined) {
    assert.strictEqual(
      outTables.length,
      expectedTableCount,
      `[${label}] Expected ${expectedTableCount} tables, got ${outTables.length}`
    );
  }

  for (let i = 0; i < outTables.length; i++) {
    const tbl = outTables[i];
    const tblPr = getDirectChildren(tbl, 'w:tblPr')[0];
    assert(tblPr, `[${label}] Table #${i} missing <w:tblPr>`);
    const tblLayout = getDirectChildren(tblPr, 'w:tblLayout')[0];
    assert(tblLayout, `[${label}] Table #${i} missing <w:tblLayout>`);
    assert.strictEqual(
      tblLayout.getAttribute('w:type'),
      'fixed',
      `[${label}] Table #${i} <w:tblLayout> is not "fixed"`
    );

    const tblGrid = getDirectChildren(tbl, 'w:tblGrid')[0];
    assert(tblGrid, `[${label}] Table #${i} missing <w:tblGrid>`);
    const gridCols = getDirectChildren(tblGrid, 'w:gridCol').map((gc) => gc.getAttribute('w:w'));
    const gridKey = gridCols.join(',');
    assert(
      tplGrids.some((g) => g.gridKey === gridKey),
      `[${label}] Table #${i} gridCols [${gridKey}] does not match any original template table grid`
    );

    const rows = getDirectChildren(tbl, 'w:tr');
    for (let r = 0; r < rows.length; r++) {
      const tr = rows[r];
      const trPr = getDirectChildren(tr, 'w:trPr')[0];
      assert(trPr, `[${label}] Table #${i} Row #${r} missing <w:trPr>`);
      const cantSplit = getDirectChildren(trPr, 'w:cantSplit')[0];
      assert(cantSplit, `[${label}] Table #${i} Row #${r} missing <w:cantSplit/>`);

      const trHeights = getDirectChildren(trPr, 'w:trHeight');
      for (const th of trHeights) {
        if (i > 0 && i < outTables.length - 2) {
          assert.strictEqual(
            th.getAttribute('w:hRule'),
            'atLeast',
            `[${label}] Data Table #${i} Row #${r} <w:trHeight> must have w:hRule="atLeast"`
          );
        }
      }

      const cells = getDirectChildren(tr, 'w:tc');
      for (let c = 0; c < cells.length; c++) {
        const tcPr = getDirectChildren(cells[c], 'w:tcPr')[0];
        assert(tcPr, `[${label}] Table #${i} Row #${r} Cell #${c} missing <w:tcPr>`);
        const tcW = getDirectChildren(tcPr, 'w:tcW')[0];
        assert(tcW, `[${label}] Table #${i} Row #${r} Cell #${c} missing <w:tcW>`);
        assert.strictEqual(
          tcW.getAttribute('w:type'),
          'dxa',
          `[${label}] Table #${i} Row #${r} Cell #${c} <w:tcW> must have w:type="dxa"`
        );
      }
    }
  }
}

function assertSignatureBlockProtectedAnd8BlankRowsIntact(outputDoc, label) {
  const outTables = Array.from(outputDoc.getElementsByTagName('w:tbl'));
  // Second-to-last table is the 10-row signature block (with 4+4=8 blank signature rows)
  // Last table is the 1-row "Nơi nhận / HIỆU TRƯỞNG" block
  const sigTable1 = outTables[outTables.length - 2];
  const sigTable2 = outTables[outTables.length - 1];
  const rows1 = getDirectChildren(sigTable1, 'w:tr');
  const rows2 = getDirectChildren(sigTable2, 'w:tr');

  // Original signature table 1 has 10 rows:
  // TR[0]: Trưởng đơn vị nhận / Trưởng đơn vị (hoặc Chủ nhiệm đề tài)
  // TR[1..4]: 4 blank rows for signatures
  // TR[5]: Phòng KH&CN / Phòng TCKT / Văn Phòng
  // TR[6..9]: 4 blank rows for signatures
  assert.strictEqual(
    rows1.length,
    10,
    `[${label}] First bottom signature table must have 10 rows (including 4+4=8 blank signature rows), got ${rows1.length}`
  );
  assert.strictEqual(
    rows2.length,
    1,
    `[${label}] Second bottom signature table (Nơi nhận / HIỆU TRƯỞNG) must have 1 row, got ${rows2.length}`
  );

  const blankRowIndices = [1, 2, 3, 4, 6, 7, 8, 9];
  for (const rIdx of blankRowIndices) {
    const rowText = (rows1[rIdx].textContent || '').trim();
    assert.strictEqual(
      rowText,
      '',
      `[${label}] Blank signature row TR[${rIdx}] must remain empty, got "${rowText}"`
    );
  }

  // Check <w:keepNext/> and <w:keepLines/> on all rows of sigTable1
  for (let rIdx = 0; rIdx < rows1.length; rIdx++) {
    const tr = rows1[rIdx];
    const trPr = getDirectChildren(tr, 'w:trPr')[0];
    assert(
      getDirectChildren(trPr, 'w:cantSplit').length > 0,
      `[${label}] Signature table 1 row TR[${rIdx}] missing <w:cantSplit/>`
    );

    const pNodes = Array.from(tr.getElementsByTagName('w:p'));
    for (const p of pNodes) {
      const pPr = getDirectChildren(p, 'w:pPr')[0];
      assert(pPr, `[${label}] Signature table 1 row TR[${rIdx}] <w:p> missing <w:pPr>`);
      assert(
        getDirectChildren(pPr, 'w:keepLines').length > 0,
        `[${label}] Signature table 1 row TR[${rIdx}] <w:pPr> missing <w:keepLines/>`
      );
      assert(
        getDirectChildren(pPr, 'w:keepNext').length > 0,
        `[${label}] Signature table 1 row TR[${rIdx}] <w:pPr> missing <w:keepNext/>`
      );
    }
  }

  // Check <w:cantSplit/> and <w:keepLines/> on sigTable2
  const tr2 = rows2[0];
  const trPr2 = getDirectChildren(tr2, 'w:trPr')[0];
  assert(
    getDirectChildren(trPr2, 'w:cantSplit').length > 0,
    `[${label}] Signature table 2 row TR[0] missing <w:cantSplit/>`
  );
  const pNodes2 = Array.from(tr2.getElementsByTagName('w:p'));
  for (const p of pNodes2) {
    const pPr = getDirectChildren(p, 'w:pPr')[0];
    assert(pPr, `[${label}] Signature table 2 row TR[0] <w:p> missing <w:pPr>`);
    assert(
      getDirectChildren(pPr, 'w:keepLines').length > 0,
      `[${label}] Signature table 2 row TR[0] <w:pPr> missing <w:keepLines/>`
    );
  }
}

function runVerification() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const tpl1aBuffer = fs.readFileSync(findTemplateFile('mau-1a-tt-cgcn').filePath);
  const tpl2aBuffer = fs.readFileSync(findTemplateFile('mau-2a-kh-cgcn').filePath);
  const tpl1aParsed = parseDocXml(tpl1aBuffer);
  const tpl2aParsed = parseDocXml(tpl2aBuffer);

  // =========================================================================
  // TEST 1: Mẫu 1a (Full Data with "PHÒNG KHOA HỌC CÔNG NGHỆ" & Số: 15/TTr-KHCN)
  // =========================================================================
  const { buffer: mau1aFullBuffer } = renderDocxBuffer(
    {
      department: 'PHÒNG KHOA HỌC CÔNG NGHỆ',
      don_vi_viet_tat: 'KHCN',
      so_hieu: '15',
      ngay: '21',
      thang: '10',
      nam: '2026',
      full_name: 'PGS.TS. Nguyễn Văn A',
      position: 'Giảng viên cao cấp',
      phone: '0912345678',
      email: 'nva@ctump.edu.vn',
      purpose: 'Chuyển giao tri thức từ đề tài cấp Trường vào giảng dạy lâm sàng.\r\nNâng cao năng lực thực hành.',
      receiver_needs: 'Bộ môn Nội cần tài liệu chuẩn hóa phác đồ điều trị mới.',
      provider_capacity: 'Nhóm nghiên cứu đã nghiệm thu đề tài đạt loại Xuất sắc.',
      transfer_goals: 'Cập nhật 100% giáo trình đào tạo đại học và sau đại học.',
      transfer_target: 'Giáo trình và bộ câu hỏi lượng giá lâm sàng.',
      transfer_method: 'Chuyển giao trực tiếp bản quyền sử dụng tài liệu và tập huấn giảng viên.',
      transfer_form: 'Chuyển giao công nghệ độc lập.',
      transfer_rights: 'Quyền sử dụng tài liệu phục vụ đào tạo nội bộ.',
      transfer_time: 'Tháng 11/2026',
      transfer_location: 'Khoa Y - Trường Đại học Y Dược Cần Thơ',
      attendees: 'Ban Chủ nhiệm Khoa Y, Giảng viên Bộ môn Nội, Nhóm nghiên cứu.',
      funding_source: 'Kinh phí hoạt động thường xuyên của Nhà trường.',
    },
    'mau-1a-tt-cgcn',
    'VERIFY-1A-FULL'
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'verify_mau_1a_full.docx'), mau1aFullBuffer);

  const out1aFull = parseDocXml(mau1aFullBuffer);
  assert.strictEqual(
    getSectPrBytes(out1aFull.doc),
    getSectPrBytes(tpl1aParsed.doc),
    '[Mẫu 1a Full] <w:sectPr> does not match template byte-for-byte'
  );
  assertNoUnrenderedPlaceholdersOrNulls(out1aFull.doc, 'Mẫu 1a Full');
  assertTablesLockedAndIntact(out1aFull.doc, tpl1aParsed.doc, 'Mẫu 1a Full', 3);
  assertSignatureBlockProtectedAnd8BlankRowsIntact(out1aFull.doc, 'Mẫu 1a Full');
  assert(
    out1aFull.xmlText.includes('Số: 15/TTr-KHCN'),
    '[Mẫu 1a Full] Document number should render "Số: 15/TTr-KHCN"'
  );
  // Verify header left cell single-line protection for "PHÒNG KHOA HỌC CÔNG NGHỆ"
  const hdrTbl1a = out1aFull.doc.getElementsByTagName('w:tbl')[0];
  const hdrLeftCell1a = getDirectChildren(getDirectChildren(hdrTbl1a, 'w:tr')[0], 'w:tc')[0];
  const hdrLeftPs1a = getDirectChildren(hdrLeftCell1a, 'w:p');
  assert.strictEqual(
    (hdrLeftPs1a[1].textContent || '').trim(),
    'PHÒNG KHOA HỌC CÔNG NGHỆ',
    '[Mẫu 1a Full] Header P[1] must contain "PHÒNG KHOA HỌC CÔNG NGHỆ"'
  );
  assert.strictEqual(
    hdrLeftPs1a[1].getElementsByTagName('w:pict').length,
    0,
    '[Mẫu 1a Full] Header P[1] must not contain <w:pict> so the horizontal line never overlaps text'
  );
  assert.strictEqual(
    hdrLeftPs1a[2].getElementsByTagName('w:pict').length,
    1,
    '[Mẫu 1a Full] Header P[2] must contain the <w:pict> horizontal line'
  );
  assert(
    out1aFull.doc.getElementsByTagName('w:br').length > 0,
    '[Mẫu 1a Full] Multi-line text should produce <w:br/> tags'
  );

  // =========================================================================
  // TEST 2: Mẫu 2a Full Data (with co_hoi_thao = true & multi-line in 10.1/10.2)
  // =========================================================================
  const { buffer: mau2aFullBuffer } = renderDocxBuffer(
    {
      department: 'KHOA DƯỢC',
      don_vi_viet_tat: 'KD',
      so_hieu: '', // Empty so_hieu -> must default to 6 spaces "      "
      ngay: '21',
      thang: '10',
      nam: '2026',
      product_name: 'Quy trình bào chế viên nang thảo dược hỗ trợ điều trị tiểu đường',
      full_name: 'TS. Trần Thị B',
      receiver_manager: 'PGS.TS. Lê Văn C',
      phone: '0987654321',
      email: 'ttb@ctump.edu.vn',
      purpose: 'Ứng dụng quy trình bào chế vào sản xuất thử nghiệm.\r\nĐảm bảo tiêu chuẩn GLP/GMP.',
      authors_group: '1. TS. Trần Thị B - Chủ nhiệm\n2. ThS. Phạm Văn D - Thành viên',
      product_type: 'Quy trình công nghệ bào chế dược phẩm',
      transfer_method: 'Bàn giao hồ sơ quy trình kỹ thuật và đào tạo trực tiếp tại xưởng.',
      receiving_party: 'Trung tâm Sản xuất Dược phẩm CTUMP',
      transfer_time: 'Quý IV/2026',
      transfer_location: 'Khoa Dược - Trường Đại học Y Dược Cần Thơ',
      transfer_cost: 0,
      ds_ban_chi_dao: [
        { ho_ten: 'GS.TS. Nguyễn Trung Kiên', chuc_vu: 'Trưởng ban' },
        { ho_ten: 'PGS.TS. Nguyễn Văn Lâm', chuc_vu: 'Phó Trưởng ban' },
      ],
      ds_ban_to_chuc: [
        { ho_ten: 'TS. Trần Thị B', chuc_vu: 'Trưởng ban tổ chức' },
        { ho_ten: 'ThS. Phạm Văn D', chuc_vu: 'Ủy viên thư ký' },
      ],
      ds_nhan_su: [
        { ho_ten: 'CN. Lê Hoàng E', chuc_vu: 'Kỹ thuật viên chính' },
      ],
      co_hoi_thao: true,
      ds_chu_toa: [
        { ho_ten: 'PGS.TS. Nguyễn Văn Lâm', chuc_vu: 'Phó Hiệu trưởng - Chủ tọa' },
      ],
      ds_bao_cao_vien: [
        { ho_ten: 'TS. Trần Thị B', chuc_vu: 'Báo cáo viên chính' },
      ],
      ds_chuong_trinh_hoi_thao: [
        {
          thoi_gian: '08:00 - 09:30',
          noi_dung: 'Trình bày quy trình chiết xuất\r\nThảo luận thông số kỹ thuật',
          thanh_phan: 'Ban Tổ chức, Đại biểu Khoa Dược',
        },
        {
          thoi_gian: '09:30 - 11:00',
          noi_dung: 'Thực hành vận hành thử nghiệm tại phòng thí nghiệm',
          thanh_phan: 'Toàn thể đại biểu',
        },
      ],
      ds_phan_cong_hoi_thao: [
        {
          noi_dung: 'Chuẩn bị hội trường và tài liệu in ấn',
          phu_trach: 'Văn phòng Khoa Dược',
        },
      ],
      workshop_budget: '15.000.000 VNĐ (Mười lăm triệu đồng chẵn).',
      ds_danh_gia_rui_ro: [
        {
          yeu_to_rui_ro: 'Biến động chất lượng dược liệu đầu vào\r\nĐộ ẩm vượt ngưỡng cho phép',
          p: 3,
          s: 4,
        },
        {
          yeu_to_rui_ro: 'Thiết bị chiết xuất cần hiệu chuẩn lại',
          p: 2,
          s: 2,
        },
      ],
      ds_kiem_soat_rui_ro: [
        {
          yeu_to_rui_ro: 'Biến động chất lượng dược liệu đầu vào',
          bien_phap: 'Kiểm nghiệm chặt chẽ COA đầu vào\r\nSấy chân không đạt chuẩn trước khi chiết xuất',
          don_vi_phu_trach: 'Bộ môn Dược liệu',
          don_vi_phoi_hop: 'Trung tâm Kiểm nghiệm',
          thoi_gian: 'Trước mỗi mẻ sản xuất',
          san_pham: 'Phiếu kiểm nghiệm đạt chuẩn',
        },
      ],
    },
    'mau-2a-kh-cgcn',
    'VERIFY-2A-FULL'
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'verify_mau_2a_full.docx'), mau2aFullBuffer);

  const out2aFull = parseDocXml(mau2aFullBuffer);
  assert.strictEqual(
    getSectPrBytes(out2aFull.doc),
    getSectPrBytes(tpl2aParsed.doc),
    '[Mẫu 2a Full] <w:sectPr> does not match template byte-for-byte'
  );
  assertNoUnrenderedPlaceholdersOrNulls(out2aFull.doc, 'Mẫu 2a Full');
  // When co_hoi_thao = true, all 12 tables exist (header + 8.1,8.2,8.3 + 9.1,9.2,9.3,9.4 + 10.1,10.2 + 2 signature tables)
  assertTablesLockedAndIntact(out2aFull.doc, tpl2aParsed.doc, 'Mẫu 2a Full', 12);
  assertSignatureBlockProtectedAnd8BlankRowsIntact(out2aFull.doc, 'Mẫu 2a Full');
  assert(
    out2aFull.xmlText.includes('Số:       /KH-KD'),
    '[Mẫu 2a Full] Empty so_hieu must render 6 spaces: "Số:       /KH-KD"'
  );
  assert(
    out2aFull.xmlText.includes('IX. Hội thảo chuyển giao'),
    '[Mẫu 2a Full] Section IX must be present when co_hoi_thao = true'
  );
  // Check R = P * S calculation (3 * 4 = 12, Cao)
  assert(
    out2aFull.xmlText.includes('12') && out2aFull.xmlText.includes('Cao'),
    '[Mẫu 2a Full] Table 10.1 must auto-calculate R = P * S (3 * 4 = 12 -> Cao)'
  );

  // =========================================================================
  // TEST 3: Mẫu 2a Partial Data (co_hoi_thao = false, empty arrays [], null fields)
  // =========================================================================
  const { buffer: mau2aPartialBuffer } = renderDocxBuffer(
    {
      department: 'KHOA ĐIỀU DƯỠNG',
      so_hieu: null,
      product_name: 'Quy trình chăm sóc bệnh nhân sau phẫu thuật tim mạch',
      full_name: 'ThS. Lê Thị F',
      receiver_manager: null,
      phone: undefined,
      email: null,
      purpose: 'Chuẩn hóa quy trình chăm sóc điều dưỡng<b>an toàn</b>.',
      co_hoi_thao: false,
      ds_ban_chi_dao: [],
      ds_ban_to_chuc: [],
      ds_nhan_su: [],
      ds_chu_toa: [],
      ds_bao_cao_vien: [],
      ds_chuong_trinh_hoi_thao: [],
      ds_phan_cong_hoi_thao: [],
      ds_danh_gia_rui_ro: [],
      ds_kiem_soat_rui_ro: [],
    },
    'mau-2a-kh-cgcn',
    'VERIFY-2A-PARTIAL'
  );
  fs.writeFileSync(path.join(OUTPUT_DIR, 'verify_mau_2a_partial_no_workshop.docx'), mau2aPartialBuffer);

  const out2aPartial = parseDocXml(mau2aPartialBuffer);
  assert.strictEqual(
    getSectPrBytes(out2aPartial.doc),
    getSectPrBytes(tpl2aParsed.doc),
    '[Mẫu 2a Partial] <w:sectPr> does not match template byte-for-byte'
  );
  assertNoUnrenderedPlaceholdersOrNulls(out2aPartial.doc, 'Mẫu 2a Partial');
  // When co_hoi_thao = false, the 4 workshop tables (9.1, 9.2, 9.3, 9.4) are removed -> 12 - 4 = 8 tables remain
  assertTablesLockedAndIntact(out2aPartial.doc, tpl2aParsed.doc, 'Mẫu 2a Partial', 8);
  assertSignatureBlockProtectedAnd8BlankRowsIntact(out2aPartial.doc, 'Mẫu 2a Partial');

  // Verify Section IX is completely absent when co_hoi_thao = false
  assert(
    !out2aPartial.xmlText.includes('IX. Hội thảo chuyển giao'),
    '[Mẫu 2a Partial] "IX. Hội thảo chuyển giao" must NOT exist when co_hoi_thao == false'
  );
  assert(
    !out2aPartial.xmlText.includes('9.1. Chủ tọa'),
    '[Mẫu 2a Partial] "9.1. Chủ tọa" must NOT exist when co_hoi_thao == false'
  );
  assert(
    !out2aPartial.xmlText.includes('9.3. Chương trình chi tiết'),
    '[Mẫu 2a Partial] "9.3. Chương trình chi tiết" must NOT exist when co_hoi_thao == false'
  );
  assert(
    !out2aPartial.xmlText.includes('9.5. Dự trù kinh phí hội thảo'),
    '[Mẫu 2a Partial] "9.5. Dự trù kinh phí hội thảo" must NOT exist when co_hoi_thao == false'
  );

  // Verify zero extra empty <w:p> tags remain between Table 8.3 and "X. Quản lý rủi ro trong chuyển giao"
  const bodyChildren = getDirectChildren(out2aPartial.doc.getElementsByTagName('w:body')[0]);
  const idx83 = bodyChildren.findIndex((el) => (el.textContent || '').includes('8.3. Nhân sự thực hiện'));
  const idxX = bodyChildren.findIndex((el) => (el.textContent || '').includes('X. Quản lý rủi ro trong chuyển giao'));
  assert(idx83 !== -1 && idxX !== -1, '[Mẫu 2a Partial] Could not find 8.3 or X heading in body');
  // Between idx83 ("8.3. Nhân sự thực hiện") and idxX ("X. Quản lý rủi ro trong chuyển giao"),
  // there should ONLY be the single <w:tbl> for 8.3 and zero extra empty <w:p> nodes!
  const nodesBetween83AndX = bodyChildren.slice(idx83 + 1, idxX);
  assert.strictEqual(
    nodesBetween83AndX.length,
    1,
    `[Mẫu 2a Partial] Expected only 1 node (Table 8.3) between 8.3 heading and X heading, found ${nodesBetween83AndX.length}`
  );
  assert.strictEqual(
    nodesBetween83AndX[0].tagName,
    'w:tbl',
    '[Mẫu 2a Partial] Node between 8.3 heading and X heading must be <w:tbl>'
  );

  // Verify Empty Table Safeguard: tables 8.1, 8.2, 8.3, 10.1, 10.2 received [] and must still have their empty formatted row
  const partialTables = Array.from(out2aPartial.doc.getElementsByTagName('w:tbl'));
  // Tables 1, 2, 3 are 8.1, 8.2, 8.3 (each has 1 empty data row)
  for (const tblIdx of [1, 2, 3]) {
    const rows = getDirectChildren(partialTables[tblIdx], 'w:tr');
    assert.strictEqual(
      rows.length,
      1,
      `[Mẫu 2a Partial] Table #${tblIdx} with [] input must render 1 empty formatted row`
    );
  }
  // Tables 4, 5 are 10.1, 10.2 (each has 1 header row + 1 empty data row = 2 rows)
  for (const tblIdx of [4, 5]) {
    const rows = getDirectChildren(partialTables[tblIdx], 'w:tr');
    assert.strictEqual(
      rows.length,
      2,
      `[Mẫu 2a Partial] Table #${tblIdx} (10.1/10.2) with [] input must render 1 header row + 1 empty formatted row (2 rows total)`
    );
  }

  console.log('================================================================');
  console.log('ALL 5 AUTOMATED VERIFICATION & REGRESSION CHECKS PASSED 100%!');
  console.log('Generated verified files:');
  console.log(' - server/uploads/docx/verify_mau_1a_full.docx');
  console.log(' - server/uploads/docx/verify_mau_2a_full.docx');
  console.log(' - server/uploads/docx/verify_mau_2a_partial_no_workshop.docx');
  console.log('================================================================');
}

runVerification();
