import React, { useState, useEffect } from 'react';
import { Edit3, X, Save, History, FileText } from 'lucide-react';
import { Application, DocumentTemplate } from '../../types';
import { normalizeNFC } from '../../utils/textUtils';

interface ManagerEditDossierModalProps {
  dossier: Application | null;
  template: DocumentTemplate | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSaveManagerEdit: (
    dossierId: string,
    updatedFormData: Record<string, any>,
    changeSummary: string
  ) => Promise<void>;
}

export const ManagerEditDossierModal: React.FC<ManagerEditDossierModalProps> = ({
  dossier,
  template,
  isOpen,
  onClose,
  onSaveManagerEdit,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [changeSummary, setChangeSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dossier) {
      setFormData({ ...(normalizeNFC(dossier.formData) || {}) });
      setChangeSummary('');
      setError('');
    }
  }, [dossier]);

  if (!isOpen || !dossier) return null;

  const fields = template?.fields || [];

  const handleFieldChange = (key: string, value: any) => {
    const normalizedVal = normalizeNFC(value);
    setFormData((prev) => ({ ...prev, [key]: normalizedVal }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeSummary.trim()) {
      setError('Vui lòng nhập tóm tắt nội dung chỉnh sửa.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSaveManagerEdit(dossier.id, formData, changeSummary);
      onClose();
    } catch (err) {
      setError('Lỗi khi lưu thông tin chỉnh sửa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50/70 border-b border-amber-200/60 shrink-0">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Edit3 className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Trưởng phòng Chỉnh sửa Dữ liệu ({dossier.code})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            <div className="p-3 rounded-md bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Lưu ý quản trị:</span> Mọi thao tác sửa đổi thông tin của Trưởng phòng sẽ tự động tạo một phiên bản mới trong{' '}
              <span className="font-semibold underline">DossierVersion History</span> và ghi nhật ký{' '}
              <span className="font-semibold underline">AuditLog (UPDATE_DATA)</span> không thể thay đổi.
            </div>

            {/* Dynamic Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => {
                const key = field.name || field.key || field.id;
                const value = formData[key] !== undefined ? formData[key] : '';

                if (field.type === 'textarea' || field.fieldType === 'TEXTAREA') {
                  return (
                    <div key={field.id} className="md:col-span-2 space-y-1">
                      <label className="block text-xs font-semibold text-slate-800">
                        {field.label}
                      </label>
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>
                  );
                }

                if (field.type === 'select' || field.fieldType === 'SELECT') {
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-800">
                        {field.label}
                      </label>
                      <select
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white"
                      >
                        <option value="">-- Chọn --</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-800">
                      {field.label}
                    </label>
                    <input
                      type={field.type === 'number' || field.fieldType === 'NUMBER' ? 'number' : field.type === 'date' || field.fieldType === 'DATE' ? 'date' : 'text'}
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Change Summary input */}
            <div className="pt-4 border-t border-slate-200 space-y-1.5">
              <label className="block text-xs font-bold text-slate-900">
                Lý do & Tóm tắt chỉnh sửa <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => {
                  setChangeSummary(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ví dụ: Đã chuẩn hóa số tiền bằng chữ và đính kèm danh mục vật tư"
                className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
              {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3 bg-slate-50 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md shadow-2xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSubmitting ? 'Đang tạo Version mới...' : 'Lưu dữ liệu & Tạo Phiên bản mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
