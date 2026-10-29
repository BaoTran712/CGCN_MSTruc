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
  Layers,
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

  // Thống kê theo phân quyền (Nếu User: đếm hồ sơ của cá nhân; Nếu Admin: đếm toàn hệ thống)
  const userDossiers = isManager
    ? safeDossiers
    : safeDossiers.filter(
        (d) =>
          d.createdBy?.id === currentUser?.id ||
          d.createdBy?.email === currentUser?.email
      );

  const totalCount = userDossiers.length;
  // 1. Nhóm cần xử lý (Mới nộp hoặc cần chỉnh sửa)
  const pendingActionCount = userDossiers.filter((d) => {
    const st = normalizeStatus(d.status);
    return st === 'NEW' || st === 'NEEDS_REVISION';
  }).length;

  // 2. Nhóm đã duyệt thể thức / Đang xin ký Khoa
  const precheckPassedCount = userDossiers.filter(
    (d) => normalizeStatus(d.status) === 'PRECHECK_PASSED'
  ).length;

  // 3. Nhóm đang trình ký liên cấp (Khoa & Trường)
  const signingCount = userDossiers.filter((d) => {
    const st = normalizeStatus(d.status);
    return st === 'FACULTY_SIGNED' || st === 'SCHOOL_SIGNING';
  }).length;

  // 4. Nhóm đã hoàn tất & Ban hành QĐ
  const completedCount = userDossiers.filter(
    (d) => normalizeStatus(d.status) === 'COMPLETED'
  ).length;

  const recentDossiers = userDossiers.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
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
              ? 'Tổng quan điều hành Hồ sơ Chuyển giao Công nghệ'
              : 'Tổng quan Hồ sơ cá nhân của Thầy / Cô'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManager
              ? 'Theo dõi tiến độ tiền kiểm bản thảo, luồng ký số liên cấp và ban hành Quyết định chính thức'
              : 'Theo dõi tiến trình thẩm định từ Phòng KH&CN, nhận kết quả và quản lý các văn bản chuyển giao'}
          </p>
        </div>

        {/* Quick Action Button */}
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
              <span>Bàn làm việc Tiền kiểm</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate(isManager ? 'pending_approval' : 'my_dossiers')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <span>{isManager ? 'Danh sách thẩm định' : 'Hồ sơ của tôi'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 2. Bốn thẻ KPI chỉ số Tinh gọn (4 Cards Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Cần xử lý ngay */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Cần xử lý</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900">{pendingActionCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isManager ? 'Hồ sơ mới nộp & cần sửa đổi' : 'Đang chờ duyệt hoặc cần nộp lại'}
            </p>
          </div>
        </div>

        {/* Thẻ 2: Duyệt thể thức / Chờ ký Khoa */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Đã duyệt thể thức</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-indigo-700">{precheckPassedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Đã xuất PDF chuẩn (Xin chữ ký Khoa)</p>
          </div>
        </div>

        {/* Thẻ 3: Đang trình ký liên cấp */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Trình ký liên cấp</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <FileSignature className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-800">{signingCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Cấp Khoa & Cấp Trường (BGH)</p>
          </div>
        </div>

        {/* Thẻ 4: Hoàn tất & Đã ban hành QĐ */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold text-slate-800">Đã ban hành QĐ</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-800">{completedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Đã đóng dấu & Lưu kho số Drive</p>
          </div>
        </div>
      </div>

      {/* 3. Bảng Hồ sơ gần đây Tinh gọn */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Hồ sơ gần đây</h2>
            <p className="text-xs text-slate-500">Các hồ sơ vừa được cập nhật tiến trình thẩm định</p>
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
                <th className="py-3 px-4">Mã hồ sơ</th>
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
                recentDossiers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {d.code}
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900 truncate">
                        {d.title || d.templateTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {d.templateTitle}
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{d.createdBy.name}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                        {d.createdBy.department}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {d.submittedAt ? (
                        new Date(d.submittedAt).toLocaleDateString('vi-VN')
                      ) : (
                        <span className="text-slate-400 italic">Bản nháp</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={d.status} />
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDossier(d)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-slate-700 hover:text-blue-800 hover:bg-blue-50 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                        title="Xem chi tiết & Thẩm định"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Xem chi tiết</span>
                      </button>
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
