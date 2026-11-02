import React from 'react';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileSignature,
  ArrowRight,
  Plus,
  Eye,
  Award,
} from 'lucide-react';
import { Dossier, WordTemplate, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { normalizeStatus } from '../services/workflowEngine';
import { isAdminUser } from '../constants';

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
  const isManager = isAdminUser(currentUser);

  const userDossiers = isManager
    ? safeDossiers
    : safeDossiers.filter(
        (d) =>
          d.createdBy?.id === currentUser?.id ||
          d.createdBy?.email === currentUser?.email
      );

  const totalCount = userDossiers.length;

  const pendingActionCount = userDossiers.filter((d) => {
    const st = normalizeStatus(d.status);
    return st === 'SUBMITTED' || st === 'RETURNED_FOR_REVISION';
  }).length;

  const validatedCount = userDossiers.filter(
    (d) => normalizeStatus(d.status) === 'VALIDATED'
  ).length;

  const signingCount = userDossiers.filter((d) => {
    const st = normalizeStatus(d.status);
    return st === 'PENDING_SIGNED_REVIEW' || st === 'WAITING_RECTOR_SIGNATURE';
  }).length;

  const completedCount = userDossiers.filter(
    (d) => normalizeStatus(d.status) === 'SIGNED_ARCHIVED'
  ).length;

  const recentDossiers = userDossiers.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (Tổng số: <strong className="font-mono text-slate-800">{totalCount}</strong> hồ sơ)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isManager
              ? 'Tổng quan Điều hành Xét duyệt & Trình ký Hồ sơ CGCN'
              : 'Tổng quan Hồ sơ cá nhân của Thầy / Cô'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Theo dõi hồ sơ mới nộp, trả về sửa lỗi, trình ký Hiệu trưởng và lưu trữ văn bản đã ký'
              : 'Theo dõi tiến trình xét duyệt từ Phòng KH&CN, tải file PDF chuẩn và quản lý văn bản đã ký lưu trữ'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isManager ? (
            <button
              type="button"
              onClick={() => onNavigate('create_dossier')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo hồ sơ mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('pending_approval')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Bàn làm việc Xét duyệt</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <span>{isManager ? 'Danh sách xét duyệt' : 'Hồ sơ của tôi'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Đã gửi / Trả về sửa lỗi</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900">{pendingActionCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chờ duyệt hoặc cần chỉnh sửa nộp lại
            </p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Hồ sơ đã được duyệt</span>
            <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-sky-700">{validatedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Đã xuất PDF chuẩn đi trình ký phòng ban</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Chờ duyệt / Chờ ký HT</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <FileSignature className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-800">{signingCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Đã tải bản ký phòng ban & chờ ký Hiệu trưởng</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Đã ký và lưu trữ</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-800">{completedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Hoàn tất trình ký Hiệu trưởng & lưu trữ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hồ sơ gần đây</h2>
            <p className="text-xs text-slate-500">Các hồ sơ vừa được cập nhật trong hệ thống</p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Xem tất cả danh sách</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã hồ sơ & Phiên bản</th>
                <th className="py-3 px-4">Tên biểu mẫu & Nội dung</th>
                <th className="py-3 px-4">Người nộp</th>
                <th className="py-3 px-4">Ngày nộp</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentDossiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm">Chưa có hồ sơ nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bấm nút "Tạo hồ sơ mới" để bắt đầu quy trình chuyển giao công nghệ.
                    </p>
                  </td>
                </tr>
              ) : (
                recentDossiers.map((d) => {
                  const ver = d.current_version || d.currentVersion || 1;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700">{d.code}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            v{ver}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 truncate">
                          {d.title || d.templateTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {d.templateTitle}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">{d.createdBy.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {d.createdBy.department}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(d.submittedAt || d.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={d.status} />
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(d)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-slate-700 hover:text-blue-800 hover:bg-blue-50 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
