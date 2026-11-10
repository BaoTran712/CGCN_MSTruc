import React, { useState } from 'react';
import { Download, Printer, ZoomIn, ZoomOut, FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Dossier, WordTemplate } from '../../types';
import { generateAndDownloadDocx, formatAuthorsGroupText } from '../../utils/docxExport';
import { generateAndDownloadPdf } from '../../utils/pdfExport';
import { normalizeNFC } from '../../utils/textUtils';
import { isMau2aTemplateOrDossier, getEffectiveTemplate } from '../../utils/templateUtils';
import { getAbbrFromDepartment } from '../common/DocumentNumberInput';

interface WordDocumentPreviewProps {
  dossier: Dossier;
  template?: WordTemplate;
  onPrint?: () => void;
  showToolbar?: boolean;
  className?: string;
}

function parseDate(iso?: string): { day: string; month: string; year: string } {
  const d = iso ? new Date(iso) : new Date();
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: (d.getMonth() + 1).toString().padStart(2, '0'),
    year: d.getFullYear().toString(),
  };
}

const VNDocHeader: React.FC<{
  docNumber: string;
  unitLabel?: string;
  dateStr?: string;
  isMinistry?: boolean;
}> = ({ docNumber, unitLabel, dateStr, isMinistry = true }) => {
  const { day, month, year } = parseDate(dateStr);
  return (
    <div className="grid grid-cols-12 gap-2 items-start mb-6 text-center leading-snug text-black">
      {/* Cột trái: Tên cơ quan chủ quản & cơ quan ban hành theo Phụ lục I Nghị định 30/2020/NĐ-CP */}
      <div className="col-span-5 flex flex-col items-center">
        {isMinistry ? (
          <>
            <div className="text-[12px] font-normal uppercase whitespace-nowrap">
              BỘ Y TẾ
            </div>
            <div className="inline-flex flex-col items-center">
              <div className="text-[12px] font-bold uppercase whitespace-nowrap">
                TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
              </div>
              <div className="w-2/5 h-[1px] bg-black mt-0.5 mb-1.5" />
            </div>
          </>
        ) : (
          <>
            <div className="text-[12px] font-normal uppercase whitespace-nowrap">
              TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
            </div>
            <div className="inline-flex flex-col items-center">
              <div className="text-[12px] font-bold uppercase whitespace-nowrap">
                {normalizeNFC(unitLabel || 'KHOA / ĐƠN VỊ')}
              </div>
              <div className="w-2/5 h-[1px] bg-black mt-0.5 mb-1.5" />
            </div>
          </>
        )}
        <div className="text-[12.5px] text-black whitespace-nowrap">
          Số: {normalizeNFC(docNumber || '....... /TTr-ĐV')}
        </div>
      </div>

      {/* Cột phải: Quốc hiệu, Tiêu ngữ & Địa danh ngày tháng theo Nghị định 30/2020/NĐ-CP */}
      <div className="col-span-7 flex flex-col items-center">
        <div className="text-[12px] font-bold uppercase tracking-tight whitespace-nowrap">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div className="inline-flex flex-col items-center">
          <div className="text-[13.5px] font-bold whitespace-nowrap">
            Độc lập – Tự do – Hạnh phúc
          </div>
          <div className="w-full h-[1px] bg-black mt-0.5 mb-1.5" />
        </div>
        <div className="text-[13px] italic text-black whitespace-nowrap">
          Cần Thơ, ngày {day} tháng {month} năm {year}
        </div>
      </div>
    </div>
  );
};

const SH: React.FC<{ children: React.ReactNode; mt?: number }> = ({ children, mt = 14 }) => (
  <div style={{ marginTop: mt }} className="font-bold text-[14px] text-gray-950 mb-1">
    {typeof children === 'string' ? normalizeNFC(children) : children}
  </div>
);

const CP: React.FC<{ hint?: string; value?: string | number }> = ({ hint, value }) => (
  <div className="text-[13.5px] text-gray-800 mb-2 leading-relaxed text-justify">
    {value !== undefined && value !== '' && value !== null ? (
      <span className="font-normal">{normalizeNFC(String(value))}</span>
    ) : hint ? (
      <span className="text-gray-400 italic">({normalizeNFC(hint)})</span>
    ) : (
      <span className="text-gray-300 italic">....................................................................................................</span>
    )}
  </div>
);

const IL: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <div className="flex items-baseline gap-2 mb-1.5 text-[13.5px]">
    <span className="font-bold whitespace-nowrap text-gray-900">{normalizeNFC(label)}:</span>
    <span className="flex-1 border-b border-dotted border-gray-400 pb-0.5 text-gray-800 min-h-[20px]">
      {value !== undefined && value !== '' && value !== null ? normalizeNFC(String(value)) : ''}
    </span>
  </div>
);

const TextBlock: React.FC<{ value?: string; hint?: string }> = ({ value, hint }) => (
  value ? (
    <div className="text-[13.5px] text-gray-800 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-gray-200 mb-2 text-justify">
      {normalizeNFC(value)}
    </div>
  ) : (
    <div className="text-[13.5px] italic text-gray-400 pl-3 mb-2">
      ({normalizeNFC(hint || 'Chưa có nội dung...')})
    </div>
  )
);

