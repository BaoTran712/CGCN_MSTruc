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
} from 'lucide-react';
import { Application, DocumentTemplate, User, ActiveNavTab } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { WordDocumentPreview } from '../components/document/WordDocumentPreview';
import { ApprovalTimeline } from '../components/timeline/ApprovalTimeline';
import { AuditLogViewer } from '../components/dossiers/AuditLogViewer';
import { VersionHistoryViewer } from '../components/dossiers/VersionHistoryViewer';
import { ReturnDossierModal } from '../components/modals/ReturnDossierModal';
import { ManagerEditDossierModal } from '../components/modals/ManagerEditDossierModal';
import { UploadUserSignatureModal } from '../components/modals/UploadUserSignatureModal';
import { generateAndDownloadDocx } from '../utils/docxExport';
import { normalizeStatus } from '../services/workflowEngine';

interface DossierDetailViewProps {
  dossier: Application;
  template?: DocumentTemplate;
  currentUser: User;
  onBack: () => void;
  onEditDossier: (dossier: Application) => void;
  onApproveDossier: (dossierId: string, notes?: string) => Promise<void>;
  onReturnDossier: (dossierId: string, reason: string) => Promise<void>;
  onSaveManagerEdit: (dossierId: string, newFormData: Record<string, any>, changeSummary: string) => Promise<void>;
  onUploadUserSignature: (dossierId: string, driveFileId: string) => Promise<void>;
  onReceiveSecretaryIntake: (dossierId: string) => Promise<void>;
  onCompleteBySecretary: (dossierId: string, driveFileId: string) => Promise<void>;
  onNavigate: (tab: ActiveNavTab) => void;
}

export const DossierDetailView: React.FC<DossierDetailViewProps> = ({
  dossier,
  template,
  currentUser,
  onBack,
  onEditDossier,
  onApproveDossier,
  onReturnDossier,
  onSaveManagerEdit,
  onUploadUserSignature,
  onReceiveSecretaryIntake,
  onCompleteBySecretary,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'audit' | 'versions'>('preview');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isManagerEditModalOpen, setIsManagerEditModalOpen] = useState(false);
  const [isUploadSignModalOpen, setIsUploadSignModalOpen] = useState(false);

  const normalized = normalizeStatus(dossier.status);
  const role = currentUser.role;

  const isManager = role === 'MANAGER' || role === 'manager' || role === 'ADMIN' || role === 'admin';
  const isSecretary = role === 'SECRETARY' || role === 'secretary' || role === 'ADMIN' || role === 'admin';
  const isApplicant = currentUser.id === dossier.createdBy.id || currentUser.name === dossier.createdBy.name;

  const canManagerReview = isManager && normalized === 'SUBMITTED';
  const canUserUploadSign = (isApplicant || role === 'ADMIN' || role === 'admin') && normalized === 'APPROVED';
  const canSecretaryReceive = isSecretary && normalized === 'USER_SIGNED';
  const canSecretaryComplete = isSecretary && normalized === 'SECRETARY_RECEIVED';
  const canUserResubmit = isApplicant && (normalized === 'DRAFT' || normalized === 'RETURNED');

  const formData = dossier.formData || {};

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

        {/* Action Controls per Workflow State */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manager Controls: Approve, Return with Reason, Edit in Place */}
          {canManagerReview && (
            <>
              <button
                type="button"
                onClick={() => setIsManagerEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>Chỉnh sửa dữ liệu</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReturnModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Yêu cầu sửa đổi</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await onApproveDossier(dossier.id, 'Phê duyệt đạt yêu cầu.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phê duyệt hồ sơ</span>
              </button>
            </>
          )}

          {/* Submitter Controls: Upload User Signature file */}
          {canUserUploadSign && (
            <button
              type="button"
              onClick={() => setIsUploadSignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải lên bản ký tay/ký số</span>
            </button>
          )}

          {/* Secretary Controls: Receive Intake */}
          {canSecretaryReceive && (
            <button
              type="button"
              onClick={async () => {
                await onReceiveSecretaryIntake(dossier.id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Văn thư tiếp nhận bản giấy</span>
            </button>
          )}

          {/* Secretary Controls: Complete with Final Stamped File */}
          {canSecretaryComplete && (
            <button
              type="button"
              onClick={async () => {
                const finalId = prompt('Nhập Drive File ID bản đóng dấu BGH:', dossier.finalSignedDriveFileId || `drive_stamped_${Date.now()}`);
                if (finalId) {
                  await onCompleteBySecretary(dossier.id, finalId);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hoàn tất & Lưu Drive</span>
            </button>
          )}

          {/* Submitter edit/resubmit if RETURNED */}
          {canUserResubmit && (
            <button
              type="button"
              onClick={() => onEditDossier(dossier)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Cập nhật & Nộp lại</span>
            </button>
          )}

          {/* Download docx */}
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

      {/* Return Reason Alert Box */}
      {dossier.status === 'RETURNED' && dossier.returnReason && (
        <div className="p-3.5 bg-rose-50 border-l-4 border-rose-600 rounded-r-md space-y-1.5 text-xs text-rose-950">
          <div className="flex items-center gap-1.5 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>HỒ SƠ CẦN CHỈNH SỬA BỔ SUNG</span>
          </div>
          <div className="p-2.5 bg-white rounded border border-rose-200 font-medium italic">
            "{dossier.returnReason}"
          </div>
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
          <span>Audit Log Kiểm toán ({dossier.auditLogs?.length || 0})</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'preview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-4">
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
                    <span className="text-[11px] text-slate-400 block">Email:</span>
                    <span className="font-mono text-slate-800 truncate block text-[11px]">{dossier.createdBy.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Field values */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-100 pb-2">
                Dữ liệu Hồ sơ Trực tuyến
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
              <ApprovalTimeline events={dossier.timeline} currentStatus={dossier.status} />
            </div>
          </div>

          {/* Right Column Word Document Preview */}
          <div className="lg:col-span-7 space-y-4">
            <WordDocumentPreview dossier={dossier} template={template} />
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <VersionHistoryViewer versions={dossier.versions || []} />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <AuditLogViewer logs={dossier.auditLogs || []} />
        </div>
      )}

      {/* Modals */}
      <ReturnDossierModal
        dossier={dossier}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onConfirmReturn={onReturnDossier}
      />

      <ManagerEditDossierModal
        dossier={dossier}
        template={template}
        isOpen={isManagerEditModalOpen}
        onClose={() => setIsManagerEditModalOpen(false)}
        onSaveManagerEdit={onSaveManagerEdit}
      />

      <UploadUserSignatureModal
        dossier={dossier}
        isOpen={isUploadSignModalOpen}
        onClose={() => setIsUploadSignModalOpen(false)}
        onUploadConfirm={onUploadUserSignature}
      />
    </div>
  );
};
