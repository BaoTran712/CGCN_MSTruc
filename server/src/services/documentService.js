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

function ensureUploadDir() {
  if (!fs.existsSync(UPLOADS_DOCX_DIR)) {
    fs.mkdirSync(UPLOADS_DOCX_DIR, { recursive: true });
  }
}

/**
 * Tìm file template chuẩn tương ứng (Mẫu 1a hoặc Mẫu 2a)
 */
function findTemplateFile(templateId = '') {
  const is1a =
    String(templateId).includes('1a') ||
    String(templateId).toLowerCase().includes('tt') ||
    String(templateId).toLowerCase().includes('tri-thuc');

  const candidates = is1a
    ? [
        path.join(TEMPLATES_DIR, 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx'),
        path.join(TEMPLATES_DIR, 'mau_1a_chuan.docx'),
        path.resolve(__dirname, '../../templates/mau_1a_chuan.docx'),
      ]
    : [
        path.join(TEMPLATES_DIR, 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx'),
        path.join(TEMPLATES_DIR, 'mau_2a_chuan.docx'),
        path.resolve(__dirname, '../../templates/mau_2a_chuan.docx'),
      ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { filePath: p, is1a };
    }
  }

  throw new Error(`Không tìm thấy file mẫu biểu Word cho templateId: ${templateId}`);
}

/**
 * Helper chuẩn hóa chuỗi nhiều dòng (\r\n -> \n)
 */
function normalizeMultiline(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n');
}

/**
 * Adapter gom mảng nhân sự thành cặp 2 cột trên mỗi hàng (8.1, 8.2, 8.3, 9.1, 9.2)
 */
export function pairTwoColumns(input) {
  let items = [];
  if (Array.isArray(input)) {
    items = input
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          if (item.col1 || item.col2) return item;
          if (item.name) {
            return item.role ? `${item.name} (${item.role})` : item.name;
          }
        }
        return String(item || '').trim();
      })
      .filter(Boolean);
  } else if (typeof input === 'string') {
    items = normalizeMultiline(input)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Nếu đã là mảng các object có col1, col2
  if (items.length > 0 && typeof items[0] === 'object' && ('col1' in items[0] || 'col2' in items[0])) {
    return items.map((r) => ({
      col1: r.col1 || '',
      col2: r.col2 || '',
    }));
  }

  if (items.length === 0) {
    return [{ col1: '', col2: '' }];
  }

  const pairs = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push({
      col1: typeof items[i] === 'string' ? items[i] : (items[i]?.col1 || ''),
      col2: items[i + 1] ? (typeof items[i + 1] === 'string' ? items[i + 1] : (items[i + 1]?.col2 || '')) : '',
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
 * Adapter bảng đánh giá rủi ro 10.1: Đảm bảo tính đúng R = P * S và phân loại
 */
export function adaptRiskTable(risks) {
  if (Array.isArray(risks) && risks.length > 0) {
    return risks.map((item, idx) => {
      const p = Number(item.p || item.probability || 1);
      const s = Number(item.s || item.severity || 1);
      const r = item.r !== undefined && item.r !== null ? Number(item.r) : p * s;
      const phan_loai = item.phan_loai || item.risk_level || getRiskLevel(r);
      return {
        stt: item.stt || idx + 1,
        yeu_to_rui_ro: item.yeu_to_rui_ro || item.risk_factor || item.name || '',
        p,
        s,
        r,
        phan_loai,
      };
    });
  }

  if (typeof risks === 'string' && risks.trim()) {
    const lines = normalizeMultiline(risks).split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line, idx) => ({
      stt: idx + 1,
      yeu_to_rui_ro: line,
      p: 2,
      s: 2,
      r: 4,
      phan_loai: 'Thấp',
    }));
  }

  return [
    {
      stt: 1,
      yeu_to_rui_ro: 'Chậm tiến độ chuyển giao do nhân sự bận công tác',
      p: 2,
      s: 2,
      r: 4,
      phan_loai: 'Thấp',
    },
  ];
}

/**
 * Adapter bảng biện pháp kiểm soát rủi ro 10.2
 */
export function adaptRiskControlTable(controls) {
  if (Array.isArray(controls) && controls.length > 0) {
    return controls.map((item, idx) => ({
      stt: item.stt || idx + 1,
      yeu_to_rui_ro: item.yeu_to_rui_ro || item.risk_factor || '',
      bien_phap: item.bien_phap || item.control_measure || '',
      don_vi_phu_trach: item.don_vi_phu_trach || item.responsible_unit || '',
      don_vi_phoi_hop: item.don_vi_phoi_hop || item.cooperating_unit || '',
      thoi_gian: item.thoi_gian || item.time || '',
      san_pham: item.san_pham || item.output || '',
    }));
  }

  if (typeof controls === 'string' && controls.trim()) {
    const lines = normalizeMultiline(controls).split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line, idx) => ({
      stt: idx + 1,
      yeu_to_rui_ro: 'Rủi ro phát sinh trong quá trình chuyển giao',
      bien_phap: line,
      don_vi_phu_trach: 'Nhóm nghiên cứu',
      don_vi_phoi_hop: 'Khoa / Đơn vị tiếp nhận',
      thoi_gian: 'Thường xuyên',
      san_pham: 'Biên bản nghiệm thu từng giai đoạn',
    }));
  }

  return [
    {
      stt: 1,
      yeu_to_rui_ro: 'Chậm tiến độ chuyển giao do nhân sự bận công tác',
      bien_phap: 'Chủ nhiệm phân công cán bộ phụ trách dự phòng và báo cáo định kỳ',
      don_vi_phu_trach: 'Nhóm nghiên cứu',
      don_vi_phoi_hop: 'Khoa / Đơn vị tiếp nhận',
      thoi_gian: 'Trong suốt quá trình',
      san_pham: 'Biên bản làm việc và báo cáo tiến độ',
    },
  ];
}

