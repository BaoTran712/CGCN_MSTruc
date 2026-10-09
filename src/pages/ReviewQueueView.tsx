import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Clock,
  User,
  Shield,
  ArrowRight,
  Download,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateAndDownloadDocx } from '../utils/docxExport';

interface ReviewQueueViewProps {
  dossiers: Dossier[];
  currentUser: UserProfile;
  onInspectDossier: (dossier: Dossier) => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  dossiers,
  currentUser,
  onInspectDossier,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<string>('pending');

  // Filter dossiers
  const filtered = dossiers.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.templateTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.createdBy.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    const st = (d.status || '').toUpperCase();
    if (activeTabFilter === 'all') return true;
    if (activeTabFilter === 'pending')
      return ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(st);
    if (activeTabFilter === 'changes') return st === 'CHANGES_REQUESTED' || st === 'RETURNED';
    if (activeTabFilter === 'approved') return st === 'APPROVED';
    if (activeTabFilter === 'for_signature')
      return ['FOR_SIGNATURE', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED'].includes(st);

    return true;
  });

  // Calculate wait time
  const getWaitTime = (submittedAt?: string): string => {
    if (!submittedAt) return 'Vừa tạo';
    const diffMs = Date.now() - new Date(submittedAt).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Dưới 1 giờ';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const pendingCount = dossiers.filter((d) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes((d.status || '').toUpperCase())
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Khu vực Thẩm định & Phê duyệt
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({pendingCount} hồ sơ chờ kiểm tra)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý & Duyệt hồ sơ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem chi tiết dữ liệu nhập, đối soát bản Word A4, gửi ý kiến yêu cầu chỉnh sửa hoặc phê duyệt hồ sơ
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hồ sơ, người gửi, đơn vị..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-md text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending', label: `Chờ duyệt (${pendingCount})` },
              { id: 'changes', label: 'Yêu cầu sửa' },
              { id: 'approved', label: 'Đã duyệt' },
              { id: 'for_signature', label: 'Hoàn tất' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabFilter(tab.id)}
                className={`px-3 py-1 rounded font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeTabFilter === tab.id
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
                <th className="py-3 px-4">Người gửi & Đơn vị</th>
                <th className="py-3 px-4">Biểu mẫu Word</th>
                <th className="py-3 px-4">Ngày gửi</th>
                <th className="py-3 px-4">Thời gian chờ</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((dossier) => {
                const isWaiting = ['submitted', 'under_review', 'resubmitted'].includes(dossier.status);

                return (
                  <tr key={dossier.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {dossier.code}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{dossier.createdBy.name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {dossier.createdBy.department}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[220px]">
                      <div className="font-medium text-slate-900 truncate">{dossier.templateTitle}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{dossier.templateCode}</div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {dossier.submittedAt ? new Date(dossier.submittedAt).toLocaleDateString('vi-VN') : 'Mới tạo'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                        isWaiting ? 'text-amber-800 font-medium' : 'text-slate-500'
                      }`}>
                        <Clock className="w-3 h-3 text-slate-400" />
                        {getWaitTime(dossier.submittedAt)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={dossier.status} />
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectDossier(dossier)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Kiểm tra hồ sơ</span>
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
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Không có hồ sơ nào cần xử lý</h3>
            <p className="text-xs text-slate-500">
              Tất cả hồ sơ trong hàng đợi đã được thẩm định hoặc không khớp với bộ lọc tìm kiếm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
