import React, { useState } from 'react';
import { FileCheck, Upload, CheckCircle2, Clock, Eye, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Application, User } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';

interface SecretaryViewProps {
  dossiers: Application[];
  currentUser: User;
  onInspectDossier: (dossier: Application) => void;
  onReceiveIntake: (dossierId: string) => Promise<void>;
  onCompleteWithFinalDoc: (dossierId: string, driveFileId: string) => Promise<void>;
}

export const SecretaryView: React.FC<SecretaryViewProps> = ({
  dossiers = [],
  currentUser,
  onInspectDossier,
  onReceiveIntake,
  onCompleteWithFinalDoc,
}) => {
  const [activeTab, setActiveTab] = useState<'intake' | 'completion' | 'all'>('intake');
  const [selectedForComplete, setSelectedForComplete] = useState<Application | null>(null);
  const [finalDriveId, setFinalDriveId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter queues
  const userSignedList = dossiers.filter((d) => ['USER_SIGNED', 'for_signature'].includes(d.status));
  const receivedList = dossiers.filter((d) => d.status === 'SECRETARY_RECEIVED');
  const completedList = dossiers.filter((d) => ['COMPLETED', 'completed'].includes(d.status));

  const handleConfirmIntake = async (dossierId: string) => {
    try {
      await onReceiveIntake(dossierId);
    } catch (err) {
      console.error('Failed to receive dossier intake:', err);
    }
  };

  const handleFinalUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForComplete) return;

    const fileId = finalDriveId.trim() || `drive_final_stamped_${Date.now()}`;
    try {
      setIsSubmitting(true);
      await onCompleteWithFinalDoc(selectedForComplete.id, fileId);
      setSelectedForComplete(null);
      setFinalDriveId('');
    } catch (err) {
      console.error('Failed to complete dossier:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Institutional Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              BỘ PHẬN VĂN THƯ TRƯỜNG
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tiếp nhận văn bản & Lưu trữ Google Drive
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận hồ sơ giấy gốc từ người nộp, trình Ban Giám hiệu ký đóng dấu và lưu trữ văn bản phát hành chính thức
          </p>
        </div>

        {/* Counter Summary Cards */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-2xs text-center">
            <span className="text-[10.5px] text-slate-500 block">Chờ nhận giấy</span>
            <span className="text-base font-bold font-mono text-amber-700">{userSignedList.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-2xs text-center">
            <span className="text-[10.5px] text-slate-500 block">Chờ đóng dấu & Drive</span>
            <span className="text-base font-bold font-mono text-blue-700">{receivedList.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('intake')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'intake'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>1. Tiếp nhận hồ sơ giấy gốc ({userSignedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completion')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'completion'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 text-slate-500" />
          <span>2. Đóng dấu & Lưu trữ Drive ({receivedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã hoàn thành ({completedList.length})</span>
        </button>
      </div>

      {/* Queue Content */}
      {activeTab === 'intake' && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Hồ sơ đã tải bản ký tay (Chờ đối chiếu tiếp nhận bản giấy gốc):</span>
          </h3>

          {userSignedList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-500 text-xs shadow-2xs">
              Hiện tại không có hồ sơ nào chờ tiếp nhận bản giấy.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userSignedList.map((dossier) => (
                <div key={dossier.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {dossier.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{dossier.templateTitle}</h4>
                      <p className="text-xs text-slate-500">Người nộp: {dossier.createdBy.name} · {dossier.createdBy.department}</p>
                    </div>
                    <StatusBadge status={dossier.status} />
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded text-xs space-y-1 border border-slate-200/80">
                    <p className="text-slate-600">
                      <span className="font-semibold text-slate-700">Tệp ký số/ký tay Drive ID:</span>{' '}
                      <code className="text-blue-700 font-mono font-medium">{dossier.userSignedDriveFileId || 'drive_user_signed_01'}</code>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Thời gian ký: {new Date(dossier.signedAt || dossier.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onInspectDossier(dossier)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmIntake(dossier.id)}
                      className="px-3.5 py-1 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tiếp nhận bản giấy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'completion' && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-blue-700" />
            <span>Hồ sơ đã nhận bản gốc (Chờ lưu trữ bản phát hành chính thức BGH):</span>
          </h3>

          {receivedList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-slate-500 text-xs shadow-2xs">
              Không có hồ sơ nào đang chờ tải bản đóng dấu chính thức.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {receivedList.map((dossier) => (
                <div key={dossier.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {dossier.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{dossier.templateTitle}</h4>
                      <p className="text-xs text-slate-500">Chuyên viên: {dossier.createdBy.name} · {dossier.createdBy.department}</p>
                    </div>
                    <StatusBadge status={dossier.status} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onInspectDossier(dossier)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForComplete(dossier)}
                      className="px-3.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload bản đóng dấu BGH
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 text-xs font-bold text-slate-800">
            Hồ sơ đã hoàn tất & Lưu trữ Google Drive ({completedList.length})
          </div>
          <div className="divide-y divide-slate-100">
            {completedList.map((dossier) => (
              <div key={dossier.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div>
                  <span className="font-mono font-bold text-blue-700">{dossier.code}</span> -{' '}
                  <span className="font-semibold text-slate-800">{dossier.templateTitle}</span>
                  <p className="text-[11px] text-slate-500">Lưu trữ lúc {new Date(dossier.completedAt || dossier.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Drive ID: {dossier.finalSignedDriveFileId || 'drive_archived_2026'}
                  </span>
                  <StatusBadge status={dossier.status} />
                  <button
                    type="button"
                    onClick={() => onInspectDossier(dossier)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Xem chi tiết"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Final Upload */}
      {selectedForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Upload Bản đóng dấu BGH & Hoàn tất Archival ({selectedForComplete.code})
            </h3>
            <p className="text-xs text-slate-600">
              Nhập mã Google Drive File ID hoặc chọn tệp văn bản phát hành có dấu đỏ chính thức của Lãnh đạo.
            </p>

            <form onSubmit={handleFinalUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Google Drive File ID / URL <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={finalDriveId}
                  onChange={(e) => setFinalDriveId(e.target.value)}
                  placeholder="drive_final_stamped_2026_001"
                  className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedForComplete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Xác nhận Hoàn tất & Archive Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
