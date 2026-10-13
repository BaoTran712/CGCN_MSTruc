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
 * Xây dựng tập hợp biến mapping cho Docxtemplater
 */
function buildDocxRenderData(dossier: Dossier, isMau1a: boolean): Record<string, any> {
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
      muc_dich: d.purpose || '',
      nhu_cau_tiep_nhan: d.receiver_needs || '',
      dap_ung_thuc_hien: d.provider_capacity || '',
      muc_tieu: d.transfer_goals || '',
      doi_tuong: d.transfer_target || '',
      phuong_thuc: d.transfer_method || '',
      hinh_thuc: d.transfer_form || 'Chuyển giao công nghệ độc lập.',
      quyen_chuyen_giao: d.transfer_rights || '',
      thoi_gian: d.transfer_time || '',
      dia_diem: d.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
      thanh_phan: d.attendees || '',
      kinh_phi: d.funding_source || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',
      truong_don_vi: dossier.assignedManager?.name || 'Trưởng Đơn vị',
      ...d,
    };
  }

  // Mau 2a
  return {
    so_ke_hoach: d.plan_code || `${dossier.code}/KH`,
    don_vi_viet_tat: dept.split(' ').map((w: string) => w[0]).join('').toUpperCase() || 'ĐV',
    ngay: day,
    thang: month,
    nam: year,
    ten_san_pham: d.product_name || d.research_title || 'Sản phẩm chuyển giao công nghệ',
    ho_ten: fullName,
    dien_thoai: d.phone || '',
    email: d.email || '',
    muc_dich: d.purpose || '',
    nhom_tac_gia: d.authors_group || fullName,
    loai_hinh_san_pham: d.product_type || 'Hệ thống phần mềm ứng dụng y tế',
    phuong_thuc: d.transfer_method || '',
    ben_nhan_chuyen_giao: d.receiving_party || 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
    thoi_gian: d.transfer_date ? new Date(d.transfer_date).toLocaleDateString('vi-VN') : (d.transfer_time || ''),
    dia_diem: d.transfer_location || 'Tại Trường Đại học Y Dược Cần Thơ',
    chi_phi: d.transfer_cost !== undefined && d.transfer_cost !== null
      ? Number(d.transfer_cost) === 0
        ? 'Không thu phí (kinh phí hoạt động Nhà trường)'
        : `${Number(d.transfer_cost).toLocaleString('vi-VN')} VNĐ`
      : 'Theo thỏa thuận',
    ban_chi_dao: d.steering_committee || '',
    ban_to_chuc: d.organizing_committee || '',
    nhan_su: d.implementing_staff || '',
    chu_toa: d.workshop_chair || '',
    bao_cao_vien: d.workshop_speaker || '',
    kinh_phi_hoi_thao: d.workshop_budget || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.',
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
  const isMau2a = templateCode.includes('2a') || templateCode.includes('KH') || templateCode.includes('trong-truong');

  const outFileName = dossier.docxFileName || `${dossier.code}_${isMau1a ? 'Mau_1a_To_trinh' : 'Mau_2a_Ke_hoach'}.docx`;

  // === CÁCH 1: NẠP VÀ MAPPING TRỰC TIẾP VÀO FILE MẪU CHUẨN GỐC ===
  try {
    const templateUrl = isMau1a ? '/templates/mau_1a_chuan.docx' : '/templates/mau_2a_chuan.docx';
    const resp = await fetch(templateUrl);
    if (resp.ok) {
      const buffer = await resp.arrayBuffer();
      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => '',
      });

      const renderData = buildDocxRenderData(dossier, isMau1a);
      doc.render(renderData);

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      saveAs(blob, outFileName);
      return;
    }
  } catch (templateError) {
    console.warn('[generateAndDownloadDocx] Lỗi tải mẫu docx chuẩn, chuyển sang bộ sinh programmatic:', templateError);
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
      pContent(d.risk_management || 'Tuân thủ chặt chẽ quy định an toàn y sinh và sở hữu trí tuệ của Trường.')
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
