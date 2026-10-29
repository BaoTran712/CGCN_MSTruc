import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { normalizeStatus } from '../services/workflowEngine';
import { isAdminUser } from '../constants';

interface MyDossiersViewProps {
  dossiers: Dossier[];
  currentUser: UserProfile;
  onSelectDossier: (dossier: Dossier) => void;
  onEditDraft: (dossier: Dossier) => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const MyDossiersView: React.FC<MyDossiersViewProps> = ({
  dossiers = [],
  currentUser,
  onSelectDossier,
  onEditDraft,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAdmin = isAdminUser(currentUser);

  // Admin xem tất cả, User chỉ xem hồ sơ của mình
  const allDossiers = Array.isArray(dossiers) ? dossiers : [];
  const userDossiers = isAdmin
    ? allDossiers
    : allDossiers.filter(
        (d) =>
          d.createdBy?.id === currentUser?.id ||
          d.createdBy?.email === currentUser?.email
      );

  const filtered = userDossiers.filter((d) => {
    const matchSearch =
      (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.templateTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.templateCode || '').toLowerCase().includes(searchQuery.toLowerCase());

    const st = normalizeStatus(d.status);
    if (statusFilter === 'all') return matchSearch;
    if (statusFilter === 'draft') return matchSearch && st === 'DRAFT';
    if (statusFilter === 'processing')
      return matchSearch && st === 'NEW';
    if (statusFilter === 'changes')
      return matchSearch && st === 'NEEDS_REVISION';
    if (statusFilter === 'signing')
      return matchSearch && (st === 'PRECHECK_PASSED' || st === 'FACULTY_SIGNED' || st === 'SCHOOL_SIGNING');
    if (statusFilter === 'completed')
      return matchSearch && st === 'COMPLETED';

    return matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hồ sơ của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến trình thẩm định, nhận xét của Phòng KH&CN và tiến độ ký số liên cấp
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create_dossier')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo hồ sơ mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hồ sơ, tên đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Status Tabs Tinh gọn */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-lg text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'draft', label: 'Bản nháp' },
              { id: 'processing', label: 'Chờ tiền kiểm' },
              { id: 'changes', label: 'Cần sửa đổi' },
              { id: 'signing', label: 'Đang trình ký' },
              { id: 'completed', label: 'Đã hoàn tất' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Table Tinh gọn 5 cột */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã hồ sơ</th>
                <th className="py-3 px-4">Biểu mẫu & Nội dung</th>
                <th className="py-3 px-4">Ngày nộp</th>
                <th className="py-3 px-4">Trạng thái thẩm định</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((dossier) => {
                const norm = normalizeStatus(dossier.status);
                const isOwner =
                  dossier.createdBy?.id === currentUser?.id ||
                  dossier.createdBy?.email === currentUser?.email;
                const canEdit =
                  norm === 'DRAFT' || norm === 'NEEDS_REVISION' || isOwner;

                return (
                  <tr key={dossier.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {dossier.code}
                    </td>

                    {/* Template & Title */}
                    <td className="py-3 px-4 max-w-[320px]">
                      <div className="font-semibold text-slate-900 truncate">
                        {dossier.title || dossier.templateTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {dossier.templateTitle} ({dossier.templateCode})
                      </div>
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {dossier.submittedAt ? (
                        new Date(dossier.submittedAt).toLocaleDateString('vi-VN')
                      ) : (
                        <span className="text-slate-400 italic">Bản nháp</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={dossier.status} />
                        {norm === 'NEEDS_REVISION' && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Có yêu cầu sửa</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions Tinh gọn */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(dossier)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                          title="Xem chi tiết văn bản & tiến trình"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Chi tiết</span>
                        </button>

                        {norm === 'NEEDS_REVISION' ? (
                          <button
                            type="button"
                            onClick={() => onEditDraft(dossier)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Mở form chỉnh sửa hồ sơ bị trả về"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Sửa ngay</span>
                          </button>
                        ) : canEdit && norm === 'DRAFT' ? (
                          <button
                            type="button"
                            onClick={() => onEditDraft(dossier)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-medium transition-colors cursor-pointer"
                            title="Mở form chỉnh sửa bản nháp"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-500" />
                            <span>Sửa</span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 px-4 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Không có hồ sơ nào</h3>
            <p className="text-xs text-slate-500">
              {userDossiers.length === 0
                ? 'Đồng chí chưa tạo hồ sơ nào. Bấm nút "+ Tạo hồ sơ mới" để bắt đầu.'
                : 'Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
