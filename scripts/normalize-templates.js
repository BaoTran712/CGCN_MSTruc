import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. Hàm làm sạch các thẻ phân mảnh XML (proofErr, rsid, v.v.) và gộp các thẻ <w:r> liền kề
 */
export function healXmlRuns(xml) {
  // Loại bỏ các thẻ w:proofErr (lỗi chính tả của Word làm tách chữ)
  let cleanXml = xml.replace(/<w:proofErr[^>]*\/>/g, '');

  // Loại bỏ các comment XML thừa nếu có
  cleanXml = cleanXml.replace(/<!--[\s\S]*?-->/g, '');

  // Xóa bỏ các thẻ rPr không cần thiết trong w:t bị chia cắt quanh dấu ngoặc nhọn
  cleanXml = cleanXml.replace(/(<w:t[^>]*>)\s*\{+\s*(<\/w:t>)/g, '$1{$2');
  cleanXml = cleanXml.replace(/(<w:t[^>]*>)\s*\}+\s*(<\/w:t>)/g, '$1}$2');

  return cleanXml;
}

/**
 * Helper tạo một Text node trong OpenXML với định dạng chuẩn Times New Roman
 */
function createRun(domDoc, text, options = {}) {
  const r = domDoc.createElement('w:r');
  const rPr = domDoc.createElement('w:rPr');
  
  const rFonts = domDoc.createElement('w:rFonts');
  rFonts.setAttribute('w:ascii', 'Times New Roman');
  rFonts.setAttribute('w:hAnsi', 'Times New Roman');
  rFonts.setAttribute('w:cs', 'Times New Roman');
  rPr.appendChild(rFonts);

  if (options.bold) {
    rPr.appendChild(domDoc.createElement('w:b'));
  }
  if (options.italic) {
    rPr.appendChild(domDoc.createElement('w:i'));
  }
  if (options.size) {
    const sz = domDoc.createElement('w:sz');
    sz.setAttribute('w:val', String(options.size));
    rPr.appendChild(sz);
    const szCs = domDoc.createElement('w:szCs');
    szCs.setAttribute('w:val', String(options.size));
    rPr.appendChild(szCs);
  }
  r.appendChild(rPr);

  const t = domDoc.createElement('w:t');
  if (text.startsWith(' ') || text.endsWith(' ') || text.includes('  ')) {
    t.setAttribute('xml:space', 'preserve');
  }
  t.textContent = text;
  r.appendChild(t);

  return r;
}

/**
 * Helper đặt nội dung văn bản cho một ô bảng (<w:tc>)
 */
function setCellContent(domDoc, tc, runs) {
  // Xóa tất cả các thẻ con w:p hiện tại
  const existingPs = tc.getElementsByTagName('w:p');
  while (existingPs.length > 0) {
    tc.removeChild(existingPs[0]);
  }

  const p = domDoc.createElement('w:p');
  const pPr = domDoc.createElement('w:pPr');
  const spacing = domDoc.createElement('w:spacing');
  spacing.setAttribute('w:after', '0');
  spacing.setAttribute('w:line', '276');
  spacing.setAttribute('w:lineRule', 'auto');
  pPr.appendChild(spacing);
  p.appendChild(pPr);

  for (const r of runs) {
    p.appendChild(r);
  }
  tc.appendChild(p);
}

/**
 * 2. Chuẩn hóa Mẫu 2a từ file gốc sạch của trường
 */
