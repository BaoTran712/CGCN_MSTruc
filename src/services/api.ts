/**
 * CTUMP DocuGov API Service Client
 * Hỗ trợ đầy đủ 6 trạng thái True Flow + False Flow & Đồng bộ Tài liệu (Single Source of Truth)
 */

import {
  DocumentTemplate,
  Application,
  ApplicationHistory,
  User,
  Notification as NotificationItem,
} from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import { OFFICIAL_TEMPLATES, AUTH_TOKEN_KEY } from '../constants';

export { API_BASE_URL };

const DOSSIERS_STORAGE_KEY = 'ctump_dossiers_cache_v2';

const DEFAULT_MOCK_USER: User = {
  id: 'usr-giangvien-demo',
  name: 'Thầy / Cô (Cán bộ - Giảng viên)',
  title: 'Giảng viên',
  email: 'thayco.giangvien@ctump.edu.vn',
  role: 'USER',
  department: 'Khoa Y',
};

function deduplicateDossiers(list: Application[]): Application[] {
  const map = new Map<string, Application>();
  for (const d of list) {
    if (!d || !d.code) continue;
    if (d.id === 'dos-2026-0001' || d.review_notes === 'sai tên') continue;
    const existing = map.get(d.code);
    if (!existing) {
      map.set(d.code, d);
    } else {
      const verCurrent = Number(d.current_version || d.currentVersion || 1);
      const verExisting = Number(existing.current_version || existing.currentVersion || 1);
      if (verCurrent >= verExisting) {
        map.set(d.code, d);
      }
    }
  }
  return Array.from(map.values());
}

function getLocalDossiers(): Application[] {
  try {
    // Xóa cache rác phiên bản cũ
    localStorage.removeItem('ctump_dossiers_cache');
    const raw = localStorage.getItem(DOSSIERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (d) => d && d.id !== 'dos-2026-0001' && d.review_notes !== 'sai tên'
        );
        return deduplicateDossiers(cleaned);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalDossiers(dossiers: Application[]): void {
  try {
    const deduped = deduplicateDossiers(dossiers);
    localStorage.setItem(DOSSIERS_STORAGE_KEY, JSON.stringify(deduped));
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
    // ignore
  }
};

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        // ignore
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
    throw err;
  }
}

export interface BackendHealthStatus {
  online: boolean;
  message?: string;
  databaseConnected?: boolean;
}

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
          fields: item.fields && item.fields.length > 0 ? item.fields : fallback?.fields || [],
          sections: item.sections && item.sections.length > 0 ? item.sections : fallback?.sections || [],
        };
      });
    }
    return OFFICIAL_TEMPLATES;
  } catch {
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
        fields: found.fields && found.fields.length > 0 ? found.fields : fallback?.fields || [],
        sections: found.sections && found.sections.length > 0 ? found.sections : fallback?.sections || [],
      };
    }
  } catch {
    // ignore
  }
  return OFFICIAL_TEMPLATES.find((t) => t.id === id || t.code === id) || null;
}

// =========================================================================
// 2. Hồ sơ CGCN (True Flow + False Flow - 6 trạng thái)
// =========================================================================

export async function getAllApplications(): Promise<Application[]> {
  try {
    const apps = await request<Application[]>(API_ENDPOINTS.GET_ALL_DOSSIERS, { method: 'GET' });
    if (Array.isArray(apps)) {
      const hasLegacyGarbage = apps.some(
        (d) =>
          d.id === 'dos-2026-0001' ||
          d.id?.startsWith('dos-test-') ||
          (d.review_notes && d.review_notes.trim().toLowerCase() === 'sai tên')
      );
      if (hasLegacyGarbage) {
        request(API_ENDPOINTS.CLEANUP_GARBAGE, { method: 'POST' }).catch(() => {});
      }
      const cleaned = apps.filter(
        (d) =>
          d &&
          d.id !== 'dos-2026-0001' &&
          !d.id?.startsWith('dos-test-') &&
          (!d.review_notes || d.review_notes.trim().toLowerCase() !== 'sai tên')
      );
      saveLocalDossiers(cleaned);
      return cleaned;
    }
  } catch {
    // fallback localStorage
  }
  return getLocalDossiers();
}

export async function getApplicationById(id: string): Promise<Application | null> {
  try {
    const found = await request<Application | null>(API_ENDPOINTS.GET_DOSSIER_DETAIL(id), { method: 'GET' });
    if (found) return found;
  } catch {
    // fallback localStorage
  }
  const local = getLocalDossiers();
  return local.find((d) => d.id === id || d.code === id) || null;
}

