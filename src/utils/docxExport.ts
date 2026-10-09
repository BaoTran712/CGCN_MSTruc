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

export async function generateAndDownloadDocx(rawDossier: Dossier, rawTemplate?: WordTemplate): Promise<void> {
  const dossier = normalizeNFC(rawDossier);
  const template = rawTemplate ? normalizeNFC(rawTemplate) : undefined;
  const d = dossier.formData || {};
  const templateCode = template?.code || dossier.templateId || '';
  const isMau1a = templateCode.includes('1a') || templateCode.includes('TTR') || templateCode.includes('tri-thuc');
  const isMau2a = templateCode.includes('2a') || templateCode.includes('KH') || templateCode.includes('trong-truong');

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
      pContent(d.steering_committee),
      pHeading('IX. Hội thảo chuyển giao'),
      pContent(d.workshop_program),
      pHeading('X. Quản lý rủi ro trong chuyển giao'),
      pContent(d.risk_management)
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
            text: (template?.name || dossier.title || 'VĂN BẢN ĐỀ NGHỊ').toUpperCase(),
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
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = dossier.docxFileName || `${dossier.code}_bieu_mau.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
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