const SigBlock: React.FC<{
  title: string;
  hint: string;
  name?: string;
  isApproved?: boolean;
  approverName?: string;
  approvedAt?: string;
  isForSig?: boolean;
}> = ({ title, hint, name }) => {
  const cleanName =
    name && name.trim() !== 'PGS.TS. Nguyễn Văn A' && name.trim() !== 'Phòng KH&CN'
      ? name.trim()
      : '';
  return (
    <div className="text-center flex-1 px-2">
      <div className="font-bold uppercase text-[12.5px] text-gray-900">{normalizeNFC(title)}</div>
      <div className="italic text-[11.5px] text-gray-600 mb-2">{normalizeNFC(hint)}</div>
      <div className="h-20 flex items-center justify-center">
        <span className="text-gray-300 italic text-[12px]">Ký và ghi rõ họ tên</span>
      </div>
      <div className="font-bold text-[13.5px] text-gray-900">
        {cleanName ? normalizeNFC(cleanName) : '...................................................'}
      </div>
    </div>
  );
};

/* ── Bảng chữ ký động phòng ban & BGH (Dynamic Signature Block) theo Nghị định 30 ── */
const DynamicSignatureBlock: React.FC<{ dossier: Dossier; is2a?: boolean }> = ({ dossier, is2a }) => {
  const d = dossier.formData || {};

  const sigConfig = dossier.signature_config || dossier.signatureConfig;
  const depts: string[] = sigConfig?.departments ?? ['Phòng KH&CN', 'Phòng TCKT'];
  const rectorRole: string = sigConfig?.rectorRole || 'HIỆU TRƯỞNG';
  const rectorSignerName: string = sigConfig?.rectorSignerName || '';

  const unitAbbr = getAbbrFromDepartment(d.department || dossier.createdBy?.department);
  const defaultRecipients = [
    `- Như kính gửi (${unitAbbr});`,
    ...(depts.includes('Phòng TCKT') ? ['- TCKT;'] : []),
    '- TTDV&ĐTTNCXH;',
    '- Lưu: VT, KHCN.',
  ];
  const recipients: string[] = sigConfig?.recipients && sigConfig.recipients.length > 0
    ? sigConfig.recipients.map((r) => r.trim().startsWith('-') ? r.trim() : `- ${r.trim()};`)
    : defaultRecipients;

  const deptPairs: { col1: string; col2?: string }[] = [];
  for (let i = 0; i < depts.length; i += 2) {
    deptPairs.push({
      col1: depts[i],
      col2: depts[i + 1],
    });
  }

  const rawTruongDonVi = d.truong_don_vi || '';
  const truongDonViName =
    rawTruongDonVi.trim() === 'PGS.TS. Nguyễn Văn A' ? '' : rawTruongDonVi.trim();
  const chuNhiemName = d.full_name || dossier.createdBy?.name || '';
  const receiverManagerName = d.receiver_manager || d.truong_don_vi_nhan || '';

  return (
    <div className="mt-8 pt-4">
      {/* BẢNG 1: Khối chữ ký Đơn vị, Cá nhân và Các Phòng ban chức năng (Bố cục 3 cột) */}
      <table className="w-full border-collapse border-0 text-center mb-6">
        <tbody>
          {/* Hàng 1: Đơn vị & Chủ nhiệm đề tài */}
          <tr>
            <td className="w-[45%] align-top text-center">
              <SigBlock
                title={is2a ? (receiverManagerName ? 'Trưởng đơn vị nhận' : 'Trưởng đơn vị') : 'Trưởng đơn vị'}
                hint="(Ký và ghi rõ họ tên)"
                name={is2a && receiverManagerName ? receiverManagerName : truongDonViName}
              />
            </td>
            <td className="w-[10%]"></td>
            <td className="w-[45%] align-top text-center">
              <SigBlock
                title={is2a ? 'Trưởng đơn vị giao/Chủ nhiệm đề tài' : 'Cá nhân/Chủ nhiệm đề tài'}
                hint="(Ký và ghi rõ họ tên)"
                name={chuNhiemName}
              />
            </td>
          </tr>

          {/* Hàng tiêu đề 2 (Động): Các phòng ban chức năng */}
          {deptPairs.map((pair, pIdx) => (
            <tr key={pIdx}>
              <td className="w-[45%] align-top text-center pt-6">
                <SigBlock title={pair.col1} hint="(Ký và ghi rõ họ tên)" />
              </td>
              <td className="w-[10%]"></td>
              <td className="w-[45%] align-top text-center pt-6">
                {pair.col2 ? (
                  <SigBlock title={pair.col2} hint="(Ký và ghi rõ họ tên)" />
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BẢNG 2: Khối Nơi nhận và Chữ ký Ban Giám hiệu (Bố cục 4 cột) */}
      <div className="flex justify-between items-start mt-8 pt-4 border-t border-gray-100">
        {/* Cột 1: Nơi nhận */}
        <div className="text-[12px] text-gray-800 leading-snug">
          <div className="font-bold italic text-[12px]">Nơi nhận:</div>
          {recipients.map((rec, rIdx) => (
            <div key={rIdx} className="text-[11px]">{rec}</div>
          ))}
        </div>

        {/* Cột 3: Chức danh Ban Giám hiệu */}
        <div className="text-center pr-12">
          {rectorRole.includes('KT.') || rectorRole.includes('PHÓ HIỆU TRƯỞNG') ? (
            <>
              <div className="font-bold uppercase text-[12.5px]">KT. HIỆU TRƯỞNG</div>
              <div className="font-bold uppercase text-[12.5px]">PHÓ HIỆU TRƯỞNG</div>
            </>
          ) : (
            <div className="font-bold uppercase text-[13px]">{rectorRole}</div>
          )}
          <div className="h-16" />
          <div className="font-bold text-[13.5px]">
            {rectorSignerName || '...................................................'}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Mẫu 1a-TT.CGCN: Tờ trình chuyển giao tri thức ── */
const Mau1aTTCGCN: React.FC<{ dossier: Dossier }> = ({ dossier: rawDossier }) => {
  const dossier = normalizeNFC(rawDossier);
  const d = dossier.formData || {};
  const approved = ['APPROVED', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);
  const forSig = ['USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);

  return (
    <div className="font-document leading-normal text-black text-[13.5px]">
      <VNDocHeader
        docNumber={`      /TTr-${getAbbrFromDepartment(d.department || dossier.createdBy?.department)}`}
        unitLabel={d.department || dossier.createdBy.department || 'KHOA / ĐƠN VỊ'}
        dateStr={dossier.createdAt}
        isMinistry={false}
      />

      <div className="text-center my-5">
        <div className="font-bold text-[15px] uppercase tracking-wide">TỜ TRÌNH</div>
        <div className="text-[13.5px] font-semibold mt-1">
          Về việc chuyển giao tri thức: từ kết quả đề tài nghiên cứu{' '}
          <span className="font-bold">
            {d.ten_de_tai || d.research_title || '...................................................'}
          </span>{' '}
          vào bài giảng – giáo trình, tài liệu tập huấn giảng dạy
        </div>
      </div>

      <div className="mb-4 text-center">
        <span className="italic font-bold">Kính gửi: </span>
        <span className="font-bold">Ban Giám Hiệu trường Đại học Y Dược Cần Thơ</span>
      </div>

      <IL label="Người trình" value={d.full_name || dossier.createdBy.name} />
      <IL label="Đơn vị / Khoa" value={d.department || dossier.createdBy.department} />

      <SH mt={16}>I. Mục đích</SH>
      <CP
        hint="Trình bày vắn tắt lý do cần thiết của chuyển giao sản phẩm từ kết quả đề tài NCKH..."
        value={d.purpose}
      />

      <SH>II. Nội dung chuyển giao bao gồm:</SH>

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        1. Nhu cầu cần sử dụng của đơn vị tiếp nhận chuyển giao:
      </div>
      <CP
        hint="Bao gồm thông tin về các bộ môn cần áp dụng kết quả nghiên cứu vào giảng dạy..."
        value={d.receiver_needs}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        2. Đáp ứng thực hiện chuyển giao của cá nhân/ đơn vị có sản phẩm chuyển giao:
      </div>
      <CP
        hint="Tóm tắt về năng lực, sản phẩm cụ thể và tài liệu chuyển giao..."
        value={d.provider_capacity}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        3. Mục tiêu của chuyển giao:
      </div>
      <CP
        hint="Nhằm tăng cường sự hiểu biết, tính ứng dụng thực tiễn trong công tác đào tạo..."
        value={d.transfer_goals}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        4. Đối tượng chuyển giao:
      </div>
      <CP
        hint="Kiến thức hoặc số liệu kết quả của đề tài nghiên cứu phát hiện được..."
        value={d.transfer_target}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        5. Phương thức chuyển giao:
      </div>
      <CP
        hint="Là bài giảng có phần nội dung viết liên quan đến sử dụng kết quả đề tài nghiên cứu..."
        value={d.transfer_method}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        6. Hình thức chuyển giao:
      </div>
      <CP
        hint="Chuyển giao công nghệ độc lập / phối hợp..."
        value={d.transfer_form || 'Chuyển giao công nghệ độc lập.'}
      />

      <div className="font-semibold text-[13.5px] mt-2 mb-1">
        7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức:
      </div>
      <CP
        hint="Chuyển giao quyền sử dụng có độc quyền, hoặc không độc quyền, hoặc quyền sở hữu đối với tri thức đó..."
        value={d.transfer_rights}
      />

      <SH>III. Thời gian chuyển giao: (dự kiến)</SH>
      <CP hint="Thời gian dự kiến thực hiện..." value={d.transfer_time} />

      <SH>IV. Địa điểm chuyển giao:</SH>
      <CP hint="Tại đơn vị..." value={d.transfer_location} />

      <SH>V. Thành phần tham dự:</SH>
      <CP hint="Giảng viên các bộ môn, sinh viên, học viên sau đại học..." value={d.attendees} />

      <SH>VI. Kinh phí tổ chức:</SH>
      <CP
        hint="Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ hoặc theo thỏa thuận hợp đồng nếu có..."
        value={d.funding_source || 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.'}
      />

      <div className="mt-4 text-[13.5px] italic text-justify leading-relaxed">
        Kính mong Ban Giám Hiệu xem xét và phê duyệt.
      </div>
      <div className="text-[13.5px] italic text-justify leading-relaxed mb-4">
        Trân trọng./.
      </div>

      {/* Khối chữ ký động (Dynamic Signature Block) */}
      <DynamicSignatureBlock dossier={dossier} is2a={false} />
    </div>
  );
};

/* ── Mẫu 2a-KH.CGCN: Kế hoạch tổ chức chuyển giao công nghệ Trong trường ── */
const Mau2aKHCGCN: React.FC<{ dossier: Dossier }> = ({ dossier: rawDossier }) => {
  const dossier = normalizeNFC(rawDossier);
  const d =
    dossier.formData2a && Object.keys(dossier.formData2a).length > 0
      ? { ...dossier.formData, ...dossier.formData2a }
      : dossier.formData || {};
  const approved = ['APPROVED', 'VALIDATED', 'USER_SIGNED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE', 'SECRETARY_RECEIVED', 'COMPLETED', 'SIGNED', 'SIGNED_ARCHIVED'].includes(dossier.status);
  const forSig = ['USER_SIGNED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE', 'SECRETARY_RECEIVED', 'COMPLETED', 'SIGNED', 'SIGNED_ARCHIVED'].includes(dossier.status);
  const unitAbbr = getAbbrFromDepartment(d.department || dossier.createdBy?.department);

  // Xử lý 6.1 Thời gian chuyển giao an toàn (không bị NaN khi chuỗi là khoảng thời gian)
  const rawTime = d.transfer_date || d.transfer_time || d.thoi_gian || '';
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(String(rawTime).trim());
  const formattedTime = isIsoDate
    ? (() => {
        const dt = new Date(rawTime);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `Ngày ${dd} tháng ${mm} năm ${yyyy}`;
      })()
    : String(rawTime).trim() || 'Từ tháng 10/2026 đến tháng 12/2026';

  // Tách danh sách nhân sự thành các dòng rõ ràng cho 8.1, 8.2, 8.3
  const parseLines = (val: any, fallback: string[]): string[] => {
    if (!val) return fallback;
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    const lines = String(val)
      .split(/[\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.length > 0 ? lines : fallback;
  };

  const steeringList = parseLines(d.steering_committee || d.ban_chi_dao, [
    '1. Đại diện Ban Giám Hiệu - Trưởng ban',
    '2. Trưởng Phòng KH&CN - Phó Trưởng ban',
  ]);
  const orgList = parseLines(d.organizing_committee || d.ban_to_chuc, [
    '1. Trưởng Khoa / Đơn vị - Trưởng ban',
    '2. Đại diện Bên nhận chuyển giao - Đồng Trưởng ban',
  ]);
  const staffList = parseLines(d.implementing_staff || d.nhan_su, [
    '1. Chủ nhiệm đề tài - Phụ trách chung',
    '2. Nhóm tác giả và chuyên viên kỹ thuật - Thực hiện chuyển giao',
  ]);

  // Kiểm tra có tổ chức hội thảo chuyển giao (Mục IX & Quản lý rủi ro Mục X) không
  const hasWorkshop =
    d.co_hoi_thao !== undefined
      ? Boolean(d.co_hoi_thao && d.co_hoi_thao !== 'Không tổ chức hội thảo (ẩn Mục IX)' && d.co_hoi_thao !== 'false')
      : d.has_hoi_thao !== undefined
        ? Boolean(d.has_hoi_thao && d.has_hoi_thao !== 'false')
        : d.has_workshop !== undefined
          ? Boolean(d.has_workshop && d.has_workshop !== 'false')
          : Boolean(d.workshop_chair || d.workshop_speaker || d.workshop_program || d.workshop_budget || d.chu_toa || d.bao_cao_vien);

  const chairList = parseLines(d.workshop_chair || d.chu_toa, [
    '1. Đại diện Ban Giám Hiệu - Chủ tọa',
    '2. Đại diện Ban Chủ nhiệm Khoa - Đồng Chủ tọa',
  ]);
  const speakerList = parseLines(d.workshop_speaker || d.bao_cao_vien, [
    '1. Chủ nhiệm đề tài - Báo cáo viên chính',
    '2. Thành viên nhóm nghiên cứu - Báo cáo viên lâm sàng',
  ]);

  const toTwoColPairs = (lines: string[]) =>
    lines.map((line, idx) => {
      const stt = idx + 1;
      const clean = line.replace(/^\d+\.\s*/, '').trim();
      const match = clean.match(/^(.*?)(?:\s+[-–|]\s+|\s*:\s+)(.+)$/);
      if (match) {
        return { col1: `${stt}. ${match[1].trim()}`, col2: match[2].trim() };
      }
      let role = '';
      if (/Ban Giám Hiệu/i.test(clean)) role = 'Chủ tọa';
      else if (/Ban Chủ nhiệm Khoa|Trưởng Khoa|Lãnh đạo Khoa/i.test(clean)) role = 'Đồng Chủ tọa';
      else if (/Chủ nhiệm đề tài/i.test(clean)) role = 'Báo cáo viên chính';
      else if (/Báo cáo viên/i.test(clean)) role = 'Báo cáo viên';
      return { col1: `${stt}. ${clean}`, col2: role };
    });

  const parseOneScheduleRow = (rawItem: any) => {
    if (rawItem && typeof rawItem === 'object') {
      const tg = String(rawItem.thoi_gian || rawItem.time || '').trim();
      const nd = String(rawItem.noi_dung || rawItem.content || '').trim();
      const tp = String(rawItem.thanh_phan || rawItem.attendees || '').trim();
      if (tg) return { thoi_gian: tg, noi_dung: nd, thanh_phan: tp || 'Ban Tổ chức và đại biểu' };
      return parseOneScheduleRow(nd);
    }
    const line = String(rawItem || '').trim();
    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim());
      return { thoi_gian: parts[0] || '', noi_dung: parts[1] || '', thanh_phan: parts[2] || 'Toàn thể đại biểu' };
    }
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx <= 25) {
      return {
        thoi_gian: line.slice(0, colonIdx).trim(),
        noi_dung: line.slice(colonIdx + 1).trim(),
        thanh_phan: 'Ban Tổ chức và đại biểu',
      };
    }
    return { thoi_gian: 'Theo chương trình', noi_dung: line, thanh_phan: 'Ban Tổ chức và đại biểu' };
  };

  const scheduleRows = (() => {
    if (Array.isArray(d.ds_chuong_trinh_hoi_thao) && d.ds_chuong_trinh_hoi_thao.length > 0) {
      return d.ds_chuong_trinh_hoi_thao.map(parseOneScheduleRow);
    }
    const lines = parseLines(d.workshop_program, [
      '08h00 - 08h30 | Đón tiếp đại biểu, tuyên bố lý do, khai mạc | Ban Tổ chức và đại biểu',
      '08h30 - 10h00 | Báo cáo chuyên đề và hướng dẫn quy trình kỹ thuật | Nhóm tác giả đề tài',
      '10h00 - 11h00 | Thảo luận, thực hành và ký biên bản bàn giao | Toàn thể đại biểu',
    ]);
    return lines.map(parseOneScheduleRow);
  })();

  const parseOneTaskRow = (rawItem: any, idx: number) => {
    if (rawItem && typeof rawItem === 'object') {
      const nd = String(rawItem.noi_dung || rawItem.task || '').trim();
      const pt = String(rawItem.phu_trach || rawItem.person || '').trim();
      if (pt) return { stt: idx + 1, noi_dung: nd.replace(/^\d+\.\s*/, ''), phu_trach: pt };
      return parseOneTaskRow(nd, idx);
    }
    const line = String(rawItem || '').replace(/^\d+\.\s*/, '').trim();
    if (line.includes('|')) {
      const parts = line.split('|').map((s) => s.trim());
      return { stt: idx + 1, noi_dung: parts[0] || '', phu_trach: parts[1] || 'Ban Tổ chức' };
    }
    const dashMatch = line.match(/^(.*?)\s+[-–]\s+(.+)$/);
    if (dashMatch) {
      return { stt: idx + 1, noi_dung: dashMatch[1].trim(), phu_trach: dashMatch[2].trim() };
    }
    return { stt: idx + 1, noi_dung: line, phu_trach: 'Nhóm tác giả & Ban Tổ chức' };
  };

  const taskRows = (() => {
    if (Array.isArray(d.ds_phan_cong_hoi_thao) && d.ds_phan_cong_hoi_thao.length > 0) {
      return d.ds_phan_cong_hoi_thao.map((item: any, idx: number) => parseOneTaskRow(item, idx));
    }
    const lines = parseLines(d.workshop_assignments, [
      'Chuẩn bị nội dung báo cáo và bộ tài liệu hướng dẫn kỹ thuật | Nhóm tác giả đề tài',
      'Công tác hậu cần, hội trường và danh sách đại biểu | Đơn vị tiếp nhận & Ban Tổ chức',
    ]);
    return lines.map((line, idx) => parseOneTaskRow(line, idx));
  })();

  return (
    <div className="font-document leading-relaxed text-black text-[13.5px]">
      <VNDocHeader
        docNumber={`           /KH-${unitAbbr}`}
        unitLabel={d.department || dossier.createdBy?.department || 'Khoa/Đơn vị'}
        dateStr={dossier.createdAt}
        isMinistry={true}
      />

      <div className="text-center my-5">
        <div className="font-bold text-[15px] uppercase tracking-wide text-black">KẾ HOẠCH</div>
        <div className="text-[14px] font-bold mt-1 text-black">Về việc tổ chức chuyển giao công nghệ</div>
        <div className="inline-flex flex-col items-center">
          <div className="text-[14px] font-bold mt-0.5 text-black">
            “{d.product_name || 'Tên sản phẩm chuyển giao'}”
          </div>
          <div className="w-28 h-[1px] bg-black mt-1.5" />
        </div>
      </div>

      <SH mt={16}>I. Mục đích</SH>
      {d.purpose ? (
        <TextBlock value={d.purpose} />
      ) : (
        <CP hint="Giới thiệu đôi nét về sản phẩm chuyển giao công nghệ và mục đích của việc tổ chức chuyển giao" />
      )}

      <SH>II. Nhóm tác giả của sản phẩm chuyển giao</SH>
      <TextBlock
        value={formatAuthorsGroupText(d.ds_nhom_tac_gia ?? d.authors_group ?? d.nhom_tac_gia)}
        hint="1. Họ và tên – Chức vụ/Đơn vị – Vai trò thực hiện;"
      />

      <SH>III. Loại hình sản phẩm chuyển giao công nghệ</SH>
      <CP
        hint="Bản quyền phần mềm / Quy trình kỹ thuật / Thiết bị y tế / Tri thức chuyên môn..."
        value={d.product_type}
      />

      <SH>IV. Phương thức chuyển giao</SH>
      <CP
        hint="Tập huấn trực tiếp & Bàn giao tài liệu / Hội thảo khoa học & Đào tạo thực hành..."
        value={d.transfer_method}
      />

      <SH>V. Bên nhận chuyển giao</SH>
      <div className="text-[13.5px] mb-2 text-black text-justify indent-7">
        {d.receiving_party ||
          'Bệnh viện Trường Đại học Y Dược Cần Thơ (đầu mối: Phòng Kế hoạch tổng hợp) – theo Phiếu đề xuất nhu cầu tiếp nhận chuyển giao công nghệ; người đại diện BS.CKII. Lại Văn Nông.'}
      </div>

      <SH>VI. Thời gian, địa điểm chuyển giao</SH>
      <div className="text-[13.5px] mb-1 text-black text-justify">
        <span className="font-bold">6.1. Thời gian: </span>
        <span>{formattedTime}</span>
      </div>
      <div className="text-[13.5px] mb-2 text-black text-justify">
        <span className="font-bold">6.2. Địa điểm: </span>
        <span>
          {d.transfer_location ||
            'Hội trường Trung tâm, Trường Đại học Y Dược Cần Thơ, số 179 đường Nguyễn Văn Cừ, phường An Khánh, quận Ninh Kiều, thành phố Cần Thơ.'}
        </span>
      </div>

      <SH>VII. Chi phí chuyển giao</SH>
      <div className="text-[13.5px] mb-2 text-black text-justify indent-7">
        {d.transfer_cost !== undefined && d.transfer_cost !== null && String(d.transfer_cost).trim() !== '' ? (
          /^(0|không thu phí)/i.test(String(d.transfer_cost).trim()) ? (
            "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường."
          ) : /^\d+$/.test(String(d.transfer_cost).trim()) ? (
            `${Number(d.transfer_cost).toLocaleString('vi-VN')} đồng. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.`
          ) : (
            String(d.transfer_cost)
          )
        ) : (
          "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường."
        )}
      </div>

      <SH>VIII. Ban chỉ đạo – tổ chức chuyển giao</SH>
      <div className="space-y-2 text-[13.5px] text-black mb-2">
        <div>
          <div className="font-bold">8.1. Ban chỉ đạo</div>
          <div className="space-y-1 pl-2 mt-0.5">
            {toTwoColPairs(steeringList).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-4">
                <div>{row.col1}</div>
                <div>{row.col2}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-bold">8.2. Ban tổ chức</div>
          <div className="space-y-1 pl-2 mt-0.5">
            {toTwoColPairs(orgList).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-4">
                <div>{row.col1}</div>
                <div>{row.col2}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-bold">8.3. Nhân sự thực hiện</div>
          <div className="space-y-1 pl-2 mt-0.5">
            {toTwoColPairs(staffList).map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-x-4">
                <div>{row.col1}</div>
                <div>{row.col2}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {hasWorkshop && (
        <>
          <SH>IX. Hội thảo chuyển giao</SH>
          <div className="space-y-2.5 text-[13.5px] text-black mb-2">
            <div>
              <div className="font-bold">9.1. Chủ tọa</div>
              <div className="space-y-1 pl-2 mt-0.5">
                {toTwoColPairs(chairList).map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-x-4">
                    <div>{row.col1}</div>
                    <div>{row.col2}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-bold">9.2. Báo cáo viên</div>
              <div className="space-y-1 pl-2 mt-0.5">
                {toTwoColPairs(speakerList).map((row, i) => (
                  <div key={i} className="grid grid-cols-2 gap-x-4">
                    <div>{row.col1}</div>
                    <div>{row.col2}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="font-bold mb-1">9.3. Chương trình chi tiết của hội thảo</div>
              <table className="w-full border-collapse border border-black text-[12.5px] my-1">
                <thead>
                  <tr className="bg-slate-50 font-bold text-center">
                    <th className="border border-black p-1.5 w-32">Thời gian</th>
                    <th className="border border-black p-1.5">Nội dung</th>
                    <th className="border border-black p-1.5 w-40">Thành phần</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black p-1.5 text-center">{r.thoi_gian}</td>
                      <td className="border border-black p-1.5 text-left">{r.noi_dung}</td>
                      <td className="border border-black p-1.5 text-center">{r.thanh_phan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="font-bold mb-1">9.4. Phân công nhiệm vụ tổ chức</div>
              <table className="w-full border-collapse border border-black text-[12.5px] my-1">
                <thead>
                  <tr className="bg-slate-50 font-bold text-center">
                    <th className="border border-black p-1.5 w-12">STT</th>
                    <th className="border border-black p-1.5">Nội dung công việc</th>
                    <th className="border border-black p-1.5 w-44">Phụ trách</th>
                  </tr>
                </thead>
                <tbody>
                  {taskRows.map((r: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border border-black p-1.5 text-center">{r.stt || idx + 1}</td>
                      <td className="border border-black p-1.5 text-left">{r.noi_dung}</td>
                      <td className="border border-black p-1.5 text-left">{r.phu_trach}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <span className="font-bold">9.5. Dự trù kinh phí hội thảo: </span>
              <span>{d.workshop_budget || 'Theo quy chế chi tiêu nội bộ của Trường Đại học Y Dược Cần Thơ.'}</span>
            </div>
          </div>
        </>
      )}

      {hasWorkshop && (
        <>
          <SH>X. Quản lý rủi ro trong chuyển giao</SH>

          <div className="font-bold text-[13.5px] mt-2 mb-1 text-black">
            10.1. Xác định và đánh giá rủi ro
          </div>
          <div className="text-[12.5px] italic text-gray-800 mb-1.5">
            Thang đánh giá: P (khả năng xảy ra) và S (mức độ ảnh hưởng) chấm từ 1 đến 5; R = P × S; R ≤ 4: Thấp; 5 ≤ R ≤ 9: Trung bình; R ≥ 10: Cao.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-center text-[12.5px] my-1.5">
              <thead>
                <tr className="bg-slate-50 font-bold">
                  <th className="border border-black p-1.5 w-10 text-center">Stt</th>
                  <th className="border border-black p-1.5 text-left">Công việc /Yếu tố rủi ro</th>
                  <th className="border border-black p-1.5 w-24 text-center">Khả năng xảy ra (P)</th>
                  <th className="border border-black p-1.5 w-24 text-center">Mức độ ảnh hưởng (S)</th>
                  <th className="border border-black p-1.5 w-24 text-center">Giá trị rủi ro<br />R=PxS</th>
                  <th className="border border-black p-1.5 w-28 text-center">Phân loại rủi ro</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(d.ds_danh_gia_rui_ro) && d.ds_danh_gia_rui_ro.length > 0
                  ? d.ds_danh_gia_rui_ro
                  : [
                      { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao do lịch giảng dạy, khám chữa bệnh dày đặc', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
                      { stt: 2, yeu_to_rui_ro: 'Hạ tầng thiết bị, phần mềm tại đơn vị tiếp nhận chưa đồng bộ', p: 2, s: 3, r: 6, phan_loai: 'Trung bình' },
                      { stt: 3, yeu_to_rui_ro: 'Nhân sự tiếp nhận chuyển giao luân chuyển hoặc chưa thành thạo kỹ thuật', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
                    ]
                ).map((item: any, idx: number) => {
                  const pVal = item.p ?? '';
                  const sVal = item.s ?? '';
                  const rVal = item.r !== undefined && item.r !== '' ? item.r : (pVal && sVal ? Number(pVal) * Number(sVal) : '');
                  const level = item.phan_loai || (rVal ? (Number(rVal) <= 4 ? 'Thấp' : Number(rVal) <= 9 ? 'Trung bình' : 'Cao') : '');
                  return (
                    <tr key={idx}>
                      <td className="border border-black p-1.5 text-center">{item.stt || idx + 1}</td>
                      <td className="border border-black p-1.5 text-left">{item.yeu_to_rui_ro}</td>
                      <td className="border border-black p-1.5 text-center">{pVal}</td>
                      <td className="border border-black p-1.5 text-center">{sVal}</td>
                      <td className="border border-black p-1.5 text-center font-bold">{rVal}</td>
                      <td className="border border-black p-1.5 text-center">{level || 'Thấp'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="font-bold text-[13.5px] mt-3.5 mb-1.5 text-black">
            10.2. Biện pháp kiểm soát rủi ro
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-center text-[12px] my-1.5">
              <thead>
                <tr className="bg-slate-50 font-bold">
                  <th className="border border-black p-1.5 w-9 text-center">Stt</th>
                  <th className="border border-black p-1.5 text-left">Yếu tố rủi ro</th>
                  <th className="border border-black p-1.5 text-left">Biện pháp kiểm soát</th>
                  <th className="border border-black p-1.5 text-center">Đơn vị<br />phụ trách</th>
                  <th className="border border-black p-1.5 text-center">Đơn vị<br />phối hợp</th>
                  <th className="border border-black p-1.5 text-center">Thời gian</th>
                  <th className="border border-black p-1.5 text-center">Sản phẩm</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(d.ds_kiem_soat_rui_ro) && d.ds_kiem_soat_rui_ro.length > 0
                  ? d.ds_kiem_soat_rui_ro
                  : [
                      { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao', bien_phap: 'Lập tiến độ chi tiết theo tuần, phân công nhân sự dự phòng', don_vi_phu_trach: 'Chủ nhiệm đề tài', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trước và trong đợt chuyển giao', san_pham: 'Biên bản nghiệm thu đúng hạn' },
                      { stt: 2, yeu_to_rui_ro: 'Hạ tầng chưa đồng bộ', bien_phap: 'Khảo sát tiền trạm, cấu hình thử nghiệm và nâng cấp thiết bị', don_vi_phu_trach: 'Bộ phận kỹ thuật', don_vi_phoi_hop: 'Phòng KH&CN', thoi_gian: 'Trước khi bàn giao 01 tuần', san_pham: 'Hệ thống vận hành ổn định' },
                      { stt: 3, yeu_to_rui_ro: 'Nhân sự chưa thành thạo', bien_phap: 'Tổ chức tập huấn thực hành cầm tay chỉ việc, bàn giao tài liệu chi tiết', don_vi_phu_trach: 'Nhóm nghiên cứu', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trong suốt kỳ chuyển giao', san_pham: '100% nhân sự đạt yêu cầu' },
                    ]
                ).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border border-black p-1.5 text-center">{item.stt || idx + 1}</td>
                    <td className="border border-black p-1.5 text-left">{item.yeu_to_rui_ro}</td>
                    <td className="border border-black p-1.5 text-left">{item.bien_phap}</td>
                    <td className="border border-black p-1.5 text-center">{item.don_vi_phu_trach}</td>
                    <td className="border border-black p-1.5 text-center">{item.don_vi_phoi_hop}</td>
                    <td className="border border-black p-1.5 text-center">{item.thoi_gian || 'Trong đợt chuyển giao'}</td>
                    <td className="border border-black p-1.5 text-center">{item.san_pham}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Khối chữ ký động (Dynamic Signature Block) */}
      <DynamicSignatureBlock dossier={dossier} is2a={true} />
    </div>
  );
};

/* ── Generic Preview for Custom Templates ── */
const GenericDocPreview: React.FC<{ dossier: Dossier; template?: WordTemplate }> = ({
  dossier: rawDossier,
  template,
}) => {
  const dossier = normalizeNFC(rawDossier);
  const data = dossier.formData || {};
  const approved = ['APPROVED', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);

  return (
    <div className="font-document leading-normal text-black text-[13.5px]">
      <VNDocHeader
        docNumber={dossier.code}
        unitLabel={dossier.createdBy.department || 'ĐƠN VỊ CÔNG TÁC'}
        dateStr={dossier.createdAt}
        isMinistry={true}
      />

      <div className="text-center my-6">
        <div className="font-bold text-[16px] uppercase tracking-wide">
          {normalizeNFC(template?.name || dossier.title || 'VĂN BẢN ĐỀ NGHỊ')}
        </div>
        <div className="text-[12px] text-gray-500 font-mono mt-1">
          Mã biểu mẫu: {template?.code || 'BM-GENERIC'}
        </div>
      </div>

      <div className="space-y-3 mt-6">
        {template && template.fields ? (
          template.fields.map((field) => {
            const key = field.name || field.key || field.id;
            const val = data[key];
            return (
              <div key={field.id} className="text-[13.5px]">
                <span className="font-semibold text-gray-900">- {normalizeNFC(field.label)}: </span>
                {val !== undefined && val !== null && val !== '' ? (
                  <span className="text-gray-800">
                    {Array.isArray(val) ? val.join(', ') : normalizeNFC(String(val))}
                  </span>
                ) : (
                  <span className="text-gray-300 italic">....................................................................</span>
                )}
              </div>
            );
          })
        ) : (
          Object.entries(data).map(([key, val]) => (
            <div key={key} className="text-[13.5px]">
              <span className="font-semibold text-gray-900">- {normalizeNFC(key)}: </span>
              <span className="text-gray-800">{normalizeNFC(String(val || ''))}</span>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 text-center mt-12 pt-6">
        <SigBlock
          title="Người lập biểu"
          hint="(Ký và ghi rõ họ tên)"
          name={dossier.createdBy.name}
        />
        <SigBlock
          title="Thủ trưởng đơn vị duyệt"
          hint="(Ký và ghi rõ họ tên)"
          name={approved ? dossier.assignedManager?.name : undefined}
          isApproved={approved}
          approverName={dossier.assignedManager?.name}
          approvedAt={dossier.approvedAt}
        />
      </div>
    </div>
  );
};

export const WordDocumentPreview: React.FC<WordDocumentPreviewProps> = ({
  dossier,
  template,
  onPrint,
  showToolbar = true,
  className = '',
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await generateAndDownloadDocx(dossier, template);
    } catch (err) {
      console.error('Failed to export docx:', err);
      alert('Có lỗi khi tạo file DOCX. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      await generateAndDownloadPdf(dossier, template);
    } catch (err) {
      console.error('Failed to export pdf:', err);
      alert('Có lỗi khi tạo file PDF. Vui lòng thử lại.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isMau2a = isMau2aTemplateOrDossier(dossier, template);
  const activeTemplate = getEffectiveTemplate(dossier, template);
  const displayCode = isMau2a ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN';
  const displayTitle = isMau2a
    ? (dossier.formData?.product_name
        ? `Kế hoạch tổ chức chuyển giao công nghệ: “${dossier.formData.product_name}”`
        : activeTemplate.title)
    : (activeTemplate.title || 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

  const overallApproved = [
    'VALIDATED',
    'APPROVED',
    'PENDING_SIGNED_REVIEW',
    'USER_SIGNED',
    'WAITING_RECTOR_SIGNATURE',
    'SECRETARY_RECEIVED',
    'SIGNED_ARCHIVED',
    'SIGNED',
    'COMPLETED',
  ].includes(String(dossier.status || '').toUpperCase());

  const isCurrentFormApproved = isMau2a
    ? (dossier as any).status_2a === 'APPROVED' || overallApproved
    : (dossier as any).status_1a === 'APPROVED' || overallApproved;

  return (
    <div className={`flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      {showToolbar && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-semibold text-sm text-slate-800">
                {normalizeNFC(displayTitle)}
              </span>
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-medium border border-blue-200">
                {displayCode} • {dossier.code}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-md p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setZoom(Math.max(60, zoom - 10))}
                className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-medium text-slate-700 px-2 min-w-[45px] text-center">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="p-1 hover:bg-white rounded text-slate-600 hover:text-slate-900 transition-colors"
                title="Phóng to"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                In
              </button>
            )}

            

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap shrink-0 ${
                isCurrentFormApproved
                  ? 'text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600'
                  : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
              }`}
              title={`Tải bản PDF ${isMau2a ? 'Mẫu 2a (Kế hoạch)' : 'Mẫu 1a (Tờ trình)'}`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{isExportingPdf ? 'Đang xuất...' : 'Tải PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
              title={`Tải bản DOCX ${isMau2a ? 'Mẫu 2a (Kế hoạch)' : 'Mẫu 1a (Tờ trình)'}`}
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{isExporting ? 'Đang xuất...' : 'Tải DOCX'}</span>
            </button>
          </div>
        </div>
      )}

      {/* A4 Paper Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-200/70">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm 15mm 20mm 30mm',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          }}
          className="bg-white border border-slate-300 relative print:m-0 print:border-none print:shadow-none"
        >
          {isMau2a ? (
            <Mau2aKHCGCN dossier={dossier} />
          ) : (
            <Mau1aTTCGCN dossier={dossier} />
          )}
        </div>
      </div>
    </div>
  );
};
