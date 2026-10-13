import React, { useState } from 'react';
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
  CheckSquare,
  Square,
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
import { generateAndDownloadDocx } from '../utils/docxExport';
import { normalizeStatus } from '../services/workflowEngine';

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
  const [activeTab, setActiveTab] = useState<'preview' | 'audit' | 'versions' | 'emails'>('preview');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isManagerEditModalOpen, setIsManagerEditModalOpen] = useState(false);
  const [isUploadFacultyModalOpen, setIsUploadFacultyModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const normalized = normalizeStatus(dossier.status);
  const isAdmin =
    currentUser.email?.trim().toLowerCase() === 'toanhkhai12345@gmail.com' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'admin';

  // Quy trình kiểm tra trạng thái
  const isPrecheckPhase = normalized === 'NEW';
  const isNeedsRevision = normalized === 'NEEDS_REVISION';
  const isFacultySigningPhase = normalized === 'PRECHECK_PASSED';
  const isSchoolSigningPhase = normalized === 'FACULTY_SIGNED' || normalized === 'SCHOOL_SIGNING';
  const isCompletedPhase = normalized === 'COMPLETED';

  const formData = dossier.formData || {};
  const driveUrl = dossier.drive_folder_url || 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link';

  // 5 mốc tiến độ trực quan
  const workflowSteps = [
    { label: '1. Mới nộp', active: isPrecheckPhase || isNeedsRevision || isFacultySigningPhase || isSchoolSigningPhase || isCompletedPhase },
    { label: '2. Tiền kiểm', active: isFacultySigningPhase || isSchoolSigningPhase || isCompletedPhase, alert: isNeedsRevision },
    { label: '3. Duyệt thể thức & PDF', active: isFacultySigningPhase || isSchoolSigningPhase || isCompletedPhase },
    { label: '4. Ký số liên cấp', active: isSchoolSigningPhase || isCompletedPhase },
    { label: '5. Hoàn tất & Ban hành QĐ', active: isCompletedPhase },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Header Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {dossier.code}
              </span>
              <StatusBadge status={dossier.status} />
              {dossier.versions && dossier.versions.length > 1 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 rounded font-mono">
                  v{dossier.versions.length}
                </span>
              )}
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-snug mt-1">
              {dossier.templateTitle}
            </h1>
          </div>
        </div>

        {/* Action Controls theo từng bước của Quy trình Automation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BƯỚC 2: Tiền kiểm (Admin Pre-check) */}
          {isPrecheckPhase && (
            <>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Yêu cầu sửa đổi (Chưa duyệt)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (onAdminPrecheck) {
                    await onAdminPrecheck(dossier.id, true, 'Duyệt hợp lệ thể thức.');
                  } else if (onApproveDossier) {
                    await onApproveDossier(dossier.id, 'Duyệt hợp lệ thể thức.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Duyệt hợp lệ & Xuất PDF chuẩn</span>
              </button>
            </>
          )}

          {/* BƯỚC 1: Sửa đổi khi có yêu cầu (User sửa lại form) */}
          {isNeedsRevision && (
            <button
              type="button"
              onClick={() => onEditDossier(dossier)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Chỉnh sửa lại Web Form & Nộp lại</span>
            </button>
          )}

          {/* BƯỚC 3 & 6: Ký số cấp cơ sở (User tải PDF & nộp bản ký Khoa) */}
          {isFacultySigningPhase && (
            <>
              <a
                href={dossier.precheck_pdf_url || '#'}
                onClick={(e) => {
                  if (!dossier.precheck_pdf_url) {
                    e.preventDefault();
                    generateAndDownloadDocx(dossier, template);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải PDF chuẩn để xin chữ ký Khoa</span>
              </a>

              <button
                type="button"
                onClick={() => setIsUploadFacultyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nộp PDF đã ký Khoa + Minh chứng</span>
              </button>
            </>
          )}

          {/* BƯỚC 4 & 7: Trình ký cấp Trường & Ban hành QĐ */}
          {isSchoolSigningPhase && (
            <>
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Ban hành Quyết định & Đóng hồ sơ</span>
              </button>
            </>
          )}

          {/* BƯỚC 4 & 8: Đã hoàn tất */}
          {isCompletedPhase && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Xem Thư mục Lưu trữ Google Drive</span>
            </a>
          )}

          {/* Nút tải Word bản thảo */}
          <button
            type="button"
            onClick={() => generateAndDownloadDocx(dossier, template)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải .docx</span>
          </button>
        </div>
      </div>

      {/* Workflow 5-Milestone Tracker Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between text-xs overflow-x-auto pb-1 gap-2">
          {workflowSteps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition-colors ${
                step.alert
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : step.active
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  step.alert ? 'bg-rose-600' : step.active ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              />
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Banners tương ứng theo từng bước */}
      {isNeedsRevision && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-600 rounded-r-md space-y-2 text-xs text-rose-950">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>HỒ SƠ CÓ SAI SÓT CẦN CHỈNH SỬA BỔ SUNG (BƯỚC 2)</span>
          </div>
          <p className="text-slate-700">
            Quản trị viên đã tiền kiểm bản thảo Word và gửi nội dung nhận xét chi tiết sau đây qua Gmail cho Cán bộ:
          </p>
          <div className="p-3 bg-white rounded border border-rose-200 font-medium italic text-rose-900">
            "{dossier.review_notes || dossier.returnReason}"
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => onEditDossier(dossier)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 text-white font-semibold rounded hover:bg-rose-800 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Bấm vào đây để mở Form chỉnh sửa & nộp lại</span>
            </button>
          </div>
        </div>
      )}

      {isFacultySigningPhase && (
        <div className="p-4 bg-indigo-50 border-l-4 border-indigo-600 rounded-r-md space-y-2 text-xs text-indigo-950">
          <div className="flex items-center gap-2 font-bold text-indigo-800">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>ĐÃ DUYỆT HỢP LỆ THỂ THỨC - TIẾN HÀNH KÝ SỐ CẤP KHOA (BƯỚC 3 & 5)</span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Hệ thống đã khóa dữ liệu và xuất bản văn bản sang định dạng <strong>PDF chuẩn</strong> để đảm bảo tính bất biến khi ký số.
            Thầy/Cô vui lòng tải file PDF về máy, gửi email xin chữ ký số của <strong>Trưởng Bộ môn / Trưởng Khoa</strong>. Sau khi ký xong, vui lòng bấm nút "Nộp PDF đã ký Khoa & Minh chứng" ở góc trên bên phải.
          </p>
        </div>
      )}

      {isSchoolSigningPhase && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-600 rounded-r-md space-y-3 text-xs text-amber-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <FileSignature className="w-4 h-4 text-amber-700 shrink-0" />
              <span>TIẾN ĐỘ TRÌNH KÝ CẤP TRƯỜNG & BAN HÀNH QUYẾT ĐỊNH (BƯỚC 4 & 7)</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(true)}
                className="px-3 py-1 bg-emerald-700 text-white font-semibold rounded hover:bg-emerald-800 transition-colors"
              >
                + Ban hành QĐ CGCN
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 bg-white rounded border border-amber-200 flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${dossier.khcn_signed ? 'text-emerald-600' : 'text-slate-300'}`} />
              <div>
                <div className="font-semibold text-slate-800">1. Trưởng phòng KH&CN</div>
                <div className="text-[10px] text-slate-500">{dossier.khcn_signed ? 'Đã ký số' : 'Đang xử lý'}</div>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded border border-amber-200 flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${dossier.khtc_signed ? 'text-emerald-600' : 'text-slate-300'}`} />
              <div>
                <div className="font-semibold text-slate-800">2. Phòng KHTC</div>
                <div className="text-[10px] text-slate-500">
                  {dossier.has_financial_implication ? (dossier.khtc_signed ? 'Đã ký số' : 'Cần thẩm định kinh phí') : 'Không phát sinh $'}
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded border border-amber-200 flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${dossier.bgh_signed ? 'text-emerald-600' : 'text-slate-300'}`} />
              <div>
                <div className="font-semibold text-slate-800">3. Hiệu trưởng (BGH)</div>
                <div className="text-[10px] text-slate-500">{dossier.bgh_signed ? 'Đã ký duyệt' : 'Chờ ký ban hành'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompletedPhase && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-600 rounded-r-md space-y-2 text-xs text-emerald-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Award className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>HỒ SƠ ĐÃ HOÀN TẤT - QUYẾT ĐỊNH CGCN ĐÃ BAN HÀNH CHÍNH THỨC</span>
            </div>
            <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
              Số: {dossier.decision_number || '128/QĐ-ĐHYDCT'}
            </span>
          </div>
          <p className="text-slate-700">
            Hồ sơ đã được lưu trữ vĩnh viễn vào Cơ sở dữ liệu và cây thư mục Google Drive của trường:{' '}
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline font-semibold hover:text-blue-900 inline-flex items-center gap-1"
            >
              <span>{driveUrl}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}

      {/* Main View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'preview'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Xem Hồ sơ & Bản Word A4</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 text-blue-700" />
          <span>Nhật ký Xử lý (Audit Trail) ({dossier.auditLogs?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emails')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'emails'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>Thông báo Gmail Tự động</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('versions')}
          className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'versions'
              ? 'border-blue-700 text-blue-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử Phiên bản ({dossier.versions?.length || 1})</span>
        </button>
      </div>

      {/* TAB CONTENT: Preview & Metadata */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Requester Information & Form Data */}
          <div className="lg:col-span-5 space-y-4">
            {/* Requester Box */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                Thông tin người đề nghị & Đơn vị
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {dossier.createdBy.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{dossier.createdBy.name}</div>
                    <div className="text-slate-500 text-[11px]">{dossier.createdBy.title}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Đơn vị:</span>
                    <span className="font-medium text-slate-800">{dossier.createdBy.department}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Email trường:</span>
                    <span className="font-mono text-slate-800 truncate block text-[11px]">
                      {dossier.createdBy.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence & Signed Files Box */}
            {(dossier.evidence_files && dossier.evidence_files.length > 0 || dossier.faculty_signed_pdf_url || dossier.final_pdf_url) && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                  Tệp Văn bản & Minh chứng đính kèm
                </h3>
                <div className="space-y-2">
                  {dossier.faculty_signed_pdf_url && (
                    <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                      <div className="flex items-center gap-1.5 font-medium text-amber-900">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        <span>Bản PDF đã ký số cấp Khoa</span>
                      </div>
                      <span className="text-[10px] text-amber-700 font-mono">Đã tải lên</span>
                    </div>
                  )}

                  {dossier.final_pdf_url && (
                    <div className="flex items-center justify-between p-2 bg-emerald-50 rounded border border-emerald-200">
                      <div className="flex items-center gap-1.5 font-medium text-emerald-900">
                        <Award className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Quyết định hoàn tất có chữ ký BGH</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-mono">Đã ban hành</span>
                    </div>
                  )}

                  {dossier.evidence_files && dossier.evidence_files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate font-medium text-slate-800">{f.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{f.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Field values */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                Dữ liệu Hồ sơ Nhập từ Web Form
              </h3>
              <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                {template && template.fields.length > 0 ? (
                  template.fields.map((f) => {
                    const key = f.name || f.key || f.id;
                    const val = formData[key];
                    return (
                      <div key={f.id} className="pt-2 first:pt-0">
                        <span className="text-[11px] text-slate-500 block mb-0.5">{f.label}:</span>
                        <div className="font-medium text-slate-900 bg-slate-50 p-2 rounded border border-slate-200/80">
                          {Array.isArray(val) ? val.join(', ') : val !== undefined && val !== '' ? String(val) : '-'}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  Object.entries(formData).map(([k, v]) => (
                    <div key={k} className="pt-2 first:pt-0">
                      <span className="text-[11px] text-slate-500 block mb-0.5">{k}:</span>
                      <div className="font-medium text-slate-900 bg-slate-50 p-2 rounded border border-slate-200/80">
                        {String(v)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Workflow Timeline */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Lịch sử Tiến trình Hồ sơ
                </h3>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <ApprovalTimeline
                events={
                  dossier.timeline && dossier.timeline.length > 0
                    ? dossier.timeline
                    : (dossier.auditLogs || []).map((log: any) => ({
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
                        status: (log.toStatus || dossier.status || 'NEW') as any,
                      }))
                }
                currentStatus={dossier.status}
              />
            </div>
          </div>

          {/* Right Column Word Document Preview */}
          <div className="lg:col-span-7 space-y-4">
            <WordDocumentPreview dossier={dossier} template={template} />
          </div>
        </div>
      )}

      {/* TAB CONTENT: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <AuditLogViewer logs={dossier.auditLogs || []} />
        </div>
      )}

      {/* TAB CONTENT: Email Logs */}
      {activeTab === 'emails' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <EmailLogViewer logs={dossier.emailLogs || []} />
        </div>
      )}

      {/* TAB CONTENT: Version History */}
      {activeTab === 'versions' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <VersionHistoryViewer versions={dossier.versions || []} />
        </div>
      )}

      {/* Modals */}
      <ReturnDossierModal
        dossier={dossier}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onConfirmReturn={async (id, reason) => {
          if (onAdminPrecheck) {
            await onAdminPrecheck(id, false, reason);
          } else if (onReturnDossier) {
            await onReturnDossier(id, reason);
          }
        }}
      />

      <ManagerEditDossierModal
        dossier={dossier}
        template={template}
        isOpen={isManagerEditModalOpen}
        onClose={() => setIsManagerEditModalOpen(false)}
        onSaveManagerEdit={onSaveManagerEdit || (async () => {})}
      />

      <UploadFacultySignedModal
        dossier={dossier}
        isOpen={isUploadFacultyModalOpen}
        onClose={() => setIsUploadFacultyModalOpen(false)}
        onUploadConfirm={async (id, pdfUrl, evidenceFiles) => {
          if (onUploadFacultySignature) {
            await onUploadFacultySignature(id, pdfUrl, evidenceFiles);
          }
        }}
      />

      <CompleteDecisionModal
        dossier={dossier}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirmComplete={async (id, decisionNumber, decisionDate, finalPdfUrl) => {
          if (onCompleteDossier) {
            await onCompleteDossier(id, decisionNumber, decisionDate, finalPdfUrl);
          }
        }}
      />
    </div>
  );
};
