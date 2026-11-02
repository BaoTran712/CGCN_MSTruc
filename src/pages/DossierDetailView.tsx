import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Edit,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Clock,
  FileText,
  Upload,
  Mail,
  Award,
  Trash2,
  Send,
  Check,
  Paperclip,
} from 'lucide-react';
import { Application, DocumentTemplate, User, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { generateAndDownloadPdf } from '../utils/pdfExport';
import { normalizeStatus, getStatusStepIndex } from '../services/workflowEngine';
import { isAdminUser, OFFICIAL_TEMPLATES } from '../constants';
import { getEffectiveTemplate, isMau2aTemplateOrDossier } from '../utils/templateUtils';

interface DossierDetailViewProps {
  dossier: Application;
  template?: DocumentTemplate;
  currentUser: User;
  onBack: () => void;
  onEditDossier: (dossier: Application) => void;
  onResubmitDossier?: (dossierId: string, updatedFormData: Record<string, any>) => Promise<void | Application>;
  onAdminPrecheck?: (dossierId: string, isValid: boolean, reviewNotes?: string) => Promise<void>;
  onUploadFacultySignature?: (
    dossierId: string,
    pdfUrl: string,
    evidenceFiles: Array<{ name: string; url: string; size?: string }>
  ) => Promise<void>;
  onUpdateSchoolSigning?: (
    dossierId: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean; note?: string }
  ) => Promise<void>;
  onCompleteDossier?: (
    dossierId: string,
    decisionNumber: string,
    decisionDate: string,
    finalPdfUrl: string
  ) => Promise<void>;
  onApproveDossier?: (dossierId: string, comment?: string) => Promise<void>;
  onReturnDossier?: (dossierId: string, reason: string) => Promise<void>;
  onNavigate?: (tab: ActiveNavTab) => void;
}

