import React, { useState } from 'react';
import { Download, Printer, ZoomIn, ZoomOut, FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Dossier, WordTemplate } from '../../types';
import { generateAndDownloadDocx } from '../../utils/docxExport';
import { normalizeNFC } from '../../utils/textUtils';

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
    <div className="grid grid-cols-12 gap-2 items-start mb-6 text-center leading-tight">
      {/* Cột trái: Tên cơ quan ban hành */}
      <div className="col-span-5 flex flex-col items-center">
        {isMinistry && (
          <div className="text-[12px] font-normal uppercase whitespace-nowrap">
            BỘ Y TẾ
          </div>
        )}
        <div className="text-[12px] font-bold uppercase whitespace-nowrap">
          TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
        </div>
        <div className="text-[11.5px] font-bold uppercase text-gray-800 whitespace-nowrap">
          {normalizeNFC(unitLabel || 'KHOA / ĐƠN VỊ')}
        </div>
        <div className="w-28 h-[1px] bg-black my-1" />
        <div className="text-[11.5px] text-gray-800 whitespace-nowrap">
          Số: {normalizeNFC(docNumber || '....... /TTr-ĐV')}
        </div>
      </div>

      {/* Cột phải: Quốc hiệu & Tiêu ngữ */}
      <div className="col-span-7 flex flex-col items-center">
        <div className="text-[12px] font-bold uppercase tracking-tight whitespace-nowrap">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </div>
        <div className="text-[12.5px] font-bold whitespace-nowrap">
          Độc lập – Tự do – Hạnh phúc
        </div>
        <div className="w-36 h-[1px] bg-black my-1" />
        <div className="text-[11.5px] italic text-gray-700 whitespace-nowrap">
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
}> = ({ title, hint, name, isApproved, approverName, approvedAt, isForSig }) => (
  <div className="text-center flex-1 px-2">
    <div className="font-bold uppercase text-[12.5px] text-gray-900">{normalizeNFC(title)}</div>
    <div className="italic text-[11.5px] text-gray-600 mb-2">{normalizeNFC(hint)}</div>
    <div className="h-20 flex items-center justify-center">
      {isApproved ? (
        <div className="border-2 border-emerald-600 rounded px-2.5 py-1 -rotate-3 bg-emerald-50 inline-flex items-center gap-1.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <div className="text-left">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-800">ĐÃ PHÊ DUYỆT</div>
            <div className="text-[8.5px] text-emerald-700 font-mono">
              {normalizeNFC(approverName)} · {approvedAt ? new Date(approvedAt).toLocaleDateString('vi-VN') : ''}
            </div>
          </div>
        </div>
      ) : (
        <span className="text-gray-300 italic text-[12px]">Ký và ghi rõ họ tên</span>
      )}
    </div>
    <div className="font-bold text-[13.5px] text-gray-900">
      {normalizeNFC(name) || '...................................................'}
    </div>
    {isForSig && (
      <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-2 py-0.5">
        <CheckCircle2 className="w-3 h-3" />
        Đã chuyển Trình ký cấp trên
      </div>
    )}
  </div>
);

