import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, FileSignature, X, ArrowRight, Shield } from 'lucide-react';
import { Dossier } from '../../types';

interface ReviewActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'approve' | 'request_changes' | 'forward_signature';
  dossier: Dossier;
  onConfirmApprove: (notes?: string) => void;
  onConfirmRequestChanges: (comment: string) => void;
  onConfirmForwardSignature: () => void;
}

export const ReviewActionModal: React.FC<ReviewActionModalProps> = ({
  isOpen,
  onClose,
  type,
  dossier,
  onConfirmApprove,
  onConfirmRequestChanges,
  onConfirmForwardSignature,
}) => {
  const [comment, setComment] = useState('');
  const [approvalNote, setApprovalNote] = useState('Nội dung hồ sơ đầy đủ, đúng thể thức quy định.');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {type === 'request_changes' && (
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-4 h-4" />
              </div>
            )}
            {type === 'approve' && (
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            )}
            {type === 'forward_signature' && (
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200">
                <FileSignature className="w-4 h-4" />
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {type === 'request_changes' && 'Yêu cầu người dùng chỉnh sửa hồ sơ'}
                {type === 'approve' && 'Phê duyệt hồ sơ hành chính'}
                {type === 'forward_signature' && 'Chuyển trạng thái Trình ký & Lưu Google Sheets'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">Mã: {dossier.code} · {dossier.templateTitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-4">
          {/* REQUEST CHANGES */}
          {type === 'request_changes' && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed">
                Người nộp hồ sơ (<strong>{dossier.createdBy.name}</strong>) sẽ nhận được thông báo kèm nội dung yêu cầu bên dưới để tiến hành chỉnh sửa và gửi lại.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nội dung yêu cầu chỉnh sửa, bổ sung <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Ghi rõ các mục cần sửa đổi (ví dụ: bổ sung số hóa đơn, sửa lỗi chính tả, thay đổi ngày bàn giao...)"
                  className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* APPROVE */}
          {type === 'approve' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed">
                Xác nhận hồ sơ <strong>{dossier.code}</strong> của đồng chí <strong>{dossier.createdBy.name}</strong> ({dossier.createdBy.department}) đã được kiểm tra tính hợp lệ và đạt điều kiện phê duyệt.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ghi chú thẩm định của Người duyệt (không bắt buộc)
                </label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* FORWARD FOR SIGNATURE */}
          {type === 'forward_signature' && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-950 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-sky-900">
                  <Shield className="w-4 h-4 text-sky-700" />
                  <span>Cơ chế tự động lưu dữ liệu Google Sheets</span>
                </div>
                <p>
                  Khi chuyển sang trạng thái <strong>"Trình ký"</strong>, hệ thống tự động:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-sky-900">
                  <li>Khóa chỉnh sửa dữ liệu biểu mẫu.</li>
                  <li>Tạo bản in Word DOCX hoàn chỉnh kèm dấu duyệt thẩm định.</li>
                  <li>Tự động đẩy thông tin hồ sơ vào <strong>Google Sheets quản trị trung tâm</strong> (phục vụ đối soát, thống kê n8n).</li>
                </ul>
              </div>

              {/* Data summary preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-500 border-b pb-1">
                  <span>Trường dữ liệu đẩy lên Sheet</span>
                  <span>Giá trị</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Mã hồ sơ:</span>
                  <span className="font-semibold text-slate-900">{dossier.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Người tạo & Đơn vị:</span>
                  <span className="text-slate-900">{dossier.createdBy.name} ({dossier.createdBy.department.split('&')[0]})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trạng thái:</span>
                  <span className="text-sky-700 font-semibold">Trình ký</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Người duyệt:</span>
                  <span className="text-slate-900">{dossier.assignedManager.name}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
          >
            Hủy bỏ
          </button>

          {type === 'request_changes' && (
            <button
              type="button"
              disabled={!comment.trim()}
              onClick={() => {
                onConfirmRequestChanges(comment);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-md transition-colors shadow-2xs"
            >
              <span>Gửi yêu cầu chỉnh sửa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {type === 'approve' && (
            <button
              type="button"
              onClick={() => {
                onConfirmApprove(approvalNote);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác nhận Duyệt hồ sơ</span>
            </button>
          )}

          {type === 'forward_signature' && (
            <button
              type="button"
              onClick={() => {
                onConfirmForwardSignature();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Chuyển Trình ký & Ghi nhận Sheet</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
