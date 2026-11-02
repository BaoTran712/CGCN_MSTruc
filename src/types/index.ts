// ==========================================
// CORE DOMAIN TYPES & INTERFACES FOR DOCUMENT WORKFLOW MANAGEMENT SYSTEM
// Hỗ trợ đầy đủ True Flow + False Flow (6 trạng thái) & Đồng bộ Tài liệu
// ==========================================

export type UserRole = 'USER' | 'MANAGER' | 'SECRETARY' | 'ADMIN' | 'employee' | 'manager' | 'secretary' | 'admin';

export type DossierStatus =
  // 6 Trạng thái chuẩn True Flow + False Flow:
  | 'SUBMITTED'                // Bước 1 / 2B: Đã gửi / Chờ duyệt (hoặc Đã nộp lại)
  | 'RETURNED_FOR_REVISION'    // Bước 2A [Luồng False]: Trả về sửa lỗi
  | 'VALIDATED'                // Bước 3 [Luồng True]: Đã hợp lệ / Hồ sơ đã được duyệt
  | 'PENDING_SIGNED_REVIEW'    // Bước 4: Chờ duyệt (Sau khi Thầy/Cô upload bản ký phòng ban)
  | 'WAITING_RECTOR_SIGNATURE' // Bước 5: Chờ ký Hiệu trưởng
  | 'SIGNED_ARCHIVED'          // Bước 6: Đã ký và lưu trữ
  // Aliases tương thích ngược:
  | 'WAITING_FOR_SUBMISSION'
  | 'SIGNED'
  | 'NEW'
  | 'NEEDS_REVISION'
  | 'PRECHECK_PASSED'
  | 'FACULTY_SIGNED'
  | 'SCHOOL_SIGNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'RETURNED'
  | 'APPROVED'
  | 'USER_SIGNED'
  | 'SECRETARY_RECEIVED';

export type ApplicationStatus = DossierStatus;

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'FILE'
  | 'TEL'
  | 'EMAIL'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'tel'
  | 'email'
  | 'risk_table'
  | 'risk_control_table'
  | 'RISK_TABLE'
  | 'RISK_CONTROL_TABLE';

export interface User {
  id: string;
  name: string;
  title: string;
  jobTitle?: string;
  department: string;
  departmentId?: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  avatar?: string;
  token?: string;
}

export type UserProfile = User;

