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
  Paperclip,
  Settings2,
  Eye,
  FileEdit,
  History,
  Printer,
  RotateCcw,
  ExternalLink,
  X,
} from 'lucide-react';
import { Application, DocumentTemplate, User, ActiveNavTab, SignatureConfig, DossierVersion } from '../types';
import { rollbackDossierVersion, API_BASE_URL } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { SignatureConfigPanel } from '../components/dossiers';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { generateAndDownloadPdf } from '../utils/pdfExport';
import { normalizeStatus } from '../services/workflowEngine';
import { isAdminUser, OFFICIAL_TEMPLATES } from '../constants';
import { formatDateTimeVi } from '../utils/statusHelpers';
import { getEffectiveTemplate, isMau2aTemplateOrDossier } from '../utils/templateUtils';

interface DossierDetailViewProps {
  dossier: Application;
  template?: DocumentTemplate;
  currentUser: User;
  onBack: () => void;
  onEditDossier: (dossier: Application) => void;
  onResubmitDossier?: (
    dossierId: string,
    updatedFormData: Record<string, any>,
    fullPayload?: Partial<Application>
  ) => Promise<void | Application>;
  onAdminPrecheck?: (
    dossierId: string,
    isValid: boolean,
    reviewNotes?: string,
    targetForm?: '1a' | '2a' | 'both'
  ) => Promise<void>;
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
  onUpdateDossier?: (dossierId: string, partial: Partial<Application>) => Promise<Application | void>;
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
  onUpdateDossier,
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

  // State cho luồng hồ sơ kép (1a & 2a) và cấu hình chữ ký động
  const [selectedPreviewTab, setSelectedPreviewTab] = useState<'1a' | '2a'>('1a');
  const [status1a, setStatus1a] = useState<'PENDING' | 'APPROVED' | 'RETURNED'>(
    (dossier as any).status_1a || 'PENDING'
  );
  const [status2a, setStatus2a] = useState<'PENDING' | 'APPROVED' | 'RETURNED'>(
    (dossier as any).status_2a || 'PENDING'
  );
  const [returnTarget, setReturnTarget] = useState<'1a' | '2a' | 'both'>('1a');
  const [showSignaturePanel, setShowSignaturePanel] = useState<boolean>(true);

