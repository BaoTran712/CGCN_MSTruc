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
  FileText,
  Award,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { normalizeStatus } from '../services/workflowEngine';

interface ReviewQueueViewProps {
  dossiers: Dossier[];
  currentUser: UserProfile;
  onInspectDossier: (dossier: Dossier) => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  dossiers = [],
  currentUser,
  onInspectDossier,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<string>('precheck');

  const safeDossiers = Array.isArray(dossiers) ? dossiers : [];

  // Filter dossiers
  const filtered = safeDossiers.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.templateTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.createdBy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.createdBy.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    const norm = normalizeStatus(d.status);
    if (activeTabFilter === 'all') return true;
    if (activeTabFilter === 'precheck') return norm === 'NEW';
    if (activeTabFilter === 'revision') return norm === 'NEEDS_REVISION';
    if (activeTabFilter === 'faculty') return norm === 'PRECHECK_PASSED';
    if (activeTabFilter === 'school') return norm === 'FACULTY_SIGNED' || norm === 'SCHOOL_SIGNING';
    if (activeTabFilter === 'completed') return norm === 'COMPLETED';

    return true;
  });

  const getWaitTime = (submittedAt?: string): string => {
    if (!submittedAt) return 'Vừa tạo';
    const diffMs = Date.now() - new Date(submittedAt).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) return 'Dưới 1 giờ';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  const precheckCount = dossiers.filter((d) => normalizeStatus(d.status) === 'NEW').length;
  const schoolCount = dossiers.filter((d) => ['FACULTY_SIGNED', 'SCHOOL_SIGNING'].includes(normalizeStatus(d.status))).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              Phòng Khoa học Công nghệ & HTQT
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({precheckCount} hồ sơ chờ tiền kiểm bản thảo)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tiền kiểm & Quản lý hồ sơ CGCN (Admin Pre-check)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tải file Word đã mapping để kiểm tra thể thức & nội dung, gửi nhận xét bổ sung hoặc duyệt xuất bản PDF chuẩn
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
              placeholder="Tìm theo mã CGCN, cán bộ, tên đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          {/* Quick tab filter */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTabFilter('precheck')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTabFilter === 'precheck'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Chờ tiền kiểm</span>
              {precheckCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                  {precheckCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('school')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTabFilter === 'school'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Trình ký cấp Trường</span>
              {schoolCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-600 text-white font-bold">
                  {schoolCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('revision')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTabFilter === 'revision'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Yêu cầu bổ sung
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('faculty')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTabFilter === 'faculty'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Chờ User ký Khoa
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('completed')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTabFilter === 'completed'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Đã hoàn tất
            </button>

            <button
              type="button"
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-blue-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả ({dossiers.length})
            </button>
          </div>
        </div>
      </div>

      {/* Dossier List Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>Không có hồ sơ nào trong hàng đợi này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Mã hồ sơ</th>
                  <th className="py-3 px-4">Nội dung đề tài / Loại hình CGCN</th>
                  <th className="py-3 px-4">Cán bộ đề xuất</th>
                  <th className="py-3 px-4">Đơn vị / Khoa</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Trạng thái mốc</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => onInspectDossier(d)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {d.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-blue-800 transition-colors">
                        {d.title || d.templateTitle}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {d.templateCode}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{d.createdBy.name}</div>
                      <div className="text-[11px] text-slate-500">{d.createdBy.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {d.department_name || d.createdBy.department}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{getWaitTime(d.submittedAt || d.createdAt)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectDossier(d);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Chi tiết</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
