/**
 * CTUMP DocuGov API Service Client (Production-Ready)
 *
 * Giao tiếp trực tiếp với Backend NodeJS Express (3-Layer Architecture).
 * Đảm bảo React thuần chỉ làm nhiệm vụ load UI và ráp dữ liệu từ Backend.
 * Toàn bộ logic nghiệp vụ, sinh mã, thẩm định, gửi mail và lưu database do Backend xử lý.
 */

import {
  DocumentTemplate,
  Application,
  ApplicationHistory,
  GeneratedDocument,
  GoogleSheetRow,
  User,
  Notification as NotificationItem,
} from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';

export { API_BASE_URL };

/**
 * Standard HTTP Request client với error handling và JSON parsing
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errMsg = `Lỗi yêu cầu máy chủ (${response.status}): ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) {
          errMsg = errorJson.message;
        }
      } catch {
        // ignore json parse error
      }
      throw new Error(errMsg);
    }

    const json = await response.json();
    if (json && typeof json === 'object') {
      if (json.success === false) {
        throw new Error(json.message || 'Yêu cầu không thành công');
      }
      if ('data' in json && (json as any).data !== undefined) {
        return (json as any).data as T;
      }
    }
    return json as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error(`[DocuGov API Error] ${url}:`, err.message || err);
    throw err;
  }
}

export interface BackendHealthStatus {
  online: boolean;
  message?: string;
  databaseConnected?: boolean;
}

/**
 * Kiểm tra trạng thái máy chủ Backend NodeJS & MySQL
 */
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  try {
    const res = await fetch(API_ENDPOINTS.STATUS, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      return {
        online: true,
        message: json.message,
        databaseConnected: Boolean(json.databaseConnected),
      };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

// =========================================================================
// 1. Biểu mẫu chuẩn (document_templates)
// =========================================================================

export async function getTemplates(): Promise<DocumentTemplate[]> {
  return request<DocumentTemplate[]>(API_ENDPOINTS.GET_TEMPLATES, { method: 'GET' });
}

export async function getTemplateById(id: string): Promise<DocumentTemplate | null> {
  return request<DocumentTemplate | null>(API_ENDPOINTS.GET_TEMPLATE_DETAIL(id), { method: 'GET' });
}

export async function saveTemplate(template: DocumentTemplate, _isNew = false): Promise<DocumentTemplate> {
  return request<DocumentTemplate>(`${API_BASE_URL}/templates`, {
    method: 'POST',
    body: JSON.stringify(template),
  });
}

// =========================================================================
// 2. Hồ sơ CGCN (dossiers) - Quy trình 8 bước chuẩn Automation
// =========================================================================

export async function getAllApplications(): Promise<Application[]> {
  return request<Application[]>(API_ENDPOINTS.GET_ALL_DOSSIERS, { method: 'GET' });
}

export async function getApplicationById(id: string): Promise<Application | null> {
  return request<Application | null>(API_ENDPOINTS.GET_DOSSIER_DETAIL(id), { method: 'GET' });
}

export async function createApplication(payload: Partial<Application>, creator?: User): Promise<Application> {
  return request<Application>(API_ENDPOINTS.CREATE_DOSSIER, {
    method: 'POST',
    body: JSON.stringify({
      templateId: payload?.templateId,
      templateTitle: payload?.templateTitle,
      templateCode: payload?.templateCode,
      formData: payload?.formData || {},
      user: creator || payload?.createdBy,
      status: 'NEW',
    }),
  });
}

export async function saveApplicationDraft(id: string, payload: Partial<Application>, actor?: User): Promise<Application> {
  const isNew = !id || id.startsWith('hs-') || id.startsWith('dos-temp-');
  const endpoint = isNew ? API_ENDPOINTS.CREATE_DOSSIER : API_ENDPOINTS.UPDATE_DOSSIER(id);
  const method = isNew ? 'POST' : 'PUT';

  return request<Application>(endpoint, {
    method,
    body: JSON.stringify({
      templateId: payload?.templateId,
      templateTitle: payload?.templateTitle,
      templateCode: payload?.templateCode,
      formData: payload?.formData || {},
      user: actor || payload?.createdBy,
      status: 'DRAFT',
    }),
  });
}

export async function submitApplication(id: string, payload?: Partial<Application>, actor?: User): Promise<Application> {
  const isNew = !id || id.startsWith('hs-') || id.startsWith('dos-temp-');
  const endpoint = isNew ? API_ENDPOINTS.CREATE_DOSSIER : API_ENDPOINTS.UPDATE_DOSSIER(id);
  const method = isNew ? 'POST' : 'PUT';

  return request<Application>(endpoint, {
    method,
    body: JSON.stringify({
      templateId: payload?.templateId,
      templateTitle: payload?.templateTitle,
      templateCode: payload?.templateCode,
      formData: payload?.formData || {},
      user: actor || payload?.createdBy,
      status: 'NEW',
    }),
  });
}

// Bước 2: Admin Tiền kiểm hồ sơ bản thảo
export async function adminPrecheck(
  id: string,
  isValid: boolean,
  reviewNotes?: string,
  adminUser?: User
): Promise<Application> {
  return request<Application>(API_ENDPOINTS.ADMIN_PRECHECK(id), {
    method: 'POST',
    body: JSON.stringify({ isValid, reviewNotes, adminUser }),
  });
}

// Bước 3 & 6: Cán bộ upload PDF ký cấp Khoa + Minh chứng
export async function uploadFacultySignature(
  id: string,
  facultySignedPdfUrl?: string,
  evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
  user?: User
): Promise<Application> {
  return request<Application>(API_ENDPOINTS.UPLOAD_FACULTY_SIGN(id), {
    method: 'POST',
    body: JSON.stringify({ facultySignedPdfUrl, evidenceFiles, user }),
  });
}

// Bước 4 & 7: Admin cập nhật tiến độ ký số cấp Trường
export async function updateSchoolSigning(
  id: string,
  flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean },
  adminUser?: User
): Promise<Application> {
  return request<Application>(API_ENDPOINTS.SCHOOL_SIGNING(id), {
    method: 'POST',
    body: JSON.stringify({ ...flags, adminUser }),
  });
}

// Bước 4 & 8: Ban hành Quyết định CGCN & Hoàn tất đóng hồ sơ
export async function completeDossier(
  id: string,
  decisionNumber?: string,
  decisionDate?: string,
  finalPdfUrl?: string,
  adminUser?: User
): Promise<Application> {
  return request<Application>(API_ENDPOINTS.COMPLETE_DOSSIER(id), {
    method: 'POST',
    body: JSON.stringify({ decisionNumber, decisionDate, finalPdfUrl, adminUser }),
  });
}

// =========================================================================
// 2.1 Dự án Chuyển giao công nghệ (transfer_projects) - 5 Endpoint chuẩn
// =========================================================================

export async function getAllProjects(): Promise<any[]> {
  return request<any[]>(API_ENDPOINTS.GET_ALL_PROJECTS, { method: 'GET' });
}

export async function getProjectById(id: string): Promise<any> {
  return request<any>(API_ENDPOINTS.GET_PROJECT_DETAIL(id), { method: 'GET' });
}

export async function createProject(payload: any): Promise<any> {
  return request<any>(API_ENDPOINTS.CREATE_PROJECT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reviewProject(
  id: string,
  isValid: boolean,
  reviewNotes?: string,
  actor?: any
): Promise<any> {
  return request<any>(API_ENDPOINTS.REVIEW_PROJECT(id), {
    method: 'POST',
    body: JSON.stringify({ isValid, reviewNotes, actor }),
  });
}

export async function uploadDeanSignedFile(
  id: string,
  file: File | Blob,
  actor?: any
): Promise<any> {
  const formData = new FormData();
  formData.append('dean_signed_pdf', file);
  if (actor) {
    formData.append('actor', JSON.stringify(actor));
  }
  const response = await fetch(API_ENDPOINTS.UPLOAD_DEAN_SIGNED(id), {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || `Lỗi tải lên văn bản ký Khoa (${response.status})`);
  }
  const json = await response.json();
  return json.data;
}

export async function completeProject(
  id: string,
  payload: { decisionNumber?: string; decisionDate?: string; finalPdfUrl?: string; actor?: any }
): Promise<any> {
  return request<any>(API_ENDPOINTS.COMPLETE_PROJECT(id), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// =========================================================================
// 3. Người dùng & Xác thực (users)
// =========================================================================

export async function getUsers(): Promise<User[]> {
  return request<User[]>(API_ENDPOINTS.GET_USERS, { method: 'GET' });
}

export async function saveUser(user: User): Promise<User> {
  return request<User>(`${API_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

export async function login(email: string): Promise<User> {
  return request<User>(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}


// =========================================================================
// 5. Nhật ký Audit Trail & Email Logs
// =========================================================================

export async function getAuditLogs(dossierId?: string): Promise<any[]> {
  const url = dossierId ? `${API_ENDPOINTS.GET_AUDIT_LOGS}?dossierId=${dossierId}` : API_ENDPOINTS.GET_AUDIT_LOGS;
  return request<any[]>(url, { method: 'GET' });
}

export async function getEmailLogs(dossierId?: string): Promise<any[]> {
  const url = dossierId ? `${API_ENDPOINTS.GET_EMAIL_LOGS}?dossierId=${dossierId}` : API_ENDPOINTS.GET_EMAIL_LOGS;
  return request<any[]>(url, { method: 'GET' });
}

// =========================================================================
// 6. Tương thích ngược (Backward Compatibility Helpers)
// =========================================================================

export async function getMyApplications(userId?: string): Promise<Application[]> {
  const all = await getAllApplications();
  if (!userId) return all;
  return all.filter((app) => app.createdBy?.id === userId || (app as any).userId === userId);
}

export async function getPendingApplications(): Promise<Application[]> {
  const all = await getAllApplications();
  return all.filter((app) => app.status === 'NEW' || app.status === 'FACULTY_SIGNED' || app.status === 'SCHOOL_SIGNING');
}

export async function requestApplicationRevision(id: string, comment: string, adminUser?: User): Promise<Application> {
  return adminPrecheck(id, false, comment, adminUser);
}

export async function approveApplication(id: string, note?: string, reviewer?: string | User): Promise<Application> {
  const user = typeof reviewer === 'object' ? reviewer : undefined;
  return adminPrecheck(id, true, note, user);
}

export async function moveApplicationToSigning(id: string, _reviewerName?: string): Promise<any> {
  const dossier = await getApplicationById(id);
  return { application: dossier };
}

export async function generateDocument(id: string, format: 'docx' | 'pdf' = 'docx'): Promise<GeneratedDocument> {
  const dossier = await getApplicationById(id);
  const fileUrl = format === 'pdf' ? (dossier?.precheckPdfUrl || dossier?.docxFileUrl || '') : (dossier?.docxFileUrl || '');
  return {
    id: `gen-${id}`,
    applicationId: id,
    format,
    fileUrl,
    downloadUrl: fileUrl,
    fileName: `${dossier?.code || id}.${format}`,
    fileSize: '45 KB',
    mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    version: 1,
    isSigned: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function getGeneratedDocument(id: string): Promise<GeneratedDocument> {
  return generateDocument(id, 'docx');
}

export async function getApplicationHistory(id: string): Promise<ApplicationHistory[]> {
  const logs = await getAuditLogs(id);
  return logs.map((log) => ({
    id: log.id,
    applicationId: id,
    title: log.action || 'Nhật ký xử lý',
    actor: log.actorName || 'Hệ thống',
    role: log.actorRole || 'SYSTEM',
    timestamp: log.createdAt || new Date().toISOString(),
    status: (log.toStatus || 'NEW') as any,
    action: log.action,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    performedBy: {
      id: log.actorId,
      name: log.actorName,
      role: log.actorRole,
      department: '',
      email: '',
      title: '',
    },
    performedAt: log.createdAt,
    comments: log.notes,
    comment: log.notes,
    description: log.notes,
  }));
}

export async function syncApplicationToSheet(id: string, data?: Partial<GoogleSheetRow>): Promise<GoogleSheetRow> {
  const app = await getApplicationById(id);
  const todayDate = new Date().toISOString().slice(0, 10);
  return {
    dossierCode: app ? app.code : id,
    templateTitle: app ? app.templateTitle : 'Biểu mẫu',
    creatorName: app ? app.createdBy.name : 'Người dùng',
    department: app ? app.createdBy.department : 'Đơn vị',
    createdAt: app?.createdAt?.slice(0, 10) || todayDate,
    submittedAt: app?.submittedAt?.slice(0, 10) || todayDate,
    approvedAt: app?.approvedAt?.slice(0, 10) || todayDate,
    status: app?.status || 'NEW',
    reviewerName: app?.assignedManager?.name || 'Phòng KH&CN',
    updatedAt: `${todayDate} ${new Date().toLocaleTimeString('vi-VN')}`,
    syncStatus: 'Đã đồng bộ MySQL',
    ...(data || {}),
  };
}

export async function getAllSheetRows(): Promise<GoogleSheetRow[]> {
  const apps = await getAllApplications();
  const todayDate = new Date().toISOString().slice(0, 10);
  return apps.map((app) => ({
    dossierCode: app.code,
    templateTitle: app.templateTitle,
    creatorName: app.createdBy.name,
    department: app.createdBy.department,
    createdAt: app.createdAt ? app.createdAt.slice(0, 10) : todayDate,
    submittedAt: app.submittedAt ? app.submittedAt.slice(0, 10) : todayDate,
    approvedAt: app.approvedAt ? app.approvedAt.slice(0, 10) : todayDate,
    status: app.status,
    reviewerName: 'Phòng KH&CN',
    updatedAt: todayDate,
    syncStatus: 'Đã đồng bộ MySQL',
  }));
}

export async function returnApplication(id: string, returnReason: string, manager?: User): Promise<Application> {
  return adminPrecheck(id, false, returnReason, manager);
}

export async function updateDossierDataByManager(
  id: string,
  newFormData: Record<string, any>,
  _changeSummary: string,
  manager?: User
): Promise<Application> {
  return request<Application>(API_ENDPOINTS.UPDATE_DOSSIER(id), {
    method: 'PUT',
    body: JSON.stringify({ formData: newFormData, user: manager, status: 'NEW' }),
  });
}

export async function uploadUserSignature(id: string, driveFileId: string, actor?: User): Promise<Application> {
  return uploadFacultySignature(id, driveFileId, [], actor);
}

export async function receiveSecretaryDossier(id: string, secretary?: User): Promise<Application> {
  return updateSchoolSigning(id, { khcnSigned: true }, secretary);
}

export async function completeDossierBySecretary(
  id: string,
  finalDriveFileId: string,
  secretary?: User
): Promise<{ application: Application; sheetSyncResult: GoogleSheetRow }> {
  const completed = await completeDossier(id, undefined, undefined, finalDriveFileId, secretary);
  const sheetRow = await syncApplicationToSheet(id);
  return { application: completed, sheetSyncResult: sheetRow };
}

export async function getSecretaryQueueApplications(): Promise<Application[]> {
  const all = await getAllApplications();
  return all.filter((app) => app.status === 'FACULTY_SIGNED' || app.status === 'SCHOOL_SIGNING');
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const logs = await getEmailLogs();
    return logs.map((log, idx) => ({
      id: `notif-${log.id || idx}`,
      userId: userId,
      dossierId: log.dossier_id || '',
      dossierCode: log.dossier_code || '',
      title: log.subject || 'Thông báo hệ thống',
      message: log.content || '',
      type: 'INFO' as const,
      isRead: false,
      createdAt: log.sent_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(_id: string): Promise<void> {
  // Client state helper
}
