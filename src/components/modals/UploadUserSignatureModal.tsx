import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import { Application } from '../../types';

interface UploadUserSignatureModalProps {
  dossier: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onUploadConfirm: (dossierId: string, driveFileId: string) => Promise<void>;
}

export const UploadUserSignatureModal: React.FC<UploadUserSignatureModalProps> = ({
  dossier,
  isOpen,
  onClose,
  onUploadConfirm,
}) => {
  const [fileName, setFileName] = useState('');
  const [driveFileId, setDriveFileId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !dossier) return null;

  const handleSimulateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setDriveFileId(`drive_signed_user_${Date.now()}`);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDriveId = driveFileId || `drive_signed_user_${Date.now()}`;
    try {
      setIsSubmitting(true);
      await onUploadConfirm(dossier.id, finalDriveId);
      onClose();
    } catch (err) {
      setError('Đã xảy ra lỗi khi tải văn bản lên Google Drive.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Upload className="w-4 h-4 shrink-0 text-blue-600" />
            <span>Tải lên văn bản đã ký ({dossier.code})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed">
            Hồ sơ <strong className="text-slate-900">{dossier.templateTitle}</strong> đã được phê duyệt.{' '}
            Vui lòng tải tập tin PDF/DOCX đã in và ký để chuyển cho Văn thư tiếp nhận.
          </div>

          <div className="border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/60 rounded-lg p-5 text-center transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.docx,.jpg,.png"
              onChange={handleSimulateFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-6 h-6 mx-auto text-blue-600 mb-2" />
            {fileName ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-900 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {fileName}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">ID lưu trữ: {driveFileId}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-800">Nhấp để chọn file scan / văn bản đã ký</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Hỗ trợ PDF, DOCX, PNG (Tối đa 25MB)</p>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-2xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSubmitting ? 'Đang tải lên...' : 'Xác nhận & Lưu Google Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