export const DossierDetailView: React.FC<DossierDetailViewProps> = ({
  dossier,
  template,
  currentUser,
  onBack,
  onEditDossier,
  onResubmitDossier,
  onAdminPrecheck,
  onUploadFacultySignature,
  onUpdateSchoolSigning,
  onCompleteDossier,
}) => {
  const [currentDossier, setCurrentDossier] = useState<Application>(dossier);

  // Admin state
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');
  const [showRevisionBox, setShowRevisionBox] = useState<boolean>(false);
  const [isProcessingPrecheck, setIsProcessingPrecheck] = useState<boolean>(false);
  const [isMovingToRector, setIsMovingToRector] = useState<boolean>(false);
  const [decisionNumberInput, setDecisionNumberInput] = useState<string>(
    dossier.decisionNumber || dossier.decision_number || `${dossier.code}/QĐ-ĐHYDCT`
  );
  const [finalSignedFileName, setFinalSignedFileName] = useState<string>('');
  const [isCompletingSign, setIsCompletingSign] = useState<boolean>(false);

  // Lecturer state (Upload bản ký phòng ban + minh chứng)
  const [signedPdfName, setSignedPdfName] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<Array<{ name: string; url: string; size: string }>>([]);
  const [isUploadingSign, setIsUploadingSign] = useState<boolean>(false);

  useEffect(() => {
    setCurrentDossier(dossier);
  }, [dossier]);

  const normalizedStatus = normalizeStatus(currentDossier.status);
  const currentStepIndex = getStatusStepIndex(currentDossier.status);
  const isReturnedForRevision = normalizedStatus === 'RETURNED_FOR_REVISION';
  const isAdmin = isAdminUser(currentUser);
  const currentVersion = currentDossier.current_version || currentDossier.currentVersion || 1;
  const is2a = isMau2aTemplateOrDossier(currentDossier, template);
  const effectiveTemplate = getEffectiveTemplate(currentDossier, template);

  const revisionMessage =
    currentDossier.revision_note ||
    currentDossier.revisionNote ||
    currentDossier.reviewNotes ||
    currentDossier.review_notes ||
    currentDossier.returnReason ||
    '';

  const uploadedDepartmentFiles =
    currentDossier.department_signed_files ||
    currentDossier.departmentSignedFiles ||
    currentDossier.resubmitted_signed_files ||
    currentDossier.resubmittedSignedFiles ||
    currentDossier.evidenceFiles ||
    currentDossier.evidence_files ||
    [];

  // Thanh tiến trình 5 bước tinh gọn
  const workflowSteps = [
    {
      index: 1,
      label: isReturnedForRevision ? 'Trả về sửa lỗi' : 'Đã gửi đơn',
    },
    {
      index: 2,
      label: 'Hồ sơ đã được duyệt',
    },
    {
      index: 3,
      label: 'Chờ duyệt',
    },
    {
      index: 4,
      label: 'Chờ ký Hiệu trưởng',
    },
    {
      index: 5,
      label: 'Đã ký và lưu trữ',
    },
  ];

  // Handlers
  const [isResubmittingQuick, setIsResubmittingQuick] = useState(false);

  const handleQuickResubmit = async () => {
    if (!onResubmitDossier) {
      onEditDossier(currentDossier);
      return;
    }
    try {
      setIsResubmittingQuick(true);
      const dataToSubmit = {
        ...((currentDossier as any).form_data || {}),
        ...(currentDossier.formData || {}),
      };
      const updated = await onResubmitDossier(currentDossier.id, dataToSubmit);
      if (updated) {
        setCurrentDossier(updated as Application);
      }
    } finally {
      setIsResubmittingQuick(false);
    }
  };

  const handleAdminAction = async (isValid: boolean) => {
    if (!onAdminPrecheck) return;
    if (!isValid && !revisionNoteInput.trim()) {
      alert('Vui lòng nhập "Gợi ý chỗ sai cần sửa chữa" trước khi trả về!');
      return;
    }

    try {
      setIsProcessingPrecheck(true);
      await onAdminPrecheck(
        currentDossier.id,
        isValid,
        isValid ? 'Hồ sơ hợp lệ.' : revisionNoteInput.trim()
      );
      setShowRevisionBox(false);
      setRevisionNoteInput('');
    } finally {
      setIsProcessingPrecheck(false);
    }
  };

  const handleSelectSignedAndEvidenceFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const added: Array<{ name: string; url: string; size: string }> = [];
    let firstPdf = signedPdfName;

    Array.from(files).forEach((f) => {
      const sizeStr = `${(f.size / 1024).toFixed(1)} KB`;
      if (f.name.toLowerCase().endsWith('.pdf') && !firstPdf) {
        firstPdf = f.name;
      }
      added.push({
        name: f.name,
        url: `/uploads/signed/${encodeURIComponent(f.name)}`,
        size: sizeStr,
      });
    });

    if (firstPdf) setSignedPdfName(firstPdf);
    setEvidenceList((prev) => [...prev, ...added]);
  };

  const handleSubmitSignedUpload = async () => {
    if (!onUploadFacultySignature) return;
    if (!signedPdfName && evidenceList.length === 0) {
      alert('Vui lòng chọn file PDF đã ký phòng ban (kèm minh chứng nếu có) trước khi nhấn Gửi.');
      return;
    }

    try {
      setIsUploadingSign(true);
      const pdfUrl = `/uploads/signed/${currentDossier.code}-${encodeURIComponent(
        signedPdfName || 'department-signed.pdf'
      )}`;
      await onUploadFacultySignature(currentDossier.id, pdfUrl, evidenceList);
    } finally {
      setIsUploadingSign(false);
    }
  };

  const handleMoveToRectorSignature = async () => {
    if (!onUpdateSchoolSigning) return;
    try {
      setIsMovingToRector(true);
      await onUpdateSchoolSigning(currentDossier.id, {
        khcnSigned: true,
        note: 'Chuyển trình Hiệu trưởng ký duyệt.',
      });
    } finally {
      setIsMovingToRector(false);
    }
  };

  const handleConfirmSignedAndArchive = async () => {
    if (!onCompleteDossier) return;
    try {
      setIsCompletingSign(true);
      const finalUrl = finalSignedFileName
        ? `/uploads/pdf/${currentDossier.code}-${encodeURIComponent(finalSignedFileName)}`
        : `/uploads/pdf/${currentDossier.code}-signed-v${currentVersion}.pdf`;
      await onCompleteDossier(
        currentDossier.id,
        decisionNumberInput.trim() || `${currentDossier.code}/QĐ-ĐHYDCT`,
        new Date().toISOString().slice(0, 10),
        finalUrl
      );
    } finally {
      setIsCompletingSign(false);
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* =====================================================================
          1. HEADER GỌN GÀNG + THANH TIẾN TRÌNH ĐƠN (1 HÀNG DUY NHẤT)
      ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>

            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
              {currentDossier.code}
            </span>

            <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
              v{currentVersion}
            </span>

            <StatusBadge status={currentDossier.status} />

            <span className="text-xs text-slate-500 hidden sm:inline">
              • Người nộp: <strong className="text-slate-800">{currentDossier.createdBy?.name}</strong> (
              {currentDossier.department_name || currentDossier.createdBy?.department || 'Khoa Y'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {['VALIDATED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE', 'SIGNED_ARCHIVED'].includes(
              normalizedStatus
            ) && (
              <button
                type="button"
                onClick={() =>
                  generateAndDownloadPdf(
                    currentDossier,
                    effectiveTemplate,
                    `${currentDossier.code}_v${currentVersion}.pdf`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => generateAndDownloadDocx(currentDossier, effectiveTemplate)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Tải Word</span>
            </button>
          </div>
        </div>

        {/* Thanh tiến trình tối giản trên 1 thanh ngang */}
        <div className="grid grid-cols-5 gap-2 pt-3 border-t border-slate-100">
          {workflowSteps.map((step) => {
            const isCompleted =
              currentStepIndex > step.index || normalizedStatus === 'SIGNED_ARCHIVED';
            const isCurrent =
              currentStepIndex === step.index && normalizedStatus !== 'SIGNED_ARCHIVED';
            const isErrorStep = step.index === 1 && isReturnedForRevision;

            return (
              <div
                key={step.index}
                className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-xs font-semibold transition-all ${
                  isErrorStep
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : isCompleted
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isCurrent
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isErrorStep
                      ? 'bg-rose-600 text-white'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isErrorStep ? '!' : isCompleted ? <Check className="w-3 h-3" /> : step.index}
                </span>
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          2. BỐ CỤC 2 CỘT ĐƠN GIẢN: TRÁI (XEM ĐƠN 8/12) - PHẢI (THAO TÁC 4/12)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (8/12): XEM VĂN BẢN */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 bg-slate-50/70">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">
              Nội dung văn bản
            </span>
          </div>

          <div className="p-4">
            <div className="h-[720px]">
              <WordDocumentPreview
                dossier={currentDossier}
                template={effectiveTemplate}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (4/12): CHỈ HIỂN THỊ DUY NHẤT 1 KHUNG THAO TÁC THEO ĐÚNG VAI TRÒ */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
          {/* HỘP HIỂN THỊ GỢI Ý SỬA LỖI (KHI ĐƠN BỊ TRẢ VỀ) */}
          {isReturnedForRevision && (
            <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Gợi ý chỗ sai cần sửa chữa:</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs text-rose-900 font-medium whitespace-pre-line">
                {revisionMessage || 'Đề nghị rà soát và chỉnh sửa lại nội dung đơn.'}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onEditDossier(currentDossier)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>1. Chỉnh sửa nội dung trên Form</span>
                </button>

                <button
                  type="button"
                  disabled={isResubmittingQuick}
                  onClick={handleQuickResubmit}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isResubmittingQuick
                      ? 'Đang gửi lại...'
                      : `2. Gửi lại hồ sơ ngay (v${currentVersion + 1})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              TRƯỜNG HỢP 1: ĐANG ĐĂNG NHẬP LÀ GIẢNG VIÊN / THẦY CÔ (USER)
          ================================================================= */}
          {!isAdmin && !isReturnedForRevision && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Thao tác của Thầy / Cô
              </h2>

              {/* Bước 1: Đã gửi / Chờ duyệt */}
              {normalizedStatus === 'SUBMITTED' && (
                <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Đang chờ Cô Admin kiểm tra & duyệt</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Khi hồ sơ được duyệt hợp lệ, hệ thống sẽ gửi file PDF chuẩn qua Gmail và mở khóa mục tải file / upload bản ký tại đây.
                  </p>
                </div>
              )}

              {/* Bước 2: Đã hợp lệ -> Tải PDF chuẩn & Upload lại sau khi ký */}
              {normalizedStatus === 'VALIDATED' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() =>
                      generateAndDownloadPdf(
                        currentDossier,
                        effectiveTemplate,
                        `${currentDossier.code}_v${currentVersion}_Ho_So_Chuan.pdf`
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>1. Tải file PDF chuẩn (Đi trình ký)</span>
                  </button>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">
                      2. Upload lại sau khi ký xong
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tải lên file PDF đã có chữ ký phòng ban kèm ảnh/PDF minh chứng:
                    </p>

                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-lg p-3.5 text-center cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-blue-600 mb-1" />
                      <span className="text-xs font-semibold text-blue-800">
                        Chọn file PDF đã ký + Minh chứng
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleSelectSignedAndEvidenceFiles}
                        className="hidden"
                      />
                    </label>

                    {evidenceList.length > 0 && (
                      <div className="space-y-1">
                        {evidenceList.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200 text-xs"
                          >
                            <span className="truncate text-slate-800 flex items-center gap-1.5">
                              <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                              {item.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEvidenceList((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isUploadingSign}
                      onClick={handleSubmitSignedUpload}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isUploadingSign ? 'Đang gửi...' : 'Gửi bản ký phòng ban'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bước 3 & 4: Chờ duyệt / Chờ ký Hiệu trưởng */}
              {(normalizedStatus === 'PENDING_SIGNED_REVIEW' ||
                normalizedStatus === 'WAITING_RECTOR_SIGNATURE') && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-xs font-bold text-amber-900">
                    {normalizedStatus === 'WAITING_RECTOR_SIGNATURE'
                      ? 'Đang chờ ký Hiệu trưởng'
                      : 'Đã gửi bản ký phòng ban • Chờ Admin duyệt'}
                  </div>
                  <p className="text-xs text-amber-800">
                    Ngay khi có chữ ký Hiệu trưởng, hệ thống sẽ gửi email kèm bản PDF hoàn tất cho Thầy/Cô.
                  </p>
                </div>
              )}

              {/* Bước 5: Đã ký và lưu trữ */}
              {normalizedStatus === 'SIGNED_ARCHIVED' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    Hồ sơ đã được Hiệu trưởng ký duyệt hoàn tất và lưu trữ.
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      generateAndDownloadPdf(
                        currentDossier,
                        effectiveTemplate,
                        `${currentDossier.code}_Da_Ky_Luu_Tru.pdf`
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải file PDF đã ký và lưu trữ</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TRƯỜNG HỢP 2: ĐANG ĐĂNG NHẬP LÀ CÔ ADMIN (ADMIN WORKSPACE)
          ================================================================= */}
          {isAdmin && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
                Thao tác xét duyệt (Cô Admin)
              </h2>

              {/* Khi đơn ở trạng thái TRẢ VỀ SỬA LỖI: Admin đang chờ Thầy/Cô nộp lại bản mới */}
              {isReturnedForRevision && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                    <Clock className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Đang chờ Thầy/Cô nộp lại bản v{currentVersion + 1}</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Cô Admin đã trả về hồ sơ kèm gợi ý chỉnh sửa. Khi Thầy/Cô hoàn tất chỉnh sửa và nộp lại hồ sơ, hệ thống sẽ tự động cập nhật lên phiên bản <strong>v{currentVersion + 1}</strong> và mở lại nút Duyệt cho Cô Admin.
                  </p>
                </div>
              )}

              {/* Khi đơn ở SUBMITTED (Đã gửi đơn mới v1 hoặc Đã nộp lại v2, v3...) */}
              {normalizedStatus === 'SUBMITTED' && (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={isProcessingPrecheck}
                    onClick={() => handleAdminAction(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isProcessingPrecheck
                        ? 'Đang duyệt...'
                        : `Duyệt (Hồ sơ hợp lệ & Gửi PDF v${currentVersion})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRevisionBox(!showRevisionBox)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Yêu cầu trả về (Sửa lỗi)</span>
                  </button>

                  {showRevisionBox && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5">
                      <label className="block text-xs font-bold text-rose-900">
                        Gợi ý chỗ sai cần sửa chữa:
                      </label>
                      <textarea
                        rows={3}
                        value={revisionNoteInput}
                        onChange={(e) => setRevisionNoteInput(e.target.value)}
                        placeholder="Nhập nội dung cần Thầy/Cô chỉnh sửa..."
                        className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                      />
                      <button
                        type="button"
                        disabled={isProcessingPrecheck}
                        onClick={() => handleAdminAction(false)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi yêu cầu sửa lỗi</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Khi đơn ở VALIDATED: Chờ Thầy/Cô upload bản ký phòng ban */}
              {normalizedStatus === 'VALIDATED' && (
                <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1.5">
                  <div className="font-bold">Đã duyệt hợp lệ & gửi PDF chuẩn</div>
                  <p>Đang chờ Thầy/Cô xin chữ ký phòng ban và upload lại lên hệ thống.</p>
                </div>
              )}

              {/* Hiển thị tệp đã ký phòng ban của Thầy/Cô khi ở Bước 3 & 4 */}
              {uploadedDepartmentFiles.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800">
                    File ký phòng ban & minh chứng đã nộp:
                  </div>
                  {uploadedDepartmentFiles.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3 h-3 text-blue-600 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Khi đơn ở PENDING_SIGNED_REVIEW: Nút chuyển sang Chờ ký Hiệu trưởng */}
              {normalizedStatus === 'PENDING_SIGNED_REVIEW' && (
                <button
                  type="button"
                  disabled={isMovingToRector}
                  onClick={handleMoveToRectorSignature}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileSignature className="w-4 h-4" />
                  <span>
                    {isMovingToRector ? 'Đang chuyển...' : 'Chuyển sang Chờ ký Hiệu trưởng'}
                  </span>
                </button>
              )}

              {/* Khi đơn ở PENDING_SIGNED_REVIEW hoặc WAITING_RECTOR_SIGNATURE: Tải lên bản ký Hiệu trưởng & Xác nhận Đã ký */}
              {(normalizedStatus === 'PENDING_SIGNED_REVIEW' ||
                normalizedStatus === 'WAITING_RECTOR_SIGNATURE') && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Hoàn tất ký Hiệu trưởng & Lưu trữ:
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Số Quyết định / Văn bản
                    </label>
                    <input
                      type="text"
                      value={decisionNumberInput}
                      onChange={(e) => setDecisionNumberInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <label className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer text-xs">
                    <span className="text-slate-700 truncate">
                      {finalSignedFileName || 'Chọn file PDF đã ký Hiệu trưởng (.pdf)'}
                    </span>
                    <span className="text-blue-700 font-semibold shrink-0 ml-2">Chọn tệp</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setFinalSignedFileName(f.name);
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={isCompletingSign}
                    onClick={handleConfirmSignedAndArchive}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>
                      {isCompletingSign ? 'Đang hoàn tất...' : 'Xác nhận Đã ký và lưu trữ'}
                    </span>
                  </button>
                </div>
              )}

              {/* Khi đơn đã SIGNED_ARCHIVED */}
              {normalizedStatus === 'SIGNED_ARCHIVED' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    Hồ sơ đã hoàn tất ký Hiệu trưởng và khóa lưu trữ.
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      generateAndDownloadPdf(
                        currentDossier,
                        effectiveTemplate,
                        `${currentDossier.code}_Da_Ky_Luu_Tru.pdf`
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải file PDF đã ký và lưu trữ</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
