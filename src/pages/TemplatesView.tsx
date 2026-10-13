import React, { useState, useMemo } from 'react';
import {
  Search,
  FileText,
  ArrowRight,
  Plus,
  UploadCloud,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { WordTemplate, ActiveNavTab } from '../types';
import { OFFICIAL_TEMPLATES } from '../constants';

interface TemplatesViewProps {
  templates: WordTemplate[];
  onSelectTemplate: (template: WordTemplate) => void;
  onViewDetails: (template: WordTemplate) => void;
  onNavigate?: (tab: ActiveNavTab) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates = [],
  onSelectTemplate,
  onViewDetails,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const safeTemplates = useMemo(() => {
    const list = Array.isArray(templates) && templates.length > 0 ? templates : OFFICIAL_TEMPLATES;
    return list.map((item) => {
      const fallback = OFFICIAL_TEMPLATES.find((t) => t.id === item.id || t.code === item.code);
      return {
        ...fallback,
        ...item,
        fields: (item.fields && item.fields.length > 0) ? item.fields : (fallback?.fields || []),
      };
    });
  }, [templates]);

  const filteredTemplates = safeTemplates.filter((tmpl) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tmpl.title.toLowerCase().includes(q) ||
      tmpl.code.toLowerCase().includes(q) ||
      tmpl.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header đơn giản & rõ ràng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Danh mục Biểu mẫu Word</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              {safeTemplates.length} biểu mẫu
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chọn biểu mẫu để điền thông tin trực tuyến và tự động xuất file Word (.docx)
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('template_management')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tải lên / Thêm biểu mẫu mới</span>
          </button>
        )}
      </div>

      {/* Tìm kiếm nhanh tối giản */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh theo tên hoặc mã biểu mẫu..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 placeholder:text-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* Lưới thẻ biểu mẫu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
          >
            {/* Nội dung chính của thẻ */}
            <div className="p-5 space-y-3">
              {/* Badge mã biểu mẫu */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/80">
                  {template.code}
                </span>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {template.fileName?.endsWith('.doc') ? '.doc' : '.docx'}
                </span>
              </div>

              {/* Tên biểu mẫu */}
              <h2 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-800 transition-colors">
                {template.title}
              </h2>

              {/* Mô tả biểu mẫu */}
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {template.description}
              </p>

              {/* Thống kê ngắn gọn */}
              <div className="pt-2 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {template.fields?.length || 0} trường nhập liệu
                </span>
                <span>·</span>
                <span>v{template.version}</span>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onViewDetails(template)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Chi tiết</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTemplate(template)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <span>Sử dụng biểu mẫu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Thẻ Upload biểu mẫu mới (dành cho các biểu mẫu sau này up lên) */}
        {onNavigate && (
          <div
            onClick={() => onNavigate('template_management')}
            className="bg-slate-50/60 hover:bg-blue-50/40 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-all p-6 flex flex-col items-center justify-center text-center cursor-pointer group min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-full bg-white group-hover:bg-blue-100/60 border border-slate-200 group-hover:border-blue-300 flex items-center justify-center text-slate-400 group-hover:text-blue-700 transition-all mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-800 mb-1">
              + Tải lên biểu mẫu mới
            </h3>
            <p className="text-xs text-slate-500 max-w-[220px] leading-relaxed">
              Tải file Word (.docx) hoặc cấu hình mẫu mới vào hệ thống
            </p>
          </div>
        )}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8 space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">Không tìm thấy biểu mẫu</h3>
          <p className="text-xs text-slate-500">Thử tìm kiếm bằng từ khóa khác hoặc xóa ô tìm kiếm.</p>
        </div>
      )}
    </div>
  );
};
