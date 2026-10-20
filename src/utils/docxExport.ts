import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  Packer,
} from 'docx';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Dossier, WordTemplate } from '../types';
import { normalizeNFC } from './textUtils';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

function parseDate(iso?: string): { day: string; month: string; year: string } {
  const d = iso ? new Date(iso) : new Date();
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: (d.getMonth() + 1).toString().padStart(2, '0'),
    year: d.getFullYear().toString(),
  };
}

function createDocHeader(options: {
  docNumber: string;
  department: string;
  dateStr?: string;
  isMinistry?: boolean;
}): Table {
  const { day, month, year } = parseDate(options.dateStr);

  const leftCells: Paragraph[] = [];
  if (options.isMinistry) {
    leftCells.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'BỘ Y TẾ',
            font: 'Times New Roman',
            size: 22, // 11pt
          }),
        ],
      })
    );
  }

  leftCells.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ',
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: (options.department || 'KHOA / ĐƠN VỊ').toUpperCase(),
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '-----------------------',
          font: 'Times New Roman',
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Số: ${options.docNumber}`,
          font: 'Times New Roman',
          size: 20, // 10pt
        }),
      ],
    })
  );

  const rightCells: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Độc lập – Tự do – Hạnh phúc',
          font: 'Times New Roman',
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '---------------------------------',
          font: 'Times New Roman',
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Cần Thơ, ngày ${day} tháng ${month} năm ${year}`,
          font: 'Times New Roman',
          size: 22,
          italics: true,
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: leftCells,
          }),
          new TableCell({
            width: { size: 52, type: WidthType.PERCENTAGE },
            children: rightCells,
          }),
        ],
      }),
    ],
  });
}

function pHeading(text: string, spaceBefore = 200): Paragraph {
  return new Paragraph({
    spacing: { before: spaceBefore, after: 80 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 26, // 13pt
        bold: true,
      }),
    ],
  });
}

function pSubHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 140, after: 60 },
    children: [
      new TextRun({
        text,
        font: 'Times New Roman',
        size: 24, // 12pt
        bold: true,
      }),
    ],
  });
}

function pContent(text?: string, hint?: string): Paragraph {
  return new Paragraph({
    spacing: { line: 280, after: 100 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: text || (hint ? `(${hint})` : '....................................................................................................'),
        font: 'Times New Roman',
        size: 24, // 12pt
        italics: !text,
      }),
    ],
  });
}

function pFieldInline(label: string, value?: string): Paragraph {
  return new Paragraph({
    spacing: { line: 280, after: 80 },
    children: [
      new TextRun({
        text: `${label}: `,
        font: 'Times New Roman',
        size: 24,
        bold: true,
      }),
      new TextRun({
        text: value || '....................................................................',
        font: 'Times New Roman',
        size: 24,
      }),
    ],
  });
}

/**
 * Helper chuẩn hóa chuỗi nhiều dòng (\r\n -> \n)
 */
export function normalizeMultiline(str: any): string {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n');
}

/**
 * Adapter gom mảng nhân sự thành cặp 2 cột trên mỗi hàng (8.1, 8.2, 8.3, 9.1, 9.2)
 */
export function pairTwoColumns(input: any): { col1: string; col2: string }[] {
  let items: any[] = [];
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

  if (items.length > 0 && typeof items[0] === 'object' && ('col1' in items[0] || 'col2' in items[0])) {
    return items.map((r) => ({
      col1: r.col1 || '',
      col2: r.col2 || '',
    }));
  }

  if (items.length === 0) {
    return [{ col1: '', col2: '' }];
  }

  const pairs: { col1: string; col2: string }[] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push({
      col1: typeof items[i] === 'string' ? items[i] : (items[i]?.col1 || ''),
      col2: items[i + 1] ? (typeof items[i + 1] === 'string' ? items[i + 1] : (items[i + 1]?.col2 || '')) : '',
    });
  }
  return pairs;
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
 * Adapter bảng đánh giá rủi ro 10.1: Đảm bảo tính đúng R = P * S
 */
