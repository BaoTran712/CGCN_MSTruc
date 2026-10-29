import React, { useState } from 'react';
import {
  History,
  Download,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Shield,
  FileText,
} from 'lucide-react';
import { Dossier, GoogleSheetRow } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';

interface ProcessingHistoryViewProps {
  sheetRows: GoogleSheetRow[];
  dossiers: Dossier[];
  onRefreshSync: () => void;
}

export const ProcessingHistoryView: React.FC<ProcessingHistoryViewProps> = ({
  sheetRows,
  dossiers,
  onRefreshSync,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'audit'>('sheets');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onRefreshSync();
      setIsSyncing(false);
    }, 600);
  };

  const handleExportCSV = () => {
    const headers = [
      'Mã hồ sơ',
      'Tên biểu mẫu',
      'Người tạo',
      'Đơn vị',
      'Ngày tạo',
      'Ngày gửi',
      'Ngày duyệt',
      'Trạng thái',
      'Người duyệt',
      'Thời gian cập nhật',
      'Trạng thái đồng bộ',
    ];

    const rows = sheetRows.map((r) => [
      r.dossierCode,
      `"${r.templateTitle}"`,
      `"${r.creatorName}"`,
      `"${r.department}"`,
      r.createdAt,
      r.submittedAt,
      r.approvedAt,
      r.status,
      `"${r.reviewerName}"`,
      r.updatedAt,
      r.syncStatus,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Bao_Cao_Ho_So_CGCN_CTUMP_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lọc dữ liệu sheet
  const filteredRows = sheetRows.filter(
    (r) =>
      (r.dossierCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.templateTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.creatorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tất cả Audit Logs được tổng hợp từ danh sách dossiers
  const allAuditLogs = dossiers
    .flatMap((d) =>
      (d.auditLogs || []).map((a) => ({
        ...a,
        dossierCode: d.code,
        templateTitle: d.templateTitle,
      }))
    )
    .sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  const filteredLogs = allAuditLogs.filter(
    (log) =>
      (log.dossierCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              LƯU TRỮ & KIỂM TOÁN VĂN BẢN TRƯỜNG
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Audit Trail & Báo cáo Tổng hợp Ban Giám hiệu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu đồng bộ tự động từ hệ thống hồ sơ phục vụ công tác thanh tra, kiểm toán số và báo cáo định kỳ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang cập nhật...' : 'Đồng bộ lại'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất file Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Switcher Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sheets'
                ? 'bg-white text-blue-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bảng tính Tổng hợp ({sheetRows.length} bản ghi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-blue-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Nhật ký Kiểm toán (Audit Logs) ({allAuditLogs.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã hồ sơ, tên cán bộ, đơn vị..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
          />
        </div>
      </div>

      {/* ================= TAB 1: BẢNG TÍNH GOOGLE SHEETS ================= */}
      {activeTab === 'sheets' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center text-slate-400">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Mã hồ sơ</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Tên biểu mẫu</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Cán bộ đề nghị</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Đơn vị</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Ngày nộp</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Trạng thái</th>
                  <th className="py-2.5 px-3 text-center">Đồng bộ CSDL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center text-slate-400">
                      Không tìm thấy bản ghi nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.dossierCode || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {row.dossierCode}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-900 max-w-[240px] truncate">
                        {row.templateTitle}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        {row.creatorName}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap text-slate-600">
                        {row.department}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-slate-500 whitespace-nowrap">
                        {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{row.status}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {row.syncStatus || 'Đã đồng bộ MySQL'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL) ================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center text-slate-400">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Thời gian</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Mã hồ sơ</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Người thực hiện</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Hành động</th>
                  <th className="py-2.5 px-3">Ghi chú chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px]">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-slate-400">
                      Chưa có nhật ký kiểm toán nào
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 border-r border-slate-100 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-slate-500 whitespace-nowrap">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {log.dossierCode}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-mono">{log.actorRole}</div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-100 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-md">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
