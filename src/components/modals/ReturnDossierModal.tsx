import React, { useState } from 'react';
import { AlertCircle, X, ArrowLeft } from 'lucide-react';
import { Application } from '../../types';

interface ReturnDossierModalProps {
  dossier: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReturn: (dossierId: string, reason: string) => Promise<void>;
}

export const ReturnDossierModal: React.FC<ReturnDossierModalProps> = ({
  dossier,
  isOpen,
  onClose,
  onConfirmReturn,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !dossier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập chi tiết lý do trả lại hồ sơ.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onConfirmReturn(dossier.id, reason);
      setReason('');
      onClose();
    } catch (err) {
      setError('Đã xảy ra lỗi khi trả lại hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Yêu cầu sửa đổi / Trả lại hồ sơ ({dossier.code})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed">
            Hồ sơ <strong className="text-slate-900 font-semibold">{dossier.templateTitle}</strong> của ông/bà{' '}
            <strong className="text-slate-900 font-semibold">{dossier.createdBy.name}</strong> sẽ được chuyển sang trạng thái{' '}
            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-medium">RETURNED (Cần sửa đổi)</span>.
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Lý do trả lại & Yêu cầu nội dung cần sửa <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ghi rõ thông tin còn thiếu, chứng từ đính kèm chưa khớp hoặc yêu cầu điều chỉnh..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-colors"
            />
            {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-md shadow-2xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? 'Đang gửi...' : 'Xác nhận Trả lại hồ sơ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
