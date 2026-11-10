import React, { useState } from 'react';
import {
  Search,
  Eye,
  Edit,
  FileText,
  AlertCircle,
  Plus,
  Download,
} from 'lucide-react';
import { Dossier, UserProfile, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { normalizeStatus } from '../services/workflowEngine';
import { generateAndDownloadPdf } from '../utils/pdfExport';
import { isAdminUser } from '../constants';
import { getDossierDate } from '../utils/statusHelpers';

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
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    const st = normalizeStatus(d.status);
    if (statusFilter === 'all') return true;
    if (statusFilter === 'submitted') return st === 'SUBMITTED';
    if (statusFilter === 'revision') return st === 'RETURNED_FOR_REVISION';
    if (statusFilter === 'validated') return st === 'VALIDATED';
    if (statusFilter === 'pending_signed') return st === 'PENDING_SIGNED_REVIEW';
    if (statusFilter === 'waiting_rector') return st === 'WAITING_RECTOR_SIGNATURE';
    if (statusFilter === 'signed_archived') return st === 'SIGNED_ARCHIVED';

    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hồ sơ của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý và theo dõi tiến trình xét duyệt các bộ hồ sơ đã nộp
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('create_dossier')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo hồ sơ mới</span>
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã hồ sơ, tên đề tài..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100/80 rounded-xl text-xs">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'submitted', label: 'Chờ duyệt' },
              { id: 'revision', label: 'Cần sửa' },
              { id: 'validated', label: 'Đã duyệt' },
              { id: 'pending_signed', label: 'Duyệt bản ký' },
              { id: 'waiting_rector', label: 'Chờ ký HT' },
              { id: 'signed_archived', label: 'Lưu trữ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
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
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Mã hồ sơ</th>
                <th className="py-3.5 px-5">Nội dung hồ sơ</th>
                <th className="py-3.5 px-5">Ngày nộp</th>
                <th className="py-3.5 px-5">Trạng thái</th>
                <th className="py-3.5 px-5 text-center">Tài liệu</th>
                <th className="py-3.5 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((dossier) => {
                const norm = normalizeStatus(dossier.status);
                const ver = dossier.current_version || dossier.currentVersion || 1;
                const isRevision = norm === 'RETURNED_FOR_REVISION';

                return (
                  <tr key={dossier.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{dossier.code}</span>
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          v{ver}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-5 max-w-[320px]">
                      <div className="font-semibold text-slate-900 truncate">
                        {dossier.title || dossier.templateTitle}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {dossier.templateTitle}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {getDossierDate(dossier)}
                    </td>

                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <div className="space-y-1">
                        <StatusBadge status={dossier.status} />
                        {isRevision && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            <span>Cần chỉnh sửa theo góp ý</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      {norm === 'SIGNED_ARCHIVED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            generateAndDownloadPdf(dossier, undefined, `${dossier.code}_Da_Ky_Luu_Tru.pdf`)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF Đã ký</span>
                        </button>
                      ) : ['VALIDATED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE'].includes(norm) ? (
                        <button
                          type="button"
                          onClick={() =>
                            generateAndDownloadPdf(dossier, undefined, `${dossier.code}_v${ver}.pdf`)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF (v{ver})</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectDossier(dossier)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Chi tiết</span>
                        </button>

                        {isRevision && (
                          <button
                            type="button"
                            onClick={() => onEditDraft(dossier)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Sửa lại</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-14 px-4 space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">Chưa có hồ sơ nào</h3>
            <p className="text-xs text-slate-500">
              {userDossiers.length === 0
                ? 'Thầy/Cô chưa tạo hồ sơ nào. Bấm nút "Tạo hồ sơ mới" để bắt đầu.'
                : 'Không tìm thấy hồ sơ phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