export interface Department {
  id: string;
  code: string;
  name: string;
  managerId?: string;
  secretaryId?: string;
  managerName?: string;
  secretaryName?: string;
  driveFolderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateField {
  id: string;
  key?: string;
  name?: string;
  label: string;
  fieldType?: FieldType;
  type?: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number | boolean | any[];
  section?: string;
  helpText?: string;
  order?: number;
  wordPlaceholder?: string;
}

export type FormFieldConfig = TemplateField;

export interface DocumentTemplate {
  id: string;
  code: string;
  title: string;
  name?: string;
  category: 'Hành chính' | 'Tài chính - Kế toán' | 'Nhân sự' | 'Đào tạo' | 'Quản trị thiết bị' | 'Khoa học Công nghệ';
  description: string;
  departmentId?: string;
  driveFileId?: string;
  version: string;
  updatedAt: string;
  manager: string;
  active: boolean;
  fileName: string;
  fileSize: string;
  downloadsCount: number;
  sections: string[];
  fields: TemplateField[];
}

export type WordTemplate = DocumentTemplate;

export type AuditAction =
  | 'CREATE'
  | 'UPDATE_DATA'
  | 'SUBMIT'
  | 'RESUBMIT'
  | 'RETURN_FOR_REVISION'
  | 'APPROVE_VALIDATED'
  | 'UPLOAD_DEPARTMENT_SIGNED'
  | 'SUBMIT_TO_RECTOR'
  | 'SIGN_AND_ARCHIVE'
  | 'PRECHECK_APPROVE'
  | 'PRECHECK_REJECT'
  | 'UPLOAD_FACULTY_SIGN'
  | 'SCHOOL_SIGNING_STEP'
  | 'APPROVE'
  | 'RETURN'
  | 'UPLOAD_USER_SIGNATURE'
  | 'RECEIVE_SECRETARY'
  | 'COMPLETE'
  | 'CANCEL';

export interface AuditLog {
  id: string;
  dossierId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  fromStatus?: DossierStatus;
  toStatus?: DossierStatus;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DossierVersion {
  id: string;
  dossierId: string;
  versionNumber: number;
  formData: Record<string, any>;
  generatedDocxPath?: string;
  generatedPdfPath?: string;
  driveFileId?: string;
  editedById: string;
  editedByName: string;
  changeSummary?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  dossierId?: string;
  dossierCode?: string;
  title: string;
  message: string;
  type: 'INFO' | 'ACTION_REQUIRED' | 'SUCCESS' | 'WARNING';
  isRead: boolean;
  createdAt: string;
}

export interface SignedFileItem {
  name: string;
  url: string;
  size?: string;
  path?: string;
  type?: string;
  uploadedAt?: string;
}

export interface TimelineLogItem {
  step: number;
  status: string;
  title: string;
  timestamp: string;
  note?: string;
}

export interface ApplicationHistory {
  id: string;
  title: string;
  description?: string;
  actor: string;
  role: string;
  timestamp: string;
  status: DossierStatus;
  comment?: string;
  applicationId?: string;
  action?: string;
  fromStatus?: DossierStatus;
  toStatus?: DossierStatus;
  performedBy?: {
    id: string;
    name: string;
    role: string;
    department?: string;
    email?: string;
    title?: string;
  };
  performedAt?: string;
  comments?: string;
}

export type TimelineEvent = ApplicationHistory;

export interface GeneratedDocument {
  id?: string;
  applicationId: string;
  fileName: string;
  fileSize: string;
  format?: 'docx' | 'pdf';
  fileUrl?: string;
  downloadUrl?: string;
  driveFileId?: string;
  mimeType: string;
  generatedAt: string;
  version: number;
  isSigned: boolean;
}

export interface Application {
  id: string;
  code: string;
  title?: string;
  userId?: string;
  departmentId?: string;
  templateId: string;
  templateTitle: string;
  templateCode: string;
  createdBy: User;
  assignedManager?: {
    name: string;
    email: string;
    department: string;
  };
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  submitted_at?: string;
  reviewedAt?: string;
  approvedAt?: string;
  signedAt?: string;
  completedAt?: string;
  status: DossierStatus;
  current_version?: number;
  currentVersion?: number;
  applicant_email?: string;
  applicantEmail?: string;
  formData: Record<string, any>;
  form_data?: Record<string, any>;
  generated_docx_path?: string;
  generatedDocxPath?: string;
  generated_pdf_path?: string;
  generatedPdfPath?: string;
  approved_pdf_path?: string;
  approvedPdfPath?: string;
  department_signed_files?: SignedFileItem[];
  departmentSignedFiles?: SignedFileItem[];
  resubmitted_signed_files?: SignedFileItem[];
  resubmittedSignedFiles?: SignedFileItem[];
  final_signed_pdf_path?: string;
  finalSignedPdfPath?: string;
  revision_note?: string;
  revisionNote?: string;
  revision_reason?: string;
  revisionReason?: string;
  returnReason?: string;
  reviewNotes?: string;
  review_notes?: string;
  timeline_logs?: TimelineLogItem[];
  timelineLogs?: TimelineLogItem[];
  department_name?: string;
  departmentName?: string;
  docx_file_url?: string;
  docxFileUrl?: string;
  precheck_pdf_url?: string;
  precheckPdfUrl?: string;
  faculty_signed_pdf_url?: string;
  facultySignedPdfUrl?: string;
  final_pdf_url?: string;
  finalPdfUrl?: string;
  decision_number?: string;
  decisionNumber?: string;
  decision_date?: string;
  decisionDate?: string;
  has_financial_implication?: boolean;
  hasFinancialImplication?: boolean;
  khcn_signed?: boolean;
  khcnSigned?: boolean;
  khtc_signed?: boolean;
  khtcSigned?: boolean;
  bgh_signed?: boolean;
  bghSigned?: boolean;
  evidence_files?: SignedFileItem[];
  evidenceFiles?: SignedFileItem[];
  drive_folder_url?: string;
  emailLogs?: any[];
  versions?: DossierVersion[];
  auditLogs?: AuditLog[];
  timeline?: ApplicationHistory[];
  docxFileName?: string;
  generatedDocument?: GeneratedDocument;
}

export type Dossier = Application;

export interface GoogleSheetRow {
  dossierCode: string;
  templateTitle: string;
  creatorName: string;
  department: string;
  createdAt: string;
  submittedAt: string;
  approvedAt: string;
  status: string;
  reviewerName: string;
  updatedAt: string;
  syncStatus: 'Đã đồng bộ' | 'Đang đồng bộ' | 'Lỗi kết nối' | 'Đã đồng bộ MySQL';
}

export type ActiveNavTab =
  | 'dashboard'
  | 'templates'
  | 'create_dossier'
  | 'my_dossiers'
  | 'pending_approval';
