import React from 'react';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileSignature,
  FileEdit,
  ArrowRight,
  TrendingUp,
  Plus,
  Eye,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { Dossier, WordTemplate, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateAndDownloadDocx } from '../utils/docxExport';

interface DashboardViewProps {
  dossiers: Dossier[];
  templates: WordTemplate[];
  currentUser: UserProfile;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectDossier: (dossier: Dossier) => void;
  onCreateWithTemplate: (template: WordTemplate) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dossiers,
  templates,
  currentUser,
  onNavigate,
  onSelectDossier,
  onCreateWithTemplate,
}) => {
  // Statistics calculations
  const totalCount = dossiers.length;
  const draftCount = dossiers.filter((d) => d.status === 'draft').length;
  const processingCount = dossiers.filter((d) =>
    ['submitted', 'under_review', 'resubmitted'].includes(d.status)
  ).length;
  const changesCount = dossiers.filter((d) => d.status === 'changes_requested').length;
  const approvedCount = dossiers.filter((d) => d.status === 'approved').length;
  const signatureCount = dossiers.filter((d) => d.status === 'for_signature' || d.status === 'completed').length;

  const recentDossiers = dossiers.slice(0, 6);

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Institutional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tổng quan hệ thống xử lý hồ sơ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ thẩm định, phê duyệt biểu mẫu và lưu trữ văn bản theo quy định
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('create_dossier')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo hồ sơ mới</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('pending_approval')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <span>Hồ sơ chờ duyệt</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Total */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium">Tổng số hồ sơ</span>
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-900">{totalCount}</span>
            <span className="text-[10.5px] text-slate-400">Tất cả</span>
          </div>
        </div>

        {/* Drafts */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium">Bản nháp</span>
            <FileEdit className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-700">{draftCount}</span>
            <span className="text-[10.5px] text-slate-400">Chưa gửi</span>
          </div>
        </div>

        {/* Processing */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-amber-800">Đang xử lý</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-700">{processingCount}</span>
            <span className="text-[10.5px] text-amber-600 font-medium">Chờ duyệt</span>
          </div>
        </div>

        {/* Changes requested */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-rose-800">Yêu cầu sửa</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-700">{changesCount}</span>
            <span className="text-[10.5px] text-rose-600 font-medium">Cần bổ sung</span>
          </div>
        </div>

        {/* Approved */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-emerald-800">Đã duyệt</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">{approvedCount}</span>
            <span className="text-[10.5px] text-emerald-600 font-medium">Hợp lệ</span>
          </div>
        </div>

        {/* For signature */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-[11.5px] font-medium text-sky-800">Trình ký / Xong</span>
            <FileSignature className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-sky-900">{signatureCount}</span>
            <span className="text-[10.5px] text-sky-600 font-medium">Lưu trữ</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Dossiers Table (Takes 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hồ sơ gần đây</h2>
              <p className="text-xs text-slate-500">Danh sách các hồ sơ được khởi tạo và cập nhật mới nhất</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Mã hồ sơ</th>
                  <th className="py-3 px-4">Tên biểu mẫu</th>
                  <th className="py-3 px-4">Người tạo</th>
                  <th className="py-3 px-4">Ngày tạo</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentDossiers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate font-medium text-slate-900">
                      {d.templateTitle}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div>{d.createdBy.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[130px]">{d.createdBy.department}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(d)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Xem chi tiết & Kiểm tra"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => generateAndDownloadDocx(d)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Tải file Word .docx"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fast Form Pickers & Workflow Guidelines */}
        <div className="space-y-6">
          {/* Quick template launchers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Biểu mẫu thông dụng
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('templates')}
                className="text-xs text-blue-700 font-semibold hover:underline"
              >
                Xem tất cả ({templates.length})
              </button>
            </div>

            <div className="space-y-2">
              {templates.slice(0, 4).map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => onCreateWithTemplate(tmpl)}
                  className="p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 rounded font-semibold">
                        {tmpl.code}
                      </span>
                      <span className="text-[11px] text-slate-400">· {tmpl.category}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                      {tmpl.title}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Guide Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Quy trình xử lý hồ sơ hành chính
            </h3>

            <div className="space-y-2 text-slate-600">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <p><strong>Chọn biểu mẫu Word:</strong> Hệ thống chuyển placeholder thành form nhập liệu.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <p><strong>Điền online & Lưu nháp:</strong> Không cần tải file Word về máy sửa tay.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <p><strong>Người quản lý duyệt:</strong> Thẩm định đối soát, yêu cầu sửa hoặc duyệt.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">4</span>
                <p><strong>Trình ký & Google Sheets:</strong> Tự động đẩy dữ liệu sang bảng tính trung tâm và in ký.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
