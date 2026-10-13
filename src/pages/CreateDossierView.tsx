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
  }, [initialTemplate, editingDossier, safeTemplates]);

  // Form values state
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    if (editingDossier && editingDossier.formData) {
      return { ...editingDossier.formData };
    }
    // Default values from user profile and template
    const defaults: Record<string, any> = {
      full_name: currentUser.name,
      department: currentUser.department,
      phone: currentUser.phone,
      position: currentUser.title,
    };
    if (template && template.fields && Array.isArray(template.fields)) {
      template.fields.forEach((f) => {
        const key = f.name || f.key || f.id;
        if (f.defaultValue !== undefined) {
          defaults[key] = f.defaultValue;
        }
      });
    }
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
        full_name: currentUser.name,
        department: currentUser.department,
        phone: currentUser.phone,
        position: currentUser.title,
      };
      if (found.fields && Array.isArray(found.fields)) {
        found.fields.forEach((f) => {
          const key = f.name || f.key || f.id;
          if (f.defaultValue !== undefined) {
            defaults[key] = f.defaultValue;
          }
        });
      }
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

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (template && template.fields) {
      for (const field of template.fields) {
        const key = field.name || field.key || field.id;
        if (field.required) {
          const val = formData[key];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            newErrors[key] = `${field.label} là trường bắt buộc`;
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      {/* Save Draft notification message */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('my_dossiers')}
            className="font-semibold text-emerald-900 hover:underline"
          >
            Đến Hồ sơ của tôi &rarr;
          </button>
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

            {/* Template Selector dropdown */}
            <div className="w-full md:w-64 shrink-0">
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

                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {fieldsInSection.map((field) => {
                      const fKey = field.name || field.key || field.id;
                      const isFullWidth = field.type === 'textarea' || field.type === 'checkbox';
                      const hasError = !!errors[fKey];

                      return (
                        <div
                          key={field.id}
                          className={`space-y-1 ${isFullWidth ? 'md:col-span-2' : ''}`}
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

                          {/* Field rendering by type */}
                          {field.type === 'text' && (
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
                          )}

                          {field.type === 'number' && (
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
                          )}

                          {field.type === 'date' && (
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
                          )}

                          {field.type === 'select' && (
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
                          )}

                          {field.type === 'radio' && (
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
                          )}

                          {field.type === 'checkbox' && (
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
                          )}

                          {field.type === 'textarea' && (
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
                          )}

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
              );
            })}
          </div>

          {/* Step 1 Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={handleNextToReview}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
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
                Sẵn sàng gửi hồ sơ kiểm tra
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hồ sơ của đồng chí sẽ được chuyển trực tiếp tới hộp thư chờ duyệt của người quản lý:{' '}
                <strong>{template.manager}</strong> ({template.category}).
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
                <span className="text-slate-900 font-medium">{currentUser.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Trạng thái sau khi gửi:</span>
                <span className="font-semibold text-amber-800">Chờ duyệt</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <p>
                  Sau khi gửi, đồng chí có thể theo dõi tiến độ thẩm định, xem yêu cầu chỉnh sửa (nếu có), hoặc tải file Word đã phê duyệt bất kỳ lúc nào tại mục <strong>"Hồ sơ của tôi"</strong>.
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
