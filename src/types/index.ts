// ==========================================
// CORE DOMAIN TYPES & INTERFACES FOR DOCUMENT WORKFLOW MANAGEMENT SYSTEM
// Strictly adhering to REQUIREMENTS.md Specification
// ==========================================

export type UserRole = 'USER' | 'MANAGER' | 'SECRETARY' | 'ADMIN' | 'employee' | 'manager' | 'secretary' | 'admin';

export type DossierStatus =
  // 5 mốc chính theo quy trình automation (quy_trinh.md):
  | 'NEW'             // Bước 1-2: Mới nộp (Chờ Admin tiền kiểm)
  | 'NEEDS_REVISION'  // Bước 2: Yêu cầu bổ sung (Bản thảo có lỗi)
  | 'PRECHECK_PASSED' // Bước 2-4: Đã duyệt thể thức & Xuất PDF chuẩn
  | 'FACULTY_SIGNED'  // Bước 3-6: Đã ký cấp Khoa & Nộp minh chứng
  | 'SCHOOL_SIGNING'  // Bước 4-7: Đang trình ký cấp Trường (KH&CN, KHTC, BGH)
  | 'COMPLETED'       // Bước 4-8: Đã ban hành QĐ CGCN & Đóng hồ sơ
  | 'CANCELLED'
  // Backward-compatible aliases
  | 'DRAFT'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'APPROVED'
  | 'USER_SIGNED'
  | 'SECRETARY_RECEIVED'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'resubmitted'
  | 'approved'
  | 'for_signature'
  | 'completed';

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
  // Lowercase aliases
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file';

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
  defaultValue?: string | number | boolean | string[];
  section?: string;
  helpText?: string;
  order?: number;
  wordPlaceholder?: string; // e.g. {{ho_ten}}
}

export type FormFieldConfig = TemplateField;

export interface DocumentTemplate {
  id: string;
  code: string;
  title: string;
  name?: string;
  category: 'Hành chính' | 'Tài chính - Kế toán' | 'Nhân sự' | 'Đào tạo' | 'Quản trị thiết bị';
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
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DossierVersion {
  id: string;
  dossierId: string;
  versionNumber: number;
  formData: Record<string, any>;
  driveFileId?: string;
  editedById: string;
  editedByName: string;
  changeSummary?: string;
  createdAt: string;
}

export interface NotificationType {
  type: 'INFO' | 'ACTION_REQUIRED' | 'SUCCESS' | 'WARNING';
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

export interface ApprovalComment {
  id: string;
  applicationId: string;
  authorName: string;
  authorRole: string;
  comment: string;
  createdAt: string;
  action: 'request_revision' | 'approve' | 'sign' | 'resubmit' | 'receive' | 'complete';
}

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
  code: string; // e.g. CGCN-2026-000001
  title?: string;
  userId?: string;
  departmentId?: string;
  templateId: string;
  templateTitle: string;
  templateCode: string;
  createdBy: User;
  assignedManager: {
    name: string;
    email: string;
    department: string;
  };
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  signedAt?: string;
  completedAt?: string;
  status: DossierStatus;
  formData: Record<string, any>;
  returnReason?: string;
  reviewNotes?: string;
  review_notes?: string;
  department_name?: string;
  docx_file_url?: string;
  docxFileUrl?: string;
  precheck_pdf_url?: string;
  precheckPdfUrl?: string;
  faculty_signed_pdf_url?: string;
  facultySignedPdfUrl?: string;
  final_pdf_url?: string;
  finalPdfUrl?: string;
  decision_number?: string;
  decision_date?: string;
  has_financial_implication?: boolean;
  khcn_signed?: boolean;
  khtc_signed?: boolean;
  bgh_signed?: boolean;
  evidence_files?: Array<{ name: string; url: string; size?: string }>;
  drive_folder_url?: string;
  emailLogs?: any[];
  generatedDriveFileId?: string;
  userSignedDriveFileId?: string;
  finalSignedDriveFileId?: string;
  versions?: DossierVersion[];
  auditLogs?: AuditLog[];
  timeline: ApplicationHistory[];
  syncedToSheets?: boolean;
  syncedAt?: string;
  docxFileName: string;
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
  | 'pending_approval'
  | 'secretary_queue'
  | 'history_sheets'
  | 'template_management'
  | 'departments'
  | 'users'
  | 'settings';

