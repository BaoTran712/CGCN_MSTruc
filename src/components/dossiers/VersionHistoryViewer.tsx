import React, { useState } from 'react';
import { History, FileText, User, Calendar, Check, Eye } from 'lucide-react';
import { DossierVersion } from '../../types';

interface VersionHistoryViewerProps {
  versions: DossierVersion[];
}

export const VersionHistoryViewer: React.FC<VersionHistoryViewerProps> = ({ versions = [] }) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    versions.length > 0 ? versions[versions.length - 1].id : ''
  );

  if (!versions || versions.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        Chưa có lịch sử phiên bản nào được ghi nhận.
      </div>
    );
  }

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions[versions.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar list of versions */}
      <div className="space-y-3 lg:col-span-1 border-r border-slate-200 pr-0 lg:pr-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
          <History className="w-4 h-4 text-blue-600" />
          <span>Danh sách Phiên bản ({versions.length})</span>
        </div>

        <div className="space-y-2">
          {versions.map((ver) => {
            const isSelected = ver.id === selectedVersion.id;
            return (
              <button
                key={ver.id}
                type="button"
                onClick={() => setSelectedVersionId(ver.id)}
                className={`w-full text-left p-2.5 rounded-md border text-xs transition-colors ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400 text-slate-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span>Phiên bản v{ver.versionNumber}</span>
                  {ver.versionNumber === versions.length && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                      Mới nhất
                    </span>
                  )}
                </div>
                <div className="text-slate-600 truncate">{ver.changeSummary || 'Cập nhật dữ liệu'}</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                  <span>{ver.editedByName}</span>
                  <span>{new Date(ver.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail inspect of selected version snapshot */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-lg">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Snapshot Phiên bản v{selectedVersion.versionNumber}</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Chỉnh sửa bởi <strong className="text-white">{selectedVersion.editedByName}</strong> lúc{' '}
              {new Date(selectedVersion.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-mono bg-slate-800 text-slate-200 rounded-md border border-slate-700">
            ID: {selectedVersion.id}
          </span>
        </div>

        <div className="bg-slate-50/70 rounded-lg p-3.5 border border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            Dữ liệu biểu mẫu lưu trữ tại thời điểm này:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            {Object.entries(selectedVersion.formData || {}).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-white rounded-md border border-slate-200">
                <span className="text-[10.5px] text-slate-400 block font-mono font-medium uppercase">{key}</span>
                <span className="font-medium text-slate-800 break-words mt-0.5 block">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val || '-')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