/* ── Mẫu 1a-TT.CGCN: Tờ trình chuyển giao tri thức ── */
const Mau1aTTCGCN: React.FC<{ dossier: Dossier }> = ({ dossier: rawDossier }) => {
  const dossier = normalizeNFC(rawDossier);
  const d = dossier.formData || {};
  const approved = ['APPROVED', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);
  const forSig = ['USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);

  return (
    <div className="font-document leading-normal text-black text-[13.5px]">
      <VNDocHeader
        docNumber={d.proposal_number || dossier.code}
        unitLabel={d.department || dossier.createdBy.department || 'KHOA / ĐƠN VỊ'}
        dateStr={dossier.createdAt}
        isMinistry={false}
      />

      <div className="text-center my-5">
        <div className="font-bold text-[15px] uppercase tracking-wide">TỜ TRÌNH</div>
        <div className="text-[13.5px] font-semibold mt-1">
          Về việc chuyển giao tri thức: từ kết quả đề tài nghiên cứu vào bài giảng,
        </div>
        <div className="text-[13.5px] font-semibold">
          giáo trình, tài liệu tập huấn giảng dạy
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

      {/* Signature section */}
      <div className="mt-6 pt-4">
        <div className="grid grid-cols-2 gap-6 text-center">
          <SigBlock
            title="Trưởng đơn vị"
            hint="(Ký và ghi rõ họ tên)"
            name={approved ? dossier.assignedManager?.name : undefined}
            isApproved={approved}
            approverName={dossier.assignedManager?.name}
            approvedAt={dossier.approvedAt}
            isForSig={forSig}
          />
          <SigBlock
            title="Cá nhân/Chủ nhiệm đề tài"
            hint="(Ký và ghi rõ họ tên)"
            name={d.full_name || dossier.createdBy.name}
          />
        </div>

        <div className="grid grid-cols-2 gap-6 text-center mt-8">
          <SigBlock
            title="Phòng KH&CN"
            hint="(Ký và ghi rõ họ tên)"
          />
          <SigBlock
            title="Phòng TCKT"
            hint="(Ký và ghi rõ họ tên)"
          />
        </div>

        <div className="flex justify-between items-start mt-8 pt-4">
          <div className="text-[12px] text-gray-700 leading-snug">
            <div className="font-bold">Nơi nhận:</div>
            <div>- Như kính gửi;</div>
            <div>- TCKT;</div>
            <div>- TTDV&ĐTTNCXH;</div>
            <div>- Lưu VT, KHCN.</div>
          </div>
          <div className="text-center pr-12">
            <div className="font-bold uppercase text-[13px]">HIỆU TRƯỞNG</div>
            <div className="h-16" />
            <div className="font-bold text-[13.5px]">...................................................</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Mẫu 2a-KH.CGCN: Kế hoạch tổ chức chuyển giao công nghệ Trong trường ── */
const Mau2aKHCGCN: React.FC<{ dossier: Dossier }> = ({ dossier: rawDossier }) => {
  const dossier = normalizeNFC(rawDossier);
  const d = dossier.formData || {};
  const approved = ['APPROVED', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);
  const forSig = ['USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(dossier.status);
  const dt = d.transfer_date ? new Date(d.transfer_date) : null;

  return (
    <div className="font-document leading-normal text-black text-[13.5px]">
      <VNDocHeader
        docNumber={d.plan_code || dossier.code}
        unitLabel={d.department || dossier.createdBy.department || 'Khoa/Đơn vị'}
        dateStr={dossier.createdAt}
        isMinistry={true}
      />

      <div className="text-center my-5">
        <div className="font-bold text-[15px] uppercase tracking-wide">KẾ HOẠCH</div>
        <div className="text-[14px] font-semibold mt-1">Về việc tổ chức chuyển giao công nghệ</div>
        <div className="text-[14px] font-bold mt-1 text-sky-950">
          “{d.product_name || 'Tên sản phẩm chuyển giao'}”
        </div>
      </div>

      <SH mt={18}>I. Mục đích</SH>
      {d.purpose ? (
        <TextBlock value={d.purpose} />
      ) : (
        <>
          <CP hint="giới thiệu đôi nét về SPCGCN" />
          <CP hint="giới thiệu mục đích của chuyển giao" />
        </>
      )}

      <SH>II. Nhóm tác giả của sản phẩm chuyển giao</SH>
      <TextBlock value={d.authors_group} hint="Liệt kê danh sách họ tên, học hàm học vị các tác giả..." />

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
      <CP
        hint="Các bộ môn lâm sàng & Bệnh viện Trường ĐH Y Dược Cần Thơ..."
        value={d.receiving_party}
      />

      <SH>VI. Thời gian, địa điểm chuyển giao</SH>
      <div className="text-[13.5px] mb-1.5 flex items-baseline gap-1">
        <span className="font-semibold">6.1. Thời gian:</span>
        <span>ngày </span>
        <span className="border-b border-gray-500 inline-block min-w-[28px] text-center font-medium">
          {dt ? dt.getDate() : '.....'}
        </span>
        <span> tháng </span>
        <span className="border-b border-gray-500 inline-block min-w-[28px] text-center font-medium">
          {dt ? dt.getMonth() + 1 : '.....'}
        </span>
        <span> năm </span>
        <span className="border-b border-gray-500 inline-block min-w-[40px] text-center font-medium">
          {dt ? dt.getFullYear() : '20...'}
        </span>
      </div>
      <IL label="6.2. Địa điểm" value={d.transfer_location} />

      <SH>VII. Chi phí chuyển giao (nếu có tùy theo thỏa thuận)</SH>
      <div className="text-[13.5px] mb-2 text-gray-800">
        {d.transfer_cost !== undefined && d.transfer_cost !== null ? (
          Number(d.transfer_cost) === 0 ? (
            'Không thu phí (sử dụng kinh phí hoạt động của Nhà trường).'
          ) : (
            `${Number(d.transfer_cost).toLocaleString('vi-VN')} VNĐ`
          )
        ) : (
          <span className="italic text-gray-400">(Ghi rõ chi phí hoặc nêu căn cứ thỏa thuận hợp đồng)</span>
        )}
      </div>

      <SH>VIII. Ban chỉ đạo – tổ chức chuyển giao</SH>
      <TextBlock
        value={d.steering_committee}
        hint="8.1 Ban chỉ đạo: BGH; 8.2 Ban tổ chức: Trưởng khoa, Phòng KHCN; 8.3 Nhân sự thực hiện: Nhóm tác giả..."
      />

      <SH>IX. Hội thảo chuyển giao (nếu có tổ chức HT chuyển giao thì ghi, nếu không bỏ phần IX này)</SH>
      {d.workshop_program ? (
        <TextBlock value={d.workshop_program} />
      ) : (
        <div className="space-y-1.5 text-[13px] text-gray-600 pl-2">
          <div><span className="font-semibold">9.1. Chủ tọa:</span> 1. BGH; 2. Đại diện Ban chủ nhiệm khoa</div>
          <div><span className="font-semibold">9.2. Báo cáo viên:</span> 1. Chủ nhiệm đề tài; 2. Nhóm tác giả</div>
          <div><span className="font-semibold">9.3. Chương trình chi tiết:</span> Khai mạc, Báo cáo kỹ thuật, Thảo luận, Bế mạc</div>
          <div><span className="font-semibold">9.4. Phân công nhiệm vụ:</span> Đơn vị chủ trì và các bên phối hợp</div>
          <div><span className="font-semibold">9.5. Dự trù kinh phí hội thảo:</span> Theo quy chế chi tiêu nội bộ</div>
        </div>
      )}

      <SH>X. Quản lý rủi ro trong chuyển giao</SH>
      {d.risk_management ? (
        <TextBlock value={d.risk_management} />
      ) : (
        <div className="text-[13px] text-gray-600 pl-2">
          <div><span className="font-semibold">10.1. Xác định và đánh giá rủi ro:</span> Các yếu tố kỹ thuật, thời gian, nhân sự</div>
          <div><span className="font-semibold">10.2. Biện pháp kiểm soát:</span> Phân công người giám sát và phương án dự phòng</div>
        </div>
      )}

      {/* Signature section */}
      <div className="mt-8 pt-4">
        <div className="grid grid-cols-2 gap-6 text-center">
          <SigBlock
            title="Trưởng đơn vị nhận"
            hint="(Ký và ghi rõ họ tên)"
          />
          <SigBlock
            title="Trưởng đơn vị giao / Chủ nhiệm đề tài"
            hint="(Ký và ghi rõ họ tên)"
            name={d.full_name || dossier.createdBy.name}
            isApproved={approved}
            approverName={dossier.assignedManager?.name}
            approvedAt={dossier.approvedAt}
            isForSig={forSig}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mt-8">
          <SigBlock title="Phòng KH&CN" hint="(Ký duyệt)" />
          <SigBlock title="Phòng TCKT" hint="(Ký duyệt)" />
          <SigBlock title="Văn Phòng" hint="(Ký duyệt)" />
        </div>

        <div className="flex justify-between items-start mt-8 pt-4">
          <div className="text-[12px] text-gray-700 leading-snug">
            <div className="font-bold">Nơi nhận:</div>
            <div>- Như trên;</div>
            <div>- VP, TCKT;</div>
            <div>- TTDV&ĐTTNCXH;</div>
            <div>- Lưu VT, KHCN.</div>
          </div>
          <div className="text-center pr-12">
            <div className="font-bold uppercase text-[13px]">HIỆU TRƯỞNG</div>
            <div className="h-16" />
            <div className="font-bold text-[13.5px]">...................................................</div>
          </div>
        </div>
      </div>
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

  const templateCode = template?.code || dossier.templateId || '';
  const isMau1a = templateCode.includes('1a') || templateCode.includes('TTR') || templateCode.includes('tri-thuc');
  const isMau2a = templateCode.includes('2a') || templateCode.includes('KH') || templateCode.includes('trong-truong');

  return (
    <div className={`flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      {showToolbar && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-semibold text-sm text-slate-800">
                {normalizeNFC(template?.name || dossier.title || 'Xem trước văn bản Word')}
              </span>
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-medium border border-blue-200">
                {templateCode || dossier.code}
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
              onClick={handleDownload}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Đang xuất file...' : 'Tải file DOCX'}
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
            padding: '25mm 20mm 20mm 25mm',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          }}
          className="bg-white border border-slate-300 relative print:m-0 print:border-none print:shadow-none"
        >
          {isMau1a ? (
            <Mau1aTTCGCN dossier={dossier} />
          ) : isMau2a ? (
            <Mau2aKHCGCN dossier={dossier} />
          ) : (
            <GenericDocPreview dossier={dossier} template={template} />
          )}
        </div>
      </div>
    </div>
  );
};
