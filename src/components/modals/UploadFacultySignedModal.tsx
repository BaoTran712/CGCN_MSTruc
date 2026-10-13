import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, Paperclip, Trash2 } from 'lucide-react';
import { Application } from '../../types';

interface UploadFacultySignedModalProps {
  dossier: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onUploadConfirm: (
    dossierId: string,
    pdfUrl: string,
    evidenceFiles: Array<{ name: string; url: string; size?: string }>
  ) => Promise<void>;
}

export const UploadFacultySignedModal: React.FC<UploadFacultySignedModalProps> = ({
  dossier,
  isOpen,
  onClose,
  onUploadConfirm,
}) => {
  const [signedFileName, setSignedFileName] = useState('');
  const [evidenceList, setEvidenceList] = useState<Array<{ name: string; url: string; size: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !dossier) return null;

  const handleSignedFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignedFileName(file.name);
      setError('');
    }
  };

  const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        name: f.name,
        url: `/uploads/evidence/${f.name}`,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      }));
      setEvidenceList((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedFileName && !dossier.faculty_signed_pdf_url) {
      setError('Vui lòng chọn tệp PDF đã có chữ ký số của Trưởng Khoa / Lãnh đạo đơn vị.');
      return;
    }

    try {
      setIsSubmitting(true);
      const pdfUrl = `/uploads/pdf/${dossier.code}-faculty-signed.pdf`;
      await onUploadConfirm(dossier.id, pdfUrl, evidenceList);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Đã xảy ra lỗi khi tải hồ sơ lên hệ thống.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50/70 border-b border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Upload className="w-4 h-4 shrink-0 text-amber-700" />
            <span>Nộp PDF ký số cấp Khoa & Minh chứng ({dossier.code})</span>
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
            <strong>Bước 3 & 6 (Quy trình Automation):</strong> Thầy/Cô nộp tệp PDF đã được Trưởng Bộ môn / Trưởng Khoa ký số điện tử kèm theo các tài liệu hoặc sản phẩm minh chứng liên quan để Phòng KH&CN tiến hành trình ký cấp Trường.
          </div>

          {/* Upload File PDF đã ký Khoa */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-800">
              1. Tệp PDF đã có chữ ký số Trưởng Khoa <span className="text-rose-600">*</span>
            </label>
            <div className="border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-4 text-center cursor-pointer relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleSignedFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 mx-auto text-amber-600 mb-1" />
              {signedFileName ? (
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{signedFileName}</span>
                </div>
              ) : (
                <div>
                  <span className="font-semibold text-blue-700">Bấm để chọn file PDF đã ký</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Định dạng chấp nhận: .pdf</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Minh chứng đính kèm */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800">
                2. Tài liệu / Sản phẩm minh chứng kèm theo (Tùy chọn)
              </label>
              <label className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 cursor-pointer flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>+ Thêm file minh chứng</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.zip"
                  onChange={handleEvidenceSelect}
                  className="hidden"
                />
              </label>
            </div>

            {evidenceList.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {evidenceList.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate text-slate-800 font-medium">{file.name}</span>
                      <span className="text-[10px] text-slate-400">({file.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                (Chưa có tệp minh chứng. Thầy/Cô có thể đính kèm biên bản nghiệm thu, hợp đồng, hình ảnh, tài liệu kỹ thuật...)
              </p>
            )}
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Đang tải lên...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xác nhận nộp bản ký cấp Khoa</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
