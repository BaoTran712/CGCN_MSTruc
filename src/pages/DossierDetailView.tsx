import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Edit,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Clock,
  Shield,
  FileText,
  History,
  Upload,
  UserCheck,
  Building,
  ExternalLink,
  Edit3,
  Mail,
  Award,
  ChevronRight,
} from 'lucide-react';
import { Application, DocumentTemplate, User, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { ApprovalTimeline } from '../components/timeline/ApprovalTimeline';
import { AuditLogViewer } from '../components/dossiers/AuditLogViewer';
import { VersionHistoryViewer } from '../components/dossiers/VersionHistoryViewer';
import { EmailLogViewer } from '../components/dossiers/EmailLogViewer';
import { ReturnDossierModal } from '../components/modals/ReturnDossierModal';
import { ManagerEditDossierModal } from '../components/modals/ManagerEditDossierModal';
import { UploadFacultySignedModal } from '../components/modals/UploadFacultySignedModal';
import { CompleteDecisionModal } from '../components/modals/CompleteDecisionModal';
import { generateAndDownloadDocx, generateAndDownloadBothDocx } from '../utils/docxExport';
import { normalizeStatus } from '../services/workflowEngine';
import { isAdminUser } from '../constants';

interface DossierDetailViewProps {
  dossier: Application;
  template?: DocumentTemplate;
  currentUser: User;
  onBack: () => void;
  onEditDossier: (dossier: Application) => void;
  onAdminPrecheck?: (dossierId: string, isValid: boolean, reviewNotes?: string) => Promise<void>;
  onUploadFacultySignature?: (
    dossierId: string,
    pdfUrl: string,
    evidenceFiles: Array<{ name: string; url: string; size?: string }>
  ) => Promise<void>;
  onUpdateSchoolSigning?: (
    dossierId: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean }
  ) => Promise<void>;
  onCompleteDossier?: (
    dossierId: string,
    decisionNumber: string,
    decisionDate: string,
    finalPdfUrl: string
  ) => Promise<void>;
  onApproveDossier?: (dossierId: string, notes?: string) => Promise<void>;
  onReturnDossier?: (dossierId: string, reason: string) => Promise<void>;
  onSaveManagerEdit?: (dossierId: string, newFormData: Record<string, any>, changeSummary: string) => Promise<void>;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const DossierDetailView: React.FC<DossierDetailViewProps> = ({
  dossier,
  template,
  currentUser,
  onBack,
  onEditDossier,
  onAdminPrecheck,
  onUploadFacultySignature,
  onUpdateSchoolSigning,
  onCompleteDossier,
  onApproveDossier,
  onReturnDossier,
  onSaveManagerEdit,
  onNavigate,
}) => {
  const [currentDossier, setCurrentDossier] = useState<Application>(dossier);

  useEffect(() => {
    setCurrentDossier(dossier);
  }, [dossier]);

  // Tinh gọn chỉ còn 2 tab chính: Văn bản thẩm định & Nhật ký lịch sử
  const [activeTab, setActiveTab] = useState<'preview' | 'history'>('preview');
  const [historySubTab, setHistorySubTab] = useState<'audit' | 'emails' | 'versions'>('audit');

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isManagerEditModalOpen, setIsManagerEditModalOpen] = useState(false);
  const [isUploadFacultyModalOpen, setIsUploadFacultyModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [showOldWordPreview, setShowOldWordPreview] = useState(false);

  const handleToggleSchoolSigning = async (flag: 'khcn' | 'bgh', checked: boolean) => {
    const flags = {
      khcnSigned: flag === 'khcn' ? checked : !!currentDossier.khcn_signed,
      bghSigned: flag === 'bgh' ? checked : !!currentDossier.bgh_signed,
    };
    setCurrentDossier((prev) => ({
      ...prev,
      khcn_signed: flags.khcnSigned,
      bgh_signed: flags.bghSigned,
    }));
    if (onUpdateSchoolSigning) {
      await onUpdateSchoolSigning(currentDossier.id, flags);
    }
  };

  const normalized = normalizeStatus(currentDossier.status);
  const isAdmin = isAdminUser(currentUser);
  const isOwner =
    currentDossier.createdBy?.id === currentUser.id ||
    currentDossier.createdBy?.email === currentUser.email;

  // Quy trình kiểm tra trạng thái
  const isPrecheckPhase = normalized === 'NEW';
  const isNeedsRevision = normalized === 'NEEDS_REVISION';
  const isFacultySigningPhase = normalized === 'PRECHECK_PASSED';
  const isSchoolSigningPhase = normalized === 'FACULTY_SIGNED' || normalized === 'SCHOOL_SIGNING';
  const isCompletedPhase = normalized === 'COMPLETED';

  const driveUrl =
    currentDossier.drive_folder_url ||
    'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link';

  // 5 mốc tiến độ chuẩn
  const workflowSteps = [
    { num: 1, label: 'Mới nộp', active: true, completed: !isPrecheckPhase && !isNeedsRevision },
    {
      num: 2,
      label: 'Tiền kiểm Word',
      active: isPrecheckPhase || isNeedsRevision,
      completed: isFacultySigningPhase || isSchoolSigningPhase || isCompletedPhase,
      alert: isNeedsRevision,
    },
    {
      num: 3,
      label: 'Ký số cấp Khoa',
      active: isFacultySigningPhase,
      completed: isSchoolSigningPhase || isCompletedPhase,
    },
    {
      num: 4,
      label: 'Trình ký Trường',
      active: isSchoolSigningPhase,
      completed: isCompletedPhase,
    },
    {
      num: 5,
      label: 'Ban hành QĐ',
      active: isCompletedPhase,
      completed: isCompletedPhase,
    },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Bar: Tiêu đề, Mã hồ sơ & Cụm nút hành động */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {currentDossier.code}
                </span>
                <StatusBadge status={currentDossier.status} />
                {currentDossier.versions && currentDossier.versions.length > 1 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded font-mono">
                    v{currentDossier.versions.length}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug mt-1">
                {currentDossier.templateTitle}
              </h1>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto pt-1 lg:pt-0">
            {/* Admin: Tiền kiểm (Duyệt hoặc Yêu cầu sửa đổi) */}
            {isPrecheckPhase && (
              isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Yêu cầu sửa đổi</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const nowIso = new Date().toISOString();
                      const updatedLocal: Application = {
                        ...currentDossier,
                        status: 'PRECHECK_PASSED',
                        reviewNotes: 'Duyệt hợp lệ thể thức.',
                        review_notes: 'Duyệt hợp lệ thể thức.',
                        reviewedAt: nowIso,
                        updatedAt: nowIso,
                        timeline: [
                          ...(currentDossier.timeline || []),
                          {
                            id: `evt-${Date.now()}`,
                            title: 'Duyệt tiền kiểm & xuất PDF',
                            actor: currentUser.name || 'Quản trị viên',
                            role: currentUser.role === 'ADMIN' ? 'Admin' : 'Chuyên viên KH&CN',
                            timestamp: new Date().toLocaleString('vi-VN'),
                            description: 'Duyệt hợp lệ thể thức.',
                            status: 'PRECHECK_PASSED',
                          },
                        ],
                        auditLogs: [
                          ...(currentDossier.auditLogs || []),
                          {
                            id: `log-${Date.now()}`,
                            dossierId: currentDossier.id,
                            action: 'PRECHECK_APPROVE',
                            actorId: currentUser.id,
                            actorName: currentUser.name,
                            actorRole: currentUser.role,
                            fromStatus: currentDossier.status,
                            toStatus: 'PRECHECK_PASSED',
                            notes: 'Duyệt hợp lệ thể thức.',
                            createdAt: nowIso,
                          },
                        ],
                      };
                      setCurrentDossier(updatedLocal);
                      if (onAdminPrecheck) {
                        await onAdminPrecheck(currentDossier.id, true, 'Duyệt hợp lệ thể thức.');
                      } else if (onApproveDossier) {
                        await onApproveDossier(currentDossier.id, 'Duyệt hợp lệ thể thức.');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Duyệt thể thức & Xuất PDF</span>
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Đang chờ Phòng KH&CN tiền kiểm</span>
                </span>
              )
            )}

            {/* Hành động khi hồ sơ bị trả về yêu cầu sửa đổi */}
            {isNeedsRevision && (
              <button
                type="button"
                onClick={() => onEditDossier(currentDossier)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa hồ sơ & Nộp lại</span>
              </button>
            )}
            {/* Admin có thể sửa nhanh trực tiếp */}
            {isAdmin && (isPrecheckPhase || isNeedsRevision) && (
              <button
                type="button"
                onClick={() => setIsManagerEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Quản trị viên căn chỉnh trực tiếp biểu mẫu Word"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Sửa nhanh thể thức</span>
              </button>
            )}

            {/* User: Tải PDF chuẩn & Nộp bản ký Khoa */}
            {isFacultySigningPhase && !isAdmin && (
              <>
                <a
                  href={currentDossier.precheck_pdf_url || '#'}
                  download={`${currentDossier.code}-chuan-ky-khoa.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!currentDossier.precheck_pdf_url) {
                      e.preventDefault();
                      generateAndDownloadDocx(currentDossier, template);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải PDF xin ký Khoa</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsUploadFacultyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Nộp PDF đã ký Khoa</span>
                </button>
              </>
            )}

            {/* Admin: Ban hành Quyết định CGCN */}
            {isSchoolSigningPhase && (
              isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Ban hành Quyết định & Đóng hồ sơ</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đang trình ký cấp Trường</span>
                </span>
              )
            )}

            {/* Hoàn tất: Link Google Drive */}
            {isCompletedPhase && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem trên Google Drive</span>
              </a>
            )}

            {/* Nút tải file Word: Cho phép tải Mẫu 1a, Mẫu 2a hoặc Cả 2 file cùng lúc theo nghiệp vụ Cô Trúc */}
            <div className="relative group inline-block">
              <button
                type="button"
                onClick={() => generateAndDownloadBothDocx(currentDossier)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Tải cả 2 file Word: Tờ trình 1a & Kế hoạch 2a"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Tải bộ Word (1a + 2a)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mini Stepper: Tiến trình 5 bước thanh mảnh, tối giản */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-[11px] overflow-x-auto pb-1 gap-1">
            {workflowSteps.map((step, idx) => {
              const isCurrent = step.active && !step.completed;
              return (
                <React.Fragment key={idx}>
                  <div
                    className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md transition-colors ${
                      step.alert
                        ? 'bg-rose-50 text-rose-700 font-bold'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-200'
                        : step.completed
                        ? 'text-emerald-700 font-medium'
                        : 'text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.alert
                          ? 'bg-rose-600 text-white'
                          : step.completed
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {step.completed ? '✓' : step.num}
                    </span>
                    <span>{step.label}</span>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 min-w-[12px] hidden sm:block ${
                        step.completed ? 'bg-emerald-300' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Cảnh báo Yêu cầu sửa đổi khi bị trả về */}
      {isNeedsRevision && (
        <div className="p-3.5 bg-rose-50 border-l-4 border-rose-600 rounded-r-xl space-y-2 text-xs text-rose-950 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>HỒ SƠ CÓ Ý KIẾN CẦN CHỈNH SỬA BỔ SUNG (BƯỚC 2)</span>
            </div>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => onEditDossier(currentDossier)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-md transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Mở Form sửa ngay</span>
              </button>
            )}
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-rose-900 italic font-medium leading-relaxed">
            "{currentDossier.review_notes || currentDossier.reviewNotes || currentDossier.returnReason || 'Cần bổ sung, chỉnh sửa nội dung hồ sơ theo thông báo.'}"
          </div>
        </div>
      )}

      {/* Thông báo Ký số Khoa */}
      {isFacultySigningPhase && (
        <div className="p-3.5 bg-indigo-50 border-l-4 border-indigo-600 rounded-r-xl text-xs text-indigo-950 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Đã duyệt hợp lệ thể thức văn bản:</strong> Hệ thống đã khóa nội dung và xuất bản file <strong>PDF chuẩn</strong>. Thầy/Cô vui lòng tải PDF về máy, xin chữ ký số của Lãnh đạo Khoa và nộp lại bản đã ký kèm minh chứng liên quan.
          </div>
        </div>
      )}

      {/* 3. Thanh Tab Tinh gọn (Chỉ 2 Tab chính) */}
      <div className="flex items-center justify-between border-b border-slate-200 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'preview'
                ? 'border-blue-700 text-blue-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Văn bản & Thẩm định</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-700 text-blue-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật ký & Lịch sử ({currentDossier.auditLogs?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* 4. Nội dung Tab 1: VĂN BẢN & THẨM ĐỊNH (Tối ưu giao diện, loại bỏ cột rác) */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Cột trái thu gọn: Chỉ giữ Thông tin Cán bộ, Minh chứng & Tiến trình */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Thẻ 1: Thông tin người nộp */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                Người nộp hồ sơ
              </h3>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {currentDossier.createdBy.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">
                    {currentDossier.createdBy.name}
                  </div>
                  <div className="text-slate-500 text-[11px] truncate">
                    {currentDossier.createdBy.title || 'Cán bộ / Giảng viên'}
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Đơn vị:</span>
                  <span className="font-medium text-slate-800 truncate text-right ml-2">
                    {currentDossier.createdBy.department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-[11px]">Email:</span>
                  <span className="font-mono text-slate-700 text-[11px] truncate text-right ml-2">
                    {currentDossier.createdBy.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Thẻ 2: Minh chứng & Chữ ký số (nếu có) */}
            {((currentDossier.evidence_files && currentDossier.evidence_files.length > 0) ||
              currentDossier.faculty_signed_pdf_url ||
              currentDossier.final_pdf_url) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2 text-xs">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pb-1.5 border-b border-slate-100">
                  Tệp đính kèm & Minh chứng
                </h3>
                <div className="space-y-1.5">
                  {currentDossier.faculty_signed_pdf_url && (
                    <a
                      href={currentDossier.faculty_signed_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="font-semibold text-amber-900 truncate">PDF ký cấp Khoa</span>
                      </div>
                      <span className="text-[10px] text-amber-700 font-bold shrink-0">Xem</span>
                    </a>
                  )}

                  {currentDossier.final_pdf_url && (
                    <a
                      href={currentDossier.final_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Award className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="font-semibold text-emerald-900 truncate">Quyết định ban hành</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold shrink-0">Xem</span>
                    </a>
                  )}

                  {currentDossier.evidence_files?.map((f, i) => (
                    <a
                      key={i}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate text-slate-700 font-medium">{f.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{f.size || 'Tải'}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Thẻ Nghiệp vụ Cô Trúc Bước 4: Thanh tiến độ ký số liên cấp Trường & Nút tick điều phối */}
            {(isFacultySigningPhase || isSchoolSigningPhase || isCompletedPhase) && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tiến độ ký số cấp Trường</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Bước 4</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Khoa */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                      <span className="font-semibold text-slate-800">1. Ký số cấp Khoa</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">Đã hoàn tất</span>
                  </div>

                  {/* Phòng KH&CN */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <input
                          type="checkbox"
                          id="tick-khcn"
                          checked={!!currentDossier.khcn_signed}
                          onChange={(e) => handleToggleSchoolSigning('khcn', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      ) : (
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          currentDossier.khcn_signed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}>
                          {currentDossier.khcn_signed ? '✓' : '2'}
                        </span>
                      )}
                      <label htmlFor="tick-khcn" className="font-semibold text-slate-800 cursor-pointer">
                        2. Trưởng phòng KH&CN
                      </label>
                    </div>
                    <span className={`text-[11px] font-medium ${currentDossier.khcn_signed ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                      {currentDossier.khcn_signed ? 'Đã duyệt ký' : 'Đang trình'}
                    </span>
                  </div>

                  {/* Ban Giám hiệu */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <input
                          type="checkbox"
                          id="tick-bgh"
                          checked={!!currentDossier.bgh_signed}
                          onChange={(e) => handleToggleSchoolSigning('bgh', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                      ) : (
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          currentDossier.bgh_signed ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}>
                          {currentDossier.bgh_signed ? '✓' : '3'}
                        </span>
                      )}
                      <label htmlFor="tick-bgh" className="font-semibold text-slate-800 cursor-pointer">
                        3. Hiệu trưởng ký QĐ
                      </label>
                    </div>
                    <span className={`text-[11px] font-medium ${currentDossier.bgh_signed ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                      {currentDossier.bgh_signed ? 'Đã ký duyệt' : 'Chờ ký'}
                    </span>
                  </div>
                </div>

                {isAdmin && isSchoolSigningPhase && (
                  <button
                    type="button"
                    onClick={() => setIsCompleteModalOpen(true)}
                    className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Ban hành Quyết định & Đóng hồ sơ</span>
                  </button>
                )}
              </div>
            )}

            {/* Thẻ 3: Tiến trình xử lý (Timeline) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tiến trình xử lý
                </h3>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <ApprovalTimeline
                events={
                  currentDossier.timeline && currentDossier.timeline.length > 0
                    ? currentDossier.timeline
                    : (currentDossier.auditLogs || []).map((log: any) => ({
                        id: log.id,
                        title:
                          log.action === 'CREATE'
                            ? 'Khởi tạo hồ sơ'
                            : log.action === 'PRECHECK_APPROVE'
                            ? 'Duyệt tiền kiểm & xuất PDF'
                            : log.action === 'PRECHECK_REJECT'
                            ? 'Yêu cầu bổ sung'
                            : log.action === 'FACULTY_SIGNED'
                            ? 'Nộp bản ký cấp Khoa'
                            : log.action === 'SCHOOL_SIGNING'
                            ? 'Tiến độ ký cấp Trường'
                            : log.action === 'COMPLETE'
                            ? 'Ban hành QĐ CGCN'
                            : log.action || 'Nhật ký xử lý',
                        actor: log.actorName || 'Cán bộ',
                        role: log.actorRole || 'Hệ thống',
                        timestamp: log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '',
                        description: log.notes || '',
                        status: (log.toStatus || currentDossier.status || 'NEW') as any,
                      }))
                }
                currentStatus={currentDossier.status}
              />
            </div>
          </div>

          {/* Cột phải: Nếu hồ sơ bị trả về (NEEDS_REVISION), BỎ XEM THỬ readonly và hiển thị Bảng thao tác Chỉnh sửa trực quan */}
          <div className="lg:col-span-8 xl:col-span-9">
            {isNeedsRevision ? (
              <div className="bg-white rounded-xl border border-rose-200 shadow-2xs overflow-hidden">
                <div className="bg-rose-50/80 px-5 py-4 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-rose-950">
                        Hồ sơ cần điều chỉnh nội dung (Bước 2: Tiền kiểm)
                      </h2>
                      <p className="text-xs text-rose-700">
                        Vui lòng chỉnh sửa các thông tin chưa chính xác theo nhận xét dưới đây và nộp lại
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditDossier(currentDossier)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Mở Form sửa ngay</span>
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Nhận xét từ Cô Trúc / Admin */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-rose-800">
                      Nội dung ý kiến từ Quản trị viên (Phòng KH&CN):
                    </label>
                    <div className="p-4 bg-rose-50/50 border-l-4 border-rose-500 rounded-r-lg text-rose-900 font-medium text-sm leading-relaxed">
                      "{currentDossier.review_notes || currentDossier.reviewNotes || currentDossier.returnReason || 'Vui lòng kiểm tra lại thông tin hồ sơ.'}"
                    </div>
                  </div>

                  {/* Hướng dẫn thao tác */}
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      <span>Các bước khắc phục để hoàn thiện hồ sơ:</span>
                    </h3>
                    <ol className="text-xs text-amber-950 space-y-2 list-decimal list-inside leading-relaxed pl-1">
                      <li>Bấm vào nút <strong>"Mở Form chỉnh sửa hồ sơ & Nộp lại ngay"</strong> ở phía dưới.</li>
                      <li>Hệ thống sẽ tải toàn bộ dữ liệu đã điền trước đây vào lại biểu mẫu. Đồng chí cập nhật đúng các trường bị sai.</li>
                      <li>Sau khi hoàn tất, bấm <strong>"Gửi hồ sơ"</strong> để chuyển lại cho Quản trị viên tiền kiểm đợt 2.</li>
                    </ol>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onEditDossier(currentDossier)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Mở Form chỉnh sửa hồ sơ & Nộp lại ngay</span>
                      </button>
                    </div>
                  </div>

                  {/* Bảng tóm tắt nội dung đã khai */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-1 border-b border-slate-100">
                      Thông tin đã khai trong hồ sơ ({currentDossier.code})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">Tên hồ sơ / Đề tài:</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {currentDossier.formData?.transfer_title || currentDossier.formData?.ten_de_tai || currentDossier.title || currentDossier.templateTitle}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">Đơn vị đề nghị:</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {currentDossier.formData?.department || currentDossier.createdBy?.department || 'Chưa chọn'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">Người đại diện:</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                          {currentDossier.formData?.full_name || currentDossier.createdBy?.name} ({currentDossier.formData?.phone || currentDossier.createdBy?.phone || 'Chưa có SĐT'})
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">Số văn bản:</span>
                        <span className="font-mono font-bold text-blue-700 mt-0.5 block">
                          {currentDossier.formData?.proposal_number || currentDossier.formData?.plan_code || 'Chưa đánh số'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tùy chọn xem lại bản Word cũ nếu cần */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowOldWordPreview(!showOldWordPreview)}
                      className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showOldWordPreview ? '▲ Thu gọn bản xem trước Word' : '▼ Xem lại bản thảo Word cũ nếu cần'}</span>
                    </button>
                    {showOldWordPreview && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <WordDocumentPreview dossier={currentDossier} template={template} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <WordDocumentPreview dossier={currentDossier} template={template} />
            )}
          </div>
        </div>
      )}

      {/* 5. Nội dung Tab 2: NHẬT KÝ & LỊCH SỬ (Gom gọn gàng, chia 3 tiểu mục sạch sẽ) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
          {/* Tiểu mục Sub-tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit text-xs font-semibold">
            <button
              type="button"
              onClick={() => setHistorySubTab('audit')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                historySubTab === 'audit'
                  ? 'bg-white text-blue-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nhật ký kiểm toán (Audit Trail)
            </button>
            <button
              type="button"
              onClick={() => setHistorySubTab('emails')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                historySubTab === 'emails'
                  ? 'bg-white text-blue-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thông báo Gmail tự động
            </button>
            <button
              type="button"
              onClick={() => setHistorySubTab('versions')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                historySubTab === 'versions'
                  ? 'bg-white text-blue-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch sử các phiên bản ({currentDossier.versions?.length || 1})
            </button>
          </div>

          {/* Nội dung tương ứng */}
          {historySubTab === 'audit' && (
            <AuditLogViewer logs={currentDossier.auditLogs || []} />
          )}

          {historySubTab === 'emails' && (
            <EmailLogViewer logs={currentDossier.emailLogs || []} />
          )}

          {historySubTab === 'versions' && (
            <VersionHistoryViewer versions={currentDossier.versions || []} />
          )}
        </div>
      )}

      {/* Modals hỗ trợ quy trình */}
      <ReturnDossierModal
        dossier={currentDossier}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onConfirmReturn={async (id, reason) => {
          const nowIso = new Date().toISOString();
          const updatedLocal: Application = {
            ...currentDossier,
            status: 'NEEDS_REVISION',
            reviewNotes: reason,
            review_notes: reason,
            returnReason: reason,
            reviewedAt: nowIso,
            updatedAt: nowIso,
            timeline: [
              ...(currentDossier.timeline || []),
              {
                id: `evt-${Date.now()}`,
                title: 'Yêu cầu sửa đổi hồ sơ',
                actor: currentUser.name || 'Quản trị viên',
                role: currentUser.role === 'ADMIN' ? 'Admin' : 'Chuyên viên KH&CN',
                timestamp: new Date().toLocaleString('vi-VN'),
                description: reason,
                status: 'NEEDS_REVISION',
              },
            ],
            auditLogs: [
              ...(currentDossier.auditLogs || []),
              {
                id: `log-${Date.now()}`,
                dossierId: currentDossier.id,
                action: 'PRECHECK_REJECT',
                actorId: currentUser.id,
                actorName: currentUser.name,
                actorRole: currentUser.role,
                fromStatus: currentDossier.status,
                toStatus: 'NEEDS_REVISION',
                notes: reason,
                createdAt: nowIso,
              },
            ],
          };
          setCurrentDossier(updatedLocal);
          setIsReturnModalOpen(false);

          if (onAdminPrecheck) {
            await onAdminPrecheck(id, false, reason);
          } else if (onReturnDossier) {
            await onReturnDossier(id, reason);
          }
        }}
      />

      <ManagerEditDossierModal
        dossier={currentDossier}
        template={template}
        isOpen={isManagerEditModalOpen}
        onClose={() => setIsManagerEditModalOpen(false)}
        onSaveManagerEdit={onSaveManagerEdit || (async () => {})}
      />

      <UploadFacultySignedModal
        dossier={currentDossier}
        isOpen={isUploadFacultyModalOpen}
        onClose={() => setIsUploadFacultyModalOpen(false)}
        onUploadConfirm={async (id, pdfUrl, evidenceFiles) => {
          setCurrentDossier((prev) => ({
            ...prev,
            status: 'FACULTY_SIGNED',
            faculty_signed_pdf_url: pdfUrl,
            evidence_files: evidenceFiles,
          }));
          setIsUploadFacultyModalOpen(false);
          if (onUploadFacultySignature) {
            await onUploadFacultySignature(id, pdfUrl, evidenceFiles);
          }
        }}
      />

      <CompleteDecisionModal
        dossier={currentDossier}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirmComplete={async (id, decisionNumber, decisionDate, finalPdfUrl) => {
          setCurrentDossier((prev) => ({
            ...prev,
            status: 'COMPLETED',
            decision_number: decisionNumber,
            decision_date: decisionDate,
            final_pdf_url: finalPdfUrl,
          }));
          setIsCompleteModalOpen(false);
          if (onCompleteDossier) {
            await onCompleteDossier(id, decisionNumber, decisionDate, finalPdfUrl);
          }
        }}
      />
    </div>
  );
};
