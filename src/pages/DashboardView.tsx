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
import { normalizeStatus } from '../services/workflowEngine';

interface DashboardViewProps {
  dossiers: Dossier[];
  templates?: WordTemplate[];
  currentUser: UserProfile;
  onNavigate: (tab: ActiveNavTab) => void;
  onSelectDossier: (dossier: Dossier) => void;
  onCreateWithTemplate?: (template: WordTemplate) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dossiers = [],
  currentUser,
  onNavigate,
  onSelectDossier,
}) => {
  const safeDossiers = Array.isArray(dossiers) ? dossiers : [];

  // Statistics calculations theo đúng 5 mốc của quy_trinh.md
  const totalCount = safeDossiers.length;
  const newCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'NEW').length;
  const revisionCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'NEEDS_REVISION').length;
  const precheckPassedCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'PRECHECK_PASSED').length;
  const signingCount = safeDossiers.filter((d) => ['FACULTY_SIGNED', 'SCHOOL_SIGNING'].includes(normalizeStatus(d.status))).length;
  const completedCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'COMPLETED').length;

  const recentDossiers = safeDossiers.slice(0, 6);

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin' || currentUser.role === 'ADMIN';

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
            Tổng quan hệ thống xử lý hồ sơ Chuyển giao Công nghệ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ tiền kiểm, ký số điện tử liên cấp và ban hành Quyết định CGCN theo quy trình Automation
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
            <span>Hồ sơ chờ tiền kiểm</span>
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

        {/* Chờ tiền kiểm */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-blue-800">Chờ tiền kiểm</span>
            <Clock className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-blue-700">{newCount}</span>
            <span className="text-[10.5px] text-blue-600 font-medium">Bản thảo Word</span>
          </div>
        </div>

        {/* Yêu cầu sửa */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-rose-800">Yêu cầu sửa</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-700">{revisionCount}</span>
            <span className="text-[10.5px] text-rose-600 font-medium">Chưa duyệt</span>
          </div>
        </div>

        {/* Đã duyệt thể thức */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11.5px] font-medium text-indigo-800">Duyệt thể thức</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-indigo-700">{precheckPassedCount}</span>
            <span className="text-[10.5px] text-indigo-600 font-medium">Đã xuất PDF</span>
          </div>
        </div>

        {/* Đang trình ký số */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-[11.5px] font-medium text-amber-800">Trình ký liên cấp</span>
            <FileSignature className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-900">{signingCount}</span>
            <span className="text-[10.5px] text-amber-700 font-medium">Khoa / Trường</span>
          </div>
        </div>

        {/* Hoàn tất */}
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 mb-2">
            <span className="text-[11.5px] font-medium text-emerald-800">Đã ban hành QĐ</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-800">{completedCount}</span>
            <span className="text-[10.5px] text-emerald-600 font-medium">Lưu Drive</span>
          </div>
        </div>
      </div>

      {/* Main Recent Dossiers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
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
              {recentDossiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm">Hệ thống chưa có hồ sơ nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">Hệ thống mới hoàn toàn. Hãy tạo hồ sơ đầu tiên để bắt đầu.</p>
                    <button
                      type="button"
                      onClick={() => onNavigate('create_dossier')}
                      className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo hồ sơ đầu tiên</span>
                    </button>
                  </td>
                </tr>
              ) : (
                recentDossiers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {d.code}
                    </td>
                    <td className="py-3 px-4 max-w-md truncate font-medium text-slate-900">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
