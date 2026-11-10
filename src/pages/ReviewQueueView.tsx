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

  // State for signature configuration modal
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  // Placeholder departments (could be fetched from API)
  const departments = ['Phòng KH&CN', 'Phòng TCKT', 'Phòng Đào tạo'];

  const openSignatureModal = (dossier: Dossier) => {
    setSelectedDossier(dossier);
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
    setSelectedDossier(null);
  };

  const handleSignatureSave = (config: any) => {
    // TODO: send config to backend (e.g., POST /api/signature-config)
    console.log('Signature config saved for', selectedDossier?.id, config);
    closeSignatureModal();
  };


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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Xét duyệt &amp; Trình ký Hồ sơ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kiểm tra thể thức biểu mẫu 1a &amp; 2a, duyệt bản ký phòng ban và trình ký Hiệu trưởng
          </p>
        </div>

        {pendingSignedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 font-medium self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{pendingSignedCount} hồ sơ đã nộp bản ký chờ duyệt</span>
          </span>
        )}
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hồ sơ, giảng viên, tên đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-slate-100/80 rounded-xl text-xs">
            {[
              { id: 'all', label: `Tất cả (${safeDossiers.length})` },
              { id: 'submitted', label: `Chờ duyệt (${submittedCount})` },
              { id: 'revision', label: 'Đã trả về' },
              { id: 'validated', label: 'Đã hợp lệ' },
              { id: 'pending_signed', label: `Duyệt bản ký (${pendingSignedCount})` },
              { id: 'waiting_rector', label: `Chờ ký HT (${waitingRectorCount})` },
              { id: 'signed_archived', label: 'Lưu trữ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabFilter(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  activeTabFilter === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Mã hồ sơ & Phiên bản</th>
                <th className="py-3 px-4">Tên đề tài</th>
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
                        {(() => {
                          const norm = normalizeStatus(d.status);
                          if (norm === 'SUBMITTED') {
                            const s1a = (d as any).status_1a;
                            const s2a = (d as any).status_2a;
                            if (s1a === 'APPROVED' && s2a !== 'APPROVED') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  Đã duyệt 1a (Chờ 2a)
                                </span>
                              );
                            }
                            if (s2a === 'APPROVED' && s1a !== 'APPROVED') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  Đã duyệt 2a (Chờ 1a)
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Chờ duyệt (1a &amp; 2a)
                              </span>
                            );
                          }
                          return <StatusBadge status={d.status} />;
                        })()}
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
