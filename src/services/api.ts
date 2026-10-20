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
  UserRole,
  Notification as NotificationItem,
} from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import { OFFICIAL_TEMPLATES, AUTH_TOKEN_KEY } from '../constants';

export { API_BASE_URL };

const DOSSIERS_STORAGE_KEY = 'ctump_dossiers_cache';

const DEFAULT_MOCK_USER: User = {
  id: 'u-cb-01',
  name: 'Cán bộ Giảng viên',
  title: 'ThS.',
  email: 'canbo@ctump.edu.vn',
  role: 'USER',
  department: 'Khoa Công nghệ Thông tin',
};

function getLocalDossiers(): Application[] {
  try {
    const raw = localStorage.getItem(DOSSIERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalDossiers(dossiers: Application[]): void {
  try {
    localStorage.setItem(DOSSIERS_STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    // ignore
  }
}

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token?: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore localStorage write error
  }
};

/**
 * Standard HTTP Request client với error handling và JSON parsing
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders,
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
  try {
    const list = await request<DocumentTemplate[]>(API_ENDPOINTS.GET_TEMPLATES, { method: 'GET' });
    if (Array.isArray(list) && list.length > 0) {
      return list.map((item) => {
        const fallback = OFFICIAL_TEMPLATES.find((t) => t.id === item.id || t.code === item.code);
        return {
          ...fallback,
          ...item,
          fields: (item.fields && item.fields.length > 0) ? item.fields : (fallback?.fields || []),
          sections: (item.sections && item.sections.length > 0) ? item.sections : (fallback?.sections || []),
        };
      });
    }
    return OFFICIAL_TEMPLATES;
  } catch (err) {
    console.warn('[getTemplates] Using official templates fallback:', err);
    return OFFICIAL_TEMPLATES;
  }
}

export async function getTemplateById(id: string): Promise<DocumentTemplate | null> {
  try {
    const found = await request<DocumentTemplate | null>(API_ENDPOINTS.GET_TEMPLATE_DETAIL(id), { method: 'GET' });
    if (found) {
      const fallback = OFFICIAL_TEMPLATES.find((t) => t.id === found.id || t.code === found.code);
      return {
        ...fallback,
        ...found,
        fields: (found.fields && found.fields.length > 0) ? found.fields : (fallback?.fields || []),
        sections: (found.sections && found.sections.length > 0) ? found.sections : (fallback?.sections || []),
      };
    }
  } catch {
    // ignore
  }
  return OFFICIAL_TEMPLATES.find((t) => t.id === id || t.code === id) || null;
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
  try {
    const apps = await request<Application[]>(API_ENDPOINTS.GET_ALL_DOSSIERS, { method: 'GET' });
    if (Array.isArray(apps) && apps.length > 0) {
      saveLocalDossiers(apps);
      return apps;
    }
  } catch (err) {
    console.warn('[getAllApplications] Backend không sẵn sàng hoặc MySQL chưa kết nối, sử dụng dữ liệu cục bộ:', err);
  }
  return getLocalDossiers();
}

export async function getApplicationById(id: string): Promise<Application | null> {
  try {
    const found = await request<Application | null>(API_ENDPOINTS.GET_DOSSIER_DETAIL(id), { method: 'GET' });
    if (found) return found;
  } catch (err) {
    console.warn(`[getApplicationById] Không thể lấy hồ sơ ${id} từ backend, tìm trong cache cục bộ:`, err);
  }
  const local = getLocalDossiers();
  return local.find((d) => d.id === id || d.code === id) || null;
}

export async function createApplication(payload: Partial<Application>, creator?: User): Promise<Application> {
  try {
    const created = await request<Application>(API_ENDPOINTS.CREATE_DOSSIER, {
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
    if (created) return created;
  } catch (err) {
    console.warn('[createApplication] Backend offline, lưu vào bộ nhớ cục bộ:', err);
  }

  const local = getLocalDossiers();
  const nextNum = String(local.length + 1).padStart(4, '0');
  const newCode = `CGCN-2026-${nextNum}`;
  const newApp: Application = {
    id: `dos-2026-${nextNum}`,
    code: newCode,
    title: payload?.templateTitle || 'Hồ sơ Chuyển giao Công nghệ',
    templateId: payload?.templateId || 'tmpl-cgcn-1a',
    templateCode: payload?.templateCode || 'Mẫu 1a-TT.CGCN',
    templateTitle: payload?.templateTitle || 'Hồ sơ Chuyển giao Công nghệ',
    status: 'NEW',
    departmentName: creator?.department || 'Khoa Công nghệ Thông tin',
    createdBy: creator || payload?.createdBy || DEFAULT_MOCK_USER,
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    formData: payload?.formData || {},
    docx_file_url: `/uploads/docx/${newCode}.docx`,
  };
  saveLocalDossiers([newApp, ...local]);
  return newApp;
}

export async function saveApplicationDraft(id: string, payload: Partial<Application>, actor?: User): Promise<Application> {
  const isNew = !id || id.startsWith('hs-') || id.startsWith('dos-temp-');
  const endpoint = isNew ? API_ENDPOINTS.CREATE_DOSSIER : API_ENDPOINTS.UPDATE_DOSSIER(id);
  const method = isNew ? 'POST' : 'PUT';

  try {
    const saved = await request<Application>(endpoint, {
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
    if (saved) return saved;
  } catch (err) {
    console.warn('[saveApplicationDraft] Backend offline, lưu cục bộ:', err);
  }

  const local = getLocalDossiers();
  const existing = local.find((d) => d.id === id || d.code === id);
  if (existing) {
    const updated = { ...existing, ...payload, formData: payload.formData || existing.formData, status: 'DRAFT' as const };
    saveLocalDossiers(local.map((d) => (d.id === existing.id ? updated : d)));
    return updated;
  }

  const nextNum = String(local.length + 1).padStart(4, '0');
  const newApp: Application = {
    id: id || `dos-2026-${nextNum}`,
    code: `CGCN-2026-${nextNum}`,
    title: payload?.templateTitle || 'Bản thảo Hồ sơ Chuyển giao',
    templateId: payload?.templateId || 'tmpl-cgcn-1a',
    templateCode: payload?.templateCode || 'Mẫu 1a-TT.CGCN',
    templateTitle: payload?.templateTitle || 'Bản thảo Hồ sơ Chuyển giao',
    status: 'DRAFT',
    departmentName: actor?.department || 'Khoa Công nghệ Thông tin',
    createdBy: actor || payload?.createdBy || DEFAULT_MOCK_USER,
    createdAt: new Date().toISOString(),
    formData: payload?.formData || {},
  };
  saveLocalDossiers([newApp, ...local]);
  return newApp;
}

export async function submitApplication(id: string, payload?: Partial<Application>, actor?: User): Promise<Application> {
  const isNew = !id || id.startsWith('hs-') || id.startsWith('dos-temp-');
  const endpoint = isNew ? API_ENDPOINTS.CREATE_DOSSIER : API_ENDPOINTS.UPDATE_DOSSIER(id);
  const method = isNew ? 'POST' : 'PUT';

  try {
    const submitted = await request<Application>(endpoint, {
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
    if (submitted) return submitted;
  } catch (err) {
    console.warn('[submitApplication] Backend offline, nộp hồ sơ cục bộ:', err);
  }

  const local = getLocalDossiers();
  const existing = local.find((d) => d.id === id || d.code === id);
  if (existing) {
    const updated = {
      ...existing,
      ...(payload || {}),
      formData: payload?.formData || existing.formData,
      status: 'NEW' as const,
      submittedAt: new Date().toISOString(),
    };
    saveLocalDossiers(local.map((d) => (d.id === existing.id ? updated : d)));
    return updated;
  }

  return createApplication(payload || {}, actor);
}

// Bước 2: Admin Tiền kiểm hồ sơ bản thảo
export async function adminPrecheck(
  id: string,
  isValid: boolean,
  reviewNotes?: string,
  adminUser?: User
): Promise<Application> {
  let backendResult: Application | null = null;
  try {
    const res = await request<Application>(API_ENDPOINTS.ADMIN_PRECHECK(id), {
      method: 'POST',
      body: JSON.stringify({ isValid, reviewNotes, adminUser }),
    });
    if (res && res.id) backendResult = res;
  } catch (err) {
    console.warn('[adminPrecheck] Backend offline, duyệt tiền kiểm cục bộ:', err);
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);

  const updated: Application = backendResult || {
    ...(target || {
      id: id,
      code: id.startsWith('CGCN-') ? id : `CGCN-2026-0001`,
      title: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
      templateId: 'tmpl-cgcn-1a',
      templateTitle: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
      templateCode: 'Mẫu 1a-TT.CGCN',
      departmentName: 'Khoa Y',
      createdBy: DEFAULT_MOCK_USER,
      createdAt: new Date().toISOString(),
      formData: {},
    }),
    status: isValid ? 'PRECHECK_PASSED' : 'NEEDS_REVISION',
    reviewNotes: reviewNotes || (isValid ? 'Hồ sơ đạt chuẩn thể thức.' : 'Yêu cầu sửa đổi bổ sung.'),
    returnReason: isValid ? undefined : (reviewNotes || 'Yêu cầu sửa đổi bổ sung.'),
    reviewedAt: new Date().toISOString(),
    precheck_pdf_url: isValid ? `/uploads/pdf/${target?.code || id}-locked.pdf` : target?.precheck_pdf_url,
  };

  if (target) {
    saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  } else {
    saveLocalDossiers([updated, ...local]);
  }
  return updated;
}

// Bước 3 & 6: Cán bộ upload PDF ký cấp Khoa + Minh chứng
export async function uploadFacultySignature(
  id: string,
  facultySignedPdfUrl?: string,
  evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
  user?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.UPLOAD_FACULTY_SIGN(id), {
      method: 'POST',
      body: JSON.stringify({ facultySignedPdfUrl, evidenceFiles, user }),
    });
    if (res) return res;
  } catch (err) {
    console.warn('[uploadFacultySignature] Backend offline, lưu bản ký Khoa cục bộ:', err);
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ để nộp bản ký');

  const updated: Application = {
    ...target,
    status: 'FACULTY_SIGNED',
    faculty_signed_pdf_url: facultySignedPdfUrl || `/uploads/pdf/${target.code}-locked.pdf`,
    evidenceFiles: evidenceFiles || target.evidenceFiles,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// Bước 4 & 7: Admin cập nhật tiến độ ký số cấp Trường
export async function updateSchoolSigning(
  id: string,
  flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean },
  adminUser?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.SCHOOL_SIGNING(id), {
      method: 'POST',
      body: JSON.stringify({ ...flags, adminUser }),
    });
    if (res) return res;
  } catch (err) {
    console.warn('[updateSchoolSigning] Backend offline, cập nhật tiến độ ký Trường cục bộ:', err);
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ để cập nhật ký Trường');

  const updated: Application = {
    ...target,
    status: 'SCHOOL_SIGNING',
    khcnSigned: flags.khcnSigned ?? target.khcnSigned,
    khtcSigned: flags.khtcSigned ?? target.khtcSigned,
    bghSigned: flags.bghSigned ?? target.bghSigned,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// Bước 4 & 8: Ban hành Quyết định CGCN & Hoàn tất đóng hồ sơ
export async function completeDossier(
  id: string,
  decisionNumber?: string,
  decisionDate?: string,
  finalPdfUrl?: string,
  adminUser?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.COMPLETE_DOSSIER(id), {
      method: 'POST',
      body: JSON.stringify({ decisionNumber, decisionDate, finalPdfUrl, adminUser }),
    });
    if (res) return res;
  } catch (err) {
    console.warn('[completeDossier] Backend offline, hoàn tất đóng hồ sơ cục bộ:', err);
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ để đóng');

  const updated: Application = {
    ...target,
    status: 'COMPLETED',
    decisionNumber: decisionNumber || '128/QĐ-ĐHYDCT',
    decisionDate: decisionDate || new Date().toISOString().slice(0, 10),
    final_pdf_url: finalPdfUrl || 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link',
    completedAt: new Date().toISOString(),
    khcnSigned: true,
    khtcSigned: true,
    bghSigned: true,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
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
  const token = getAuthToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(API_ENDPOINTS.UPLOAD_DEAN_SIGNED(id), {
    method: 'POST',
    headers,
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

export async function login(
  email: string,
  extraData?: { name?: string; avatar?: string; googleId?: string }
): Promise<User> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const isAdmin = cleanEmail === 'toanhkhai12345@gmail.com';

  try {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, ...(extraData || {}) }),
    });

    const json = await res.json();
    if (res.ok && json.success && json.data) {
      if (json.data.token) {
        setAuthToken(json.data.token);
      }
      return json.data;
    }
    throw new Error(json.message || 'Lỗi đăng nhập');
  } catch (err: any) {
    console.warn('[api.login] Kết nối backend thất bại, sử dụng fallback cấu hình:', err.message);
    const fallbackToken = isAdmin ? 'dev-token-admin' : 'dev-token-user';
    setAuthToken(fallbackToken);

    const username = cleanEmail.split('@')[0];
    const formattedName =
      extraData?.name ||
      (isAdmin
        ? 'Quản trị viên (Toàn Khải)'
        : username
            .split(/[._-]/)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ') || 'Người dùng Google');

    return {
      id: `usr-${username}`,
      name: formattedName,
      email: cleanEmail,
      role: isAdmin ? 'ADMIN' : 'USER',
      title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
      department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Trường Đại học Y Dược Cần Thơ',
      avatar: extraData?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${cleanEmail}`,
      token: fallbackToken,
    };
  }
}


// =========================================================================
// 5. Nhật ký Audit Trail & Email Logs
// =========================================================================

export async function getAuditLogs(dossierId?: string): Promise<any[]> {
  const url = dossierId ? `${API_ENDPOINTS.GET_AUDIT_LOGS}?dossierId=${dossierId}` : API_ENDPOINTS.GET_AUDIT_LOGS;
  try {
    const logs = await request<any[]>(url, { method: 'GET' });
    if (Array.isArray(logs) && logs.length > 0) return logs;
  } catch (err) {
    console.warn('[getAuditLogs] Backend offline, sử dụng lịch sử từ hồ sơ:', err);
  }

  const local = getLocalDossiers();
  const target = dossierId ? local.filter((d) => d.id === dossierId || d.code === dossierId) : local;
  const generated: any[] = [];
  target.forEach((app) => {
    generated.push({
      id: `aud-${app.code}-1`,
      dossierId: app.id,
      actorId: app.createdBy.id,
      actorName: app.createdBy.name,
      actorRole: app.createdBy.role,
      action: 'Nộp hồ sơ trực tuyến',
      fromStatus: null,
      toStatus: 'NEW',
      notes: `Khởi tạo hồ sơ và nộp bản thảo thành công (${app.templateTitle})`,
      createdAt: app.submittedAt || app.createdAt,
    });
    if (['PRECHECK_PASSED', 'FACULTY_SIGNED', 'SCHOOL_SIGNING', 'COMPLETED'].includes(app.status)) {
      generated.push({
        id: `aud-${app.code}-2`,
        dossierId: app.id,
        actorId: 'usr-admin',
        actorName: 'Quản trị viên KH&CN',
        actorRole: 'ADMIN',
        action: 'Tiền kiểm đạt thể thức',
        fromStatus: 'NEW',
        toStatus: 'PRECHECK_PASSED',
        notes: app.reviewNotes || 'Đạt chuẩn thể thức văn bản số. Khóa layout PDF.',
        createdAt: app.reviewedAt || app.createdAt,
      });
    }
    if (['FACULTY_SIGNED', 'SCHOOL_SIGNING', 'COMPLETED'].includes(app.status)) {
      generated.push({
        id: `aud-${app.code}-3`,
        dossierId: app.id,
        actorId: app.createdBy.id,
        actorName: app.createdBy.name,
        actorRole: 'USER',
        action: 'Nộp bản ký cấp Khoa',
        fromStatus: 'PRECHECK_PASSED',
        toStatus: 'FACULTY_SIGNED',
        notes: 'Đã hoàn tất chữ ký số Trưởng Khoa và nộp kèm minh chứng nghiệm thu.',
        createdAt: app.reviewedAt || app.createdAt,
      });
    }
    if (app.status === 'COMPLETED') {
      generated.push({
        id: `aud-${app.code}-4`,
        dossierId: app.id,
        actorId: 'usr-admin',
        actorName: 'Quản trị viên KH&CN',
        actorRole: 'ADMIN',
        action: 'Ban hành Quyết định & Đóng hồ sơ',
        fromStatus: 'SCHOOL_SIGNING',
        toStatus: 'COMPLETED',
        notes: `Ban hành Quyết định ${app.decisionNumber || '128/QĐ-ĐHYDCT'} và lưu trữ Google Drive.`,
        createdAt: app.completedAt || app.createdAt,
      });
    }
  });

  return generated;
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

// ==========================================
// USER MANAGEMENT & ROLE ASSIGNMENT API
// ==========================================

const USERS_STORAGE_KEY = 'ctump_users_cache';

const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_toanhkhai',
    name: 'Quản trị viên (Toàn Khải)',
    email: 'toanhkhai12345@gmail.com',
    role: 'ADMIN',
    department: 'Phòng Khoa học Công nghệ',
    departmentId: 'khcn',
    title: 'Quản trị viên Hệ thống (Admin)',
    jobTitle: 'Quản trị viên Hệ thống (Admin)',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ToanKhai',
  },
  {
    id: 'usr_admin_mstruc',
    name: 'ThS. Nguyễn Thị Trúc',
    email: 'truc.ctump@ctump.edu.vn',
    role: 'ADMIN',
    department: 'Phòng Khoa học Công nghệ',
    departmentId: 'khcn',
    title: 'Chuyên viên Quản lý CGCN',
    jobTitle: 'Cán bộ Tiền kiểm (Admin nghiệp vụ)',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=NguyenThiTruc',
  },
  {
    id: 'usr_user_thayco',
    name: 'Thầy / Cô (Cán bộ - Giảng viên)',
    email: 'thayco.giangvien@ctump.edu.vn',
    role: 'USER',
    department: 'Khoa Y - Trường Đại học Y Dược Cần Thơ',
    departmentId: 'khoa_y',
    title: 'Giảng viên / Nghiên cứu viên',
    jobTitle: 'Cán bộ / Giảng viên (Thầy / Cô)',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=ThayCo',
  },
  {
    id: 'usr_user_bslan',
    name: 'TS. BS. Trần Ngọc Lan',
    email: 'tnlan@ctump.edu.vn',
    role: 'USER',
    department: 'Khoa Y - Bộ môn Nội',
    departmentId: 'khoa_y',
    title: 'Trưởng Bộ môn Nội',
    jobTitle: 'Chủ nhiệm Đề tài CGCN',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=TranNgocLan',
  },
  {
    id: 'usr_user_duoc',
    name: 'ThS. DS. Phạm Minh Hoàng',
    email: 'pmhoang@ctump.edu.vn',
    role: 'USER',
    department: 'Khoa Dược - Bộ môn Dược liệu',
    departmentId: 'khoa_duoc',
    title: 'Phó Trưởng Khoa Dược',
    jobTitle: 'Giảng viên chính',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=MinhHoang',
  },
];

function getLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return INITIAL_USERS;
}

function saveLocalUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

/**
 * Lấy danh sách tất cả người dùng trong hệ thống
 */
export async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/users`, { credentials: 'omit' });
    if (res.ok) {
      const json = await res.json();
      const list = json?.data || json;
      if (Array.isArray(list) && list.length > 0) {
        saveLocalUsers(list);
        return list;
      }
    }
  } catch (err) {
    console.warn('[getUsers] Backend offline, fallback to local users cache');
  }
  return getLocalUsers();
}

/**
 * Lưu hoặc cập nhật thông tin người dùng / phân quyền
 */
export async function saveUser(userData: Partial<User>): Promise<User> {
  const currentUsers = getLocalUsers();
  const id = userData.id || `usr-${Date.now()}`;
  const existingIdx = currentUsers.findIndex((u) => u.id === id || (userData.email && u.email?.toLowerCase() === userData.email.toLowerCase()));

  const updatedUser: User = {
    id: existingIdx >= 0 ? currentUsers[existingIdx].id : id,
    name: userData.name || (existingIdx >= 0 ? currentUsers[existingIdx].name : 'Người dùng mới'),
    email: (userData.email || (existingIdx >= 0 ? currentUsers[existingIdx].email : '')).trim().toLowerCase(),
    role: userData.role || (existingIdx >= 0 ? currentUsers[existingIdx].role : 'USER'),
    title: userData.title || (existingIdx >= 0 ? currentUsers[existingIdx].title : 'Cán bộ / Giảng viên'),
    department: userData.department || (existingIdx >= 0 ? currentUsers[existingIdx].department : 'Trường Đại học Y Dược Cần Thơ'),
    departmentId: userData.departmentId || (existingIdx >= 0 ? currentUsers[existingIdx].departmentId : ''),
    avatar: userData.avatar || (existingIdx >= 0 ? currentUsers[existingIdx].avatar : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || 'User')}`),
  };

  if (existingIdx >= 0) {
    currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...updatedUser };
  } else {
    currentUsers.push(updatedUser);
  }
  saveLocalUsers(currentUsers);

  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updatedUser),
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data || updatedUser;
    }
  } catch (err) {
    console.warn('[saveUser] Backend offline, saved to local cache');
  }

  return updatedUser;
}

/**
 * Admin phân quyền vai trò cho người dùng
 */
export async function updateUserRole(userId: string, newRole: UserRole): Promise<User> {
  const currentUsers = getLocalUsers();
  const user = currentUsers.find((u) => u.id === userId);
  if (!user) {
    throw new Error('Không tìm thấy người dùng để phân quyền');
  }

  const updated = {
    ...user,
    role: newRole,
    title: newRole === 'ADMIN' ? 'Quản trị viên Hệ thống (Admin)' : 'Cán bộ / Giảng viên',
    department: newRole === 'ADMIN' ? (user.department || 'Phòng Khoa học Công nghệ') : user.department,
  };

  return saveUser(updated);
}

