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
  Eye,
  FileText,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { TimeRangePicker, DocumentNumberInput, DepartmentSelect, LocationSelect } from '../components/common';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { normalizeNFC } from '../utils/textUtils';
import { OFFICIAL_TEMPLATES } from '../constants';

interface CreateDossierViewProps {
  selectedTemplate: WordTemplate | null;
  templates: WordTemplate[];
  currentUser: UserProfile;
  editingDossier?: Dossier | null;
  onSaveDraft: (dossier: Dossier) => void;
  onSubmitDossier: (dossier: Dossier) => void;
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
        fields: (item.fields && item.fields.length > 0) ? item.fields : (fallback?.fields || []),
        sections: (item.sections && item.sections.length > 0) ? item.sections : (fallback?.sections || []),
      };
    });
  }, [templates]);

  // If no template is selected, choose the first or initial one
  const [template, setTemplate] = useState<WordTemplate>(() => {
    if (initialTemplate) {
      const match = safeTemplates.find((t) => t.id === initialTemplate.id || t.code === initialTemplate.code);
      return match || initialTemplate;
    }
    if (editingDossier && safeTemplates.length > 0) {
      return safeTemplates.find((t) => t.id === editingDossier.templateId) || safeTemplates[0];
    }
    return safeTemplates[0] || OFFICIAL_TEMPLATES[0];
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    if (initialTemplate) {
      const match = safeTemplates.find((t) => t.id === initialTemplate.id || t.code === initialTemplate.code);
      setTemplate(match || initialTemplate);
    } else if (editingDossier && safeTemplates.length > 0) {
      const match = safeTemplates.find((t) => t.id === editingDossier.templateId);
      if (match) setTemplate(match);
    } else if ((!template || !template.id || !template.fields || template.fields.length === 0) && safeTemplates.length > 0) {
      setTemplate(safeTemplates[0]);
    }
    if (editingDossier && editingDossier.formData) {
      setFormData({ ...editingDossier.formData });
    }
  }, [initialTemplate, editingDossier, safeTemplates]);

  // Form values state
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (editingDossier && editingDossier.formData) {
      return { ...editingDossier.formData };
    }
    // Seed defaults: user profile fields + field.defaultValue from template
    const activeTemplate = (initialTemplate
      ? safeTemplates.find((t) => t.id === initialTemplate.id) || initialTemplate
      : safeTemplates[0] || OFFICIAL_TEMPLATES[0]);
    const defaults: Record<string, any> = {
      full_name: currentUser.name || '',
      department: currentUser.department || '',
      phone: currentUser.phone || '',
      position: currentUser.title || '',
    };
    // Pre-fill any field that has a defaultValue
    (activeTemplate?.fields || []).forEach((f) => {
      const key = f.name || f.key || f.id;
      if (f.defaultValue !== undefined && f.defaultValue !== '' && defaults[key] === undefined) {
        defaults[key] = f.defaultValue;
      }
    });
    return defaults;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // When template changes
  const handleTemplateChange = (newTemplateId: string) => {
    const found = safeTemplates.find((t) => t.id === newTemplateId);
    if (found) {
      setTemplate(found);
      const defaults: Record<string, any> = {
        full_name: currentUser.name || '',
        department: currentUser.department || '',
        phone: currentUser.phone || '',
        position: currentUser.title || '',
      };
      // Pre-fill field.defaultValue for new template
      (found.fields || []).forEach((f) => {
        const key = f.name || f.key || f.id;
        if (f.defaultValue !== undefined && f.defaultValue !== '' && defaults[key] === undefined) {
          defaults[key] = f.defaultValue;
        }
      });
      setFormData(defaults);
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
    const currentList: string[] = Array.isArray(formData[fieldName])
      ? formData[fieldName]
      : [];
    const nextList = currentList.includes(option)
      ? currentList.filter((item) => item !== option)
      : [...currentList, option];
    handleInputChange(fieldName, nextList);
  };

  // Helper kiểm tra định dạng số điện thoại Việt Nam hợp lệ
  const isValidVietnamesePhone = (phoneStr: string): boolean => {
    if (!phoneStr) return true;
    const clean = phoneStr.replace(/[\s.\-()]/g, '');
    // Di động: 10 số đầu 03, 05, 07, 08, 09 (hoặc +84); Cố định: 10-11 số đầu 02 (ví dụ Cần Thơ 0292)
    const phoneRegex = /^(0|\+84)(2\d{8,9}|[35789]\d{8})$/;
    return phoneRegex.test(clean);
  };

  // Helper kiểm tra email công vụ CTUMP (@ctump.edu.vn)
  const isValidCtumpEmail = (emailStr: string): boolean => {
    if (!emailStr) return true;
    const clean = emailStr.trim().toLowerCase();
    // Chấp nhận đuôi @ctump.edu.vn hoặc subdomain @*.ctump.edu.vn, đồng thời hỗ trợ email admin dev thử nghiệm
    const isCtump = clean.endsWith('@ctump.edu.vn') || clean.endsWith('.ctump.edu.vn') || clean === 'toanhkhai12345@gmail.com';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return isCtump && emailRegex.test(clean);
  };

  // Validation with auto-scroll to first invalid field
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (template && template.fields) {
      for (const field of template.fields) {
        const key = field.name || field.key || field.id;
        const val = formData[key];

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

        // 1. Kiểm tra trường bắt buộc
        if (field.required) {
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            newErrors[key] = `${field.label} là trường bắt buộc`;
          }
        }

        // 2. Ép điều kiện số điện thoại hợp lệ
        if (isPhone && val && typeof val === 'string' && val.trim() !== '') {
          if (!isValidVietnamesePhone(val)) {
            newErrors[key] = 'Số điện thoại không hợp lệ (Cần 10 số di động 03/05/07/08/09 hoặc số bàn 02, ví dụ: 0912.345.678 hoặc 0292.3831.531)';
          }
        }

        // 3. Ép điều kiện email công vụ CTUMP (@ctump.edu.vn)
        if (isEmail && val && typeof val === 'string' && val.trim() !== '') {
          if (!isValidCtumpEmail(val)) {
            newErrors[key] = 'Email liên hệ phải có đuôi trường @ctump.edu.vn (Ví dụ: canbo@ctump.edu.vn)';
          }
        }

        // 4. Ép điều kiện số văn bản / số tờ trình (Bắt buộc phải có số thứ tự)
        const isDocNumber =
          key === 'proposal_number' ||
          key === 'plan_code' ||
          field.wordPlaceholder === '{{so_to_trinh}}' ||
          field.wordPlaceholder === '{{so_ke_hoach}}' ||
          field.id === 'f-1a-proposal-number' ||
          field.id === 'f-2a-plan-code';

        if (isDocNumber && field.required) {
          const str = String(val || '').trim();
          const numPart = str.split('/')[0]?.trim();
          if (!numPart || numPart === '...' || /^\.+$/.test(numPart)) {
            newErrors[key] = `Vui lòng nhập số của ${field.label.toLowerCase()} (bắt buộc, ví dụ: 15)`;
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

  // Construct draft dossier
  const buildCurrentDossier = (status: Dossier['status']): Dossier => {
    const code =
      editingDossier?.code ||
      `HS-2026-${Math.floor(100 + Math.random() * 900)}`;

    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');

    return {
      id: editingDossier?.id || `hs-${Date.now()}`,
      code,
      templateId: template.id,
      templateTitle: template.title,
      templateCode: template.code,
      createdBy: editingDossier?.createdBy || currentUser,
      assignedManager: {
        name: template.manager,
        email: 'mai.tt@ctump.edu.vn',
        department: 'Phòng Hành chính - Tổng hợp',
      },
      createdAt: editingDossier?.createdAt || nowStr,
      submittedAt: status === 'submitted' || status === 'resubmitted' ? nowStr : editingDossier?.submittedAt,
      status,
      formData,
      docxFileName: `${code}_${template.code.replace(/[^a-zA-Z0-9]/g, '_')}_${formData.full_name?.replace(/\s+/g, '') || 'BieuMau'}.docx`,
      timeline: [
        ...(editingDossier?.timeline || []),
        {
          id: `tl-${Date.now()}`,
          title:
            status === 'draft'
              ? 'Lưu bản nháp hồ sơ'
              : editingDossier?.status === 'changes_requested'
              ? 'Chỉnh sửa và gửi lại hồ sơ cho người quản lý'
              : 'Hoàn thành và gửi hồ sơ trực tuyến',
          actor: currentUser.name,
          role: currentUser.title,
          timestamp: nowReadable,
          status,
        },
      ],
    };
  };

  const handleSaveDraft = () => {
    const dossier = buildCurrentDossier('draft');
    onSaveDraft(dossier);
    setSaveSuccessMsg('Đã lưu bản nháp thành công! Bạn có thể xem lại tại mục "Hồ sơ của tôi".');
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

  const handleFinalSubmit = () => {
    const nextStatus = editingDossier?.status === 'changes_requested' ? 'resubmitted' : 'submitted';
    const dossier = buildCurrentDossier(nextStatus);
    onSubmitDossier(dossier);
  };

  const previewDossier = buildCurrentDossier('draft');

  // Group fields by section
  const sections = template.sections && template.sections.length > 0
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
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {editingDossier ? `Chỉnh sửa hồ sơ: ${editingDossier.code}` : 'Khởi tạo hồ sơ trực tuyến'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu mẫu: <span className="font-semibold text-slate-800">{template.title}</span> ({template.code})
          </p>
        </div>

        {/* Action Save Draft */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-slate-500" />
            <span>Lưu bản nháp</span>
          </button>
        </div>
      </div>

      {/* Save Draft / Auto-fill notification message */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          {saveSuccessMsg.includes('Lưu bản nháp') && (
            <button
              type="button"
              onClick={() => onNavigate('my_dossiers')}
              className="font-semibold text-emerald-900 hover:underline cursor-pointer"
            >
              Đến Hồ sơ của tôi &rarr;
            </button>
          )}
        </div>
      )}

      {/* 4-Step Stepper Progress Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Điền thông tin', sub: 'Chuyển placeholder Word' },
            { step: 2, label: '2. Kiểm tra dữ liệu', sub: 'Rà soát tính chính xác' },
            { step: 3, label: '3. Tạo biểu mẫu Word', sub: 'Xem trước chuẩn A4' },
            { step: 4, label: '4. Gửi hồ sơ', sub: 'Chuyển Người quản lý' },
          ].map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <div
                key={s.step}
                onClick={() => {
                  if (s.step < currentStep) setCurrentStep(s.step as any);
                }}
                className={`flex flex-col p-2 rounded-md border transition-colors ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-50/60 shadow-2xs'
                    : isCompleted
                    ? 'border-emerald-300 bg-emerald-50/40 cursor-pointer'
                    : 'border-slate-200 bg-slate-50 opacity-70'
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
                  {isCompleted && (
                    <span className="text-[10px] text-emerald-800 font-medium">Hoàn tất</span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] text-blue-900 font-semibold">Đang nhập</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-900 leading-tight truncate">
                  {s.label}
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline truncate">
                  {s.sub}
                </span>
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

            {/* Template Selector dropdown & Quick Fill button */}
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

          {/* If changes requested, show manager review alert */}
          {editingDossier?.reviewNotes && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md space-y-1 text-xs text-rose-950">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Yêu cầu chỉnh sửa từ Người quản lý ({editingDossier.assignedManager?.name || 'Phòng KH&CN'}):</span>
              </div>
              <p className="italic pl-5 font-medium">"{editingDossier.reviewNotes}"</p>
              <p className="text-[11px] text-rose-700 pl-5">Vui lòng cập nhật các trường liên quan bên dưới và gửi lại hồ sơ.</p>
            </div>
          )}

          {/* Form Groups by Section */}
          <div className="space-y-4">
            {sections.map((sectionName) => {
              const fieldsInSection = template.fields.filter((f) => {
                const fSection = f.section || 'Nội dung chi tiết';
                return fSection === sectionName || (!template.sections?.includes(fSection) && sectionName === 'Nội dung chi tiết');
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
                    {/* Tích chọn điều kiện theo đặc tả Cô Trúc: Hội thảo */}
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

                    {/* Tích chọn điều kiện theo đặc tả Cô Trúc: Kinh phí */}
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
                                handleInputChange('transfer_cost', '0');
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
                      // Tự động ẩn các trường hội thảo khi không chọn có hội thảo
                      const isWorkshopHidden = (formData.co_hoi_thao === false || formData.has_workshop === false) &&
                        (fKey.includes('workshop') || field.label.toLowerCase().includes('hội thảo'));
                      if (isWorkshopHidden) return null;
                      const isTimeRangeField =
                        fKey === 'transfer_time' ||
                        fKey === 'transfer_date' ||
                        field.wordPlaceholder === '{{thoi_gian}}' ||
                        field.id === 'f-1a-transfer-time' ||
                        field.id === 'f-2a-transfer-date';

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
                        isTimeRangeField ||
                        isDocNumberField ||
                        isLocationField;
                      const hasError = !!errors[fKey];

                      return (
                        <div
                          key={field.id}
                          id={`field-${fKey}`}
                          className={`space-y-1 p-2 rounded-lg transition-colors ${
                            hasError
                              ? 'bg-rose-50/60 ring-1 ring-rose-300'
                              : ''
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

                          {/* Field rendering by type (exclusive conditional rendering) */}
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
                                  docType={fKey === 'plan_code' || field.wordPlaceholder === '{{so_ke_hoach}}' ? 'KH' : 'TTr'}
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
                                    // Chỉ cho phép nhập số, dấu +, dấu chấm, gạch ngang, khoảng trắng
                                    const sanitized = e.target.value.replace(/[^0-9+\s.\-()]/g, '');
                                    handleInputChange(fKey, sanitized);
                                  }}
                                  onBlur={() => {
                                    if (formData[fKey] && !isValidVietnamesePhone(String(formData[fKey]))) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        [fKey]: 'Số điện thoại không hợp lệ (Ví dụ: 0912.345.678 hoặc 0292.3831.531)',
                                      }));
                                    }
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
                                  onBlur={() => {
                                    if (formData[fKey] && !isValidCtumpEmail(String(formData[fKey]))) {
                                      setErrors((prev) => ({
                                        ...prev,
                                        [fKey]: 'Email liên hệ phải có đuôi trường @ctump.edu.vn (Ví dụ: canbo@ctump.edu.vn)',
                                      }));
                                    }
                                  }}
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

                          {field.helpText && (
                            <p className="text-[11px] text-slate-500">{field.helpText}</p>
                          )}

                          {hasError && (
                            <p className="text-[11px] text-rose-600 font-medium">
                              {errors[fKey]}
                            </p>
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

          {/* Validation Error Alert Box if any errors exist */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start sm:items-center gap-2.5 text-xs text-rose-900 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-rose-950">
                  Chưa thể chuyển bước: Còn {Object.keys(errors).length} trường thông tin bắt buộc chưa điền!
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Hệ thống đã tự động cuộn đến vị trí trường còn thiếu (viền đỏ). Vui lòng điền đầy đủ các thông tin cần thiết để tiếp tục.
                </p>
              </div>
            </div>
          )}

          {/* Step 1 Actions Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={handleNextToReview}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <span>Tiếp tục: Kiểm tra dữ liệu</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
                Vui lòng kiểm tra kỹ lưỡng các thông tin trước khi hệ thống tạo văn bản Word chính thức.
              </p>
            </div>

            {/* Summary List */}
            <div className="divide-y divide-slate-100">
              {template.fields.map((f) => {
                const fKey = f.name || f.key || f.id;
                const val = formData[fKey];

                return (
                  <div
                    key={f.id}
                    className="flex flex-col sm:flex-row sm:items-start justify-between py-2.5 gap-2"
                  >
                    <span className="text-xs font-semibold text-slate-600 sm:w-1/3">
                      {f.label}
                    </span>
                    <span className="text-xs text-slate-900 font-medium sm:w-2/3 break-words">
                      {Array.isArray(val)
                        ? val.join(', ')
                        : val !== undefined && val !== ''
                        ? String(val)
                        : <span className="text-slate-400 italic">(Để trống)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2 Actions Footer */}
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
              onClick={handleNextToPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <span>Xác nhận & Xem trước bản Word</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
              <span>Tải file Word nháp (.docx)</span>
            </button>
          </div>

          {/* Word Paper Document Preview */}
          <WordDocumentPreview
            dossier={previewDossier}
            template={template}
          />

          {/* Step 3 Actions Footer */}
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
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <span>Chuyển sang bước Gửi hồ sơ</span>
              <ArrowRight className="w-3.5 h-3.5" />
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
                Sẵn sàng gửi hồ sơ tới Quản trị viên
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hồ sơ của Thầy/Cô sẽ được chuyển trực tiếp tới hàng đợi tiền kiểm của{' '}
                <strong>Quản trị viên (Phòng Khoa học &amp; Công nghệ)</strong> để thẩm định thể thức và phê duyệt.
              </p>
            </div>

            {/* Submission card details */}
            <div className="p-3.5 bg-slate-50 rounded-md border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Mã hồ sơ tự sinh:</span>
                <span className="font-mono font-bold text-blue-700">{previewDossier.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Biểu mẫu áp dụng:</span>
                <span className="font-medium text-slate-900 truncate max-w-[220px]">{template.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Người nộp hồ sơ:</span>
                <span className="text-slate-900 font-medium">{currentUser.name} (Thầy / Cô)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Người phê duyệt:</span>
                <span className="font-semibold text-emerald-800">Quản trị viên (Phòng KH&amp;CN)</span>
              </div>
              <div className="flex justify-between py-1 border-t border-slate-200">
                <span className="text-slate-500">Trạng thái sau khi gửi:</span>
                <span className="font-semibold text-amber-800">Chờ Admin duyệt (Tiền kiểm)</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p>
                  Sau khi Thầy/Cô gửi nộp, Quản trị viên sẽ tiến hành tiền kiểm. Thầy/Cô có thể theo dõi tiến độ thẩm định, xem phản hồi hoặc tải file Word bất kỳ lúc nào tại mục <strong>"Hồ sơ của tôi"</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại xem trước</span>
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Xác nhận Gửi hồ sơ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
