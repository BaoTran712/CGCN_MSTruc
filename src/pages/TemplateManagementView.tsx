import React, { useState } from 'react';
import {
  FileCode2,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Check,
  X,
  Eye,
  FileText,
  Tag,
  ToggleLeft,
  ToggleRight,
  Shield,
  Layers,
  Sparkles,
  FileCode,
} from 'lucide-react';
import { WordTemplate, FormFieldConfig, FieldType } from '../types';
import { WordXmlInspectorModal } from '../components/modals/WordXmlInspectorModal';

interface TemplateManagementViewProps {
  templates: WordTemplate[];
  onAddTemplate: (newTemplate: WordTemplate) => void;
  onUpdateTemplate: (updatedTemplate: WordTemplate) => void;
}

export const TemplateManagementView: React.FC<TemplateManagementViewProps> = ({
  templates,
  onAddTemplate,
  onUpdateTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WordTemplate>(templates[0]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingField, setEditingField] = useState<FormFieldConfig | null>(null);
  const [showXmlInspectorModal, setShowXmlInspectorModal] = useState(false);

  // Field modal state
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldSection, setFieldSection] = useState('Thông tin hồ sơ');
  const [fieldWordPlaceholder, setFieldWordPlaceholder] = useState('');

  // New Template form state
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<WordTemplate['category']>('Hành chính');
  const [newDescription, setNewDescription] = useState('');
  const [newVersion, setNewVersion] = useState('1.0');
  const [newFileName, setNewFileName] = useState('Mau_Bieu_Moi.docx');

  const handleOpenAddField = () => {
    setEditingField(null);
    setFieldLabel('');
    setFieldName('');
    setFieldType('text');
    setFieldRequired(true);
    setFieldPlaceholder('');
    setFieldSection(selectedTemplate.sections[0] || 'Thông tin người đề nghị');
    setFieldWordPlaceholder('');
    setShowFieldModal(true);
  };

  const handleOpenEditField = (field: FormFieldConfig) => {
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldName(field.name || field.key || field.id);
    setFieldType(field.type || field.fieldType || 'text');
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder || '');
    setFieldSection(field.section || 'Thông tin người đề nghị');
    setFieldWordPlaceholder(field.wordPlaceholder || `{{${field.name || field.key || field.id}}}`);
    setShowFieldModal(true);
  };

  const handleSaveField = () => {
    const autoName =
      fieldName.trim() ||
      fieldLabel
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');

    const autoWord = fieldWordPlaceholder.trim() || `{{${autoName}}}`;

    const config: FormFieldConfig = {
      id: editingField?.id || `f-${Date.now()}`,
      name: autoName,
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder,
      section: fieldSection,
      wordPlaceholder: autoWord,
    };

    let updatedFields: FormFieldConfig[];
    if (editingField) {
      updatedFields = selectedTemplate.fields.map((f) =>
        f.id === editingField.id ? config : f
      );
    } else {
      updatedFields = [...selectedTemplate.fields, config];
    }

    const updatedTemplate = {
      ...selectedTemplate,
      fields: updatedFields,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    setSelectedTemplate(updatedTemplate);
    onUpdateTemplate(updatedTemplate);
    setShowFieldModal(false);
  };

  const handleDeleteField = (fieldId: string) => {
    const updated = {
      ...selectedTemplate,
      fields: selectedTemplate.fields.filter((f) => f.id !== fieldId),
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setSelectedTemplate(updated);
    onUpdateTemplate(updated);
  };

  const handleSaveNewTemplate = () => {
    if (!newTitle.trim() || !newCode.trim()) return;

    const created: WordTemplate = {
      id: `tmpl-${Date.now()}`,
      code: newCode.trim(),
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim() || 'Mô tả biểu mẫu hành chính ban hành nội bộ.',
      version: newVersion,
      updatedAt: new Date().toISOString().slice(0, 10),
      manager: 'Ban Giám Hiệu',
      active: true,
      fileName: newFileName,
      fileSize: '45.0 KB',
      downloadsCount: 0,
      sections: ['Thông tin người đề nghị', 'Nội dung đề xuất', 'Kế hoạch thực hiện'],
      fields: [
        {
          id: `f-${Date.now()}-1`,
          name: 'full_name',
          label: 'Họ và tên người lập',
          type: 'text',
          required: true,
          section: 'Thông tin người đề nghị',
          wordPlaceholder: '{{ho_va_ten}}',
        },
        {
          id: `f-${Date.now()}-2`,
          name: 'department',
          label: 'Đơn vị / Phòng ban',
          type: 'text',
          required: true,
          section: 'Thông tin người đề nghị',
          wordPlaceholder: '{{don_vi}}',
        },
        {
          id: `f-${Date.now()}-3`,
          name: 'content',
          label: 'Nội dung chi tiết',
          type: 'textarea',
          required: true,
          section: 'Nội dung đề xuất',
          wordPlaceholder: '{{noi_dung_chi_tiet}}',
        },
      ],
    };

    onAddTemplate(created);
    setSelectedTemplate(created);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              QUẢN TRỊ VIÊN & PHỤ TRÁCH BIỂU MẪU
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý & Cấu hình Biểu mẫu Word (Placeholder Mapping)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tập trung các file mẫu Word .docx, ánh xạ các trường dữ liệu trực tuyến vào placeholder Word
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowXmlInspectorModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-blue-700" />
            <span>Bóc tách XML (.docx)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm biểu mẫu mới</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Template List on Left, Form Builder on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3.5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
              Danh sách Biểu mẫu hiện hành ({templates.length})
            </h3>

            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setIsCreatingNew(false);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplate.id === tmpl.id && !isCreatingNew
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {tmpl.code}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">v{tmpl.version}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-1">
                    {tmpl.title}
                  </h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span>{tmpl.category}</span>
                    <span className="font-mono">{tmpl.fields.length} trường</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Template Detail & Field Builder */}
        <div className="lg:col-span-8 space-y-6">
          {/* If creating new template */}
          {isCreatingNew ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Thêm mới Biểu mẫu Word vào hệ thống
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Hủy bỏ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã hiệu biểu mẫu (Code) *
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Ví dụ: BM-06/DNTT"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lĩnh vực phân loại *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="Hành chính">Hành chính</option>
                    <option value="Nhân sự">Nhân sự</option>
                    <option value="Tài chính - Kế toán">Tài chính - Kế toán</option>
                    <option value="Đào tạo">Đào tạo</option>
                    <option value="Quản trị thiết bị">Quản trị thiết bị</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên đầy đủ biểu mẫu Word *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ví dụ: Giấy đề nghị thanh toán công tác phí kỳ 1"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mô tả phạm vi áp dụng
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Mô tả mục đích sử dụng biểu mẫu và các đối tượng áp dụng..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mô phỏng đính kèm file Word template (.docx)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">Kéo thả file .docx hoặc click để chọn mẫu</p>
                    <p className="text-[11px] text-slate-400 mt-1">Đã chuẩn bị file: {newFileName}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!newCode || !newTitle}
                  onClick={handleSaveNewTemplate}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  Lưu & Bắt đầu cấu hình trường
                </button>
              </div>
            </div>
          ) : (
            /* Editing existing template fields */
            <div className="space-y-6">
              {/* Template Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedTemplate.code}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">Phiên bản {selectedTemplate.version}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">
                      {selectedTemplate.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedTemplate.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenAddField}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm trường nhập liệu</span>
                    </button>
                  </div>
                </div>

                {/* File info banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-400 block">File Word gốc:</span>
                    <span className="font-mono text-slate-700 font-medium truncate block">{selectedTemplate.fileName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Dung lượng:</span>
                    <span className="font-mono text-slate-700">{selectedTemplate.fileSize}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Phụ trách:</span>
                    <span className="text-slate-700 font-medium truncate block">{selectedTemplate.manager}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Trạng thái:</span>
                    <span className="text-emerald-700 font-semibold">Đang hoạt động</span>
                  </div>
                </div>
              </div>

              {/* Form Fields Table Mapping */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Cấu hình trường dữ liệu trực tuyến ({selectedTemplate.fields.length} trường)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Tương thích mẫu Carbone / Word placeholder
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Tên trường (Label)</th>
                        <th className="py-2.5 px-4">Mã trường (Key)</th>
                        <th className="py-2.5 px-4">Kiểu dữ liệu</th>
                        <th className="py-2.5 px-4">Bắt buộc</th>
                        <th className="py-2.5 px-4">Placeholder trong Word</th>
                        <th className="py-2.5 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedTemplate.fields.map((field) => (
                        <tr key={field.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {field.label}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                            {field.name}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              {field.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {field.required ? (
                              <span className="text-rose-600 font-medium">Bắt buộc</span>
                            ) : (
                              <span className="text-slate-400">Tùy chọn</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800">
                            {field.wordPlaceholder || `{{${field.name}}}`}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditField(field)}
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Sửa trường"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteField(field.id)}
                                className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title="Xóa trường"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Field Config Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-100 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                {editingField ? 'Chỉnh sửa trường dữ liệu' : 'Thêm trường dữ liệu mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFieldModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên hiển thị (Label) *
                </label>
                <input
                  type="text"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="Ví dụ: Họ và tên người đề nghị"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã biến (Variable key)
                  </label>
                  <input
                    type="text"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="full_name"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kiểu nhập liệu *
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as FieldType)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="text">Text (Văn bản ngắn)</option>
                    <option value="textarea">Textarea (Đoạn văn dài)</option>
                    <option value="number">Number (Số lượng, tiền tệ)</option>
                    <option value="date">Date (Ngày tháng)</option>
                    <option value="select">Select (Danh sách chọn)</option>
                    <option value="radio">Radio (Chọn một)</option>
                    <option value="checkbox">Checkbox (Chọn nhiều)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Placeholder khớp trong file Word (.docx)
                </label>
                <input
                  type="text"
                  value={fieldWordPlaceholder}
                  onChange={(e) => setFieldWordPlaceholder(e.target.value)}
                  placeholder="{{ho_va_ten}}"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-blue-800 bg-blue-50/40 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nhóm thông tin (Section)
                </label>
                <select
                  value={fieldSection}
                  onChange={(e) => setFieldSection(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  {selectedTemplate.sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="rounded text-blue-700"
                  />
                  <span className="font-semibold text-slate-800">
                    Bắt buộc người dùng phải điền (Required)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFieldModal(false)}
                className="px-3.5 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!fieldLabel.trim()}
                onClick={handleSaveField}
                className="px-4 py-1.5 font-semibold text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-50 rounded-md shadow-2xs cursor-pointer transition-colors"
              >
                Lưu cấu hình trường
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Word XML Inspector Modal */}
      <WordXmlInspectorModal
        isOpen={showXmlInspectorModal}
        onClose={() => setShowXmlInspectorModal(false)}
      />
    </div>
  );
};
