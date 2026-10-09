import React, { useState } from 'react';
import {
  TableProperties,
  History,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Send,
  Search,
  FileSpreadsheet,
  Layers,
  Code2,
} from 'lucide-react';
import { Dossier, GoogleSheetRow } from '../types';

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
  const [showWebhookPayload, setShowWebhookPayload] = useState(false);

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
    link.setAttribute('download', `DocuGov_GoogleSheets_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter sheet rows
  const filteredRows = sheetRows.filter(
    (r) =>
      r.dossierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.templateTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // All audit logs across dossiers
  const allAuditLogs = dossiers.flatMap((d) =>
    (d.timeline || []).map((t) => ({
      ...t,
      dossierCode: d.code,
      templateTitle: d.templateTitle,
    }))
  ).sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              LƯU TRỮ VĂN BẢN TRUNG TÂM
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Google Sheets API & n8n Engine
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Lịch sử Xử lý & Google Sheets Quản trị
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu hồ sơ sau khi chuyển trạng thái "Trình ký" được đồng bộ tự động vào bảng tính trung tâm phục vụ tra cứu và lưu trữ lâu dài
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ lại'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bảng tính Google Sheets ({sheetRows.length} bản ghi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'border-blue-700 text-blue-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Nhật ký luân chuyển hồ sơ</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowWebhookPayload(!showWebhookPayload)}
          className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-mono cursor-pointer"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showWebhookPayload ? 'Ẩn Webhook' : 'Xem Webhook JSON'}</span>
        </button>
      </div>

      {/* Optional Webhook JSON schema preview */}
      {showWebhookPayload && (
        <div className="p-4 bg-slate-900 rounded-lg text-slate-200 text-xs font-mono space-y-2 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span>Payload gửi tới n8n / Google Sheets API webhook:</span>
            <span className="text-[11px] text-emerald-400">POST /webhook/dossier-for-signature</span>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300">
            {JSON.stringify(sheetRows[0] || {}, null, 2)}
          </pre>
        </div>
      )}

      {/* ================= TAB 1: GOOGLE SHEETS SIMULATION ================= */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          {/* Google Sheets header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold">Bảng tính liên kết:</span>
              <span className="font-mono text-slate-700 font-medium">
                [Hệ thống] Danh mục Hồ sơ Trình ký Năm 2026 (HoSoTrinhKy)
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc dữ liệu sheet..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* SpreadSheet Table container */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center text-slate-400">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Mã hồ sơ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên biểu mẫu Word</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Người tạo</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Đơn vị</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Ngày tạo</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Ngày gửi</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Ngày duyệt</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Trạng thái</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Người duyệt</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Thời gian cập nhật</th>
                    <th className="py-2.5 px-3 text-center">Đồng bộ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-mono text-[11px]">
                  {filteredRows.map((row, idx) => (
                    <tr key={row.dossierCode} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-400 bg-slate-50 font-sans">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-blue-700 whitespace-nowrap">
                        {row.dossierCode}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans font-medium text-slate-900 whitespace-nowrap max-w-xs truncate">
                        {row.templateTitle}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans whitespace-nowrap">
                        {row.creatorName}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-600 whitespace-nowrap">
                        {row.department}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-600">
                        {row.createdAt}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-600">
                        {row.submittedAt}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-600">
                        {row.approvedAt}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans whitespace-nowrap">
                        <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans whitespace-nowrap">
                        {row.reviewerName}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-500 whitespace-nowrap">
                        {row.updatedAt}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{row.syncStatus}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs">
                Chưa có hồ sơ nào ở trạng thái "Trình ký" được đồng bộ.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: AUDIT LOG ================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Dòng sự kiện luân chuyển toàn hệ thống
          </h3>

          <div className="divide-y divide-slate-100">
            {allAuditLogs.map((log, index) => (
              <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                      {log.dossierCode}
                    </span>
                    <span className="font-semibold text-slate-900">{log.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {log.templateTitle} · Thực hiện bởi: <span className="text-slate-700 font-medium">{log.actor}</span> ({log.role})
                  </p>
                  {log.comment && (
                    <p className="text-[11px] italic text-amber-800 bg-amber-50/60 p-1.5 rounded mt-1 border border-amber-200">
                      "{log.comment}"
                    </p>
                  )}
                </div>

                <div className="font-mono text-[11px] text-slate-400 whitespace-nowrap self-start sm:self-auto">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