/**
 * Adapter chương trình chi tiết hội thảo 9.3
 */
export function adaptWorkshopSchedule(schedule) {
  if (Array.isArray(schedule) && schedule.length > 0) {
    return schedule.map((item) => ({
      thoi_gian: item.thoi_gian || item.time || '',
      noi_dung: item.noi_dung || item.content || '',
      thanh_phan: item.thanh_phan || item.attendees || '',
    }));
  }

  if (typeof schedule === 'string' && schedule.trim()) {
    const lines = normalizeMultiline(schedule).split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => ({
      thoi_gian: '08:00 - 11:30',
      noi_dung: line,
      thanh_phan: 'Ban Tổ chức và Đại biểu',
    }));
  }

  return [
    { thoi_gian: '08:00 - 08:30', noi_dung: 'Đón tiếp đại biểu và tuyên bố lý do', thanh_phan: 'Ban Tổ chức, Đại biểu' },
    { thoi_gian: '08:30 - 10:00', noi_dung: 'Báo cáo kỹ thuật và trình diễn sản phẩm CGCN', thanh_phan: 'Chủ nhiệm đề tài, Báo cáo viên' },
    { thoi_gian: '10:00 - 11:00', noi_dung: 'Thảo luận, trao đổi và lấy ý kiến chuyên môn', thanh_phan: 'Đại biểu tham dự' },
    { thoi_gian: '11:00 - 11:30', noi_dung: 'Tổng kết và bế mạc hội thảo', thanh_phan: 'Chủ tọa hội thảo' },
  ];
}

/**
 * Adapter phân công nhiệm vụ tổ chức 9.4
 */
export function adaptWorkshopAssignment(assignments) {
  if (Array.isArray(assignments) && assignments.length > 0) {
    return assignments.map((item, idx) => ({
      stt: item.stt || idx + 1,
      noi_dung: item.noi_dung || item.task || '',
      phu_trach: item.phu_trach || item.person || '',
    }));
  }

  if (typeof assignments === 'string' && assignments.trim()) {
    const lines = normalizeMultiline(assignments).split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.map((line, idx) => ({
      stt: idx + 1,
      noi_dung: line,
      phu_trach: 'Ban Tổ chức',
    }));
  }

  return [
    { stt: 1, noi_dung: 'Chuẩn bị hội trường, âm thanh, máy chiếu', phu_trach: 'Phòng Quản trị thiết bị' },
    { stt: 2, noi_dung: 'Phát hành giấy mời và đón tiếp đại biểu', phu_trach: 'Ban Tổ chức & Văn phòng Khoa' },
    { stt: 3, noi_dung: 'Chuẩn bị tài liệu kỹ thuật và bài trình chiếu', phu_trach: 'Chủ nhiệm đề tài' },
  ];
}

/**
 * Hậu xử lý DOM XML: Khóa phân trang bảng (<w:cantSplit/>) và bảo vệ bảng chữ ký (<w:keepLines/>, <w:keepNext/>)
 */
