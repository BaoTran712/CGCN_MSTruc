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
import { getDossierDate } from '../utils/statusHelpers';

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
      {/* ── Top Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isManager
              ? 'Tổng quan xét duyệt & trình ký'
              : 'Tổng quan hồ sơ của tôi'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống quản lý hồ sơ chuyển giao công nghệ ({totalCount} hồ sơ)
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!isManager ? (
            <button
              type="button"
              onClick={() => onNavigate('create_dossier')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo hồ sơ mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('pending_approval')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Xử lý hồ sơ chờ duyệt</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Minimalist Metric Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Chờ duyệt / Cần sửa */}
        <div
          onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Đã gửi / Cần sửa
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50/80 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {pendingActionCount}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
              Chờ xử lý &rarr;
            </span>
          </div>
        </div>

        {/* Card 2: Đã duyệt thể thức */}
        <div
          onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Đã duyệt thể thức
            </span>
            <span className="w-8 h-8 rounded-xl bg-sky-50/80 text-sky-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {validatedCount}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
              Đã xuất PDF &rarr;
            </span>
          </div>
        </div>

        {/* Card 3: Đang trình ký */}
        <div
          onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Đang trình ký
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50/80 text-amber-600 flex items-center justify-center shrink-0">
              <FileSignature className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {signingCount}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
              Chờ ký duyệt &rarr;
            </span>
          </div>
        </div>

        {/* Card 4: Đã ký & Lưu trữ */}
        <div
          onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
          className="group p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Đã ký &amp; Lưu trữ
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {completedCount}
            </span>
            <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
              Hoàn tất &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ── Recent Dossiers Table Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Hồ sơ gần đây</span>
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Các hồ sơ vừa được cập nhật hoặc tạo mới trong hệ thống
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200/60 rounded-lg transition-all duration-150 cursor-pointer self-start sm:self-auto"
          >
            <span>Xem tất cả danh sách</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/70 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Mã hồ sơ & Phiên bản</th>
                <th className="py-3.5 px-6">Tên biểu mẫu & Nội dung</th>
                <th className="py-3.5 px-6">Người nộp</th>
                <th className="py-3.5 px-6">Ngày nộp</th>
                <th className="py-3.5 px-6">Trạng thái</th>
                <th className="py-3.5 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentDossiers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-6 text-center text-slate-500">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 mx-auto mb-3 shadow-2xs">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-800 text-sm">Chưa có hồ sơ nào được ghi nhận</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Bấm nút "Tạo hồ sơ mới" để bắt đầu quy trình chuyển giao công nghệ Mẫu 1a & 2a.
                    </p>
                    {!isManager && (
                      <button
                        type="button"
                        onClick={() => onNavigate('create_dossier')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-xl shadow-xs transition-colors mt-4 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tạo hồ sơ ngay</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                recentDossiers.map((d) => {
                  const ver = d.current_version || d.currentVersion || 1;
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-blue-50/30 transition-colors duration-150 group border-b border-slate-100/80 last:border-b-0"
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-800 text-xs">{d.code}</span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                            v{ver}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6 max-w-sm">
                        <div className="font-semibold text-slate-900 text-xs truncate group-hover:text-blue-900 transition-colors">
                          {d.title || d.templateTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                          {d.templateTitle}
                        </div>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">{d.createdBy?.name || 'Cán bộ'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px] mt-0.5">
                          {d.createdBy?.department || 'Trường ĐHYD Cần Thơ'}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {getDossierDate(d)}
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <StatusBadge status={d.status} />
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-800 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg shadow-2xs transition-all duration-150 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
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
