import React, { useState, useEffect, useMemo } from 'react';
import {
  WordTemplate,
  Dossier,
  UserProfile,
  ActiveNavTab,
} from '../types';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  AlertCircle,
  ShieldCheck,
  Download,
  Plus,
  Trash2,
} from 'lucide-react';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { TimeRangePicker, DocumentNumberInput, DepartmentSelect, LocationSelect } from '../components/common';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { normalizeNFC } from '../utils/textUtils';
import { OFFICIAL_TEMPLATES } from '../constants';
import { isMau2aTemplateOrDossier } from '../utils/templateUtils';

interface CreateDossierViewProps {
  selectedTemplate: WordTemplate | null;
  templates: WordTemplate[];
  currentUser: UserProfile;
  editingDossier?: Dossier | null;
  onSaveDraft: (dossier: Dossier) => void;
  onSubmitDossier: (dossier: Dossier) => void | Promise<void>;
  onCancel: () => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const CreateDossierView: React.FC<CreateDossierViewProps> = ({
  selectedTemplate: initialTemplate,
  templates,
  currentUser,
  editingDossier,
  onSaveDraft,
  onSubmitDossier,
  onCancel,
  onNavigate,
}) => {
  const safeTemplates = useMemo(() => {
    const list = Array.isArray(templates) && templates.length > 0 ? templates : OFFICIAL_TEMPLATES;
    return list.map((item) => {
      const fallback = OFFICIAL_TEMPLATES.find((t) => t.id === item.id || t.code === item.code);
      return {
        ...fallback,
        ...item,
        fields: item.fields && item.fields.length > 0 ? item.fields : fallback?.fields || [],
        sections: item.sections && item.sections.length > 0 ? item.sections : fallback?.sections || [],
      };
    });
  }, [templates]);

  const [template, setTemplate] = useState<WordTemplate>(() => {
    if (initialTemplate) {
      const match = safeTemplates.find((t) => t.id === initialTemplate.id || t.code === initialTemplate.code);
      return match || initialTemplate;
    }
    if (editingDossier && safeTemplates.length > 0) {
      return (
        safeTemplates.find(
          (t) =>
            t.id === editingDossier.templateId ||
            t.id === (editingDossier as any).template_id ||
            t.code === editingDossier.templateCode
        ) || safeTemplates[0]
      );
    }
    return safeTemplates[0] || OFFICIAL_TEMPLATES[0];
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chuẩn bị dữ liệu form đầy đủ (kết hợp defaultValue của mẫu + dữ liệu đã lưu của hồ sơ trả về)
  const buildMergedFormData = (activeTemplate: WordTemplate, dossier?: Dossier | null): Record<string, any> => {
    const is2a = isMau2aTemplateOrDossier(dossier, activeTemplate);

    const defaults: Record<string, any> = {
      full_name: currentUser.name || 'Thầy/Cô Giảng viên',
      department: currentUser.department || 'Khoa Y',
      phone: currentUser.phone || '0912345678',
      email: currentUser.email || 'thayco.giangvien@ctump.edu.vn',
      position: currentUser.title || 'Giảng viên',
      transfer_location: 'Tại Trường Đại học Y Dược Cần Thơ',
    };

    if (is2a) {
      defaults.transfer_date = 'Bắt đầu triển khai lúc 08 giờ 00 ngày 15/10/2026 (ekip kỹ thuật thiết lập từ 07 giờ 30 đến 11 giờ 30); vận hành thử nghiệm ngày 14/10/2026; bàn giao bộ tài liệu hướng dẫn ngày 16/10/2026.';
      defaults.transfer_location = 'Hội trường Trung tâm, Trường Đại học Y Dược Cần Thơ, số 179 đường Nguyễn Văn Cừ, phường An Khánh, quận Ninh Kiều, thành phố Cần Thơ.';
      defaults.transfer_cost = "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.";
      defaults.ds_danh_gia_rui_ro = [
        { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao do lịch giảng dạy, khám chữa bệnh dày đặc', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
        { stt: 2, yeu_to_rui_ro: 'Hạ tầng thiết bị, phần mềm tại đơn vị tiếp nhận chưa đồng bộ', p: 2, s: 3, r: 6, phan_loai: 'Trung bình' },
        { stt: 3, yeu_to_rui_ro: 'Nhân sự tiếp nhận chuyển giao luân chuyển hoặc chưa thành thạo kỹ thuật', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
      ];
      defaults.ds_kiem_soat_rui_ro = [
        { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao', bien_phap: 'Lập tiến độ chi tiết theo tuần, phân công nhân sự dự phòng', don_vi_phu_trach: 'Chủ nhiệm đề tài', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trước và trong đợt chuyển giao', san_pham: 'Biên bản nghiệm thu đúng hạn' },
        { stt: 2, yeu_to_rui_ro: 'Hạ tầng chưa đồng bộ', bien_phap: 'Khảo sát tiền trạm, cấu hình thử nghiệm và nâng cấp thiết bị', don_vi_phu_trach: 'Bộ phận kỹ thuật', don_vi_phoi_hop: 'Phòng KH&CN', thoi_gian: 'Trước khi bàn giao 01 tuần', san_pham: 'Hệ thống vận hành ổn định' },
        { stt: 3, yeu_to_rui_ro: 'Nhân sự chưa thành thạo', bien_phap: 'Tổ chức tập huấn thực hành cầm tay chỉ việc, bàn giao tài liệu chi tiết', don_vi_phu_trach: 'Nhóm nghiên cứu', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trong suốt kỳ chuyển giao', san_pham: '100% nhân sự đạt yêu cầu' },
      ];
    } else {
      defaults.transfer_form = 'Chuyển giao quyền tác giả bài giảng và giáo trình.';
      defaults.transfer_time = 'Từ tháng 10/2026 đến tháng 12/2026';
    }

    (activeTemplate?.fields || []).forEach((f) => {
      const key = f.name || f.key || f.id;
      if (f.defaultValue !== undefined && f.defaultValue !== '' && defaults[key] === undefined) {
        defaults[key] = f.defaultValue;
      }
    });

    const rawSaved = {
      ...((dossier as any)?.form_data || {}),
      ...(dossier?.formData || {}),
    };
    const merged: Record<string, any> = { ...defaults };
    Object.keys(rawSaved).forEach((k) => {
      const val = rawSaved[k];
      if (val !== undefined && val !== null && val !== '') {
        if (is2a && (k === 'proposal_number' || k === 'plan_code' || k === 'receiver_needs' || k === 'provider_capacity')) return;
        if (!is2a && (k === 'plan_code' || k === 'product_name' || k === 'authors_group' || k === 'receiving_party')) return;
        merged[k] = val;
      }
    });
    return merged;
  };

  useEffect(() => {
    let resolvedTemplate = template;
    if (initialTemplate) {
      const match = safeTemplates.find((t) => t.id === initialTemplate.id || t.code === initialTemplate.code);
      resolvedTemplate = match || initialTemplate;
      setTemplate(resolvedTemplate);
    } else if (editingDossier && safeTemplates.length > 0) {
      const match = safeTemplates.find(
        (t) =>
          t.id === editingDossier.templateId ||
          t.id === (editingDossier as any).template_id ||
          t.code === editingDossier.templateCode
      );
      if (match) {
        resolvedTemplate = match;
        setTemplate(match);
      }
    } else if ((!template || !template.id || !template.fields || template.fields.length === 0) && safeTemplates.length > 0) {
      resolvedTemplate = safeTemplates[0];
      setTemplate(safeTemplates[0]);
    }
    if (editingDossier) {
      setFormData(buildMergedFormData(resolvedTemplate, editingDossier));
    }
  }, [initialTemplate, editingDossier, safeTemplates]);

  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const activeTemplate = initialTemplate
      ? safeTemplates.find((t) => t.id === initialTemplate.id) || initialTemplate
      : safeTemplates[0] || OFFICIAL_TEMPLATES[0];
    return buildMergedFormData(activeTemplate, editingDossier);
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const revisionNoteText =
    editingDossier?.review_notes ||
    editingDossier?.revision_reason ||
    editingDossier?.returnReason ||
    editingDossier?.reviewNotes ||
    '';

  const nextVersionNumber = editingDossier
    ? (editingDossier.current_version || editingDossier.currentVersion || 1) + 1
    : 1;

  const handleTemplateChange = (newTemplateId: string) => {
    const found = safeTemplates.find((t) => t.id === newTemplateId);
    if (found) {
      setTemplate(found);
      setFormData(buildMergedFormData(found, editingDossier));
      setErrors({});
    }
  };

  const handleInputChange = (fieldName: string, value: any) => {
    const normalizedValue = normalizeNFC(value);
    setFormData((prev) => ({
      ...prev,
      [fieldName]: normalizedValue,
    }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldName: string, option: string) => {
    const currentList: string[] = Array.isArray(formData[fieldName]) ? formData[fieldName] : [];
    const nextList = currentList.includes(option)
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    handleInputChange(fieldName, nextList);
  };

  const isValidVietnamesePhone = (phoneStr: string): boolean => {
    if (!phoneStr) return true;
    const clean = phoneStr.replace(/[\s.\-()]/g, '');
    return clean.length >= 9 && /^[0-9+]+$/.test(clean);
  };

  const isValidCtumpEmail = (emailStr: string): boolean => {
    if (!emailStr) return true;
    const clean = emailStr.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(clean);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (template && template.fields) {
      for (const field of template.fields) {
        const key = field.name || field.key || field.id;
        const val = formData[key];

        // Bỏ qua trường hội thảo khi không tích chọn hội thảo
        const isWorkshopHidden =
          (formData.co_hoi_thao === false || formData.has_workshop === false) &&
          (key.includes('workshop') || field.label.toLowerCase().includes('hội thảo'));
        if (isWorkshopHidden) continue;

        // Bỏ qua trường kinh phí khi chọn không phát sinh kinh phí
        const isFundingHidden =
          (formData.co_kinh_phi === false || formData.has_funding === false) &&
          (key === 'transfer_cost' || key === 'funding_source');
        if (isFundingHidden) continue;

        const isPhone =
          key === 'phone' ||
          field.type === 'tel' ||
          field.id?.includes('phone') ||
          /điện thoại/i.test(field.label);

        const isEmail =
          key === 'email' ||
          field.type === 'email' ||
          field.id?.includes('email') ||
          /email|thư điện tử/i.test(field.label);

        if (field.required) {
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            newErrors[key] = `${field.label} là trường bắt buộc`;
          }
        }

        if (isPhone && val && typeof val === 'string' && val.trim() !== '') {
          if (!isValidVietnamesePhone(val)) {
            newErrors[key] = 'Số điện thoại không hợp lệ (Ví dụ: 0912.345.678)';
          }
        }

        if (isEmail && val && typeof val === 'string' && val.trim() !== '') {
          if (!isValidCtumpEmail(val)) {
            newErrors[key] = 'Địa chỉ Email không đúng định dạng';
          }
        }
      }
    }
    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      setTimeout(() => {
        const el = document.getElementById(`field-${firstKey}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = el.querySelector('input, select, textarea') as HTMLElement;
          if (input) input.focus();
        }
      }, 50);
      return false;
    }
    return true;
  };

  const buildCurrentDossier = (status: Dossier['status']): Dossier => {
    const code = editingDossier?.code || `CGCN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');
    const prevVer = Number(editingDossier?.current_version || editingDossier?.currentVersion || 1);
    const effectiveVersion = editingDossier ? prevVer + 1 : 1;

    const is2a = isMau2aTemplateOrDossier({ formData }, template);
    const effectiveTitle = is2a
      ? (formData.product_name
          ? `Kế hoạch tổ chức chuyển giao công nghệ: “${formData.product_name}”`
          : template.title)
      : (formData.purpose
          ? `Tờ trình về việc chuyển giao tri thức: “${formData.purpose.slice(0, 80)}”`
          : template.title);

    return {
      ...editingDossier,
      id: editingDossier?.id || `hs-${Date.now()}`,
      code,
      title: effectiveTitle,
      templateId: template.id,
      templateTitle: template.title,
      templateCode: template.code,
      createdBy: editingDossier?.createdBy || currentUser,
      assignedManager: {
        name: template.manager,
        email: 'admin@ctump.edu.vn',
        department: 'Phòng Khoa học & Công nghệ',
      },
      createdAt: editingDossier?.createdAt || nowStr,
      submittedAt: nowStr,
      status,
      current_version: effectiveVersion,
      currentVersion: effectiveVersion,
      generated_docx_path: `/uploads/docx/${code}-v${effectiveVersion}.docx`,
      generated_pdf_path: `/uploads/pdf/${code}-v${effectiveVersion}.pdf`,
      docx_file_url: `/uploads/docx/${code}-v${effectiveVersion}.docx`,
      formData,
      form_data: formData,
      docxFileName: `${code}_${template.code.replace(/[^a-zA-Z0-9]/g, '_')}_${formData.full_name?.replace(/\s+/g, '') || 'BieuMau'}_v${effectiveVersion}.docx`,
      timeline: [
        ...(editingDossier?.timeline || []),
        {
          id: `tl-${Date.now()}`,
          title: editingDossier
            ? `Chỉnh sửa và nộp lại hồ sơ (v${effectiveVersion})`
            : 'Hoàn thành và gửi hồ sơ trực tuyến (v1)',
          actor: currentUser.name,
          role: currentUser.title,
          timestamp: nowReadable,
          status,
        },
      ],
    };
  };

  const handleSaveDraft = () => {
    const dossier = buildCurrentDossier('SUBMITTED');
    onSaveDraft(dossier);
    setSaveSuccessMsg('Đã lưu hồ sơ thành công! Bạn có thể xem lại tại mục "Hồ sơ của tôi".');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleNextToReview = () => {
    if (validateForm()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextToPreview = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    if (!validateForm()) {
      setCurrentStep(1);
      return;
    }
    try {
      setIsSubmitting(true);
      const dossier = buildCurrentDossier('SUBMITTED');
      await onSubmitDossier(dossier);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewDossier = buildCurrentDossier('SUBMITTED');

  const sections =
    template.sections && template.sections.length > 0
      ? template.sections
      : ['Thông tin người đề nghị', 'Nội dung chi tiết'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-1 font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {editingDossier ? `Chỉnh sửa & Nộp lại hồ sơ: ${editingDossier.code}` : 'Khởi tạo hồ sơ trực tuyến'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu mẫu: <span className="font-semibold text-slate-800">{template.title}</span> ({template.code})
          </p>
        </div>

        {/* Nút Gửi / Nộp lại ngay trên thanh tiêu đề */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinalSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isSubmitting
                ? 'Đang gửi...'
                : editingDossier
                ? `Gửi lại hồ sơ (v${nextVersionNumber})`
                : 'Gửi hồ sơ ngay'}
            </span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('my_dossiers')}
            className="font-semibold text-emerald-900 hover:underline cursor-pointer"
          >
            Đến Hồ sơ của tôi &rarr;
          </button>
        </div>
      )}

      {/* Thanh 4 bước (Cho phép bấm trực tiếp vào bất kỳ bước nào) */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Điền thông tin', sub: 'Nhập & sửa nội dung' },
            { step: 2, label: '2. Kiểm tra dữ liệu', sub: 'Rà soát tính chính xác' },
            { step: 3, label: '3. Tạo biểu mẫu Word', sub: 'Xem trước chuẩn A4' },
            { step: 4, label: '4. Gửi hồ sơ', sub: 'Gửi Admin xét duyệt' },
          ].map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step === 1) {
                    setCurrentStep(1);
                  } else if (validateForm()) {
                    setCurrentStep(s.step as any);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`flex flex-col p-2 rounded-md border transition-colors cursor-pointer ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-50/60 shadow-2xs'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[10px] font-bold ${
                      isCompleted
                        ? 'bg-emerald-700 text-white'
                        : isCurrent
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                  </span>
                  {isCompleted && <span className="text-[10px] text-emerald-800 font-medium">Hoàn tất</span>}
                  {isCurrent && <span className="text-[10px] text-blue-900 font-semibold">Đang chọn</span>}
                </div>
                <span className="text-xs font-semibold text-slate-900 leading-tight truncate">{s.label}</span>
                <span className="text-[10px] text-slate-500 hidden sm:inline truncate">{s.sub}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= STEP 1: FORM INPUTS ================= */}
      {currentStep === 1 && (
        <div className="space-y-5">
          {/* Template Info Card */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {template.code}
                </span>
                <span className="text-xs text-slate-500">Mẫu Word: {template.fileName}</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900">{template.title}</h2>
              <p className="text-xs text-slate-600 max-w-2xl">{template.description}</p>
            </div>

            <div className="w-full md:w-auto shrink-0 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="w-full md:w-64">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Đổi biểu mẫu khác:
                </label>
                <select
                  value={template.id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  {safeTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.code}] {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Gợi ý chỗ sai cần sửa chữa khi đơn bị trả về */}
          {revisionNoteText && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-lg space-y-1.5 text-xs text-rose-950">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Gợi ý chỗ sai cần sửa chữa từ Cô Admin (Phòng KH&CN):</span>
              </div>
              <p className="pl-5 font-semibold text-rose-900 whitespace-pre-line">"{revisionNoteText}"</p>
              <p className="text-[11px] text-rose-700 pl-5">
                Thầy/Cô chỉnh sửa lại các trường thông tin bên dưới và nhấn <strong>"Gửi lại hồ sơ (v{nextVersionNumber})"</strong>.
              </p>
            </div>
          )}

          {/* Form Groups by Section */}
          <div className="space-y-4">
            {sections.map((sectionName) => {
              const fieldsInSection = template.fields.filter((f) => {
                const fSection = f.section || 'Nội dung chi tiết';
                return (
                  fSection === sectionName ||
                  (!template.sections?.includes(fSection) && sectionName === 'Nội dung chi tiết')
                );
              });

              if (fieldsInSection.length === 0) return null;

              return (
                <div key={sectionName} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      {sectionName}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {fieldsInSection.length} trường
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 space-y-3">
                    {sectionName.includes('Hội thảo') && (
                      <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.co_hoi_thao !== false && formData.has_workshop !== false}
                            onChange={(e) => {
                              const val = e.target.checked;
                              handleInputChange('co_hoi_thao', val);
                              handleInputChange('has_workshop', val);
                            }}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-blue-900">
                            Có tổ chức hội thảo kèm theo không?
                          </span>
                        </label>
                        <span className="text-[11px] font-medium text-blue-700">
                          {formData.co_hoi_thao === false || formData.has_workshop === false
                            ? '✓ Sẽ tự động ẩn/xóa đoạn Hội thảo khi xuất file Word'
                            : '• Đoạn Hội thảo sẽ xuất hiện trong file Word'}
                        </span>
                      </div>
                    )}

                    {sectionName.includes('Kinh phí') && (
                      <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.co_kinh_phi !== false && formData.has_funding !== false}
                            onChange={(e) => {
                              const val = e.target.checked;
                              handleInputChange('co_kinh_phi', val);
                              handleInputChange('has_funding', val);
                              if (!val) {
                                handleInputChange('transfer_cost', "Không thu phí chuyển giao. Chi phí phát sinh (nếu có) thực hiện theo quy chế chi tiêu nội bộ của Trường.");
                                handleInputChange('funding_source', 'Không thu phí (kinh phí hoạt động Nhà trường)');
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-blue-900">
                            Có phát sinh kinh phí chuyển giao không?
                          </span>
                        </label>
                        <span className="text-[11px] font-medium text-blue-700">
                          {formData.co_kinh_phi === false || formData.has_funding === false
                            ? '✓ Mặc định: Không thu phí (sử dụng kinh phí trường)'
                            : '• Có phát sinh kinh phí thực hiện'}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {fieldsInSection.map((field) => {
                        const fKey = field.name || field.key || field.id;
                        const isWorkshopHidden =
                          (formData.co_hoi_thao === false || formData.has_workshop === false) &&
                          (fKey.includes('workshop') || field.label.toLowerCase().includes('hội thảo'));
                        if (isWorkshopHidden) return null;

                        const isTimeRangeField =
                          fKey === 'transfer_time' ||
                          field.id === 'f-1a-transfer-time';

                        const isDocNumberField =
                          fKey === 'proposal_number' ||
                          fKey === 'plan_code' ||
                          field.wordPlaceholder === '{{so_to_trinh}}' ||
                          field.wordPlaceholder === '{{so_ke_hoach}}' ||
                          field.id === 'f-1a-proposal-number' ||
                          field.id === 'f-2a-plan-code';

                        const isDepartmentField =
                          fKey === 'department' ||
                          field.wordPlaceholder === '{{don_vi_uppercase}}' ||
                          field.id === 'f-1a-department' ||
                          field.id === 'f-2a-department';

                        const isLocationField =
                          fKey === 'transfer_location' ||
                          fKey === 'transfer_place' ||
                          field.wordPlaceholder === '{{dia_diem}}' ||
                          field.id === 'f-1a-transfer-location' ||
                          field.id === 'f-2a-transfer-location' ||
                          /địa điểm/i.test(field.label);

                        const isPhoneField =
                          fKey === 'phone' ||
                          field.type === 'tel' ||
                          field.id === 'f-1a-phone' ||
                          field.id === 'f-2a-phone' ||
                          /điện thoại/i.test(field.label);

                        const isEmailField =
                          fKey === 'email' ||
                          field.type === 'email' ||
                          field.id === 'f-1a-email' ||
                          field.id === 'f-2a-email' ||
                          /email|thư điện tử/i.test(field.label);

                        const isFullWidth =
                          field.type === 'textarea' ||
                          field.type === 'checkbox' ||
                          field.type === 'risk_table' ||
                          field.type === 'risk_control_table' ||
                          isTimeRangeField ||
                          isDocNumberField ||
                          isLocationField;
                        const hasError = !!errors[fKey];

                        return (
                          <div
                            key={field.id}
                            id={`field-${fKey}`}
                            className={`space-y-1 p-2 rounded-lg transition-colors ${
                              hasError ? 'bg-rose-50/60 ring-1 ring-rose-300' : ''
                            } ${isFullWidth ? 'md:col-span-2' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-semibold text-slate-700">
                                {field.label}{' '}
                                {field.required && <span className="text-rose-500">*</span>}
                              </label>
                              {field.wordPlaceholder && (
                                <span className="font-mono text-[10px] text-slate-400">
                                  {field.wordPlaceholder}
                                </span>
                              )}
                            </div>

                            {(() => {
                              if (isTimeRangeField) {
                                return (
                                  <TimeRangePicker
                                    value={formData[fKey] || ''}
                                    onChange={(val) => handleInputChange(fKey, val)}
                                    placeholder={field.placeholder || 'Ví dụ: Từ tháng 10/2026 đến tháng 12/2026'}
                                    hasError={hasError}
                                  />
                                );
                              }
                              if (isDocNumberField) {
                                return (
                                  <DocumentNumberInput
                                    value={formData[fKey] || ''}
                                    onChange={(val) => handleInputChange(fKey, val)}
                                    docType={
                                      fKey === 'plan_code' || field.wordPlaceholder === '{{so_ke_hoach}}'
                                        ? 'KH'
                                        : 'TTr'
                                    }
                                    currentDepartment={formData.department || currentUser.department || ''}
                                    hasError={hasError}
                                    placeholderNumber="15"
                                  />
                                );
                              }
                              if (isDepartmentField) {
                                return (
                                  <DepartmentSelect
                                    id={`field-input-${fKey}`}
                                    value={formData[fKey] || ''}
                                    onChange={(val) => handleInputChange(fKey, val)}
                                    hasError={hasError}
                                    placeholder="-- Chọn Đơn vị / Khoa / Bộ môn trình --"
                                  />
                                );
                              }
                              if (isLocationField) {
                                return (
                                  <LocationSelect
                                    id={`field-input-${fKey}`}
                                    value={formData[fKey] || ''}
                                    onChange={(val) => handleInputChange(fKey, val)}
                                    hasError={hasError}
                                    placeholder="-- Chọn địa điểm chuyển giao --"
                                  />
                                );
                              }
                              if (isPhoneField) {
                                return (
                                  <input
                                    type="tel"
                                    value={formData[fKey] || ''}
                                    onChange={(e) => {
                                      const sanitized = e.target.value.replace(/[^0-9+\s.\-()]/g, '');
                                      handleInputChange(fKey, sanitized);
                                    }}
                                    placeholder={field.placeholder || 'Ví dụ: 0912.345.678'}
                                    maxLength={15}
                                    className={`w-full px-3 py-1.5 text-xs font-mono border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  />
                                );
                              }
                              if (isEmailField) {
                                return (
                                  <input
                                    type="email"
                                    value={formData[fKey] || ''}
                                    onChange={(e) => handleInputChange(fKey, e.target.value)}
                                    placeholder={field.placeholder || 'Ví dụ: canbo@ctump.edu.vn'}
                                    className={`w-full px-3 py-1.5 text-xs font-mono border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  />
                                );
                              }
                              if (field.type === 'number') {
                                return (
                                  <input
                                    type="number"
                                    value={formData[fKey] ?? ''}
                                    onChange={(e) => handleInputChange(fKey, e.target.value)}
                                    placeholder={field.placeholder || '0'}
                                    className={`w-full px-3 py-1.5 text-xs font-mono border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  />
                                );
                              }
                              if (field.type === 'date') {
                                return (
                                  <input
                                    type="date"
                                    value={formData[fKey] || ''}
                                    onChange={(e) => handleInputChange(fKey, e.target.value)}
                                    className={`w-full px-3 py-1.5 text-xs font-mono border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  />
                                );
                              }
                              if (field.type === 'select') {
                                return (
                                  <select
                                    value={formData[fKey] || ''}
                                    onChange={(e) => handleInputChange(fKey, e.target.value)}
                                    className={`w-full px-3 py-1.5 text-xs border rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  >
                                    <option value="">-- Chọn {field.label.toLowerCase()} --</option>
                                    {field.options?.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                );
                              }
                              if (field.type === 'radio') {
                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                    {field.options?.map((opt) => (
                                      <label
                                        key={opt}
                                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                          formData[fKey] === opt
                                            ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-medium'
                                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={fKey}
                                          checked={formData[fKey] === opt}
                                          onChange={() => handleInputChange(fKey, opt)}
                                          className="text-blue-600"
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                );
                              }
                              if (field.type === 'checkbox') {
                                return (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                    {field.options?.map((opt) => {
                                      const checked = Array.isArray(formData[fKey]) && formData[fKey].includes(opt);
                                      return (
                                        <label
                                          key={opt}
                                          className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                                            checked
                                              ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-medium'
                                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleCheckboxToggle(fKey, opt)}
                                            className="text-blue-600 rounded"
                                          />
                                          <span>{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              if (field.type === 'risk_table') {
                                const currentRisks = Array.isArray(formData[fKey]) && formData[fKey].length > 0
                                  ? formData[fKey]
                                  : [
                                      { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao do lịch giảng dạy, khám chữa bệnh dày đặc', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
                                      { stt: 2, yeu_to_rui_ro: 'Hạ tầng thiết bị, phần mềm tại đơn vị tiếp nhận chưa đồng bộ', p: 2, s: 3, r: 6, phan_loai: 'Trung bình' },
                                      { stt: 3, yeu_to_rui_ro: 'Nhân sự tiếp nhận chuyển giao luân chuyển hoặc chưa thành thạo kỹ thuật', p: 2, s: 2, r: 4, phan_loai: 'Thấp' },
                                    ];

                                const handleRiskChange = (idx: number, key: string, val: any) => {
                                  const updated = currentRisks.map((row: any, i: number) => {
                                    if (i !== idx) return row;
                                    const newRow = { ...row, [key]: val };
                                    if (key === 'p' || key === 's') {
                                      const pNum = Number(key === 'p' ? val : newRow.p) || 1;
                                      const sNum = Number(key === 's' ? val : newRow.s) || 1;
                                      const rVal = pNum * sNum;
                                      newRow.r = rVal;
                                      newRow.phan_loai = rVal <= 4 ? 'Thấp' : rVal <= 9 ? 'Trung bình' : 'Cao';
                                    }
                                    return newRow;
                                  });
                                  handleInputChange(fKey, updated);
                                };

                                const handleAddRisk = () => {
                                  const newRow = {
                                    stt: currentRisks.length + 1,
                                    yeu_to_rui_ro: '',
                                    p: 2,
                                    s: 2,
                                    r: 4,
                                    phan_loai: 'Thấp',
                                  };
                                  handleInputChange(fKey, [...currentRisks, newRow]);
                                };

                                const handleRemoveRisk = (idx: number) => {
                                  if (currentRisks.length <= 1) return;
                                  const filtered = currentRisks.filter((_: any, i: number) => i !== idx).map((r: any, i: number) => ({ ...r, stt: i + 1 }));
                                  handleInputChange(fKey, filtered);
                                };

                                return (
                                  <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200 rounded-lg">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse bg-white rounded-md overflow-hidden border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="py-2 px-2 text-center w-12 border-r border-slate-200">STT</th>
                                            <th className="py-2 px-3 text-left border-r border-slate-200">Công việc / Yếu tố rủi ro</th>
                                            <th className="py-2 px-2 text-center w-28 border-r border-slate-200">Khả năng (P)</th>
                                            <th className="py-2 px-2 text-center w-28 border-r border-slate-200">Ảnh hưởng (S)</th>
                                            <th className="py-2 px-2 text-center w-24 border-r border-slate-200">R = P x S</th>
                                            <th className="py-2 px-2 text-center w-28 border-r border-slate-200">Phân loại</th>
                                            <th className="py-2 px-2 text-center w-12">Xóa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {currentRisks.map((item: any, idx: number) => {
                                            const rVal = item.r !== undefined && item.r !== '' ? item.r : Number(item.p || 2) * Number(item.s || 2);
                                            const level = item.phan_loai || (rVal <= 4 ? 'Thấp' : rVal <= 9 ? 'Trung bình' : 'Cao');
                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                                                  {idx + 1}
                                                </td>
                                                <td className="py-1.5 px-2 border-r border-slate-200">
                                                  <input
                                                    type="text"
                                                    value={item.yeu_to_rui_ro || ''}
                                                    onChange={(e) => handleRiskChange(idx, 'yeu_to_rui_ro', e.target.value)}
                                                    placeholder="Nhập yếu tố rủi ro..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                  />
                                                </td>
                                                <td className="py-1.5 px-2 border-r border-slate-200">
                                                  <select
                                                    value={item.p ?? 2}
                                                    onChange={(e) => handleRiskChange(idx, 'p', Number(e.target.value))}
                                                    className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white text-center"
                                                  >
                                                    <option value={1}>1 - Rất thấp</option>
                                                    <option value={2}>2 - Thấp</option>
                                                    <option value={3}>3 - Trung bình</option>
                                                    <option value={4}>4 - Cao</option>
                                                    <option value={5}>5 - Rất cao</option>
                                                  </select>
                                                </td>
                                                <td className="py-1.5 px-2 border-r border-slate-200">
                                                  <select
                                                    value={item.s ?? 2}
                                                    onChange={(e) => handleRiskChange(idx, 's', Number(e.target.value))}
                                                    className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded bg-white text-center"
                                                  >
                                                    <option value={1}>1 - Rất nhẹ</option>
                                                    <option value={2}>2 - Nhẹ</option>
                                                    <option value={3}>3 - Đáng kể</option>
                                                    <option value={4}>4 - Nghiêm trọng</option>
                                                    <option value={5}>5 - Rất nghiêm trọng</option>
                                                  </select>
                                                </td>
                                                <td className="py-2 px-2 text-center font-bold text-slate-900 border-r border-slate-200">
                                                  {rVal}
                                                </td>
                                                <td className="py-2 px-2 text-center border-r border-slate-200">
                                                  <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                                      level === 'Cao'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : level === 'Trung bình'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                    }`}
                                                  >
                                                    {level}
                                                  </span>
                                                </td>
                                                <td className="py-1.5 px-2 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveRisk(idx)}
                                                    disabled={currentRisks.length <= 1}
                                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                                                    title="Xóa dòng"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleAddRisk}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm yếu tố rủi ro</span>
                                    </button>
                                  </div>
                                );
                              }

                              if (field.type === 'risk_control_table') {
                                const currentControls = Array.isArray(formData[fKey]) && formData[fKey].length > 0
                                  ? formData[fKey]
                                  : [
                                      { stt: 1, yeu_to_rui_ro: 'Chậm tiến độ chuyển giao', bien_phap: 'Lập tiến độ chi tiết theo tuần, phân công nhân sự dự phòng', don_vi_phu_trach: 'Chủ nhiệm đề tài', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trước và trong đợt chuyển giao', san_pham: 'Biên bản nghiệm thu đúng hạn' },
                                      { stt: 2, yeu_to_rui_ro: 'Hạ tầng chưa đồng bộ', bien_phap: 'Khảo sát tiền trạm, cấu hình thử nghiệm và nâng cấp thiết bị', don_vi_phu_trach: 'Bộ phận kỹ thuật', don_vi_phoi_hop: 'Phòng KH&CN', thoi_gian: 'Trước khi bàn giao 01 tuần', san_pham: 'Hệ thống vận hành ổn định' },
                                      { stt: 3, yeu_to_rui_ro: 'Nhân sự chưa thành thạo', bien_phap: 'Tổ chức tập huấn thực hành cầm tay chỉ việc, bàn giao tài liệu chi tiết', don_vi_phu_trach: 'Nhóm nghiên cứu', don_vi_phoi_hop: 'Đơn vị tiếp nhận', thoi_gian: 'Trong suốt kỳ chuyển giao', san_pham: '100% nhân sự đạt yêu cầu' },
                                    ];

                                const handleControlChange = (idx: number, key: string, val: any) => {
                                  const updated = currentControls.map((row: any, i: number) => {
                                    if (i !== idx) return row;
                                    return { ...row, [key]: val };
                                  });
                                  handleInputChange(fKey, updated);
                                };

                                const handleAddControl = () => {
                                  const newRow = {
                                    stt: currentControls.length + 1,
                                    yeu_to_rui_ro: '',
                                    bien_phap: '',
                                    don_vi_phu_trach: 'Chủ nhiệm đề tài',
                                    don_vi_phoi_hop: 'Đơn vị tiếp nhận',
                                    thoi_gian: 'Trước và trong đợt chuyển giao',
                                    san_pham: '',
                                  };
                                  handleInputChange(fKey, [...currentControls, newRow]);
                                };

                                const handleRemoveControl = (idx: number) => {
                                  if (currentControls.length <= 1) return;
                                  const filtered = currentControls.filter((_: any, i: number) => i !== idx).map((r: any, i: number) => ({ ...r, stt: i + 1 }));
                                  handleInputChange(fKey, filtered);
                                };

                                return (
                                  <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200 rounded-lg">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse bg-white rounded-md overflow-hidden border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="py-2 px-2 text-center w-10 border-r border-slate-200">Stt</th>
                                            <th className="py-2 px-2.5 text-left border-r border-slate-200">Yếu tố rủi ro</th>
                                            <th className="py-2 px-2.5 text-left border-r border-slate-200">Biện pháp kiểm soát</th>
                                            <th className="py-2 px-2 text-center w-28 border-r border-slate-200">Đơn vị phụ trách</th>
                                            <th className="py-2 px-2 text-center w-28 border-r border-slate-200">Đơn vị phối hợp</th>
                                            <th className="py-2 px-2 text-center w-32 border-r border-slate-200">Thời gian</th>
                                            <th className="py-2 px-2.5 text-left border-r border-slate-200">Sản phẩm</th>
                                            <th className="py-2 px-2 text-center w-10">Xóa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {currentControls.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                                                {idx + 1}
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.yeu_to_rui_ro || ''}
                                                  onChange={(e) => handleControlChange(idx, 'yeu_to_rui_ro', e.target.value)}
                                                  placeholder="Yếu tố rủi ro..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.bien_phap || ''}
                                                  onChange={(e) => handleControlChange(idx, 'bien_phap', e.target.value)}
                                                  placeholder="Biện pháp khắc phục..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.don_vi_phu_trach || ''}
                                                  onChange={(e) => handleControlChange(idx, 'don_vi_phu_trach', e.target.value)}
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.don_vi_phoi_hop || ''}
                                                  onChange={(e) => handleControlChange(idx, 'don_vi_phoi_hop', e.target.value)}
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.thoi_gian || ''}
                                                  onChange={(e) => handleControlChange(idx, 'thoi_gian', e.target.value)}
                                                  placeholder="Trước / trong đợt CG..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.san_pham || ''}
                                                  onChange={(e) => handleControlChange(idx, 'san_pham', e.target.value)}
                                                  placeholder="Biên bản / Kết quả..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveControl(idx)}
                                                  disabled={currentControls.length <= 1}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                                                  title="Xóa dòng"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={handleAddControl}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm biện pháp kiểm soát</span>
                                    </button>
                                  </div>
                                );
                              }

                                                                                          if (fKey === 'authors_group' || field.id === 'f-2a-authors-group') {
                                const parseAuthorRows = () => {
                                  if (Array.isArray(formData.ds_nhom_tac_gia) && formData.ds_nhom_tac_gia.length > 0) {
                                    return formData.ds_nhom_tac_gia;
                                  }
                                  const rawStr = String(formData[fKey] || '').trim();
                                  const lines = rawStr.split('\n').map((s) => s.trim()).filter(Boolean);
                                  if (lines.length > 0) {
                                    return lines.map((line, idx) => {
                                      const clean = line.replace(/^\d+\.\s*/, '').replace(/[;.,]+$/, '').trim();
                                      const parenMatch = clean.match(/^(.*?)\s*\(([^)]+)\)$/);
                                      if (parenMatch) {
                                        const inside = parenMatch[2].split(',').map((s) => s.trim()).filter(Boolean);
                                        const rawRole = inside[0] || 'Thành viên';
                                        const rawUnit = inside.slice(1).join(', ') || (formData.department || 'Khoa Y');
                                        return {
                                          stt: idx + 1,
                                          ho_ten: parenMatch[1].trim(),
                                          chuc_vu: `Giảng viên ${rawUnit}`,
                                          vai_tro: /chủ nhiệm|tác giả chính/i.test(rawRole)
                                            ? 'Tác giả chính, chủ trì xây dựng nội dung và triển khai chuyển giao kỹ thuật'
                                            : 'Thành viên',
                                        };
                                      }
                                      const parts = clean.split(/\s+[-–]\s+/).map((s) => s.trim()).filter(Boolean);
                                      if (parts.length >= 3) {
                                        return {
                                          stt: idx + 1,
                                          ho_ten: parts[0],
                                          chuc_vu: parts[1],
                                          vai_tro: parts.slice(2).join(' – '),
                                        };
                                      }
                                      if (parts.length === 2) {
                                        return {
                                          stt: idx + 1,
                                          ho_ten: parts[0],
                                          chuc_vu: '',
                                          vai_tro: parts[1],
                                        };
                                      }
                                      return {
                                        stt: idx + 1,
                                        ho_ten: clean,
                                        chuc_vu: formData.department || 'Trường ĐHYD Cần Thơ',
                                        vai_tro: idx === 0 ? 'Tác giả chính, chủ trì xây dựng nội dung và triển khai chuyển giao kỹ thuật' : 'Thành viên',
                                      };
                                    });
                                  }
                                  return [
                                    {
                                      stt: 1,
                                      ho_ten: formData.full_name || 'TS. Nguyễn Văn Nam',
                                      chuc_vu: `Giảng viên ${formData.department || 'Khoa Công nghệ Thông tin'}`,
                                      vai_tro: 'Tác giả chính, chủ trì xây dựng nội dung và triển khai chuyển giao kỹ thuật',
                                    },
                                    {
                                      stt: 2,
                                      ho_ten: 'ThS.BS. Lê Thị Thu Hà',
                                      chuc_vu: 'Giảng viên Khoa Y',
                                      vai_tro: 'Thành viên',
                                    },
                                  ];
                                };

                                const authorRows = parseAuthorRows();
                                const syncAuthorRows = (rows: any[]) => {
                                  const normalized = rows.map((r, i) => ({ ...r, stt: i + 1 }));
                                  handleInputChange('ds_nhom_tac_gia', normalized);
                                  const formattedLines = normalized
                                    .map((r, i) => {
                                      const parts = [r.ho_ten, r.chuc_vu, r.vai_tro]
                                        .map((x) => String(x || '').trim().replace(/[;.,]+$/, ''))
                                        .filter(Boolean);
                                      const punct = i === normalized.length - 1 ? '.' : ';';
                                      return `${i + 1}. ${parts.join(' – ')}${punct}`;
                                    })
                                    .join('\n');
                                  handleInputChange(fKey, formattedLines);
                                };

                                return (
                                  <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200 rounded-lg">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse bg-white rounded-md overflow-hidden border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="py-2 px-2 text-center w-12 border-r border-slate-200">STT</th>
                                            <th className="py-2 px-3 text-left w-56 border-r border-slate-200">Họ và tên / Học vị (hoặc Tập thể)</th>
                                            <th className="py-2 px-3 text-left w-56 border-r border-slate-200">Chức vụ / Đơn vị</th>
                                            <th className="py-2 px-3 text-left border-r border-slate-200">Vai trò trong chuyển giao</th>
                                            <th className="py-2 px-2 text-center w-12">Xóa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {authorRows.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                                                {idx + 1}
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.ho_ten || ''}
                                                  onChange={(e) => {
                                                    const next = authorRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, ho_ten: e.target.value } : r
                                                    );
                                                    syncAuthorRows(next);
                                                  }}
                                                  placeholder="VD: ThS. Trần Thị Bích Phương"
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.chuc_vu || ''}
                                                  onChange={(e) => {
                                                    const next = authorRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, chuc_vu: e.target.value } : r
                                                    );
                                                    syncAuthorRows(next);
                                                  }}
                                                  placeholder="VD: Phó Chánh Văn phòng Trường"
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.vai_tro || ''}
                                                  onChange={(e) => {
                                                    const next = authorRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, vai_tro: e.target.value } : r
                                                    );
                                                    syncAuthorRows(next);
                                                  }}
                                                  placeholder="VD: Tác giả chính, chủ trì xây dựng nội dung... / Thành viên"
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (authorRows.length <= 1) return;
                                                    syncAuthorRows(authorRows.filter((_: any, i: number) => i !== idx));
                                                  }}
                                                  disabled={authorRows.length <= 1}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          syncAuthorRows([
                                            ...authorRows,
                                            { stt: authorRows.length + 1, ho_ten: '', chuc_vu: '', vai_tro: 'Thành viên' },
                                          ])
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Thêm tác giả / thành viên</span>
                                      </button>
                                      <span className="text-[11px] text-slate-500 italic">
                                        Định dạng xuất chuẩn: 1. Họ tên – Chức vụ/Đơn vị – Vai trò; (dòng cuối kết thúc bằng dấu chấm .)
                                      </span>
                                    </div>
                                  </div>
                                );
                              }

                              if (fKey === 'workshop_program' || field.id === 'f-2a-workshop-program') {
                                const parseProgramRows = () => {
                                  if (Array.isArray(formData.ds_chuong_trinh_hoi_thao) && formData.ds_chuong_trinh_hoi_thao.length > 0) {
                                    return formData.ds_chuong_trinh_hoi_thao.map((r: any, idx: number) => {
                                      const tg = String(r.thoi_gian || '').trim();
                                      const nd = String(r.noi_dung || '').trim();
                                      const tp = String(r.thanh_phan || '').trim();
                                      if (!tg && nd.indexOf(':') > 0 && nd.indexOf(':') <= 25) {
                                        const cIdx = nd.indexOf(':');
                                        return {
                                          stt: idx + 1,
                                          thoi_gian: nd.slice(0, cIdx).trim(),
                                          noi_dung: nd.slice(cIdx + 1).trim(),
                                          thanh_phan: tp || 'Ban Tổ chức và đại biểu',
                                        };
                                      }
                                      return {
                                        stt: idx + 1,
                                        thoi_gian: tg,
                                        noi_dung: nd,
                                        thanh_phan: tp || 'Ban Tổ chức và đại biểu',
                                      };
                                    });
                                  }
                                  const rawStr = String(formData[fKey] || '');
                                  const lines = rawStr.split('\n').map((s) => s.trim()).filter(Boolean);
                                  if (lines.length > 0) {
                                    return lines.map((line, idx) => {
                                      if (line.includes('|')) {
                                        const parts = line.split('|').map((s) => s.trim());
                                        return { stt: idx + 1, thoi_gian: parts[0] || '', noi_dung: parts[1] || '', thanh_phan: parts[2] || 'Toàn thể đại biểu' };
                                      }
                                      const cIdx = line.indexOf(':');
                                      if (cIdx > 0 && cIdx <= 25) {
                                        return {
                                          stt: idx + 1,
                                          thoi_gian: line.slice(0, cIdx).trim(),
                                          noi_dung: line.slice(cIdx + 1).trim(),
                                          thanh_phan: 'Ban Tổ chức và đại biểu',
                                        };
                                      }
                                      return { stt: idx + 1, thoi_gian: '08h00 - 09h00', noi_dung: line, thanh_phan: 'Ban Tổ chức và đại biểu' };
                                    });
                                  }
                                  return [
                                    { stt: 1, thoi_gian: '08h00 - 08h30', noi_dung: 'Đón tiếp đại biểu, tuyên bố lý do, khai mạc', thanh_phan: 'Ban Tổ chức và đại biểu' },
                                    { stt: 2, thoi_gian: '08h30 - 10h00', noi_dung: 'Báo cáo giới thiệu sản phẩm và hướng dẫn kỹ thuật', thanh_phan: 'Nhóm tác giả đề tài' },
                                    { stt: 3, thoi_gian: '10h00 - 11h00', noi_dung: 'Thảo luận, thực hành và ký biên bản bàn giao', thanh_phan: 'Toàn thể đại biểu' },
                                  ];
                                };

                                const programRows = parseProgramRows();
                                const syncProgramRows = (rows: any[]) => {
                                  const normalized = rows.map((r, i) => ({ ...r, stt: i + 1 }));
                                  handleInputChange('ds_chuong_trinh_hoi_thao', normalized);
                                  handleInputChange(
                                    fKey,
                                    normalized.map((r) => `${r.thoi_gian} | ${r.noi_dung} | ${r.thanh_phan}`).join('\n')
                                  );
                                };

                                return (
                                  <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200 rounded-lg">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse bg-white rounded-md overflow-hidden border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="py-2 px-3 text-center w-36 border-r border-slate-200">Thời gian</th>
                                            <th className="py-2 px-3 text-left border-r border-slate-200">Nội dung</th>
                                            <th className="py-2 px-3 text-left w-48 border-r border-slate-200">Thành phần</th>
                                            <th className="py-2 px-2 text-center w-12">Xóa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {programRows.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.thoi_gian || ''}
                                                  onChange={(e) => {
                                                    const next = programRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, thoi_gian: e.target.value } : r
                                                    );
                                                    syncProgramRows(next);
                                                  }}
                                                  placeholder="08h00 - 08h30"
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded text-center"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.noi_dung || ''}
                                                  onChange={(e) => {
                                                    const next = programRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, noi_dung: e.target.value } : r
                                                    );
                                                    syncProgramRows(next);
                                                  }}
                                                  placeholder="Nội dung chương trình..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.thanh_phan || ''}
                                                  onChange={(e) => {
                                                    const next = programRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, thanh_phan: e.target.value } : r
                                                    );
                                                    syncProgramRows(next);
                                                  }}
                                                  placeholder="Thành phần tham dự..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (programRows.length <= 1) return;
                                                    syncProgramRows(programRows.filter((_: any, i: number) => i !== idx));
                                                  }}
                                                  disabled={programRows.length <= 1}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        syncProgramRows([
                                          ...programRows,
                                          { stt: programRows.length + 1, thoi_gian: '', noi_dung: '', thanh_phan: 'Toàn thể đại biểu' },
                                        ])
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm dòng chương trình</span>
                                    </button>
                                  </div>
                                );
                              }

                              if (fKey === 'workshop_assignments' || field.id === 'f-2a-workshop-assignments') {
                                const parseTaskRows = () => {
                                  if (Array.isArray(formData.ds_phan_cong_hoi_thao) && formData.ds_phan_cong_hoi_thao.length > 0) {
                                    return formData.ds_phan_cong_hoi_thao.map((r: any, idx: number) => {
                                      const nd = String(r.noi_dung || '').replace(/^\d+\.\s*/, '').trim();
                                      const pt = String(r.phu_trach || '').trim();
                                      if (!pt && nd.includes('|')) {
                                        const parts = nd.split('|').map((s) => s.trim());
                                        return { stt: idx + 1, noi_dung: parts[0] || '', phu_trach: parts[1] || 'Ban Tổ chức' };
                                      }
                                      return { stt: idx + 1, noi_dung: nd, phu_trach: pt || 'Nhóm tác giả & Ban Tổ chức' };
                                    });
                                  }
                                  const rawStr = String(formData[fKey] || '');
                                  const lines = rawStr.split('\n').map((s) => s.trim()).filter(Boolean);
                                  if (lines.length > 0) {
                                    return lines.map((line, idx) => {
                                      const clean = line.replace(/^\d+\.\s*/, '').trim();
                                      if (clean.includes('|')) {
                                        const parts = clean.split('|').map((s) => s.trim());
                                        return { stt: idx + 1, noi_dung: parts[0] || '', phu_trach: parts[1] || 'Ban Tổ chức' };
                                      }
                                      return { stt: idx + 1, noi_dung: clean, phu_trach: 'Nhóm tác giả & Ban Tổ chức' };
                                    });
                                  }
                                  return [
                                    { stt: 1, noi_dung: 'Chuẩn bị nội dung báo cáo và bộ tài liệu hướng dẫn kỹ thuật', phu_trach: 'Nhóm tác giả đề tài' },
                                    { stt: 2, noi_dung: 'Công tác hậu cần, hội trường và danh sách đại biểu', phu_trach: 'Đơn vị tiếp nhận & Ban Tổ chức' },
                                  ];
                                };

                                const taskRows = parseTaskRows();
                                const syncTaskRows = (rows: any[]) => {
                                  const normalized = rows.map((r, i) => ({ ...r, stt: i + 1 }));
                                  handleInputChange('ds_phan_cong_hoi_thao', normalized);
                                  handleInputChange(
                                    fKey,
                                    normalized.map((r) => `${r.noi_dung} | ${r.phu_trach}`).join('\n')
                                  );
                                };

                                return (
                                  <div className="space-y-3 bg-slate-50/70 p-3.5 border border-slate-200 rounded-lg">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs border-collapse bg-white rounded-md overflow-hidden border border-slate-200">
                                        <thead>
                                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="py-2 px-2 text-center w-12 border-r border-slate-200">STT</th>
                                            <th className="py-2 px-3 text-left border-r border-slate-200">Nội dung công việc</th>
                                            <th className="py-2 px-3 text-left w-56 border-r border-slate-200">Phụ trách</th>
                                            <th className="py-2 px-2 text-center w-12">Xóa</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {taskRows.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                              <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                                                {idx + 1}
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.noi_dung || ''}
                                                  onChange={(e) => {
                                                    const next = taskRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, noi_dung: e.target.value } : r
                                                    );
                                                    syncTaskRows(next);
                                                  }}
                                                  placeholder="Nội dung công việc..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 border-r border-slate-200">
                                                <input
                                                  type="text"
                                                  value={item.phu_trach || ''}
                                                  onChange={(e) => {
                                                    const next = taskRows.map((r: any, i: number) =>
                                                      i === idx ? { ...r, phu_trach: e.target.value } : r
                                                    );
                                                    syncTaskRows(next);
                                                  }}
                                                  placeholder="Đơn vị / Cá nhân phụ trách..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
                                                />
                                              </td>
                                              <td className="py-1.5 px-2 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    if (taskRows.length <= 1) return;
                                                    syncTaskRows(taskRows.filter((_: any, i: number) => i !== idx));
                                                  }}
                                                  disabled={taskRows.length <= 1}
                                                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 cursor-pointer"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        syncTaskRows([
                                          ...taskRows,
                                          { stt: taskRows.length + 1, noi_dung: '', phu_trach: '' },
                                        ])
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm công việc phân công</span>
                                    </button>
                                  </div>
                                );
                              }

                              if (field.type === 'textarea') {
                                return (
                                  <textarea
                                    rows={3}
                                    value={formData[fKey] || ''}
                                    onChange={(e) => handleInputChange(fKey, e.target.value)}
                                    placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
                                    className={`w-full px-3 py-1.5 text-xs border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                      hasError
                                        ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                    }`}
                                  />
                                );
                              }
                              return (
                                <input
                                  type="text"
                                  value={formData[fKey] || ''}
                                  onChange={(e) => handleInputChange(fKey, e.target.value)}
                                  placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                                  className={`w-full px-3 py-1.5 text-xs border rounded-md text-slate-900 focus:outline-none focus:ring-1 ${
                                    hasError
                                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                                      : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                                  }`}
                                />
                              );
                            })()}

                            {field.helpText && <p className="text-[11px] text-slate-500">{field.helpText}</p>}

                            {hasError && (
                              <p className="text-[11px] text-rose-600 font-medium">{errors[fKey]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start sm:items-center gap-2.5 text-xs text-rose-900 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-rose-950">
                  Còn {Object.keys(errors).length} trường thông tin bắt buộc chưa điền!
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Vui lòng điền đầy đủ các trường viền đỏ để gửi hồ sơ.
                </p>
              </div>
            </div>
          )}

          {/* Step 1 Actions Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleNextToReview}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <span>Xem trước văn bản Word</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Đang gửi hồ sơ...'
                  : editingDossier
                  ? `Gửi lại hồ sơ (Phiên bản v${nextVersionNumber})`
                  : 'Gửi hồ sơ ngay'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: REVIEW ENTERED DATA ================= */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900">
                Bước 2: Rà soát & Kiểm tra thông tin đã nhập
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vui lòng kiểm tra kỹ lưỡng các thông tin trước khi hệ thống tạo văn bản Word & PDF chính thức.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {template.fields.map((f) => {
                const fKey = f.name || f.key || f.id;
                const val = formData[fKey];

                return (
                  <div
                    key={f.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between py-2.5 gap-2"
                  >
                    <span className="text-xs font-semibold text-slate-600 sm:w-1/3">{f.label}</span>
                    <span className="text-xs text-slate-900 font-medium sm:w-2/3 break-words">
                      {Array.isArray(val) ? (
                        fKey === 'ds_danh_gia_rui_ro' ? (
                          <div className="overflow-x-auto w-full mt-1 border border-slate-200 rounded">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700">
                                <tr>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-10">STT</th>
                                  <th className="p-1.5 border-b border-slate-200">Công việc / Yếu tố rủi ro</th>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-16">P</th>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-16">S</th>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-16">R=PxS</th>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-24">Phân loại</th>
                                </tr>
                              </thead>
                              <tbody>
                                {val.map((r: any, idx: number) => (
                                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                                    <td className="p-1.5 font-mono text-center">{idx + 1}</td>
                                    <td className="p-1.5 font-medium">{r.yeu_to_rui_ro}</td>
                                    <td className="p-1.5 text-center">{r.p}</td>
                                    <td className="p-1.5 text-center">{r.s}</td>
                                    <td className="p-1.5 text-center font-bold">{r.r}</td>
                                    <td className="p-1.5 text-center font-semibold text-slate-800">{r.phan_loai}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : fKey === 'ds_kiem_soat_rui_ro' ? (
                          <div className="overflow-x-auto w-full mt-1 border border-slate-200 rounded">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700">
                                <tr>
                                  <th className="p-1.5 border-b border-slate-200 text-center w-10">Stt</th>
                                  <th className="p-1.5 border-b border-slate-200">Yếu tố rủi ro</th>
                                  <th className="p-1.5 border-b border-slate-200">Biện pháp kiểm soát</th>
                                  <th className="p-1.5 border-b border-slate-200">ĐV phụ trách</th>
                                  <th className="p-1.5 border-b border-slate-200">ĐV phối hợp</th>
                                  <th className="p-1.5 border-b border-slate-200">Thời gian</th>
                                  <th className="p-1.5 border-b border-slate-200">Sản phẩm</th>
                                </tr>
                              </thead>
                              <tbody>
                                {val.map((c: any, idx: number) => (
                                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                                    <td className="p-1.5 font-mono text-center">{idx + 1}</td>
                                    <td className="p-1.5 font-medium">{c.yeu_to_rui_ro}</td>
                                    <td className="p-1.5">{c.bien_phap}</td>
                                    <td className="p-1.5">{c.don_vi_phu_trach}</td>
                                    <td className="p-1.5">{c.don_vi_phoi_hop}</td>
                                    <td className="p-1.5">{c.thoi_gian}</td>
                                    <td className="p-1.5">{c.san_pham}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          val.join(', ')
                        )
                      ) : val !== undefined && val !== '' ? (
                        String(val)
                      ) : (
                        <span className="text-slate-400 italic">(Để trống)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại chỉnh sửa</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNextToPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
              >
                <span>Xem trước bản Word</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{editingDossier ? `Gửi lại hồ sơ (v${nextVersionNumber})` : 'Gửi hồ sơ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: WORD TEMPLATE PREVIEW ================= */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Bước 3: Bản Word hoàn chỉnh dự kiến được tạo
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các trường dữ liệu đã được tự động điền vào khung mẫu Word theo quy chuẩn hành chính.
              </p>
            </div>

            <button
              type="button"
              onClick={() => generateAndDownloadDocx(previewDossier, template)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Word (.docx)</span>
            </button>
          </div>

          <WordDocumentPreview dossier={previewDossier} template={template} />

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại bước kiểm tra</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{editingDossier ? `Gửi lại hồ sơ (v${nextVersionNumber})` : 'Xác nhận Gửi hồ sơ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: SUBMIT CONFIRMATION ================= */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-6 space-y-5 max-w-xl mx-auto">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center mx-auto">
                <Send className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {editingDossier
                  ? `Xác nhận gửi lại hồ sơ (Phiên bản v${nextVersionNumber})`
                  : 'Sẵn sàng gửi hồ sơ tới Quản trị viên'}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hồ sơ của Thầy/Cô sẽ được chuyển tới <strong>Cô Admin (Phòng Khoa học &amp; Công nghệ)</strong> kèm bộ file Word &amp; PDF phiên bản mới nhất.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Mã hồ sơ:</span>
                <span className="font-mono font-bold text-blue-700">{previewDossier.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Phiên bản:</span>
                <span className="font-mono font-bold text-indigo-700">v{nextVersionNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Biểu mẫu áp dụng:</span>
                <span className="font-medium text-slate-900 truncate max-w-[220px]">{template.title}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Trạng thái sau khi gửi:</span>
                <span className="font-semibold text-blue-800">Đã gửi đơn (Chờ Admin duyệt)</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p>
                  Hệ thống sẽ tự động kết xuất lại bộ file Word (.docx) và PDF (.pdf) khớp 100% với nội dung vừa chỉnh sửa.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại chỉnh sửa</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Đang gửi...'
                  : editingDossier
                  ? `Xác nhận Gửi lại hồ sơ (v${nextVersionNumber})`
                  : 'Xác nhận Gửi hồ sơ'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