export function normalizeMau2a(templateBuffer) {
  const zip = new PizZip(templateBuffer);
  let xml = zip.file('word/document.xml').asText();

  // Loại bỏ orphaned w:tbl nếu có
  const badSnippet = /<w:tbl><w:tblPr><w:tblStyle w:val="a4"[^>]*>[\s\S]*?<\/w:tblPr>/g;
  xml = xml.replace(badSnippet, '');

  xml = healXmlRuns(xml);

  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  const tables = dom.getElementsByTagName('w:tbl');

  // Đảm bảo có đúng 12 bảng trong Mẫu 2a gốc
  console.log(`[normalizeMau2a] Tìm thấy ${tables.length} bảng trong template`);

  // --- BẢNG 0: Header (Số: {so_ke_hoach}/KH-{don_vi_viet_tat}) ---
  const t0 = tables[0];
  const t0Cells = t0.getElementsByTagName('w:tc');
  if (t0Cells.length >= 1) {
    const leftCell = t0Cells[0];
    const leftPs = leftCell.getElementsByTagName('w:p');
    for (let i = 0; i < leftPs.length; i++) {
      const p = leftPs[i];
      const txt = (p.textContent || '').trim();
      if (txt.includes('Số:')) {
        // Thay đoạn văn Số: bằng placeholder sạch
        while (p.firstChild) p.removeChild(p.firstChild);
        const pPr = dom.createElement('w:pPr');
        const jc = dom.createElement('w:jc');
        jc.setAttribute('w:val', 'center');
        pPr.appendChild(jc);
        p.appendChild(pPr);
        p.appendChild(createRun(dom, 'Số: {so_ke_hoach}/KH-{don_vi_viet_tat}', { size: 24 }));
      }
    }
  }

  // --- BẢNG 1, 2, 3: Ban chỉ đạo, Ban tổ chức, Nhân sự (2 cột mỗi hàng) ---
  const twoColConfigs = [
    { tbl: tables[1], tag: 'ds_ban_chi_dao' },
    { tbl: tables[2], tag: 'ds_ban_to_chuc' },
    { tbl: tables[3], tag: 'ds_nhan_su' },
  ];

  for (const { tbl, tag } of twoColConfigs) {
    const rows = tbl.getElementsByTagName('w:tr');
    // Xóa các hàng thừa 1, 2... chỉ giữ lại hàng 0
    while (rows.length > 1) {
      tbl.removeChild(rows[1]);
    }
    // Hàng 0 trở thành hàng lặp docxtemplater
    const row0 = rows[0];
    const cells = row0.getElementsByTagName('w:tc');
    if (cells.length >= 2) {
      setCellContent(dom, cells[0], [
        createRun(dom, `{-w:tr ${tag}}`, { size: 2 }),
        createRun(dom, '{col1}', { size: 26 }),
      ]);
      setCellContent(dom, cells[1], [
        createRun(dom, '{col2}', { size: 26 }),
        createRun(dom, `{/${tag}}`, { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 4 & 5: Chủ tọa (9.1) & Báo cáo viên (9.2) ---
  // Loại bỏ hàng thứ 3 bị lệch colspan (gridSpan 1, 2) và hàng thứ 2
  const chairSpeakerConfigs = [
    { tbl: tables[4], tag: 'ds_chu_toa' },
    { tbl: tables[5], tag: 'ds_bao_cao_vien' },
  ];

  for (const { tbl, tag } of chairSpeakerConfigs) {
    const rows = tbl.getElementsByTagName('w:tr');
    while (rows.length > 1) {
      tbl.removeChild(rows[1]);
    }
    const row0 = rows[0];
    const cells = row0.getElementsByTagName('w:tc');
    if (cells.length >= 2) {
      // Cell 0 có gridSpan=2 (w=4428), Cell 1 có gridSpan=1 (w=4858)
      setCellContent(dom, cells[0], [
        createRun(dom, `{-w:tr ${tag}}`, { size: 2 }),
        createRun(dom, '{col1}', { size: 26 }),
      ]);
      setCellContent(dom, cells[1], [
        createRun(dom, '{col2}', { size: 26 }),
        createRun(dom, `{/${tag}}`, { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 6: Chương trình chi tiết hội thảo (9.3) ---
  // Row 0: Header (Thời gian, Nội dung, Thành phần)
  // Xóa các hàng trống thừa 2, 3, 4, 5
  const t6 = tables[6];
  const t6Rows = t6.getElementsByTagName('w:tr');
  while (t6Rows.length > 2) {
    t6.removeChild(t6Rows[2]);
  }
  if (t6Rows.length >= 2) {
    const row1 = t6Rows[1];
    const cells = row1.getElementsByTagName('w:tc');
    if (cells.length >= 3) {
      setCellContent(dom, cells[0], [
        createRun(dom, '{-w:tr ds_chuong_trinh_hoi_thao}', { size: 2 }),
        createRun(dom, '{thoi_gian}', { size: 26 }),
      ]);
      setCellContent(dom, cells[1], [
        createRun(dom, '{noi_dung}', { size: 26 }),
      ]);
      setCellContent(dom, cells[2], [
        createRun(dom, '{thanh_phan}', { size: 26 }),
        createRun(dom, '{/ds_chuong_trinh_hoi_thao}', { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 7: Phân công nhiệm vụ hội thảo (9.4) ---
  // Row 0: Header (STT, Nội dung công việc, Phụ trách)
  // Xóa các hàng trống thừa 2, 3
  const t7 = tables[7];
  const t7Rows = t7.getElementsByTagName('w:tr');
  while (t7Rows.length > 2) {
    t7.removeChild(t7Rows[2]);
  }
  if (t7Rows.length >= 2) {
    const row1 = t7Rows[1];
    const cells = row1.getElementsByTagName('w:tc');
    if (cells.length >= 3) {
      setCellContent(dom, cells[0], [
        createRun(dom, '{-w:tr ds_phan_cong_hoi_thao}', { size: 2 }),
        createRun(dom, '{stt}', { size: 26 }),
      ]);
      setCellContent(dom, cells[1], [
        createRun(dom, '{noi_dung}', { size: 26 }),
      ]);
      setCellContent(dom, cells[2], [
        createRun(dom, '{phu_trach}', { size: 26 }),
        createRun(dom, '{/ds_phan_cong_hoi_thao}', { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 8: Đánh giá rủi ro 10.1 (6 cột: Stt, Công việc/Yếu tố, P, S, R, Phân loại) ---
  const t8 = tables[8];
  const t8Rows = t8.getElementsByTagName('w:tr');
  while (t8Rows.length > 2) {
    t8.removeChild(t8Rows[2]);
  }
  if (t8Rows.length >= 2) {
    const row1 = t8Rows[1];
    const cells = row1.getElementsByTagName('w:tc');
    if (cells.length >= 6) {
      setCellContent(dom, cells[0], [
        createRun(dom, '{-w:tr ds_danh_gia_rui_ro}', { size: 2 }),
        createRun(dom, '{stt}', { size: 24 }),
      ]);
      setCellContent(dom, cells[1], [createRun(dom, '{yeu_to_rui_ro}', { size: 24 })]);
      setCellContent(dom, cells[2], [createRun(dom, '{p}', { size: 24 })]);
      setCellContent(dom, cells[3], [createRun(dom, '{s}', { size: 24 })]);
      setCellContent(dom, cells[4], [createRun(dom, '{r}', { size: 24 })]);
      setCellContent(dom, cells[5], [
        createRun(dom, '{phan_loai}', { size: 24 }),
        createRun(dom, '{/ds_danh_gia_rui_ro}', { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 9: Biện pháp kiểm soát rủi ro 10.2 (7 cột) ---
  const t9 = tables[9];
  const t9Rows = t9.getElementsByTagName('w:tr');
  while (t9Rows.length > 2) {
    t9.removeChild(t9Rows[2]);
  }
  if (t9Rows.length >= 2) {
    const row1 = t9Rows[1];
    const cells = row1.getElementsByTagName('w:tc');
    if (cells.length >= 7) {
      setCellContent(dom, cells[0], [
        createRun(dom, '{-w:tr ds_kiem_soat_rui_ro}', { size: 2 }),
        createRun(dom, '{stt}', { size: 24 }),
      ]);
      setCellContent(dom, cells[1], [createRun(dom, '{yeu_to_rui_ro}', { size: 24 })]);
      setCellContent(dom, cells[2], [createRun(dom, '{bien_phap}', { size: 24 })]);
      setCellContent(dom, cells[3], [createRun(dom, '{don_vi_phu_trach}', { size: 24 })]);
      setCellContent(dom, cells[4], [createRun(dom, '{don_vi_phoi_hop}', { size: 24 })]);
      setCellContent(dom, cells[5], [createRun(dom, '{thoi_gian}', { size: 24 })]);
      setCellContent(dom, cells[6], [
        createRun(dom, '{san_pham}', { size: 24 }),
        createRun(dom, '{/ds_kiem_soat_rui_ro}', { size: 2 }),
      ]);
    }
  }

  // --- BẢNG 10: Bảng chữ ký 10 hàng (BẢO LƯU TOÀN VẸN 8 HÀNG TRỐNG KÝ & ĐÓNG DẤU) ---
  const t10 = tables[10];
  const t10Rows = t10.getElementsByTagName('w:tr');
  console.log(`[normalizeMau2a] Bảng chữ ký 10 có ${t10Rows.length} hàng (Phải đúng 10 hàng)`);
  // Đảm bảo không xóa bất kỳ hàng trống nào trong t10
  // Cập nhật tên ở hàng 4 (dưới Trưởng đơn vị) nếu cần
  if (t10Rows.length >= 10) {
    // Row 0: Tiêu đề "Trưởng đơn vị nhận", "Trưởng đơn vị giao/Chủ nhiệm đề tài"
    // Rows 1, 2, 3: Khoảng trống ký tên
    // Row 4: Tên người ký (nếu có placeholder)
    const row4Cells = t10Rows[4].getElementsByTagName('w:tc');
    if (row4Cells.length >= 2) {
      setCellContent(dom, row4Cells[0], [createRun(dom, '{truong_don_vi_nhan}', { bold: true, size: 26 })]);
      setCellContent(dom, row4Cells[1], [createRun(dom, '{ho_ten}', { bold: true, size: 26 })]);
    }
  }

  // --- BẢNG 11: Nơi nhận & Hiệu trưởng ---
  const t11 = tables[11];
  const t11Cells = t11.getElementsByTagName('w:tc');
  if (t11Cells.length >= 1) {
    // Cell 0 chứa Nơi nhận
    const cell0Ps = t11Cells[0].getElementsByTagName('w:p');
    for (let i = 0; i < cell0Ps.length; i++) {
      const p = cell0Ps[i];
      const txt = (p.textContent || '').trim();
      if (txt.includes('thêm tên tắt đơn vị CG')) {
        while (p.firstChild) p.removeChild(p.firstChild);
        p.appendChild(createRun(dom, '- {ben_nhan_chuyen_giao};', { size: 20 }));
      }
    }
  }

  // --- CHUẨN HÓA CÁC ĐOẠN VĂN BẢN (Text Placeholders) ---
  const paragraphs = dom.getElementsByTagName('w:p');
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = (p.textContent || '').replace(/\s+/g, ' ').trim();

    // 1. Ngày tháng năm
    if (text.includes('ngày ….. tháng …. năm 20…') || text.includes('ngày ….. tháng …. năm')) {
      while (p.firstChild) p.removeChild(p.firstChild);
      const pPr = dom.createElement('w:pPr');
      const jc = dom.createElement('w:jc');
      jc.setAttribute('w:val', 'right');
      pPr.appendChild(jc);
      p.appendChild(pPr);
      p.appendChild(createRun(dom, 'Cần Thơ, ngày {ngay} tháng {thang} năm {nam}', { italic: true, size: 26 }));
    }

    // 2. Tên sản phẩm
    if (text.includes('(giới thiệu đôi nét về SPCGCN)')) {
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(createRun(dom, '{ten_san_pham}', { size: 26 }));
    }

    // 3. Mục đích
    if (text.includes('(giới thiệu mục đích của chuyển giao)')) {
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(createRun(dom, '{muc_dich}', { size: 26 }));
    }

    // 4. Thời gian 6.1
    if (text.startsWith('6.1. Thời gian:')) {
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(createRun(dom, '6.1. Thời gian: ', { bold: true, size: 26 }));
      p.appendChild(createRun(dom, '{thoi_gian}', { size: 26 }));
    }

    // 5. Địa điểm 6.2
    if (text.startsWith('6.2. Địa điểm:')) {
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(createRun(dom, '6.2. Địa điểm: ', { bold: true, size: 26 }));
      p.appendChild(createRun(dom, '{dia_diem}', { size: 26 }));
    }

    // 6. Mục 9.5 Dự trù kinh phí hội thảo
    if (text.includes('9.5. Dự trù kinh phí hội thảo') || text.includes('kinh phí hội thảo')) {
      // Đoạn tiếp theo hoặc ngay tại đoạn này
    }
  }

  // Chuyển lại thành chuỗi XML
  let resultXml = new XMLSerializer().serializeToString(dom);

  // Đóng gói Section IX vào block điều kiện {#has_hoi_thao}...{/has_hoi_thao}
  // Tìm tiêu đề "IX. Hội thảo chuyển giao" và kết thúc trước "X. Quản lý rủi ro"
  const ixStartTag = 'IX. Hội thảo chuyển giao';
  const xStartTag = 'X. Quản lý rủi ro';

  const ixIdx = resultXml.indexOf(ixStartTag);
  const xIdx = resultXml.indexOf(xStartTag);

  if (ixIdx !== -1 && xIdx !== -1) {
    // Tìm thẻ <w:p mở đầu đoạn IX
    const pBeforeIx = resultXml.lastIndexOf('<w:p', ixIdx);
    // Tìm thẻ <w:p mở đầu đoạn X
    const pBeforeX = resultXml.lastIndexOf('<w:p', xIdx);

    const beforeIx = resultXml.slice(0, pBeforeIx);
    const ixContent = resultXml.slice(pBeforeIx, pBeforeX);
    const afterIx = resultXml.slice(pBeforeX);

    // Chèn {#has_hoi_thao} và {/has_hoi_thao} sạch
    const tagOpen = '<w:p><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:t xml:space="preserve">{#has_hoi_thao}</w:t></w:r></w:p>';
    const tagClose = '<w:p><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="2"/><w:szCs w:val="2"/></w:rPr><w:t xml:space="preserve">{/has_hoi_thao}</w:t></w:r></w:p>';

    resultXml = beforeIx + tagOpen + ixContent + tagClose + afterIx;
  }

  // Khóa tất cả <w:tblLayout w:type="fixed"/>
  resultXml = resultXml.replace(/<w:tblLayout[^>]*\/>/g, '<w:tblLayout w:type="fixed"/>');

  zip.file('word/document.xml', resultXml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * 3. Chuẩn hóa Mẫu 1a
 */
export function normalizeMau1a(templateBuffer) {
  const zip = new PizZip(templateBuffer);
  let xml = zip.file('word/document.xml').asText();
  xml = healXmlRuns(xml);

  // Khóa tất cả table layout fixed
  xml = xml.replace(/<w:tblLayout[^>]*\/>/g, '<w:tblLayout w:type="fixed"/>');

  zip.file('word/document.xml', xml);
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Chạy script trực tiếp nếu gọi từ CLI
if (process.argv[1] && process.argv[1].endsWith('normalize-templates.js')) {
  console.log('=== BẮT ĐẦU CHUẨN HÓA TEMPLATES ===');
  const orig2aPath = path.resolve(__dirname, '../CGCN_MSTruc/docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx');
  const orig1aPath = path.resolve(__dirname, '../docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx');

  if (fs.existsSync(orig2aPath)) {
    console.log(`Đang xử lý Mẫu 2a từ: ${orig2aPath}`);
    const buf2a = fs.readFileSync(orig2aPath);
    const normalized2a = normalizeMau2a(buf2a);

    const targets2a = [
      path.resolve(__dirname, '../docs/templates/mau_2a_chuan.docx'),
      path.resolve(__dirname, '../server/templates/mau_2a_chuan.docx'),
      path.resolve(__dirname, '../public/templates/mau_2a_chuan.docx'),
    ];
    for (const t of targets2a) {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.writeFileSync(t, normalized2a);
      console.log(` -> Đã ghi: ${t} (${normalized2a.length} bytes)`);
    }
  }

  if (fs.existsSync(orig1aPath)) {
    console.log(`Đang xử lý Mẫu 1a từ: ${orig1aPath}`);
    const buf1a = fs.readFileSync(orig1aPath);
    const normalized1a = normalizeMau1a(buf1a);

    const targets1a = [
      path.resolve(__dirname, '../docs/templates/mau_1a_chuan.docx'),
      path.resolve(__dirname, '../server/templates/mau_1a_chuan.docx'),
      path.resolve(__dirname, '../public/templates/mau_1a_chuan.docx'),
    ];
    for (const t of targets1a) {
      fs.mkdirSync(path.dirname(t), { recursive: true });
      fs.writeFileSync(t, normalized1a);
      console.log(` -> Đã ghi: ${t} (${normalized1a.length} bytes)`);
    }
  }
  console.log('=== HOÀN TẤT CHUẨN HÓA TEMPLATES ===');
}