export function applyPaginationAndSignatureProtection(zip) {
  const xmlString = zip.file('word/document.xml').asText();
  const domDoc = new DOMParser().parseFromString(xmlString, 'text/xml');

  // 1. Chèn <w:cantSplit/> vào <w:trPr> của tất cả các hàng bảng (<w:tr>)
  const allRows = domDoc.getElementsByTagName('w:tr');
  for (let i = 0; i < allRows.length; i++) {
    const tr = allRows[i];
    let trPr = tr.getElementsByTagName('w:trPr')[0];
    if (!trPr) {
      trPr = domDoc.createElement('w:trPr');
      tr.insertBefore(trPr, tr.firstChild);
    }
    const hasCantSplit = trPr.getElementsByTagName('w:cantSplit').length > 0;
    if (!hasCantSplit) {
      trPr.appendChild(domDoc.createElement('w:cantSplit'));
    }
  }

  // 2. Chèn <w:keepLines/> và <w:keepNext/> vào <w:pPr> của các đoạn văn nằm trong bảng chữ ký cuối văn bản
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

  const allTables = domDoc.getElementsByTagName('w:tbl');
  for (let t = 0; t < allTables.length; t++) {
    const tbl = allTables[t];
    const text = tbl.textContent || '';
    const isSignatureTable = signatureKeywords.some((kw) => text.includes(kw));
    if (isSignatureTable) {
      const paragraphs = tbl.getElementsByTagName('w:p');
      for (let p = 0; p < paragraphs.length; p++) {
        const pNode = paragraphs[p];
        let pPr = pNode.getElementsByTagName('w:pPr')[0];
        if (!pPr) {
          pPr = domDoc.createElement('w:pPr');
          pNode.insertBefore(pPr, pNode.firstChild);
        }
        if (pPr.getElementsByTagName('w:keepLines').length === 0) {
          pPr.appendChild(domDoc.createElement('w:keepLines'));
        }
      }
    }
  }

  // 3. Xóa triệt để các đoạn văn trống cuối văn bản giữa bảng cuối cùng và <w:sectPr> để không bị thừa trang trắng
  const body = domDoc.getElementsByTagName('w:body')[0];
  if (body) {
    const sectPr = body.getElementsByTagName('w:sectPr')[0];
    if (sectPr) {
      let prevNode = sectPr.previousSibling;
      while (prevNode && prevNode.nodeName === 'w:p') {
        const text = prevNode.textContent ? prevNode.textContent.trim() : '';
        const nodeToRemove = prevNode;
        prevNode = prevNode.previousSibling;
        if (text === '') {
          body.removeChild(nodeToRemove);
        } else {
          break;
        }
      }
      // Chèn 1 paragraph kích thước siêu nhỏ 1pt trước sectPr để Word hợp lệ mà không tạo trang trắng
      const zeroP = domDoc.createElement('w:p');
      const pPr = domDoc.createElement('w:pPr');
      const spacing = domDoc.createElement('w:spacing');
      spacing.setAttribute('w:before', '0');
      spacing.setAttribute('w:after', '0');
      spacing.setAttribute('w:line', '20');
      spacing.setAttribute('w:lineRule', 'exact');
      pPr.appendChild(spacing);
      const rPr = domDoc.createElement('w:rPr');
      const sz = domDoc.createElement('w:sz');
      sz.setAttribute('w:val', '2');
      rPr.appendChild(sz);
      const szCs = domDoc.createElement('w:szCs');
      szCs.setAttribute('w:val', '2');
      rPr.appendChild(szCs);
      pPr.appendChild(rPr);
      zeroP.appendChild(pPr);
      body.insertBefore(zeroP, sectPr);
    }
  }

  const updatedXml = new XMLSerializer().serializeToString(domDoc);
  zip.file('word/document.xml', updatedXml);
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

  const { filePath: templatePath, is1a } = findTemplateFile(templateId);
  const templateBinary = fs.readFileSync(templatePath, 'binary');

  const zip = new PizZip(templateBinary);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  let renderData = {};

  if (is1a) {
    const dept = formData.department || formData.department_name || 'KHOA CÔNG NGHỆ THÔNG TIN';
    renderData = {
      don_vi_uppercase: dept.toUpperCase(),
      so_to_trinh: formData.proposal_number || `${normalizedCode}/TTr`,
      ngay: day,
      thang: month,
      nam: year,
      ho_ten: formData.full_name || formData.creator_name || 'Cán bộ phụ trách',
      chuc_danh: formData.position || '',
      dien_thoai: formData.phone || '',
      email: formData.email || '',
      muc_dich: normalizeMultiline(formData.purpose || formData.research_title || ''),
      nhu_cau_tiep_nhan: normalizeMultiline(formData.receiver_needs || ''),
      dap_ung_thuc_hien: normalizeMultiline(formData.provider_capacity || ''),
      muc_tieu: normalizeMultiline(formData.transfer_goals || ''),
      doi_tuong: normalizeMultiline(formData.transfer_target || ''),
      phuong_thuc: normalizeMultiline(formData.transfer_method || ''),
      hinh_thuc: formData.transfer_form || 'Chuyển giao công nghệ độc lập.',
      quyen_chuyen_giao: normalizeMultiline(formData.transfer_rights || ''),
      thoi_gian: formData.transfer_time || '',
      dia_diem: formData.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      thanh_phan: normalizeMultiline(formData.attendees || ''),
      kinh_phi: normalizeMultiline(
        formData.funding_source || formData.financial_plan || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'
      ),
      truong_don_vi: formData.assigned_manager || formData.truong_don_vi || 'Trưởng Đơn vị',
      ...formData,
    };
  } else {
    // Mẫu 2a
    const dept = formData.department || formData.department_name || 'KHOA CÔNG NGHỆ THÔNG TIN';
    const hasHoiThao = Boolean(
      formData.has_workshop === true ||
      formData.has_hoi_thao === true ||
      (formData.has_workshop !== false &&
        formData.has_hoi_thao !== false &&
        (formData.workshop_chair ||
          formData.workshop_speaker ||
          formData.workshop_program ||
          formData.chu_toa ||
          formData.bao_cao_vien))
    );

    renderData = {
      so_ke_hoach: formData.plan_code || `${normalizedCode}/KH`,
      don_vi_uppercase: dept.toUpperCase(),
      don_vi_viet_tat: dept.split(' ').map((w) => w[0]).join('').toUpperCase() || 'ĐV',
      ngay: day,
      thang: month,
      nam: year,
      ten_san_pham: formData.product_name || formData.title || formData.research_title || 'Sản phẩm chuyển giao công nghệ',
      ho_ten: formData.full_name || formData.creator_name || 'Cán bộ phụ trách',
      truong_don_vi_nhan: formData.receiver_manager || formData.truong_don_vi_nhan || 'Trưởng Đơn vị nhận',
      dien_thoai: formData.phone || '',
      email: formData.email || '',
      muc_dich: normalizeMultiline(formData.purpose || ''),
      nhom_tac_gia: normalizeMultiline(formData.authors_group || formData.full_name || ''),
      loai_hinh_san_pham: formData.product_type || 'Hệ thống phần mềm ứng dụng y tế',
      phuong_thuc: normalizeMultiline(formData.transfer_method || ''),
      ben_nhan_chuyen_giao: formData.receiving_party || formData.partner || 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
      thoi_gian: formData.transfer_date
        ? new Date(formData.transfer_date).toLocaleDateString('vi-VN')
        : (formData.transfer_time || ''),
      dia_diem: formData.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      chi_phi:
        formData.transfer_cost !== undefined && formData.transfer_cost !== null && formData.transfer_cost !== ''
          ? Number(formData.transfer_cost) === 0
            ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
            : `${Number(formData.transfer_cost).toLocaleString('vi-VN')} VNĐ`
          : 'Theo thỏa thuận',
      // Nhân sự 2 cột Mục VIII
      ds_ban_chi_dao: pairTwoColumns(formData.steering_committee || formData.ban_chi_dao || formData.ds_ban_chi_dao),
      ds_ban_to_chuc: pairTwoColumns(formData.organizing_committee || formData.ban_to_chuc || formData.ds_ban_to_chuc),
      ds_nhan_su: pairTwoColumns(formData.implementing_staff || formData.nhan_su || formData.ds_nhan_su),
      // Khối điều kiện Mục IX
      has_hoi_thao: hasHoiThao,
      ds_chu_toa: pairTwoColumns(formData.workshop_chair || formData.chu_toa || formData.ds_chu_toa),
      ds_bao_cao_vien: pairTwoColumns(formData.workshop_speaker || formData.bao_cao_vien || formData.ds_bao_cao_vien),
      ds_chuong_trinh_hoi_thao: adaptWorkshopSchedule(
        formData.workshop_program || formData.chuong_trinh_hoi_thao || formData.ds_chuong_trinh_hoi_thao
      ),
      ds_phan_cong_hoi_thao: adaptWorkshopAssignment(
        formData.workshop_assignments || formData.phan_cong_hoi_thao || formData.ds_phan_cong_hoi_thao
      ),
      kinh_phi_hoi_thao: normalizeMultiline(
        formData.workshop_budget || formData.kinh_phi_hoi_thao || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'
      ),
      // Bảng rủi ro Mục X
      ds_danh_gia_rui_ro: adaptRiskTable(
        formData.risks || formData.danh_gia_rui_ro || formData.risk_management || formData.ds_danh_gia_rui_ro
      ),
      ds_kiem_soat_rui_ro: adaptRiskControlTable(
        formData.risk_controls || formData.kiem_soat_rui_ro || formData.ds_kiem_soat_rui_ro
      ),
      ...formData,
    };
  }

  // Render bằng docxtemplater
  doc.render(renderData);

  // Hậu xử lý DOM: cantSplit, keepLines, keepNext
  applyPaginationAndSignatureProtection(doc.getZip());

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
  pairTwoColumns,
  getRiskLevel,
  adaptRiskTable,
  adaptRiskControlTable,
  adaptWorkshopSchedule,
  adaptWorkshopAssignment,
  applyPaginationAndSignatureProtection,
};

export default documentService;
