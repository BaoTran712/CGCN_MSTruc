import React, { useState } from 'react';
import {
  Search,
  ArrowRight,
  Download,
  FileText,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { generateAndDownloadPdf } from '../utils/pdfExport';
import { normalizeStatus } from '../services/workflowEngine';

interface ReviewQueueViewProps {
  dossiers: Dossier[];
  currentUser: UserProfile;
  onInspectDossier: (dossier: Dossier) => void;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  dossiers = [],
  onInspectDossier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<string>('all');

  const safeDossiers = Array.isArray(dossiers) ? dossiers : [];

  const filtered = safeDossiers.filter((d) => {
    const matchSearch =
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.title || d.templateTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.createdBy?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.department_name || d.createdBy?.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    const norm = normalizeStatus(d.status);
    if (activeTabFilter === 'all') return true;
    if (activeTabFilter === 'submitted') return norm === 'SUBMITTED';
    if (activeTabFilter === 'revision') return norm === 'RETURNED_FOR_REVISION';
    if (activeTabFilter === 'validated') return norm === 'VALIDATED';
    if (activeTabFilter === 'pending_signed') return norm === 'PENDING_SIGNED_REVIEW';
    if (activeTabFilter === 'waiting_rector') return norm === 'WAITING_RECTOR_SIGNATURE';
    if (activeTabFilter === 'signed_archived') return norm === 'SIGNED_ARCHIVED';

    return true;
  });

  const submittedCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'SUBMITTED').length;
  const pendingSignedCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'PENDING_SIGNED_REVIEW').length;
  const waitingRectorCount = safeDossiers.filter((d) => normalizeStatus(d.status) === 'WAITING_RECTOR_SIGNATURE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              Phòng Khoa học Công nghệ & HTQT
            </span>
            {pendingSignedCount > 0 && (
              <span className="text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 font-semibold">
                Có {pendingSignedCount} hồ sơ đã upload bản ký phòng ban chờ duyệt
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Xét duyệt & Trình ký Hồ sơ (Admin)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Duyệt hồ sơ hợp lệ (gửi PDF chuẩn), trả về sửa lỗi, chuyển trình ký Hiệu trưởng và xác nhận đã ký lưu trữ
          </p>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã CGCN, cán bộ, tên đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: `Tất cả (${safeDossiers.length})` },
              { id: 'submitted', label: `Đã gửi / Chờ duyệt (${submittedCount})` },
              { id: 'revision', label: 'Trả về sửa lỗi' },
              { id: 'validated', label: 'Đã hợp lệ' },
              { id: 'pending_signed', label: `Chờ duyệt bản ký (${pendingSignedCount})` },
              { id: 'waiting_rector', label: `Chờ ký Hiệu trưởng (${waitingRectorCount})` },
              { id: 'signed_archived', label: 'Đã ký và lưu trữ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTabFilter === tab.id
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Mã hồ sơ & Phiên bản</th>
                <th className="py-3 px-4">Đề tài / Nội dung CGCN</th>
                <th className="py-3 px-4">Giảng viên nộp</th>
                <th className="py-3 px-4">Đơn vị</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-center">File PDF</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Chưa có hồ sơ nào trong danh sách
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const ver = d.current_version || d.currentVersion || 1;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-blue-700 text-xs">{d.code}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            v{ver}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate" title={d.title || d.templateTitle}>
                          {d.title || d.templateTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{d.templateTitle}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{d.createdBy?.name || 'Giảng viên'}</div>
                        <div className="text-[10px] text-slate-400">{d.applicant_email || d.createdBy?.email}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {d.department_name || d.createdBy?.department || 'Khoa Y'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {['VALIDATED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE', 'SIGNED_ARCHIVED'].includes(
                          normalizeStatus(d.status)
                        ) ? (
                          <button
                            type="button"
                            onClick={() => generateAndDownloadPdf(d, undefined, `${d.code}_v${ver}.pdf`)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF (v{ver})</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Chờ duyệt</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectDossier(d)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Xử lý hồ sơ</span>
                          <ArrowRight className="w-3 h-3" />
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
