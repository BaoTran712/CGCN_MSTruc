import React from 'react';
import { Mail, CheckCircle2, Clock, XCircle, User } from 'lucide-react';

interface EmailLogItem {
  id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  content: string;
  step_name: string;
  status: string;
  sent_at: string;
  delivery_issue?: string;
  last_error?: string;
}

interface EmailLogViewerProps {
  logs: EmailLogItem[];
}

export const EmailLogViewer: React.FC<EmailLogViewerProps> = ({ logs = [] }) => {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs">
        <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        <p>Chưa có thông báo Gmail tự động nào được gửi cho hồ sơ này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Nhật ký Thông báo Gmail Tự động (Hệ thống Automation)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ghi nhận toàn bộ thông báo gửi qua email theo từng bước của quy trình
          </p>
        </div>
        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-mono">
          {logs.length} thông báo
        </span>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">
                  {log.step_name}
                </span>
                <span className="text-xs font-bold text-slate-900">{log.subject}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{log.sent_at ? new Date(log.sent_at).toLocaleString('vi-VN') : 'Chưa gửi'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                <span>Người nhận: <strong className="text-slate-800">{log.recipient_name}</strong></span>
              </div>
              <div className="font-mono text-slate-500">({log.recipient_email})</div>
              <div className={`ml-auto flex items-center gap-1 font-semibold text-[10px] ${log.status === 'SENT' ? 'text-emerald-700' : log.status === 'FAILED' ? 'text-red-700' : 'text-amber-700'}`}>
                {log.status === 'SENT' ? <CheckCircle2 className="w-3 h-3" /> : log.status === 'FAILED' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                <span>{log.status === 'SENT' ? 'Đã gửi thành công' : log.status === 'FAILED' ? 'Gửi thất bại' : 'Đang chờ gửi'}</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 text-[11.5px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {log.content}
            </div>
            {(log.delivery_issue || log.last_error) && <p className="text-xs text-amber-800">{log.delivery_issue || log.last_error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
