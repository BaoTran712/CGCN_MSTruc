import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Clock,
  User,
  ArrowRight,
  Download,
  Info,
  CheckCircle,
  LayoutGrid,
  List,
} from 'lucide-react';
import { WordTemplate } from '../types';

interface TemplatesViewProps {
  templates: WordTemplate[];
  onSelectTemplate: (template: WordTemplate) => void;
  onViewDetails: (template: WordTemplate) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onSelectTemplate,
  onViewDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'updatedAt' | 'downloads'>('updatedAt');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const categories = [
    { id: 'all', label: 'Tất cả biểu mẫu' },
    { id: 'Hành chính', label: 'Hành chính' },
    { id: 'Nhân sự', label: 'Nhân sự' },
    { id: 'Tài chính - Kế toán', label: 'Tài chính - Kế toán' },
    { id: 'Quản trị thiết bị', label: 'Quản trị thiết bị' },
  ];

  // Filtering
  const filteredTemplates = templates
    .filter((tmpl) => {
      const matchSearch =
        tmpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === 'all' || tmpl.category === selectedCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'downloads') return b.downloadsCount - a.downloadsCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              KHO BIỂU MẪU HÀNH CHÍNH
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh mục Biểu mẫu Word Trực tuyến
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chọn biểu mẫu chuẩn hóa để hệ thống sinh form online và tự động xuất tài liệu Word có cấu trúc
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-blue-800 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Dạng lưới thẻ"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-blue-800 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Dạng bảng chi tiết"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search, Category Tabs, Sort Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên biểu mẫu, mã ký hiệu (BM-01...), hoặc mô tả..."
              className="w-full pl-8 pr-4 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="updatedAt">Mới cập nhật nhất</option>
              <option value="title">Tên biểu mẫu (A-Z)</option>
              <option value="downloads">Lượt sử dụng nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-800 text-white font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-slate-200 hover:border-blue-300 shadow-2xs transition-colors flex flex-col justify-between overflow-hidden group"
            >
              {/* Card top */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {template.code}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    v{template.version} · {template.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-800 transition-colors">
                  {template.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {template.description}
                </p>

                {/* Metadata list */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Người phụ trách:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{template.manager}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Số trường nhập liệu:</span>
                    <span className="font-mono text-slate-800 font-semibold">{template.fields.length} trường</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cập nhật gần nhất:</span>
                    <span className="font-mono text-slate-500">{template.updatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Card bottom actions */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onViewDetails(template)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTemplate(template)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <span>Sử dụng biểu mẫu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã</th>
                <th className="py-3 px-4">Tên biểu mẫu Word</th>
                <th className="py-3 px-4">Lĩnh vực</th>
                <th className="py-3 px-4">Phiên bản</th>
                <th className="py-3 px-4">Người quản lý</th>
                <th className="py-3 px-4">Cập nhật</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTemplates.map((tmpl) => (
                <tr key={tmpl.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">
                    {tmpl.code}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                    <div>{tmpl.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1">{tmpl.description}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{tmpl.category}</td>
                  <td className="py-3 px-4 font-mono text-[11px]">v{tmpl.version}</td>
                  <td className="py-3 px-4 text-slate-600">{tmpl.manager}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{tmpl.updatedAt}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(tmpl)}
                        className="px-2.5 py-1 text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-50 transition-colors text-xs cursor-pointer"
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(tmpl)}
                        className="px-3 py-1 bg-blue-800 hover:bg-blue-900 text-white rounded font-medium transition-colors text-xs shadow-2xs cursor-pointer"
                      >
                        Sử dụng
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200 p-8 space-y-2 shadow-2xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">Không tìm thấy biểu mẫu phù hợp</h3>
          <p className="text-xs text-slate-500">Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc danh mục.</p>
        </div>
      )}
    </div>
  );
};