export function adaptRiskTable(risks: any): any[] {
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
export function adaptRiskControlTable(controls: any): any[] {
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
export function adaptWorkshopSchedule(schedule: any): any[] {
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
export function adaptWorkshopAssignment(assignments: any): any[] {
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
 * Hậu xử lý DOM XML: Khóa phân trang bảng (<w:cantSplit/>), bảo vệ bảng chữ ký và loại bỏ trang trắng cuối
 */
export function applyPaginationAndSignatureProtection(zip: any): void {
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

  // 2. Chèn <w:keepLines/> vào các đoạn văn nằm trong bảng chữ ký cuối văn bản
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
 * Xây dựng tập hợp biến mapping cho Docxtemplater
 */
export function buildDocxRenderData(dossier: Dossier, isMau1a: boolean): Record<string, any> {
  const d = dossier.formData || {};
  const dateObj = new Date(dossier.createdAt || Date.now());
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear().toString();
  const dept = d.department || dossier.createdBy.department || 'Khoa Công nghệ Thông tin';
  const fullName = d.full_name || dossier.createdBy.name || '';

  if (isMau1a) {
    return {
      don_vi_uppercase: dept.toUpperCase(),
      so_to_trinh: d.proposal_number || `${dossier.code}/TTr`,
      ngay: day,
      thang: month,
      nam: year,
      ho_ten: fullName,
      chuc_danh: d.position || '',
      dien_thoai: d.phone || '',
      email: d.email || '',
      muc_dich: normalizeMultiline(d.purpose || ''),
      nhu_cau_tiep_nhan: normalizeMultiline(d.receiver_needs || ''),
      dap_ung_thuc_hien: normalizeMultiline(d.provider_capacity || ''),
      muc_tieu: normalizeMultiline(d.transfer_goals || ''),
      doi_tuong: normalizeMultiline(d.transfer_target || ''),
      phuong_thuc: normalizeMultiline(d.transfer_method || ''),
      hinh_thuc: d.transfer_form || 'Chuyển giao công nghệ độc lập.',
      quyen_chuyen_giao: normalizeMultiline(d.transfer_rights || ''),
      thoi_gian: d.transfer_time || '',
      dia_diem: d.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      thanh_phan: normalizeMultiline(d.attendees || ''),
      kinh_phi: normalizeMultiline(
        d.funding_source || d.financial_plan || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'
      ),
      truong_don_vi: dossier.assignedManager?.name || d.assigned_manager || d.truong_don_vi || 'Trưởng Đơn vị',
      ...d,
    };
  }

  // Mẫu 2a
  const hasHoiThao = Boolean(
    d.has_workshop === true ||
    d.has_hoi_thao === true ||
    (d.has_workshop !== false &&
      d.has_hoi_thao !== false &&
      (d.workshop_chair ||
        d.workshop_speaker ||
        d.workshop_program ||
        d.chu_toa ||
        d.bao_cao_vien))
  );

  return {
    so_ke_hoach: d.plan_code || `${dossier.code}/KH`,
    don_vi_uppercase: dept.toUpperCase(),
    don_vi_viet_tat: dept.split(' ').map((w: string) => w[0]).join('').toUpperCase() || 'ĐV',
    ngay: day,
    thang: month,
    nam: year,
    ten_san_pham: d.product_name || d.research_title || 'Sản phẩm chuyển giao công nghệ',
    ho_ten: fullName,
    truong_don_vi_nhan: d.receiver_manager || d.truong_don_vi_nhan || 'Trưởng Đơn vị nhận',
    dien_thoai: d.phone || '',
    email: d.email || '',
    muc_dich: normalizeMultiline(d.purpose || ''),
    nhom_tac_gia: normalizeMultiline(d.authors_group || fullName),
    loai_hinh_san_pham: d.product_type || 'Hệ thống phần mềm ứng dụng y tế',
    phuong_thuc: normalizeMultiline(d.transfer_method || ''),
    ben_nhan_chuyen_giao: d.receiving_party || 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
    thoi_gian: d.transfer_date ? new Date(d.transfer_date).toLocaleDateString('vi-VN') : (d.transfer_time || ''),
    dia_diem: d.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
    chi_phi:
      d.transfer_cost !== undefined && d.transfer_cost !== null && d.transfer_cost !== ''
        ? Number(d.transfer_cost) === 0
          ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
          : `${Number(d.transfer_cost).toLocaleString('vi-VN')} VNĐ`
        : 'Theo thỏa thuận',
    // Nhân sự 2 cột Mục VIII
    ds_ban_chi_dao: pairTwoColumns(d.steering_committee || d.ban_chi_dao || d.ds_ban_chi_dao),
    ds_ban_to_chuc: pairTwoColumns(d.organizing_committee || d.ban_to_chuc || d.ds_ban_to_chuc),
    ds_nhan_su: pairTwoColumns(d.implementing_staff || d.nhan_su || d.ds_nhan_su),
    // Khối điều kiện Mục IX
    has_hoi_thao: hasHoiThao,
    ds_chu_toa: pairTwoColumns(d.workshop_chair || d.chu_toa || d.ds_chu_toa),
    ds_bao_cao_vien: pairTwoColumns(d.workshop_speaker || d.bao_cao_vien || d.ds_bao_cao_vien),
    ds_chuong_trinh_hoi_thao: adaptWorkshopSchedule(
      d.workshop_program || d.chuong_trinh_hoi_thao || d.ds_chuong_trinh_hoi_thao
    ),
    ds_phan_cong_hoi_thao: adaptWorkshopAssignment(
      d.workshop_assignments || d.phan_cong_hoi_thao || d.ds_phan_cong_hoi_thao
    ),
    kinh_phi_hoi_thao: normalizeMultiline(
      d.workshop_budget || d.kinh_phi_hoi_thao || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'
    ),
    // Bảng rủi ro Mục X
    ds_danh_gia_rui_ro: adaptRiskTable(
      d.risks || d.danh_gia_rui_ro || d.risk_management || d.ds_danh_gia_rui_ro
    ),
    ds_kiem_soat_rui_ro: adaptRiskControlTable(
      d.risk_controls || d.kiem_soat_rui_ro || d.ds_kiem_soat_rui_ro
    ),
    ...d,
  };
}

/**
 * HÀM XUẤT FILE WORD:
 * 1. Ưu tiên nạp biểu mẫu chuẩn gốc (/templates/mau_1a_chuan.docx hoặc /templates/mau_2a_chuan.docx)
 *    và render bằng Docxtemplater để bảo toàn 100% định dạng, phông chữ, lề trang, bảng biểu của Trường.
 * 2. Fallback sang programmatic docx nếu không fetch được template tĩnh.
 */
export async function generateAndDownloadDocx(rawDossier: Dossier, rawTemplate?: WordTemplate): Promise<void> {
  const dossier = normalizeNFC(rawDossier);
  const template = rawTemplate ? normalizeNFC(rawTemplate) : undefined;
  const d = dossier.formData || {};
  const templateCode = template?.code || dossier.templateId || dossier.templateCode || '';
  const isMau1a = templateCode.includes('1a') || templateCode.includes('TTR') || templateCode.includes('tri-thuc');
  const isMau2a = templateCode.includes('2a') || templateCode.includes('KH') || templateCode.includes('trong-truong') || !isMau1a;

  const outFileName = dossier.docxFileName || `${dossier.code}_${isMau1a ? 'Mau_1a_To_trinh' : 'Mau_2a_Ke_hoach'}.docx`;

  // === CÁCH 1: ƯU TIÊN NẠP VÀ MAPPING TRỰC TIẾP DỮ LIỆU MỚI NHẤT VÀO FILE MẪU CHUẨN GỐC ===
  try {
    const templateUrl = isMau1a ? '/templates/mau_1a_chuan.docx' : '/templates/mau_2a_chuan.docx';
    const resp = await fetch(templateUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });

      const renderData = buildDocxRenderData(dossier, isMau1a);
      doc.render(renderData);

      // Khóa phân trang & bảo vệ bảng chữ ký (an toàn)
      try {
        applyPaginationAndSignatureProtection(doc.getZip());
      } catch (xmlErr) {
        console.warn('[generateAndDownloadDocx] Bỏ qua hậu xử lý XML:', xmlErr);
      }

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      saveAs(blob, outFileName);
      return;
    }
  } catch (templateError) {
    console.warn('[generateAndDownloadDocx] Lỗi tải mẫu docx chuẩn, thử tải từ server:', templateError);
  }

  // === CÁCH 2: NẾU KHÔNG NẠP ĐƯỢC TEMPLATE TĨNH, TẢI TỪ FILE ĐÃ LƯU TRÊN MÁY CHỦ ===
  if (dossier.docx_file_url) {
    try {
      const serverResp = await fetch(dossier.docx_file_url);
      if (serverResp.ok) {
        const serverBlob = await serverResp.blob();
        if (serverBlob.size > 1000) {
          saveAs(serverBlob, outFileName);
          return;
        }
      }
    } catch (fetchErr) {
      console.warn('[generateAndDownloadDocx] Không tải được file docx từ server, chuyển sang bộ sinh programmatic:', fetchErr);
    }
  }

  // === CÁCH 2: FALLBACK PROGRAMMATIC DOCX NẾU KHÔNG CÓ KẾT NỐI TẢI TEMPLATE ===
  const contentParagraphs: (Paragraph | Table)[] = [];

  if (isMau1a) {
    // Header
    contentParagraphs.push(
      createDocHeader({
        docNumber: d.proposal_number || dossier.code,
        department: d.department || dossier.createdBy.department || 'KHOA / ĐƠN VỊ',
        dateStr: dossier.createdAt,
        isMinistry: false,
      }),
      new Paragraph({ text: '', spacing: { after: 180 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'TỜ TRÌNH',
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new TextRun({
            text: 'Về việc chuyển giao tri thức: từ kết quả đề tài nghiên cứu vào bài giảng,',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'giáo trình, tài liệu tập huấn giảng dạy',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: 'Kính gửi: ',
            font: 'Times New Roman',
            size: 24,
            bold: true,
            italics: true,
          }),
          new TextRun({
            text: 'Ban Giám Hiệu trường Đại học Y Dược Cần Thơ',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
      }),
      pFieldInline('Người trình', d.full_name || dossier.createdBy.name),
      pFieldInline('Đơn vị / Khoa', d.department || dossier.createdBy.department),
      pHeading('I. Mục đích'),
      pContent(d.purpose, 'Trình bày vắn tắt lý do cần thiết của chuyển giao sản phẩm'),
      pHeading('II. Nội dung chuyển giao bao gồm:'),
      pSubHeading('1. Nhu cầu cần sử dụng của đơn vị tiếp nhận chuyển giao:'),
      pContent(d.receiver_needs),
      pSubHeading('2. Đáp ứng thực hiện chuyển giao của cá nhân/ đơn vị có sản phẩm chuyển giao:'),
      pContent(d.provider_capacity),
      pSubHeading('3. Mục tiêu của chuyển giao:'),
      pContent(d.transfer_goals, 'Nhằm tăng cường sự hiểu biết...'),
      pSubHeading('4. Đối tượng chuyển giao:'),
      pContent(d.transfer_target, 'Kiến thức hoặc số liệu kết quả...'),
      pSubHeading('5. Phương thức chuyển giao:'),
      pContent(d.transfer_method, 'Là bài giảng có phần nội dung viết liên quan...'),
      pSubHeading('6. Hình thức chuyển giao:'),
      pContent(d.transfer_form || 'Chuyển giao công nghệ độc lập.'),
      pSubHeading('7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức:'),
      pContent(d.transfer_rights),
      pHeading('III. Thời gian chuyển giao: (dự kiến)'),
      pContent(d.transfer_time),
      pHeading('IV. Địa điểm chuyển giao:'),
      pContent(d.transfer_location),
      pHeading('V. Thành phần tham dự:'),
      pContent(d.attendees),
      pHeading('VI. Kinh phí tổ chức:'),
      pContent(d.funding_source || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'),
      new Paragraph({
        spacing: { before: 200, after: 100 },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: 'Kính mong Ban Giám Hiệu xem xét và phê duyệt.',
            font: 'Times New Roman',
            size: 24,
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'Trân trọng./.',
            font: 'Times New Roman',
            size: 24,
            italics: true,
          }),
        ],
      }),
      // Signature rows
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'TRƯỞNG ĐƠN VỊ', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 600 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: dossier.assignedManager?.name || '..................................', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'CÁ NHÂN / CHỦ NHIỆM ĐỀ TÀI', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 600 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: d.full_name || dossier.createdBy.name, font: 'Times New Roman', size: 24, bold: true })],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else if (isMau2a) {
    // Mau 2a
    contentParagraphs.push(
      createDocHeader({
        docNumber: d.plan_code || dossier.code,
        department: d.department || dossier.createdBy.department || 'KHOA / ĐƠN VỊ',
        dateStr: dossier.createdAt,
        isMinistry: true,
      }),
      new Paragraph({ text: '', spacing: { after: 180 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'KẾ HOẠCH',
            font: 'Times New Roman',
            size: 28,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: 'Về việc tổ chức chuyển giao công nghệ',
            font: 'Times New Roman',
            size: 24,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `“${d.product_name || 'Tên sản phẩm'}”`,
            font: 'Times New Roman',
            size: 24,
            bold: true,
            italics: true,
          }),
        ],
      }),
      pHeading('I. Mục đích'),
      pContent(d.purpose, 'Giới thiệu đôi nét về SPCGCN và mục đích chuyển giao...'),
      pHeading('II. Nhóm tác giả của sản phẩm chuyển giao'),
      pContent(d.authors_group, 'Danh sách các tác giả...'),
      pHeading('III. Loại hình sản phẩm chuyển giao công nghệ'),
      pContent(d.product_type),
      pHeading('IV. Phương thức chuyển giao'),
      pContent(d.transfer_method),
      pHeading('V. Bên nhận chuyển giao'),
      pContent(d.receiving_party),
      pHeading('VI. Thời gian, địa điểm chuyển giao'),
      pContent(`- Thời gian: ${d.transfer_date ? new Date(d.transfer_date).toLocaleDateString('vi-VN') : 'Theo kế hoạch'}`),
      pContent(`- Địa điểm: ${d.transfer_location || 'Tại Trường ĐH Y Dược Cần Thơ'}`),
      pHeading('VII. Chi phí chuyển giao'),
      pContent(
        d.transfer_cost !== undefined && d.transfer_cost !== null
          ? Number(d.transfer_cost) === 0
            ? 'Không thu phí (sử dụng kinh phí hoạt động của Nhà trường).'
            : `${Number(d.transfer_cost).toLocaleString('vi-VN')} VNĐ`
          : 'Theo thỏa thuận và quy chế chi tiêu nội bộ.'
      ),
      pHeading('VIII. Ban chỉ đạo – tổ chức chuyển giao'),
      pSubHeading('8.1. Ban chỉ đạo:'),
      pContent(d.steering_committee),
      pSubHeading('8.2. Ban tổ chức:'),
      pContent(d.organizing_committee),
      pSubHeading('8.3. Nhân sự thực hiện:'),
      pContent(d.implementing_staff),
      pHeading('IX. Hội thảo chuyển giao'),
      pSubHeading('9.1. Chủ tọa:'),
      pContent(d.workshop_chair || 'Đại diện Ban Giám Hiệu, Khoa'),
      pSubHeading('9.2. Báo cáo viên:'),
      pContent(d.workshop_speaker || 'Chủ nhiệm đề tài và các tác giả'),
      pSubHeading('9.5. Dự trù kinh phí hội thảo:'),
      pContent(d.workshop_budget || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'),
      pHeading('X. Quản lý rủi ro trong chuyển giao'),
      pContent(d.risk_management || 'Tuân thủ chặt chẽ quy định an toàn y sinh và sở hữu trí tuệ của Trường.'),
      new Paragraph({ text: '', spacing: { before: 200 } }),
      // Khối 1: Trưởng đơn vị nhận & giao
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'TRƯỞNG ĐƠN VỊ NHẬN', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 500 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: d.receiver_manager || d.truong_don_vi_nhan || '..................................', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'TRƯỞNG ĐƠN VỊ GIAO / CHỦ NHIỆM ĐỀ TÀI', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, ghi rõ họ tên)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 500 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: d.full_name || dossier.createdBy.name, font: 'Times New Roman', size: 24, bold: true })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: '', spacing: { before: 160 } }),
      // Khối 2: 3 Phòng ban
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'PHÒNG KH&CN', font: 'Times New Roman', size: 22, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký duyệt)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 400 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '..................................', font: 'Times New Roman', size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'PHÒNG TCKT', font: 'Times New Roman', size: 22, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký duyệt)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 400 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '..................................', font: 'Times New Roman', size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 34, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'VĂN PHÒNG', font: 'Times New Roman', size: 22, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký duyệt)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 400 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '..................................', font: 'Times New Roman', size: 20 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: '', spacing: { before: 160 } }),
      // Khối 3: Nơi nhận & Hiệu trưởng
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.NONE },
          insideVertical: { style: BorderStyle.NONE },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: 'Nơi nhận:', font: 'Times New Roman', size: 22, bold: true, italics: true })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: '- Ban Giám Hiệu (để b/c);', font: 'Times New Roman', size: 19 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: `- ${d.receiving_party || 'Bệnh viện Trường ĐH Y Dược Cần Thơ'};`, font: 'Times New Roman', size: 19 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: '- VP, TCKT;', font: 'Times New Roman', size: 19 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: '- TTDV&ĐTTNCXH;', font: 'Times New Roman', size: 19 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: '- Lưu: VT, KHCN.', font: 'Times New Roman', size: 19 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'HIỆU TRƯỞNG', font: 'Times New Roman', size: 24, bold: true })],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '(Ký, đóng dấu)', font: 'Times New Roman', size: 20, italics: true })],
                  }),
                  new Paragraph({ text: '', spacing: { before: 500 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '..................................', font: 'Times New Roman', size: 22 })],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else {
    // Generic
    contentParagraphs.push(
      createDocHeader({
        docNumber: dossier.code,
        department: dossier.createdBy.department || 'ĐƠN VỊ CÔNG TÁC',
        dateStr: dossier.createdAt,
        isMinistry: true,
      }),
      new Paragraph({ text: '', spacing: { after: 180 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: (template?.title || dossier.title || 'VĂN BẢN ĐỀ NGHỊ').toUpperCase(),
            font: 'Times New Roman',
            size: 28,
            bold: true,
          }),
        ],
      }),
      ...buildDocxFields(dossier, template)
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              bottom: 1134, // ~2cm
              left: 1417, // ~2.5cm
              right: 1134, // ~2cm
            },
          },
        },
        children: contentParagraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, outFileName);
}

function buildDocxFields(dossier: Dossier, template?: WordTemplate): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const data = dossier.formData || {};

  if (template && template.fields) {
    for (const field of template.fields) {
      const fieldKey = field.name || field.key || field.id;
      const val = data[fieldKey];
      let displayVal = '....................................................................';

      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
          displayVal = val.join(', ');
        } else if (field.type === 'number') {
          displayVal = Number(val).toLocaleString('vi-VN');
        } else {
          displayVal = String(val);
        }
      }

      paragraphs.push(
        new Paragraph({
          spacing: { line: 320, after: 120 },
          children: [
            new TextRun({
              text: `- ${field.label}: `,
              font: 'Times New Roman',
              size: 24,
              bold: true,
            }),
            new TextRun({
              text: displayVal,
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        })
      );
    }
  } else {
    Object.entries(data).forEach(([key, val]) => {
      paragraphs.push(
        new Paragraph({
          spacing: { line: 320, after: 120 },
          children: [
            new TextRun({
              text: `- ${key}: `,
              font: 'Times New Roman',
              size: 24,
              bold: true,
            }),
            new TextRun({
              text: String(val || ''),
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        })
      );
    });
  }

  return paragraphs;
}