  // State cho Xem thử bản in (Print Preview) & Quản lý Version (Draft vs Approved)
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);
  const [printPreviewTab, setPrintPreviewTab] = useState<'1a' | '2a'>('1a');
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState<boolean>(false);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);

  // Lecturer state (Upload bản ký phòng ban + minh chứng)
  const [signedPdfName, setSignedPdfName] = useState<string>('');
  const [evidenceList, setEvidenceList] = useState<
    Array<{ name: string; url: string; size: string; dataUrl?: string; mimeType?: string }>
  >([]);
  const [isUploadingSign, setIsUploadingSign] = useState<boolean>(false);
  const [previewUploadedFile, setPreviewUploadedFile] = useState<{
    name: string;
    url: string;
    blobUrl?: string;
    isImage?: boolean;
    isLoading?: boolean;
  } | null>(null);

  useEffect(() => {
    setCurrentDossier(dossier);
    setStatus1a((dossier as any).status_1a || 'PENDING');
    setStatus2a((dossier as any).status_2a || 'PENDING');
  }, [dossier]);

  const normalizedStatus = normalizeStatus(currentDossier.status);
  const isReturnedForRevision = normalizedStatus === 'RETURNED_FOR_REVISION';
  const isAdmin = isAdminUser(currentUser);
  const currentVersion = currentDossier.current_version || currentDossier.currentVersion || 1;
  const is2a = isMau2aTemplateOrDossier(currentDossier, template);
  const effectiveTemplate = getEffectiveTemplate(currentDossier, template);

  const template1a = OFFICIAL_TEMPLATES.find((t) => t.id === 'tmpl-cgcn-1a') || OFFICIAL_TEMPLATES[0];
  const template2a = OFFICIAL_TEMPLATES.find((t) => t.id === 'tmpl-cgcn-2a') || OFFICIAL_TEMPLATES[1];
  const activePreviewTemplate = selectedPreviewTab === '1a' ? template1a : template2a;

  const previewDossierForTab = {
    ...currentDossier,
    formData: {
      ...(currentDossier.formData || {}),
      ...(selectedPreviewTab === '1a'
        ? ((currentDossier as any).formData1a || {})
        : ((currentDossier as any).formData2a || {})),
    },
    templateId: selectedPreviewTab === '1a' ? 'tmpl-cgcn-1a' : 'tmpl-cgcn-2a',
    templateCode: selectedPreviewTab === '1a' ? 'Mẫu 1a-TT.CGCN' : 'Mẫu 2a-KH.CGCN',
  };

  const handleRollbackVersion = async (targetVer: number) => {
    if (
      !window.confirm(
        `Thầy/Cô có chắc chắn muốn khôi phục (Rollback) dữ liệu về Bản cứng v${targetVer}? Dữ liệu bản nháp hiện tại sẽ được cập nhật lại theo bản này.`
      )
    ) {
      return;
    }
    try {
      setIsRollingBack(true);
      const updated = await rollbackDossierVersion(currentDossier.id, targetVer, currentUser);
      if (updated) {
        setCurrentDossier(updated);
        if (onUpdateDossier) {
          await onUpdateDossier(currentDossier.id, updated);
        }
      }
      setShowVersionHistoryModal(false);
      alert(`Đã khôi phục thành công dữ liệu từ Bản cứng v${targetVer}!`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi khôi phục phiên bản');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Trạng thái Bản nháp (Draft Mode - Lưu đè lên tệp nháp hiện tại, không phình dung lượng)
  const handleSaveSignatureConfig = async (cfg: SignatureConfig) => {
    const updatedFields: Partial<Application> = {
      signature_config: cfg,
      signatureConfig: cfg,
      version_type: 'DRAFT',
      is_official_locked: false,
      updatedAt: new Date().toISOString(),
    };
    setCurrentDossier((prev) => ({
      ...prev,
      ...updatedFields,
    }));
    if (onUpdateDossier) {
      await onUpdateDossier(currentDossier.id, updatedFields);
    }
  };

  const handleApprove1a = async () => {
    setStatus1a('APPROVED');
    setCurrentDossier((prev) => ({ ...prev, status_1a: 'APPROVED' }));
    if (status2a === 'APPROVED') {
      await handleAdminAction(true);
    } else if (onUpdateDossier) {
      const updated = await onUpdateDossier(currentDossier.id, { status_1a: 'APPROVED' });
      if (updated) setCurrentDossier(updated);
    }
  };

  const handleApprove2a = async () => {
    setStatus2a('APPROVED');
    setCurrentDossier((prev) => ({ ...prev, status_2a: 'APPROVED' }));
    if (status1a === 'APPROVED') {
      await handleAdminAction(true);
    } else if (onUpdateDossier) {
      const updated = await onUpdateDossier(currentDossier.id, { status_2a: 'APPROVED' });
      if (updated) setCurrentDossier(updated);
    }
  };

  const handleApproveBoth = async () => {
    setStatus1a('APPROVED');
    setStatus2a('APPROVED');
    setCurrentDossier((prev) => ({ ...prev, status_1a: 'APPROVED', status_2a: 'APPROVED' }));
    await handleAdminAction(true);
  };
  const revisionMessage =
    currentDossier.revision_note ||
    currentDossier.revisionNote ||
    currentDossier.reviewNotes ||
    currentDossier.review_notes ||
    currentDossier.returnReason ||
    '';

  const rejectedTarget =
    currentDossier.rejected_target ||
    currentDossier.rejectedTarget ||
    currentDossier.target_form ||
    null;

  const isOnly1aRejected =
    isReturnedForRevision &&
    (rejectedTarget === '1a' || (status1a === 'RETURNED' && status2a !== 'RETURNED'));

  const isOnly2aRejected =
    isReturnedForRevision &&
    (rejectedTarget === '2a' || (status2a === 'RETURNED' && status1a !== 'RETURNED'));

  const effectiveReason1a =
    currentDossier.rejection_reason_1a ||
    currentDossier.rejectionReason1a ||
    revisionMessage;

  const rawUploadedDepartmentFiles =
    currentDossier.department_signed_files ||
    currentDossier.departmentSignedFiles ||
    currentDossier.resubmitted_signed_files ||
    currentDossier.resubmittedSignedFiles ||
    currentDossier.evidenceFiles ||
    currentDossier.evidence_files ||
    [];

  // Loại bỏ bản ghi ảo "{code}_Ban_Ky_Phong_Ban.pdf" nếu đã có các file thực tế do Giảng viên nộp lên
  const uploadedDepartmentFiles =
    rawUploadedDepartmentFiles.length > 1
      ? rawUploadedDepartmentFiles.filter(
          (f: any) => !String(f?.name || '').endsWith('_Ban_Ky_Phong_Ban.pdf')
        )
      : rawUploadedDepartmentFiles;

  // Handlers
  const [isResubmittingQuick, setIsResubmittingQuick] = useState(false);

  const handleQuickResubmit = async () => {
    if (!onResubmitDossier) {
      onEditDossier(currentDossier);
      return;
    }
    try {
      setIsResubmittingQuick(true);
      if (isOnly1aRejected) {
        const data1aOnly = {
          ...((currentDossier as any).form_data_1a || {}),
          ...(currentDossier.formData1a || {}),
        };
        const fallback1a =
          Object.keys(data1aOnly).length > 0
            ? data1aOnly
            : {
                ...((currentDossier as any).form_data || {}),
                ...(currentDossier.formData || {}),
              };
        const updated = await onResubmitDossier(currentDossier.id, fallback1a, {
          target_form: '1a',
          formData1a: fallback1a,
          form_data_1a: fallback1a,
          ten_de_tai: fallback1a.ten_de_tai || currentDossier.ten_de_tai,
          truong_don_vi: fallback1a.truong_don_vi || currentDossier.truong_don_vi,
        });
        if (updated) {
          setCurrentDossier(updated as Application);
        }
        return;
      }

      if (isOnly2aRejected) {
        const data2aOnly = {
          ...((currentDossier as any).form_data_2a || {}),
          ...(currentDossier.formData2a || {}),
        };
        const fallback2a =
          Object.keys(data2aOnly).length > 0
            ? data2aOnly
            : {
                ...((currentDossier as any).form_data || {}),
                ...(currentDossier.formData || {}),
              };
        const updated = await onResubmitDossier(currentDossier.id, fallback2a, {
          target_form: '2a',
          formData2a: fallback2a,
          form_data_2a: fallback2a,
        });
        if (updated) {
          setCurrentDossier(updated as Application);
        }
        return;
      }

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
      if (!isValid) {
        const next1a: 'PENDING' | 'APPROVED' | 'RETURNED' =
          returnTarget === '1a' || returnTarget === 'both'
            ? 'RETURNED'
            : status1a === 'RETURNED'
            ? 'PENDING'
            : status1a;
        const next2a: 'PENDING' | 'APPROVED' | 'RETURNED' =
          returnTarget === '2a' || returnTarget === 'both'
            ? 'RETURNED'
            : status2a === 'RETURNED'
            ? 'PENDING'
            : status2a;

        const cleanReason = revisionNoteInput.trim();

        setStatus1a(next1a);
        setStatus2a(next2a);
        setCurrentDossier((prev) => ({
          ...prev,
          status: 'RETURNED_FOR_REVISION',
          status_1a: next1a,
          status_2a: next2a,
          rejected_target: returnTarget,
          rejectedTarget: returnTarget,
          target_form: returnTarget,
          rejection_reason_1a: returnTarget === '1a' || returnTarget === 'both' ? cleanReason : null,
          rejection_reason_2a: returnTarget === '2a' || returnTarget === 'both' ? cleanReason : null,
        }));

        await onAdminPrecheck(
          currentDossier.id,
          false,
          cleanReason,
          returnTarget
        );
      } else {
        setCurrentDossier((prev) => ({
          ...prev,
          status: 'VALIDATED',
          status_1a: 'APPROVED',
          status_2a: 'APPROVED',
          rejected_target: null,
          rejectedTarget: null,
          target_form: null,
        }));
        await onAdminPrecheck(
          currentDossier.id,
          true,
          'Hồ sơ hợp lệ.'
        );
      }
      setShowRevisionBox(false);
      setRevisionNoteInput('');
    } finally {
      setIsProcessingPrecheck(false);
    }
  };

  const handleSelectSignedAndEvidenceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let firstPdf = signedPdfName;
    const fileArray = Array.from(files);

    const readAsDataUrl = (file: File): Promise<string> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

    const added: Array<{ name: string; url: string; size: string; dataUrl?: string; mimeType?: string }> = [];

    for (const f of fileArray) {
      const sizeStr = `${(f.size / 1024).toFixed(1)} KB`;
      if (f.name.toLowerCase().endsWith('.pdf') && !firstPdf) {
        firstPdf = f.name;
      }
      const dataUrl = await readAsDataUrl(f);
      added.push({
        name: f.name,
        url: `/uploads/signed/${encodeURIComponent(f.name)}`,
        size: sizeStr,
        dataUrl: dataUrl || undefined,
        mimeType: f.type || undefined,
      });
    }

    if (firstPdf) setSignedPdfName(firstPdf);
    setEvidenceList((prev) => [...prev, ...added]);
  };

  const resolveUploadedFileBlobUrl = async (fileItem: {
    name: string;
    url?: string;
    dataUrl?: string;
  }): Promise<{ blobUrl: string; isImage: boolean }> => {
    const lowerName = String(fileItem.name || '').toLowerCase();
    const isImage =
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp');

    // 1. Nếu có sẵn dataUrl (vừa chọn từ máy hoặc lưu trong state)
    if (fileItem.dataUrl && fileItem.dataUrl.startsWith('data:')) {
      const res = await fetch(fileItem.dataUrl);
      const blob = await res.blob();
      return { blobUrl: URL.createObjectURL(blob), isImage };
    }

    // 2. Thử tải trực tiếp từ đường dẫn file trên Backend (/uploads/signed/... hoặc /uploads/pdf/...)
    if (fileItem.url) {
      const serverBase = API_BASE_URL.replace(/\/api$/, '');
      const fullUrl = fileItem.url.startsWith('http')
        ? fileItem.url
        : `${serverBase}${fileItem.url.startsWith('/') ? '' : '/'}${fileItem.url}`;
      try {
        const res = await fetch(fullUrl);
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && !contentType.includes('text/html')) {
          const blob = await res.blob();
          return {
            blobUrl: URL.createObjectURL(
              new Blob([blob], { type: isImage ? blob.type || 'image/png' : 'application/pdf' })
            ),
            isImage,
          };
        }
      } catch {
        // fallback bên dưới
      }
    }

    // 3. Fallback thông minh cho các bản ghi đã nộp trước đó: kết xuất trực tiếp PDF 1a hoặc 2a của hồ sơ
    const isFile2a =
      lowerName.includes('2a') ||
      lowerName.includes('ke_hoach') ||
      lowerName.includes('kế hoạch');
    const specificFormData = isFile2a
      ? { ...(currentDossier.formData || {}), ...((currentDossier as any).formData2a || {}) }
      : { ...(currentDossier.formData || {}), ...((currentDossier as any).formData1a || {}) };

    const exportRes = await fetch(
      `${API_BASE_URL}/applications/${encodeURIComponent(currentDossier.id)}/export-pdf`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentDossier.code,
          version: currentVersion,
          formTarget: isFile2a ? '2a' : '1a',
          formData: specificFormData,
          signatureConfig: currentDossier.signature_config || currentDossier.signatureConfig || null,
          templateId: isFile2a ? 'tmpl-cgcn-2a' : 'tmpl-cgcn-1a',
          templateCode: isFile2a ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN',
        }),
      }
    );

    if (exportRes.ok) {
      const blob = await exportRes.blob();
      return {
        blobUrl: URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })),
        isImage: false,
      };
    }

    throw new Error('Không thể tải nội dung tệp đính kèm.');
  };

  const handlePreviewUploadedFile = async (fileItem: {
    name: string;
    url?: string;
    dataUrl?: string;
  }) => {
    setPreviewUploadedFile({
      name: fileItem.name,
      url: fileItem.url || '',
      isLoading: true,
    });
    try {
      const { blobUrl, isImage } = await resolveUploadedFileBlobUrl(fileItem);
      setPreviewUploadedFile({
        name: fileItem.name,
        url: fileItem.url || '',
        blobUrl,
        isImage,
        isLoading: false,
      });
    } catch (err: any) {
      setPreviewUploadedFile(null);
      alert(err.message || 'Không thể mở xem tệp này.');
    }
  };

  const handleDownloadUploadedFile = async (fileItem: {
    name: string;
    url?: string;
    dataUrl?: string;
  }) => {
    try {
      const { blobUrl } = await resolveUploadedFileBlobUrl(fileItem);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileItem.name || `${currentDossier.code}_file_dinh_kem.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      alert(err.message || 'Không thể tải tệp này.');
    }
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
      setCurrentDossier((prev) => ({
        ...prev,
        status: 'PENDING_SIGNED_REVIEW',
        faculty_signed_pdf_url: pdfUrl,
        evidenceFiles: evidenceList,
        department_signed_files: evidenceList,
      }));
      await onUploadFacultySignature(currentDossier.id, pdfUrl, evidenceList);
    } finally {
      setIsUploadingSign(false);
    }
  };

  const handleMoveToRectorSignature = async () => {
    if (!onUpdateSchoolSigning) return;
    try {
      setIsMovingToRector(true);
      setCurrentDossier((prev) => ({
        ...prev,
        status: 'WAITING_RECTOR_SIGNATURE',
        khcnSigned: true,
        khcn_signed: true,
      }));
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
      const resolvedDecisionNum = decisionNumberInput.trim() || `${currentDossier.code}/QĐ-ĐHYDCT`;
      const resolvedDate = new Date().toISOString().slice(0, 10);
      setCurrentDossier((prev) => ({
        ...prev,
        status: 'SIGNED_ARCHIVED',
        decisionNumber: resolvedDecisionNum,
        decision_number: resolvedDecisionNum,
        decisionDate: resolvedDate,
        decision_date: resolvedDate,
        final_signed_pdf_path: finalUrl,
        final_pdf_url: finalUrl,
      }));
      await onCompleteDossier(
        currentDossier.id,
        resolvedDecisionNum,
        resolvedDate,
        finalUrl
      );
    } finally {
      setIsCompletingSign(false);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      {/* =====================================================================
          1. HEADER TINH GỌN (CLEAN DASHBOARD)
      ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        {/* Hàng 1: Nút Quay lại + Mã hồ sơ + Badge trạng thái trên cùng 1 hàng ngang */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <span className="font-mono text-sm font-bold text-slate-900 tracking-tight">
              {currentDossier.code}
            </span>

            {isReturnedForRevision ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Đang chờ chỉnh sửa (v{currentVersion + 1})</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <StatusBadge status={currentDossier.status} />
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  v{currentVersion}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {((currentDossier.versions && currentDossier.versions.length > 0) || isAdmin) && (
              <button
                type="button"
                onClick={() => setShowVersionHistoryModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                title="Xem lịch sử các bản cứng và đối chiếu/rollback"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Lịch sử {currentDossier.versions?.length ? `(${currentDossier.versions.length})` : ''}</span>
              </button>
            )}

            {(['VALIDATED', 'PENDING_SIGNED_REVIEW', 'WAITING_RECTOR_SIGNATURE', 'SIGNED_ARCHIVED'].includes(
              normalizedStatus
            ) ||
              (selectedPreviewTab === '1a' && status1a === 'APPROVED') ||
              (selectedPreviewTab === '2a' && status2a === 'APPROVED')) && (
              <button
                type="button"
                onClick={() =>
                  generateAndDownloadPdf(
                    previewDossierForTab as any,
                    activePreviewTemplate,
                    `${currentDossier.code}_Mau_${selectedPreviewTab}_v${currentVersion}.pdf`
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Tải PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => generateAndDownloadDocx(previewDossierForTab as any, activePreviewTemplate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Tải Word</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Khu vực thông tin Người nộp & Góp ý sửa lỗi của Admin (Grid gọn gàng) */}
        {(() => {
          const shouldHideRevisionBannerForTab =
            (isOnly1aRejected && selectedPreviewTab === '2a') ||
            (isOnly2aRejected && selectedPreviewTab === '1a');
          const activeBannerReason = isOnly1aRejected
            ? effectiveReason1a
            : revisionMessage;
          const showRevisionBanner =
            isReturnedForRevision && Boolean(activeBannerReason) && !shouldHideRevisionBannerForTab;

          return (
            <div className="pt-3.5 border-t border-slate-100 space-y-3">
              <div
                className={
                  showRevisionBanner
                    ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-center'
                    : 'flex flex-wrap items-center justify-between gap-3'
                }
              >
                {/* Thông tin Người nộp */}
                <div className={showRevisionBanner ? 'lg:col-span-5 flex items-center gap-3' : 'flex items-center gap-3'}>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                    {(currentDossier.createdBy?.name || 'GV').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-400">
                      Người nộp hồ sơ
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {currentDossier.createdBy?.name || 'Giảng viên'}
                      <span className="font-normal text-slate-500">
                        {' '}• {currentDossier.department_name || currentDossier.createdBy?.department || 'Khoa Y'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Khung góp ý sửa lỗi của Admin (ẩn khi người dùng đang xem biểu mẫu không bị trả về) */}
                {showRevisionBanner && (
                  <div className="lg:col-span-7 flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50/60 border border-red-200/80">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 text-xs leading-relaxed">
                      <span className="font-semibold text-red-800">
                        {isOnly1aRejected
                          ? 'Yêu cầu chỉnh sửa Biểu mẫu 1a: '
                          : isOnly2aRejected
                          ? 'Yêu cầu chỉnh sửa Biểu mẫu 2a: '
                          : 'Yêu cầu chỉnh sửa từ Admin: '}
                      </span>
                      <span className="text-red-700/90 font-medium whitespace-pre-line">
                        {activeBannerReason}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh thao tác nhanh cho Giảng viên ngay khi có yêu cầu sửa lỗi */}
              {!isAdmin && isReturnedForRevision && !shouldHideRevisionBannerForTab && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                        status1a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                          ? 'bg-red-50/80 text-red-700 border-red-200/80'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <strong>Mẫu 1a:</strong>{' '}
                      {status1a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                        ? 'Mở khóa sửa'
                        : 'Chỉ xem'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                        status2a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                          ? 'bg-red-50/80 text-red-700 border-red-200/80'
                          : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80'
                      }`}
                    >
                      <strong>Mẫu 2a:</strong>{' '}
                      {status2a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                        ? 'Mở khóa sửa'
                        : 'Hợp lệ (Chỉ xem)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEditDossier(currentDossier)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {isOnly1aRejected
                          ? 'Chỉnh sửa Mẫu 1a'
                          : isOnly2aRejected
                          ? 'Chỉnh sửa Mẫu 2a'
                          : 'Chỉnh sửa trên Form'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isResubmittingQuick}
                      onClick={handleQuickResubmit}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {isResubmittingQuick
                          ? 'Đang nộp lại...'
                          : isOnly1aRejected
                          ? `Nộp lại Mẫu 1a (v${currentVersion + 1})`
                          : isOnly2aRejected
                          ? `Nộp lại Mẫu 2a (v${currentVersion + 1})`
                          : `Nộp lại hồ sơ (v${currentVersion + 1})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* =====================================================================
          2. KHUNG XEM TRƯỚC VĂN BẢN (FULL-WIDTH 1 CỘT DỌC CHUẨN A4)
      ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setSelectedPreviewTab('1a')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPreviewTab === '1a'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Tờ trình (Mẫu 1a)</span>
              {status1a === 'APPROVED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  ✓ Đã duyệt
                </span>
              ) : status1a === 'RETURNED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">
                  Cần sửa
                </span>
              ) : isReturnedForRevision && status2a === 'RETURNED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-medium">
                  Chỉ xem
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSelectedPreviewTab('2a')}
              className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPreviewTab === '2a'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Kế hoạch (Mẫu 2a)</span>
              {status2a === 'APPROVED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                  ✓ Đã duyệt
                </span>
              ) : status2a === 'RETURNED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-semibold">
                  Cần sửa
                </span>
              ) : isReturnedForRevision && status1a === 'RETURNED' ? (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-medium">
                  Chỉ xem
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPrintPreviewTab(selectedPreviewTab);
              setShowPrintPreviewModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Xem thử bản in A4</span>
          </button>
        </div>

        {/* Thông báo trạng thái Chỉ xem đối với file không bị trả về */}
        {isReturnedForRevision &&
          ((selectedPreviewTab === '2a' && status1a === 'RETURNED' && status2a !== 'RETURNED') ||
            (selectedPreviewTab === '1a' && status2a === 'RETURNED' && status1a !== 'RETURNED')) && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Biểu mẫu {selectedPreviewTab} không có yêu cầu chỉnh sửa và đang ở chế độ{' '}
                  <strong className="text-slate-800">Chỉ xem (Khóa chỉnh sửa)</strong>.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shrink-0">
                Chỉ xem
              </span>
            </div>
          )}

        <div className="p-4 sm:p-6 bg-slate-50/40 flex justify-center">
          <div className="w-full max-w-4xl min-h-[780px]">
            <WordDocumentPreview
              dossier={previewDossierForTab}
              template={activePreviewTemplate}
            />
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. CỤM TÙY CHỈNH THÀNH PHẦN KÝ & NƠI NHẬN (ADMIN VIEW)
      ===================================================================== */}
      {isAdmin && !isReturnedForRevision && normalizedStatus !== 'SIGNED_ARCHIVED' && (
        <SignatureConfigPanel
          dossier={currentDossier}
          onSaveConfig={handleSaveSignatureConfig}
        />
      )}

      {/* =================================================================
          TRƯỜNG HỢP 1: GIẢNG VIÊN / THẦY CÔ (USER)
      ================================================================= */}
      {!isAdmin && !isReturnedForRevision && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
            Tiến trình &amp; Thao tác hồ sơ
          </h2>

          {/* Bước 1: Đã gửi / Chờ duyệt */}
          {normalizedStatus === 'SUBMITTED' && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Đang chờ Cô Admin kiểm tra &amp; duyệt thể thức</span>
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Khi hồ sơ được duyệt hợp lệ, hệ thống sẽ gửi file PDF chuẩn qua Gmail và mở khóa mục tải file / upload bản ký tại đây.
              </p>
            </div>
          )}

          {/* Bước 2: Đã hợp lệ -> Tải PDF chuẩn (Mẫu 1a & Mẫu 2a) & Upload lại sau khi ký */}
          {normalizedStatus === 'VALIDATED' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    generateAndDownloadPdf(
                      {
                        ...currentDossier,
                        formData: {
                          ...(currentDossier.formData || {}),
                          ...((currentDossier as any).formData1a || {}),
                        },
                        templateId: 'tmpl-cgcn-1a',
                        templateCode: 'Mẫu 1a-TT.CGCN',
                      } as any,
                      template1a,
                      `${currentDossier.code}_Mau_1a_v${currentVersion}.pdf`
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>1a. Tải PDF Tờ trình (Mẫu 1a)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    generateAndDownloadPdf(
                      {
                        ...currentDossier,
                        formData: {
                          ...(currentDossier.formData || {}),
                          ...((currentDossier as any).formData2a || {}),
                        },
                        templateId: 'tmpl-cgcn-2a',
                        templateCode: 'Mẫu 2a-KH.CGCN',
                      } as any,
                      template2a,
                      `${currentDossier.code}_Mau_2a_v${currentVersion}.pdf`
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>2a. Tải PDF Kế hoạch (Mẫu 2a)</span>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  2. Upload lại sau khi ký xong
                </div>
                <p className="text-[11px] text-slate-600">
                  Tải lên file PDF đã có chữ ký phòng ban kèm ảnh/PDF minh chứng:
                </p>

                <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-lg p-4 text-center cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-blue-600 mb-1" />
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
                  <div className="space-y-1.5">
                    {evidenceList.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handlePreviewUploadedFile(item)}
                          className="truncate text-slate-800 hover:text-blue-700 font-medium flex items-center gap-1.5 cursor-pointer text-left"
                          title="Nhấn để xem trước tệp"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewUploadedFile(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Xem</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEvidenceList((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            title="Xóa tệp"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isUploadingSign}
                  onClick={handleSubmitSignedUpload}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
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
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900">
                  {normalizedStatus === 'WAITING_RECTOR_SIGNATURE'
                    ? 'Đang chờ ký Hiệu trưởng'
                    : 'Đã gửi bản ký phòng ban • Chờ Admin duyệt'}
                </div>
                <p className="text-xs text-amber-800">
                  Ngay khi có chữ ký Hiệu trưởng, hệ thống sẽ gửi email kèm bản PDF hoàn tất cho Thầy/Cô.
                </p>
              </div>

              {uploadedDepartmentFiles.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">
                    File ký phòng ban &amp; minh chứng đã nộp:
                  </div>
                  <div className="space-y-2">
                    {uploadedDepartmentFiles.map((f: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs bg-white border border-slate-200 hover:border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-800 flex items-center justify-between gap-3 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => handlePreviewUploadedFile(f)}
                          className="flex items-center gap-2 min-w-0 text-left hover:text-blue-700 font-medium cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{f.name}</span>
                          {f.size && (
                            <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                              ({f.size})
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePreviewUploadedFile(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem file</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadUploadedFile(f)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải về</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bước 5: Đã ký và lưu trữ */}
          {normalizedStatus === 'SIGNED_ARCHIVED' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                Hồ sơ đã được Hiệu trưởng ký duyệt hoàn tất và lưu trữ.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    generateAndDownloadPdf(
                      {
                        ...currentDossier,
                        formData: {
                          ...(currentDossier.formData || {}),
                          ...((currentDossier as any).formData1a || {}),
                        },
                        templateId: 'tmpl-cgcn-1a',
                        templateCode: 'Mẫu 1a-TT.CGCN',
                      } as any,
                      template1a,
                      `${currentDossier.code}_Mau_1a_Da_Ky_Luu_Tru.pdf`
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải PDF Mẫu 1a (Đã ký)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    generateAndDownloadPdf(
                      {
                        ...currentDossier,
                        formData: {
                          ...(currentDossier.formData || {}),
                          ...((currentDossier as any).formData2a || {}),
                        },
                        templateId: 'tmpl-cgcn-2a',
                        templateCode: 'Mẫu 2a-KH.CGCN',
                      } as any,
                      template2a,
                      `${currentDossier.code}_Mau_2a_Da_Ky_Luu_Tru.pdf`
                    )
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải PDF Mẫu 2a (Đã ký)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================
          TRƯỜNG HỢP 2: CÔ ADMIN (ADMIN WORKSPACE)
      ================================================================= */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Xét duyệt &amp; Trình ký Hồ sơ
            </h2>

            {isReturnedForRevision && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Chờ Giảng viên nộp lại bản v{currentVersion + 1}</span>
              </span>
            )}
          </div>

          {/* Khi đơn ở trạng thái TRẢ VỀ SỬA LỖI: Chỉ hiển thị trạng thái phân quyền gọn gàng (nội dung góp ý đã có ở Header) */}
          {isReturnedForRevision && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                    status1a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <strong>Mẫu 1a:</strong>{' '}
                  {status1a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                    ? 'Đã trả về yêu cầu sửa'
                    : `Khóa chỉ xem (${status1a === 'APPROVED' ? 'Đã duyệt' : 'Chưa duyệt'})`}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
                    status2a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <strong>Mẫu 2a:</strong>{' '}
                  {status2a === 'RETURNED' || (status1a !== 'RETURNED' && status2a !== 'RETURNED')
                    ? 'Đã trả về yêu cầu sửa'
                    : `Khóa chỉ xem (${status2a === 'APPROVED' ? 'Đã duyệt' : 'Chưa duyệt'})`}
                </span>
              </div>
              <span className="text-slate-500">
                Tự động mở lại xét duyệt khi Giảng viên gửi bản <strong>v{currentVersion + 1}</strong>
              </span>
            </div>
          )}

          {/* Khi đơn ở SUBMITTED: Bảng điều khiển xét duyệt 1a & 2a tinh gọn */}
          {normalizedStatus === 'SUBMITTED' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Nhánh A: File 1a */}
                <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Biểu mẫu 1a (Tờ trình)</div>
                    <div className="text-[11px] mt-0.5">
                      {status1a === 'APPROVED' ? (
                        <span className="text-emerald-700 font-semibold">✓ Đã duyệt {status2a !== 'APPROVED' && '(Chờ Mẫu 2a)'}</span>
                      ) : (
                        <span className="text-slate-500">Chờ kiểm tra thể thức</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessingPrecheck}
                      onClick={() => {
                        setReturnTarget('1a');
                        setShowRevisionBox(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Trả về 1a
                    </button>
                    {status1a === 'APPROVED' ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        Đã duyệt
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessingPrecheck}
                        onClick={handleApprove1a}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Duyệt 1a
                      </button>
                    )}
                  </div>
                </div>

                {/* Nhánh B: File 2a */}
                <div className="flex items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Biểu mẫu 2a (Kế hoạch)</div>
                    <div className="text-[11px] mt-0.5">
                      {status2a === 'APPROVED' ? (
                        <span className="text-emerald-700 font-semibold">✓ Đã duyệt {status1a !== 'APPROVED' && '(Chờ Mẫu 1a)'}</span>
                      ) : (
                        <span className="text-slate-500">Chờ kiểm tra thể thức</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isProcessingPrecheck}
                      onClick={() => {
                        setReturnTarget('2a');
                        setShowRevisionBox(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Trả về 2a
                    </button>
                    {status2a === 'APPROVED' ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                        Đã duyệt
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessingPrecheck}
                        onClick={handleApprove2a}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Duyệt 2a
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hàng nút thao tác duyệt & trả về (Tỉ lệ 50 - 50) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isProcessingPrecheck}
                  onClick={handleApproveBoth}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isProcessingPrecheck
                      ? 'Đang duyệt...'
                      : 'Duyệt cả bộ hồ sơ (1a & 2a)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowRevisionBox(!showRevisionBox)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FileEdit className="w-4 h-4" />
                  <span>Yêu cầu chỉnh sửa (Trả về)</span>
                </button>
              </div>

              {showRevisionBox && (
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3.5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Chọn file yêu cầu chỉnh sửa (file không bị trả về sẽ ở chế độ Chỉ xem, không được sửa):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReturnTarget('1a')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                          returnTarget === '1a'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div>Trả về File 1a (Tờ trình)</div>
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                          File 2a giữ nguyên (Chỉ xem)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReturnTarget('2a')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                          returnTarget === '2a'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div>Trả về File 2a (Kế hoạch)</div>
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                          File 1a giữ nguyên (Chỉ xem)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReturnTarget('both')}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                          returnTarget === 'both'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div>Trả về cả 2 file (1a &amp; 2a)</div>
                        <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                          Mở khóa sửa cả 2 file
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Nội dung góp ý chỉnh sửa gửi cho Giảng viên:
                    </label>
                    <textarea
                      rows={3}
                      value={revisionNoteInput}
                      onChange={(e) => setRevisionNoteInput(e.target.value)}
                      placeholder="Nhập nội dung cần Thầy/Cô chỉnh sửa..."
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-gray-900"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevisionBox(false)}
                      className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingPrecheck}
                      onClick={() => handleAdminAction(false)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        Gửi yêu cầu trả về{' '}
                        {returnTarget === '1a'
                          ? 'File 1a'
                          : returnTarget === '2a'
                          ? 'File 2a'
                          : 'cả 2 file'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Khi đơn ở VALIDATED: Chờ Thầy/Cô upload bản ký phòng ban */}
          {normalizedStatus === 'VALIDATED' && (
            <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 space-y-1.5">
              <div className="font-bold">Đã duyệt hợp lệ &amp; gửi PDF chuẩn</div>
              <p>Đang chờ Thầy/Cô xin chữ ký phòng ban và upload lại lên hệ thống.</p>
            </div>
          )}

          {/* Hiển thị tệp đã ký phòng ban của Thầy/Cô khi ở Bước 3 & 4 */}
          {uploadedDepartmentFiles.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">
                  File ký phòng ban &amp; minh chứng đã nộp ({uploadedDepartmentFiles.length} tệp):
                </div>
                <span className="text-[11px] text-slate-500">
                  Nhấn vào tên file hoặc nút Xem file để kiểm tra trực tiếp
                </span>
              </div>
              <div className="space-y-2">
                {uploadedDepartmentFiles.map((f: any, i: number) => (
                  <div
                    key={i}
                    className="text-xs bg-white border border-slate-200 hover:border-blue-300 rounded-xl px-3.5 py-2.5 text-slate-800 flex items-center justify-between gap-3 transition-colors shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => handlePreviewUploadedFile(f)}
                      className="flex items-center gap-2 min-w-0 text-left hover:text-blue-700 font-medium cursor-pointer"
                      title="Nhấn để mở xem trực tiếp nội dung tệp"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      {f.size && (
                        <span className="text-[10.5px] text-slate-400 font-mono shrink-0">
                          ({f.size})
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePreviewUploadedFile(f)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem file</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadUploadedFile(f)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải về</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Khi đơn ở PENDING_SIGNED_REVIEW: Nút chuyển sang Chờ ký Hiệu trưởng */}
          {normalizedStatus === 'PENDING_SIGNED_REVIEW' && (
            <button
              type="button"
              disabled={isMovingToRector}
              onClick={handleMoveToRectorSignature}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
                Hoàn tất ký Hiệu trưởng &amp; Lưu trữ:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    File PDF đã ký Hiệu trưởng (.pdf)
                  </label>
                  <label className="flex items-center justify-between px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg cursor-pointer text-xs">
                    <span className="text-slate-700 truncate">
                      {finalSignedFileName || 'Chọn file PDF đã ký...'}
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
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={isCompletingSign}
                  onClick={handleConfirmSignedAndArchive}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>
                    {isCompletingSign ? 'Đang hoàn tất...' : 'Xác nhận Đã ký và lưu trữ'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Khi đơn đã SIGNED_ARCHIVED */}
          {normalizedStatus === 'SIGNED_ARCHIVED' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải file PDF đã ký và lưu trữ</span>
              </button>
            </div>
          )}
        </div>
      )}


      {/* =====================================================================
          MODAL XEM THỬ BẢN IN (PRINT PREVIEW MODAL A4)
      ===================================================================== */}
      {showPrintPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bản xem thử trước khi in (Print Preview A4)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mô phỏng bản in thật đã tự động cập nhật theo cấu hình chữ ký &amp; nơi nhận mới nhất
                  </p>
                </div>
              </div>

              {/* Tabs 1a vs 2a & Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setPrintPreviewTab('1a')}
                    className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                      printPreviewTab === '1a'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    File 1a: Tờ trình
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintPreviewTab('2a')}
                    className={`px-3 py-1 font-bold rounded-md transition-all cursor-pointer ${
                      printPreviewTab === '2a'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    File 2a: Kế hoạch
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    generateAndDownloadPdf(
                      printPreviewTab === '1a'
                        ? { ...currentDossier, formData: (currentDossier as any).formData1a || currentDossier.formData }
                        : { ...currentDossier, formData: (currentDossier as any).formData2a || currentDossier.formData },
                      printPreviewTab === '1a' ? template1a : template2a,
                      `${currentDossier.code}_v${currentVersion}_XEM_THU_${printPreviewTab.toUpperCase()}.pdf`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PDF xem thử</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: A4 Paper Preview */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center">
              <div className="w-full max-w-4xl bg-white shadow-xl rounded-lg p-6 sm:p-10 border border-slate-300 min-h-[850px]">
                <WordDocumentPreview
                  dossier={{
                    ...currentDossier,
                    formData: {
                      ...(currentDossier.formData || {}),
                      ...(printPreviewTab === '1a'
                        ? ((currentDossier as any).formData1a || {})
                        : ((currentDossier as any).formData2a || {})),
                    },
                    templateId: printPreviewTab === '1a' ? 'tmpl-cgcn-1a' : 'tmpl-cgcn-2a',
                    templateCode: printPreviewTab === '1a' ? 'Mẫu 1a-TT.CGCN' : 'Mẫu 2a-KH.CGCN',
                  }}
                  template={printPreviewTab === '1a' ? template1a : template2a}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="text-slate-600 flex items-center gap-1.5">
                <span className="font-bold text-slate-800">Cơ chế lưu trữ:</span>
                <span>
                  Đang ở chế độ <strong>Bản nháp lưu đè</strong>. Khi Admin bấm <em>"Duyệt"</em>, hệ thống sẽ tự động khóa bản nháp này thành <strong>Bản cứng chính thức</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintPreviewModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Đóng xem thử
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL LỊCH SỬ PHIÊN BẢN & ĐỐI CHIẾU / ROLLBACK
      ===================================================================== */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Lịch sử Phiên bản &amp; Bản cứng Lưu vết ({currentDossier.code})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đối chiếu các bản cứng đã chốt hoặc khôi phục (Rollback) lại dữ liệu khi phát hiện sai sót
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Phiên bản hiện tại */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <span>Phiên bản đang thao tác: v{currentVersion}</span>
                  {currentDossier.version_type === 'OFFICIAL' || currentDossier.is_official_locked ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Bản cứng chính thức (Đã khóa)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                      Bản nháp (Đang sửa đổi lưu đè)
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-blue-700">Mới nhất</span>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Mọi tùy chỉnh thành phần chữ ký phòng ban và nơi nhận sẽ ghi đè trực tiếp lên bản nháp này để không sinh file rác trung gian.
              </p>
            </div>

            {/* Danh sách các bản cứng lưu vết */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pt-1">
                Các bản cứng đã chốt trong lịch sử:
              </div>

              {(!currentDossier.versions || currentDossier.versions.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg italic">
                  Chưa có bản cứng nào được lưu vết. Khi Admin duyệt hoặc yêu cầu sửa đổi, hệ thống sẽ tự động lưu lại snapshot tại đây.
                </div>
              ) : (
                currentDossier.versions.map((ver: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono">v{ver.versionNumber}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                          Bản cứng lưu vết
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          • {formatDateTimeVi(ver.createdAt || (ver as any).created_at)}
                        </span>
                      </div>
                      <div className="text-slate-700 font-medium">
                        {ver.changeSummary || 'Chốt bản cứng chính thức'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Người chốt: {ver.editedByName}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isRollingBack}
                        onClick={() => handleRollbackVersion(ver.versionNumber)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs disabled:opacity-50"
                        title="Khôi phục lại dữ liệu của phiên bản này"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVersionHistoryModal(false)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL XEM TRỰC TIẾP TỆP ĐÍNH KÈM / BẢN KÝ PHÒNG BAN & MINH CHỨNG
      ===================================================================== */}
      {previewUploadedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {previewUploadedFile.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Xem trực tiếp tệp ký phòng ban &amp; minh chứng đã nộp ({currentDossier.code})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {previewUploadedFile.blobUrl && (
                  <>
                    <a
                      href={previewUploadedFile.blobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tab mới</span>
                    </a>
                    <a
                      href={previewUploadedFile.blobUrl}
                      download={previewUploadedFile.name}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (previewUploadedFile.blobUrl) {
                      URL.revokeObjectURL(previewUploadedFile.blobUrl);
                    }
                    setPreviewUploadedFile(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 bg-slate-100 p-3 sm:p-5 overflow-auto flex items-center justify-center min-h-[75vh]">
              {previewUploadedFile.isLoading ? (
                <div className="text-xs font-medium text-slate-500 py-12">
                  Đang tải nội dung tệp đính kèm...
                </div>
              ) : previewUploadedFile.blobUrl ? (
                previewUploadedFile.isImage ? (
                  <img
                    src={previewUploadedFile.blobUrl}
                    alt={previewUploadedFile.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md bg-white"
                  />
                ) : (
                  <iframe
                    src={previewUploadedFile.blobUrl}
                    title={previewUploadedFile.name}
                    className="w-full h-[75vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                  />
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