// BƯỚC 1: Gửi đơn mới (SUBMITTED - v1)
export async function createApplication(payload: Partial<Application>, creator?: User): Promise<Application> {
  const chosenTemplateId = payload?.templateId || 'tmpl-cgcn-1a';
  const matchedTemplate = OFFICIAL_TEMPLATES.find((t) => t.id === chosenTemplateId || t.code === chosenTemplateId || t.code === payload?.templateCode);
  const effectiveTemplateCode = matchedTemplate?.code || payload?.templateCode || (chosenTemplateId.includes('2a') ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN');
  const effectiveTemplateTitle = matchedTemplate?.title || payload?.templateTitle || 'Hồ sơ Chuyển giao Công nghệ';

  try {
    const created = await request<Application>(API_ENDPOINTS.CREATE_DOSSIER, {
      method: 'POST',
      body: JSON.stringify({
        templateId: chosenTemplateId,
        templateTitle: effectiveTemplateTitle,
        templateCode: effectiveTemplateCode,
        formData: payload?.formData || {},
        user: creator || payload?.createdBy,
        status: 'SUBMITTED',
      }),
    });
    if (created) {
      const local = getLocalDossiers();
      saveLocalDossiers([created, ...local.filter((d) => d.id !== created.id)]);
      return created;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const nextNum = String(local.length + 1).padStart(4, '0');
  const newCode = `CGCN-2026-${nextNum}`;
  const newApp: Application = {
    id: `dos-2026-${nextNum}`,
    code: newCode,
    title: payload?.title || effectiveTemplateTitle,
    templateId: chosenTemplateId,
    templateCode: effectiveTemplateCode,
    templateTitle: effectiveTemplateTitle,
    status: 'SUBMITTED',
    current_version: 1,
    currentVersion: 1,
    departmentName: creator?.department || 'Khoa Y',
    createdBy: creator || payload?.createdBy || DEFAULT_MOCK_USER,
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    formData: payload?.formData || {},
    generated_docx_path: `/uploads/docx/${newCode}-v1.docx`,
    generated_pdf_path: `/uploads/pdf/${newCode}-v1.pdf`,
    docx_file_url: `/uploads/docx/${newCode}-v1.docx`,
  };
  saveLocalDossiers([newApp, ...local]);
  return newApp;
}

export async function saveApplicationDraft(id: string, payload: Partial<Application>, actor?: User): Promise<Application> {
  return submitApplication(id, payload, actor);
}

// BƯỚC 1 hoặc BƯỚC 2B: Nộp mới hoặc Nộp lại
export async function submitApplication(id: string, payload?: Partial<Application>, actor?: User): Promise<Application> {
  const local = getLocalDossiers();
  const existsLocally = Boolean(
    id && local.some((d) => d.id === id || d.code === id || (payload?.code && d.code === payload.code))
  );
  const isEditingExisting =
    existsLocally ||
    Boolean(payload?.current_version && payload.current_version >= 1) ||
    Boolean(payload?.currentVersion && payload.currentVersion >= 1) ||
    Boolean(id && !id.startsWith('hs-') && !id.startsWith('dos-temp-'));

  if (!isEditingExisting) {
    return createApplication(payload || {}, actor);
  }
  return resubmitApplication(id, payload?.formData || (payload as any)?.form_data || {}, actor);
}

// BƯỚC 2B [LUỒNG FALSE]: Thầy/Cô Chỉnh sửa & Nộp lại (v2, v3... -> SUBMITTED)
export async function resubmitApplication(
  id: string,
  formData: Record<string, any>,
  user?: User
): Promise<Application> {
  try {
    const updated = await request<Application>(API_ENDPOINTS.RESUBMIT_APPLICATION(id), {
      method: 'PUT',
      body: JSON.stringify({ formData, user }),
    });
    if (updated) {
      const local = getLocalDossiers();
      const filtered = local.filter(
        (d) => d.id !== updated.id && d.code !== updated.code && d.id !== id
      );
      saveLocalDossiers([updated, ...filtered]);
      return updated;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const existing = local.find(
    (d) => d.id === id || d.code === id || (id && id.includes(d.code))
  );
  if (existing) {
    const prevVer = Number(existing.current_version || existing.currentVersion || 1);
    const nextVer = prevVer + 1;
    const updated: Application = {
      ...existing,
      formData: { ...existing.formData, ...formData },
      form_data: { ...existing.formData, ...formData },
      status: 'SUBMITTED',
      current_version: nextVer,
      currentVersion: nextVer,
      generated_docx_path: `/uploads/docx/${existing.code}-v${nextVer}.docx`,
      generated_pdf_path: `/uploads/pdf/${existing.code}-v${nextVer}.pdf`,
      docx_file_url: `/uploads/docx/${existing.code}-v${nextVer}.docx`,
      submittedAt: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    };
    const filtered = local.filter(
      (d) => d.id !== existing.id && d.code !== existing.code && d.id !== id
    );
    saveLocalDossiers([updated, ...filtered]);
    return updated;
  }

  return createApplication({ formData }, user);
}

// BƯỚC 2A [LUỒNG FALSE] & BƯỚC 3 [LUỒNG TRUE]: Admin Duyệt (VALIDATED) hoặc Trả về sửa lỗi (RETURNED_FOR_REVISION)
export async function adminPrecheck(
  id: string,
  isValid: boolean,
  reviewNotes?: string,
  adminUser?: User
): Promise<Application> {
  const endpoint = isValid
    ? API_ENDPOINTS.APPROVE_APPLICATION_TRUE(id)
    : API_ENDPOINTS.RETURN_REVISION(id);

  try {
    const res = await request<Application>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        isValid,
        reviewNotes,
        revisionNote: reviewNotes,
        adminUser,
      }),
    });
    if (res && res.id) {
      const local = getLocalDossiers();
      saveLocalDossiers(local.map((d) => (d.id === res.id || d.id === id ? res : d)));
      return res;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ');

  const ver = target.current_version || 1;
  const updated: Application = {
    ...target,
    status: isValid ? 'VALIDATED' : 'RETURNED_FOR_REVISION',
    revision_note: isValid ? undefined : reviewNotes,
    revisionNote: isValid ? undefined : reviewNotes,
    reviewNotes: reviewNotes || (isValid ? 'Hồ sơ đã được duyệt hợp lệ.' : 'Trả về sửa lỗi.'),
    review_notes: reviewNotes || (isValid ? 'Hồ sơ đã được duyệt hợp lệ.' : 'Trả về sửa lỗi.'),
    reviewedAt: new Date().toISOString(),
    approved_pdf_path: isValid ? `/uploads/pdf/${target.code}-v${ver}.pdf` : undefined,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// BƯỚC 4: Thầy/Cô Upload bản ký phòng ban (PENDING_SIGNED_REVIEW - Chờ duyệt)
export async function uploadFacultySignature(
  id: string,
  facultySignedPdfUrl?: string,
  evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
  user?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.REUPLOAD_SIGNED(id), {
      method: 'POST',
      body: JSON.stringify({ facultySignedPdfUrl, evidenceFiles, user }),
    });
    if (res) {
      const local = getLocalDossiers();
      saveLocalDossiers(local.map((d) => (d.id === res.id || d.id === id ? res : d)));
      return res;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ để nộp bản ký phòng ban');

  const updated: Application = {
    ...target,
    status: 'PENDING_SIGNED_REVIEW',
    faculty_signed_pdf_url: facultySignedPdfUrl || `/uploads/signed/${target.code}-department-signed.pdf`,
    evidenceFiles: evidenceFiles || target.evidenceFiles,
    department_signed_files: evidenceFiles || [],
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// BƯỚC 5: Admin Chuyển Trình ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE - Chờ ký Hiệu trưởng)
export async function updateSchoolSigning(
  id: string,
  flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean; note?: string },
  adminUser?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.SUBMIT_TO_RECTOR(id), {
      method: 'PATCH',
      body: JSON.stringify({ ...flags, adminUser }),
    });
    if (res) {
      const local = getLocalDossiers();
      saveLocalDossiers(local.map((d) => (d.id === res.id || d.id === id ? res : d)));
      return res;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ');

  const updated: Application = {
    ...target,
    status: 'WAITING_RECTOR_SIGNATURE',
    khcnSigned: true,
    khcn_signed: true,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// BƯỚC 6: Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED - Đã ký và lưu trữ)
export async function completeDossier(
  id: string,
  decisionNumber?: string,
  decisionDate?: string,
  finalPdfUrl?: string,
  adminUser?: User
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.CONFIRM_SIGNED(id), {
      method: 'PATCH',
      body: JSON.stringify({ decisionNumber, decisionDate, finalPdfUrl, adminUser }),
    });
    if (res) {
      const local = getLocalDossiers();
      saveLocalDossiers(local.map((d) => (d.id === res.id || d.id === id ? res : d)));
      return res;
    }
  } catch {
    // fallback
  }

  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ');

  const ver = target.current_version || 1;
  const updated: Application = {
    ...target,
    status: 'SIGNED_ARCHIVED',
    decisionNumber: decisionNumber || `${target.code}/QĐ-ĐHYDCT`,
    decision_number: decisionNumber || `${target.code}/QĐ-ĐHYDCT`,
    decisionDate: decisionDate || new Date().toISOString().slice(0, 10),
    decision_date: decisionDate || new Date().toISOString().slice(0, 10),
    final_signed_pdf_path: finalPdfUrl || `/uploads/pdf/${target.code}-signed-v${ver}.pdf`,
    final_pdf_url: finalPdfUrl || `/uploads/pdf/${target.code}-signed-v${ver}.pdf`,
    completedAt: new Date().toISOString(),
    khcnSigned: true,
    bghSigned: true,
  };
  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// =========================================================================
// 3. Người dùng & Xác thực (users)
// =========================================================================

export async function login(
  email: string,
  extraData?: { name?: string; avatar?: string; googleId?: string }
): Promise<User> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const isAdmin = cleanEmail === 'toanhkhai12345@gmail.com' || cleanEmail === 'admin@ctump.edu.vn';

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
  } catch {
    const fallbackToken = isAdmin ? 'dev-token-admin' : 'dev-token-user';
    setAuthToken(fallbackToken);

    const username = cleanEmail.split('@')[0];
    const formattedName =
      extraData?.name ||
      (isAdmin
        ? 'Quản trị viên (Cô Admin)'
        : username
            .split(/[._-]/)
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ') || 'Giảng viên CTUMP');

    return {
      id: `usr-${username}`,
      name: formattedName,
      email: cleanEmail,
      role: isAdmin ? 'ADMIN' : 'USER',
      title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
      department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Khoa Y',
      avatar: extraData?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${cleanEmail}`,
      token: fallbackToken,
    };
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const list = await request<User[]>(API_ENDPOINTS.GET_USERS, { method: 'GET' });
    if (Array.isArray(list)) return list;
  } catch {
    // ignore
  }
  return [];
}

// =========================================================================
// 4. Nhật ký Audit Trail & Email Logs
// =========================================================================

export async function getAuditLogs(dossierId?: string): Promise<any[]> {
  const url = dossierId ? `${API_ENDPOINTS.GET_AUDIT_LOGS}?dossierId=${dossierId}` : API_ENDPOINTS.GET_AUDIT_LOGS;
  try {
    const logs = await request<any[]>(url, { method: 'GET' });
    if (Array.isArray(logs)) return logs;
  } catch {
    // ignore
  }
  return [];
}

export async function getEmailLogs(dossierId?: string): Promise<any[]> {
  const url = dossierId ? `${API_ENDPOINTS.GET_EMAIL_LOGS}?dossierId=${dossierId}` : API_ENDPOINTS.GET_EMAIL_LOGS;
  try {
    const logs = await request<any[]>(url, { method: 'GET' });
    if (Array.isArray(logs)) return logs;
  } catch {
    // ignore
  }
  return [];
}

export async function approveApplication(id: string, note?: string, reviewer?: string | User): Promise<Application> {
  const user = typeof reviewer === 'object' ? reviewer : undefined;
  return adminPrecheck(id, true, note, user);
}

export async function returnApplication(id: string, returnReason: string, manager?: User): Promise<Application> {
  return adminPrecheck(id, false, returnReason, manager);
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
    status: (log.toStatus || 'SUBMITTED') as any,
    action: log.action,
    fromStatus: log.fromStatus,
    toStatus: log.toStatus,
    performedAt: log.createdAt,
    comments: log.notes,
    comment: log.notes,
    description: log.notes,
  }));
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const logs = await getEmailLogs();
    return logs.map((log, idx) => ({
      id: `notif-${log.id || idx}`,
      userId,
      dossierId: log.dossier_id || log.dossierId || '',
      dossierCode: log.dossier_code || '',
      title: log.subject || 'Thông báo hệ thống',
      message: log.stepName || log.step_name || 'Thông báo cập nhật trạng thái hồ sơ',
      type: 'INFO' as const,
      isRead: false,
      createdAt: log.sent_at || log.sentAt || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(_id: string): Promise<void> {
  // No-op helper
}
