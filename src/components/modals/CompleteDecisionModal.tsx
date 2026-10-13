import React, { useState } from 'react';
import { CheckCircle2, X, FileText, Upload, ExternalLink, Award } from 'lucide-react';
import { Application } from '../../types';

interface CompleteDecisionModalProps {
  dossier: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmComplete: (
    dossierId: string,
    decisionNumber: string,
    decisionDate: string,
    finalPdfUrl: string
  ) => Promise<void>;
}

export const CompleteDecisionModal: React.FC<CompleteDecisionModalProps> = ({
  dossier,
  isOpen,
  onClose,
  onConfirmComplete,
}) => {
  const [decisionNumber, setDecisionNumber] = useState(
    dossier?.decision_number || `${Math.floor(100 + Math.random() * 900)}/QĐ-ĐHYDCT`
  );
  const [decisionDate, setDecisionDate] = useState(
    dossier?.decision_date || new Date().toISOString().split('T')[0]
  );
  const [finalPdfFileName, setFinalPdfFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !dossier) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFinalPdfFileName(e.target.files[0].name);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNumber.trim()) {
      setError('Vui lòng nhập Số Quyết định ban hành.');
      return;
    }

    try {
      setIsSubmitting(true);
      const finalPdfUrl = `/uploads/pdf/${dossier.code}-quyet-dinh-ban-hanh.pdf`;
      await onConfirmComplete(dossier.id, decisionNumber.trim(), decisionDate, finalPdfUrl);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi hoàn tất hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <Award className="w-4.5 h-4.5 shrink-0 text-emerald-700" />
            <span>Ban hành Quyết định & Hoàn tất hồ sơ ({dossier.code})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
            <strong>Bước 4 & 8 (Quy trình Automation):</strong> Hiệu trưởng đã ký duyệt chính thức. Quản trị viên cập nhật Số Quyết định và tải file hoàn chỉnh để đóng hồ sơ. Hệ thống sẽ tự động gửi Gmail chúc mừng cho Cán bộ và lưu trữ vào cây thư mục Google Drive của trường.
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Số Quyết định ban hành <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                placeholder="VD: 128/QĐ-ĐHYDCT"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Ngày ký ban hành <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              />
            </div>
          </div>

          {/* Upload file PDF Quyết định */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-800">
              Tệp PDF Quyết định hoàn tất (Có chữ ký Hiệu trưởng)
            </label>
            <div className="border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-3.5 text-center cursor-pointer relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
              {finalPdfFileName ? (
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{finalPdfFileName}</span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-emerald-700">Bấm để đính kèm file Quyết định ký số</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hoặc hệ thống tự động lưu file chuẩn</p>
                </div>
              )}
            </div>
          </div>

          {/* Link Drive quy định */}
          <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="font-bold block">Thư mục Google Drive lưu trữ hồ sơ:</span>
              <span className="text-[11px] text-blue-700 truncate font-mono block">
                {dossier.drive_folder_url || 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link'}
              </span>
            </div>
            <a
              href={dossier.drive_folder_url || 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-white text-blue-700 hover:text-blue-900 border border-blue-300 rounded font-semibold text-[11px] shrink-0 inline-flex items-center gap-1"
            >
              <span>Xem Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ban hành QĐ & Đóng hồ sơ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
