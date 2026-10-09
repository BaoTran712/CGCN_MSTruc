import React, { useState } from 'react';
import {
  Settings,
  Workflow,
  FileSpreadsheet,
  Server,
  Mail,
  HardDrive,
  Save,
  CheckCircle2,
  ExternalLink,
  Code,
  Shield,
  Layers,
  Radio,
  FileText,
} from 'lucide-react';
import { API_BASE_URL, isMockMode } from '../config/api.config';

export const SettingsView: React.FC = () => {
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(API_BASE_URL);
  const [carboneUrl, setCarboneUrl] = useState('https://carbone-renderer.internal:4000/render');
  const [sheetId, setSheetId] = useState('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  const [autoSyncOnSignature, setAutoSyncOnSignature] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showEndpoints, setShowEndpoints] = useState(true);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const apiEndpointsList = [
    { method: 'GET', path: '/api/templates', desc: '1. Lấy danh sách mẫu biểu Word' },
    { method: 'GET', path: '/api/templates/:id', desc: '2. Lấy thông tin chi tiết mẫu biểu & schema' },
    { method: 'POST', path: '/api/applications', desc: '3. Khởi tạo hồ sơ mới' },
    { method: 'PUT', path: '/api/applications/:id', desc: '4. Lưu bản nháp hồ sơ' },
    { method: 'POST', path: '/api/applications/:id/submit', desc: '5. Nộp hồ sơ chính thức' },
    { method: 'GET', path: '/api/applications/my', desc: '6. Lấy danh sách hồ sơ của tôi' },
    { method: 'GET', path: '/api/applications/pending', desc: '7. Lấy danh sách hồ sơ chờ duyệt (Quản lý)' },
    { method: 'GET', path: '/api/applications/:id', desc: '8. Lấy chi tiết hồ sơ & form data' },
    { method: 'POST', path: '/api/applications/:id/request-revision', desc: '9. Yêu cầu người dùng chỉnh sửa hồ sơ' },
    { method: 'POST', path: '/api/applications/:id/approve', desc: '10. Phê duyệt hồ sơ' },
    { method: 'POST', path: '/api/applications/:id/signing', desc: '11. Chuyển hồ sơ sang trạng thái Trình ký' },
    { method: 'POST', path: '/api/applications/:id/generate-document', desc: '12. Tạo file Word (Carbone / Template engine)' },
    { method: 'GET', path: '/api/applications/:id/document', desc: '13. Tải file Word đã tạo' },
    { method: 'GET', path: '/api/applications/:id/history', desc: '14. Lấy lịch sử và tiến trình luân chuyển' },
    { method: 'POST', path: '/api/applications/:id/sync-sheet', desc: '15. Ghi nhận dữ liệu vào Google Sheets trung tâm' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            CẤU HÌNH HỆ THỐNG
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Cài đặt & Cấu hình Tích hợp Hệ thống
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Sẵn sàng kết nối kiến trúc tự động hóa: Frontend &rarr; n8n Webhook &rarr; Carbone &rarr; DOCX/PDF &rarr; Google Drive &rarr; Gmail &rarr; Google Sheets
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Cài đặt hệ thống đã được lưu thành công!</span>
        </div>
      )}

      {/* Backend Mode Status Card */}
      <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Trạng thái tầng API Service:</span>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${
                  isMockMode()
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
              >
                {isMockMode() ? 'MOCK FALLBACK ACTIVE' : 'CONNECTED TO N8N'}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              API Base URL: <code className="font-mono text-slate-700 font-semibold">{API_BASE_URL}</code>
            </p>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 self-start sm:self-auto">
          Tự động fallback về mock data khi n8n offline
        </span>
      </div>

      {/* Integration Blueprint Diagram */}
      <div className="bg-slate-900 rounded-xl p-5 text-white space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
          <span className="font-mono text-emerald-400 font-bold">KIẾN TRÚC TÍCH HỢP TỰ ĐỘNG HÓA (N8N PIPELINE)</span>
          <span className="text-[11px] text-slate-400">15 REST Webhook Endpoints</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
            <span className="block font-bold text-blue-400">1. Web Frontend</span>
            <span className="text-[10px] text-slate-400">API Service Layer</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
            <span className="block font-bold text-amber-400">2. n8n Engine</span>
            <span className="text-[10px] text-slate-400">Điều phối workflow</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
            <span className="block font-bold text-sky-400">3. Carbone DOCX</span>
            <span className="text-[10px] text-slate-400">Xuất file Word mẫu</span>
          </div>
          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
            <span className="block font-bold text-emerald-400">4. Google Sheets</span>
            <span className="text-[10px] text-slate-400">Lưu dữ liệu trung tâm</span>
          </div>
        </div>
      </div>

      {/* 15 API Endpoints Documentation Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden text-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900">
              Danh mục 15 Endpoint API n8n Webhook đã cấu hình
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowEndpoints(!showEndpoints)}
            className="text-xs text-blue-700 hover:underline font-semibold"
          >
            {showEndpoints ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </div>

        {showEndpoints && (
          <div className="overflow-x-auto divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {apiEndpointsList.map((ep, i) => (
              <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : ep.method === 'POST'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-semibold text-slate-800 text-[11px]">{ep.path}</span>
                </div>
                <span className="text-[11px] text-slate-500 text-right">{ep.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Forms */}
      <div className="space-y-6 text-xs">
        {/* n8n Webhook Connection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b pb-3">
            <Workflow className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cấu hình Base URL n8n Webhook
              </h3>
              <p className="text-[11px] text-slate-500">
                Đường dẫn gốc của hệ thống n8n điều phối quy trình (được cấu hình trong <code>src/config/api.config.ts</code>)
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                API Base URL (n8n Webhook Base URL)
              </label>
              <input
                type="text"
                value={n8nWebhookUrl}
                onChange={(e) => setN8nWebhookUrl(e.target.value)}
                placeholder="YOUR_N8N_WEBHOOK_BASE_URL"
                className="w-full px-3 py-2 border rounded-lg font-mono text-slate-800 focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                TODO: Khi triển khai, cập nhật hằng số <code>API_BASE_URL</code> trong <code>src/config/api.config.ts</code> thành domain n8n thực tế của cơ quan.
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <span className="font-semibold text-slate-800">
                  Kích hoạt n8n Gmail Node gửi email thông báo khi có yêu cầu chỉnh sửa hoặc duyệt
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Google Sheets Connection */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cấu hình Google Sheets Trung tâm
              </h3>
              <p className="text-[11px] text-slate-500">
                Bảng tính lưu trữ các bản ghi hồ sơ đã chuyển sang trạng thái "Trình ký"
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Google Spreadsheet ID
              </label>
              <input
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={autoSyncOnSignature}
                  onChange={(e) => setAutoSyncOnSignature(e.target.checked)}
                  className="rounded text-blue-800"
                />
                <span className="font-semibold text-slate-700">
                  Tự động gọi endpoint <code>POST /api/applications/:id/sync-sheet</code> khi hồ sơ chuyển sang "Trình ký"
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Carbone DOCX Renderer */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Server className="w-4 h-4 text-blue-700" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Carbone Template Engine
              </h3>
              <p className="text-[11px] text-slate-500">
                Service kết xuất file DOCX từ template gốc khi triển khai môi trường sản xuất
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Carbone Server API Endpoint
            </label>
            <input
              type="text"
              value={carboneUrl}
              onChange={(e) => setCarboneUrl(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu thiết lập</span>
          </button>
        </div>
      </div>
    </div>
  );
};
