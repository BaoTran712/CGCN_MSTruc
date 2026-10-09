import React from 'react';
import { Shield, Clock, User, ArrowRight, FileCheck, CheckCircle2, FileEdit } from 'lucide-react';
import { AuditLog } from '../../types';
import { getStatusMeta } from '../../utils/statusHelpers';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs = [] }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        Chưa có ghi nhận Audit Log cho hồ sơ này.
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded">CREATE</span>;
      case 'SUBMIT':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded">SUBMIT</span>;
      case 'APPROVE':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">APPROVE</span>;
      case 'RETURN':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded">RETURN</span>;
      case 'UPDATE_DATA':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded">UPDATE_DATA</span>;
      case 'UPLOAD_USER_SIGNATURE':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200 rounded font-mono">USER_SIGN</span>;
      case 'RECEIVE_SECRETARY':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded font-mono">INTAKE</span>;
      case 'COMPLETE':
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono">COMPLETE</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-50 text-slate-700 border border-slate-200 rounded">{action}</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Nhật ký Kiểm toán (Immutable Audit Log)</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Tổng cộng: {logs.length} bản ghi</span>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          const fromMeta = log.fromStatus ? getStatusMeta(log.fromStatus) : null;
          const toMeta = log.toStatus ? getStatusMeta(log.toStatus) : null;

          return (
            <div
              key={log.id}
              className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getActionBadge(log.action)}
                  <span className="text-xs font-semibold text-slate-900">{log.actorName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono border border-slate-200">
                    {log.actorRole}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Status Transition flow indicator */}
              {(fromMeta || toMeta) && (
                <div className="flex items-center gap-2 my-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-200">
                  <span className="font-semibold text-slate-500">Trạng thái:</span>
                  {fromMeta ? (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${fromMeta.badgeClass}`}>
                      {fromMeta.label}
                    </span>
                  ) : (
                    <span className="text-slate-400">Khởi tạo</span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  {toMeta && (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${toMeta.badgeClass}`}>
                      {toMeta.label}
                    </span>
                  )}
                </div>
              )}

              {/* Metadata Diffs & Notes */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="mt-2 text-xs bg-slate-900 text-slate-200 p-3 rounded-md font-mono overflow-x-auto">
                  <span className="text-[10px] text-slate-400 block mb-1 font-sans font-semibold">Metadata / Payload Diffs:</span>
                  <pre className="text-[11px] whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
