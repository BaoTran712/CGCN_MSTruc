import React from 'react';
import { WordTemplate } from '../../types';
import { FileText, ArrowRight, X, Calendar, User, Download, ShieldCheck, Tag } from 'lucide-react';

interface TemplateDetailModalProps {
  template: WordTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: WordTemplate) => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {template.code}
                </span>
                <span className="text-xs text-slate-500 font-medium">Phiên bản {template.version}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {template.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Phân loại:</span>
              <span className="font-semibold text-slate-800">{template.category}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Người phụ trách:</span>
              <span className="font-semibold text-slate-800 truncate block">{template.manager}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Cập nhật:</span>
              <span className="font-mono text-slate-800">{template.updatedAt}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">File gốc:</span>
              <span className="font-mono text-slate-800 truncate block">{template.fileSize}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Mục đích & Phạm vi áp dụng
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {template.description}
            </p>
          </div>

          {/* Placeholders and input fields mapping */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Các trường thông tin sẽ điền trực tuyến ({template.fields.length} trường)
              </h3>
              <span className="text-[11px] text-slate-400">Tự động điền vào mẫu Word</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="py-2 px-3">Tên trường (Label)</th>
                    <th className="py-2 px-3">Kiểu dữ liệu</th>
                    <th className="py-2 px-3">Bắt buộc</th>
                    <th className="py-2 px-3">Biến Word (Placeholder)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {template.fields.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-medium text-slate-900">{f.label}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{f.type}</td>
                      <td className="py-2 px-3">
                        {f.required ? (
                          <span className="text-rose-600 font-semibold">Bắt buộc</span>
                        ) : (
                          <span className="text-slate-400">Tùy chọn</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-700 bg-blue-50/40">
                        {f.wordPlaceholder || `{{${f.name}}}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Mẫu biểu chuẩn hóa hành chính</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onUseTemplate(template);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              <span>Sử dụng biểu mẫu này</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
