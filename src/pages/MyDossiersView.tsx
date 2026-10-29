import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  Printer,
  FileText,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateAndDownloadDocx } from '../utils/docxExport';
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
      (d.templateCode || '').toLowerCase().includes(searchQuery.toLowerCase());

    const st = (d.status || '').toUpperCase();
    if (statusFilter === 'all') return matchSearch;
    if (statusFilter === 'draft') return matchSearch && st === 'DRAFT';
    if (statusFilter === 'processing')
      return matchSearch && ['NEW', 'SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(st);
    if (statusFilter === 'changes')
      return matchSearch && (st === 'NEEDS_REVISION' || st === 'CHANGES_REQUESTED' || st === 'RETURNED');
    if (statusFilter === 'approved')
      return matchSearch && ['PRECHECK_PASSED', 'FACULTY_SIGNED', 'SCHOOL_SIGNING', 'APPROVED', 'FOR_SIGNATURE', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(st);

    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              CỔNG QUẢN LÝ HỒ SƠ
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hồ sơ của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiến độ thẩm định, xem phản hồi yêu cầu chỉnh sửa và tải file Word đã phê duyệt
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create_dossier')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo hồ sơ mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hồ sơ, tên biểu mẫu..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-md text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'draft', label: 'Bản nháp' },
              { id: 'processing', label: 'Đang xử lý' },
              { id: 'changes', label: 'Cần sửa' },
              { id: 'approved', label: 'Đã duyệt / Trình ký' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Mã hồ sơ</th>
                <th className="py-3 px-4">Tên biểu mẫu</th>
                <th className="py-3 px-4">Ngày tạo</th>
                <th className="py-3 px-4">Ngày gửi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Người xử lý</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((dossier) => {
                const norm = normalizeStatus(dossier.status);
                const isOwner =
                  dossier.createdBy?.id === currentUser?.id ||
                  dossier.createdBy?.email === currentUser?.email;
                // Chỉ chủ hồ sơ mới được chỉnh sửa khi bản nháp hoặc cần sửa đổi
                const canEdit =
                  isOwner && (norm === 'DRAFT' || norm === 'NEEDS_REVISION');

                return (
                  <tr key={dossier.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {dossier.code}
                    </td>

                    {/* Template */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[240px]">
                      <div className="truncate">{dossier.templateTitle}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{dossier.templateCode}</div>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(dossier.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    {/* Submitted Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {dossier.submittedAt ? (
                        new Date(dossier.submittedAt).toLocaleDateString('vi-VN')
                      ) : (
                        <span className="text-slate-400 italic">Chưa gửi</span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={dossier.status} />
                        {dossier.status === 'changes_requested' && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            <span>Cần sửa</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Reviewer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{dossier.assignedManager?.name || 'Phòng KH&CN'}</div>
                      <div className="text-[11px] text-slate-400">{dossier.assignedManager?.department || 'Trường ĐH Y Dược Cần Thơ'}</div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(dossier)}
                          className="px-2.5 py-1 text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded transition-colors"
                          title="Xem chi tiết & Tiến trình"
                        >
                          Xem
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onEditDraft(dossier)}
                            className="px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded font-medium transition-colors"
                            title="Chỉnh sửa bản nháp / Sửa theo yêu cầu"
                          >
                            Sửa
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => generateAndDownloadDocx(dossier)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                          title="Tải file Word .docx"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
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
