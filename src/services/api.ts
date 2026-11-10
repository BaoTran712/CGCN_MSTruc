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

const DOSSIERS_STORAGE_KEY = 'ctump_dossiers_cache_v3';

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

    // Chuẩn hóa trường ngày tháng an toàn, không bao giờ để null hoặc Invalid Date
    const rawDate = d.submittedAt || d.submitted_at || d.createdAt || d.created_at;
    const isValid = rawDate && rawDate !== 'Invalid Date' && !isNaN(new Date(rawDate).getTime());
    const safeIso = isValid ? new Date(rawDate).toISOString() : new Date().toISOString();
    d.submittedAt = safeIso;
    d.submitted_at = safeIso;
    d.createdAt = d.createdAt && !isNaN(new Date(d.createdAt).getTime()) ? new Date(d.createdAt).toISOString() : safeIso;
    d.created_at = d.createdAt;

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
    // Xóa triệt để cache rác từ các phiên bản test trước
    localStorage.removeItem('ctump_dossiers_cache');
    localStorage.removeItem('ctump_dossiers_cache_v1');
    localStorage.removeItem('ctump_dossiers_cache_v2');
    const raw = localStorage.getItem(DOSSIERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(
          (d) =>
            d &&
            d.id !== 'dos-2026-0001' &&
            !d.id?.startsWith('dos-test-') &&
            d.review_notes !== 'sai tên'
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
        formData1a: payload?.formData1a || (payload as any)?.form_data_1a,
        formData2a: payload?.formData2a || (payload as any)?.form_data_2a,
        status_1a: payload?.status_1a || 'PENDING',
        status_2a: payload?.status_2a || 'PENDING',
        ten_de_tai: payload?.ten_de_tai || (payload?.formData as any)?.ten_de_tai,
        truong_don_vi: payload?.truong_don_vi || (payload?.formData as any)?.truong_don_vi,
        signature_config: payload?.signature_config || payload?.signatureConfig,
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
    form_data: payload?.formData || {},
    formData1a: payload?.formData1a || (payload as any)?.form_data_1a,
    formData2a: payload?.formData2a || (payload as any)?.form_data_2a,
    form_data_1a: payload?.formData1a || (payload as any)?.form_data_1a,
    form_data_2a: payload?.formData2a || (payload as any)?.form_data_2a,
    status_1a: payload?.status_1a || 'PENDING',
    status_2a: payload?.status_2a || 'PENDING',
    ten_de_tai: payload?.ten_de_tai || (payload?.formData as any)?.ten_de_tai,
    truong_don_vi: payload?.truong_don_vi || (payload?.formData as any)?.truong_don_vi,
    signature_config: payload?.signature_config || payload?.signatureConfig,
    signatureConfig: payload?.signature_config || payload?.signatureConfig,
    timeline: payload?.timeline,
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
    Boolean(payload?.current_version && payload.current_version > 1) ||
    Boolean(payload?.currentVersion && payload.currentVersion > 1) ||
    Boolean(id && !id.startsWith('hs-') && !id.startsWith('dos-temp-'));

  if (!isEditingExisting) {
    return createApplication(payload || {}, actor);
  }
  return resubmitApplication(id, payload?.formData || (payload as any)?.form_data || {}, actor, payload);
}

// BƯỚC 2B.1 [LUỒNG FALSE - NỘP LẠI ĐỘC LẬP BIỂU MẪU 1A]:
// Chỉ cập nhật dữ liệu của Biểu mẫu 1a, giữ nguyên 100% dữ liệu và trạng thái của Biểu mẫu 2a
export async function resubmitForm1a(
  id: string,
  formData1a: Record<string, any>,
  user?: User,
  extra?: Partial<Application>
): Promise<Application> {
  try {
    const updated = await request<Application>(API_ENDPOINTS.RESUBMIT_1A(id), {
      method: 'PATCH',
      body: JSON.stringify({
        formData1a,
        form_data_1a: formData1a,
        ten_de_tai: extra?.ten_de_tai || formData1a?.ten_de_tai,
        truong_don_vi: extra?.truong_don_vi || formData1a?.truong_don_vi,
        target_form: '1a',
        user,
      }),
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
  if (!existing) {
    throw new Error('Không tìm thấy hồ sơ để nộp lại Biểu mẫu 1a');
  }

  const prevVer = Number(existing.current_version || existing.currentVersion || 1);
  const nextVer = prevVer + 1;

  // Chỉ cập nhật dữ liệu 1a, bảo toàn nguyên vẹn 100% dữ liệu 2a và trạng thái 2a
  const updatedFormData1a = {
    ...(existing.formData1a || existing.form_data_1a || {}),
    ...(formData1a || {}),
  };
  const preservedFormData2a = existing.formData2a || existing.form_data_2a || {};
  const preservedStatus2a =
    existing.status_2a === 'APPROVED' ? 'APPROVED' : 'PENDING';

  const mergedFormData = {
    ...(existing.formData || existing.form_data || {}),
    ...preservedFormData2a,
    ...updatedFormData1a,
  };

  const topicTitle =
    extra?.ten_de_tai ||
    updatedFormData1a.ten_de_tai ||
    existing.ten_de_tai ||
    'Hồ sơ chuyển giao tri thức và công nghệ';

  const updated: Application = {
    ...existing,
    title: `Bộ hồ sơ kép CGCN: “${topicTitle}” (Mẫu 1a & 2a)`,
    ten_de_tai: extra?.ten_de_tai || updatedFormData1a.ten_de_tai || existing.ten_de_tai,
    truong_don_vi: extra?.truong_don_vi || updatedFormData1a.truong_don_vi || existing.truong_don_vi,
    formData: mergedFormData,
    form_data: mergedFormData,
    formData1a: updatedFormData1a,
    form_data_1a: updatedFormData1a,
    formData2a: preservedFormData2a,
    form_data_2a: preservedFormData2a,
    status: 'SUBMITTED',
    status_1a: 'PENDING',
    status_2a: preservedStatus2a,
    rejected_target: null,
    rejectedTarget: null,
    target_form: null,
    rejection_reason_1a: null,
    rejectionReason1a: null,
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

// BƯỚC 2B [LUỒNG FALSE]: Thầy/Cô Chỉnh sửa & Nộp lại (v2, v3... -> SUBMITTED)
export async function resubmitApplication(
  id: string,
  formData: Record<string, any>,
  user?: User,
  fullPayload?: Partial<Application>
): Promise<Application> {
  const local = getLocalDossiers();
  const existing = local.find(
    (d) => d.id === id || d.code === id || (id && id.includes(d.code))
  );

  const isOnly1aReturn =
    fullPayload?.target_form === '1a' ||
    fullPayload?.rejected_target === '1a' ||
    existing?.rejected_target === '1a' ||
    (existing?.status_1a === 'RETURNED' && existing?.status_2a !== 'RETURNED');

  if (isOnly1aReturn) {
    const payload1a =
      fullPayload?.formData1a ||
      (fullPayload as any)?.form_data_1a ||
      formData;
    return resubmitForm1a(id, payload1a, user, fullPayload);
  }

  try {
    const updated = await request<Application>(API_ENDPOINTS.RESUBMIT_APPLICATION(id), {
      method: 'PUT',
      body: JSON.stringify({
        formData,
        user,
        formData1a: fullPayload?.formData1a || (fullPayload as any)?.form_data_1a,
        formData2a: fullPayload?.formData2a || (fullPayload as any)?.form_data_2a,
        ten_de_tai: fullPayload?.ten_de_tai || (formData as any)?.ten_de_tai,
        truong_don_vi: fullPayload?.truong_don_vi || (formData as any)?.truong_don_vi,
        signature_config: fullPayload?.signature_config || fullPayload?.signatureConfig,
      }),
    });
    if (updated) {
      const latestLocal = getLocalDossiers();
      const filtered = latestLocal.filter(
        (d) => d.id !== updated.id && d.code !== updated.code && d.id !== id
      );
      saveLocalDossiers([updated, ...filtered]);
      return updated;
    }
  } catch {
    // fallback
  }

  if (existing) {
    const prevVer = Number(existing.current_version || existing.currentVersion || 1);
    const nextVer = prevVer + 1;
    const prevS1a = existing.status_1a || 'PENDING';
    const prevS2a = existing.status_2a || 'PENDING';
    const is1aReturned = prevS1a === 'RETURNED';
    const is2aReturned = prevS2a === 'RETURNED';
    const hasSpecificReturn = is1aReturned || is2aReturned;

    const is1aEditable = !hasSpecificReturn || is1aReturned;
    const is2aEditable = !hasSpecificReturn || is2aReturned;

    const nextFormData1a = is1aEditable
      ? (fullPayload?.formData1a || (fullPayload as any)?.form_data_1a || existing.formData1a || existing.form_data_1a)
      : (existing.formData1a || existing.form_data_1a);

    const nextFormData2a = is2aEditable
      ? (fullPayload?.formData2a || (fullPayload as any)?.form_data_2a || existing.formData2a || existing.form_data_2a)
      : (existing.formData2a || existing.form_data_2a);

    const nextS1a = prevS1a === 'RETURNED' ? 'PENDING' : prevS1a;
    const nextS2a = prevS2a === 'RETURNED' ? 'PENDING' : prevS2a;

    const updated: Application = {
      ...existing,
      ...(fullPayload || {}),
      formData: { ...existing.formData, ...formData },
      form_data: { ...existing.formData, ...formData },
      formData1a: nextFormData1a,
      formData2a: nextFormData2a,
      form_data_1a: nextFormData1a,
      form_data_2a: nextFormData2a,
      status: 'SUBMITTED',
      status_1a: nextS1a,
      status_2a: nextS2a,
      rejected_target: null,
      rejectedTarget: null,
      target_form: null,
      rejection_reason_1a: null,
      rejectionReason1a: null,
      rejection_reason_2a: null,
      rejectionReason2a: null,
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

  return createApplication({ formData, ...(fullPayload || {}) }, user);
}

// Cập nhật các trường hồ sơ (Cấu hình chữ ký, trạng thái duyệt từng phần status_1a, status_2a...)
export async function updateDossierFields(
  id: string,
  fields: Partial<Application>
): Promise<Application> {
  try {
    const res = await request<Application>(API_ENDPOINTS.GET_DOSSIER_DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    if (res && res.id) {
      const local = getLocalDossiers();
      const filtered = local.filter((d) => d.id !== res.id && d.code !== res.code && d.id !== id);
      saveLocalDossiers([res, ...filtered]);
      return res;
    }
  } catch {
    // fallback to localStorage
  }

  const local = getLocalDossiers();
  const existing = local.find((d) => d.id === id || d.code === id);
  if (!existing) {
    throw new Error('Không tìm thấy hồ sơ để cập nhật');
  }
  const updated: Application = {
    ...existing,
    ...fields,
  };
  saveLocalDossiers(local.map((d) => (d.id === existing.id ? updated : d)));
  return updated;
}

function getEffectiveAdminUser(adminUser?: User): User {
  if (adminUser && adminUser.email) return adminUser;
  try {
    const raw = localStorage.getItem('ctump_auth_user_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch {
    // ignore
  }
  return {
    id: 'usr-admin',
    name: 'Quản trị viên (Cô Admin)',
    email: 'tranthibaotran.2k@gmail.com',
    role: 'ADMIN',
    title: 'Quản trị viên Hệ thống',
    department: 'Phòng Khoa học Công nghệ',
  };
}

// BƯỚC 2A [LUỒNG FALSE] & BƯỚC 3 [LUỒNG TRUE]: Admin Duyệt (VALIDATED) hoặc Trả về sửa lỗi (RETURNED_FOR_REVISION)
export async function adminPrecheck(
  id: string,
  isValid: boolean,
  reviewNotes?: string,
  adminUser?: User,
  targetForm?: '1a' | '2a' | 'both'
): Promise<Application> {
  const resolvedAdmin = getEffectiveAdminUser(adminUser);
  const endpoint = isValid
    ? API_ENDPOINTS.APPROVE_APPLICATION_TRUE(id)
    : API_ENDPOINTS.RETURN_REVISION(id);

  const localBefore = getLocalDossiers();
  const targetBefore = localBefore.find((d) => d.id === id || d.code === id);
  const existingS1a = targetBefore?.status_1a === 'APPROVED' ? 'APPROVED' : 'PENDING';
  const existingS2a = targetBefore?.status_2a === 'APPROVED' ? 'APPROVED' : 'PENDING';

  const resolvedTargetForm: '1a' | '2a' | 'both' =
    targetForm ||
    (targetBefore?.status_1a === 'RETURNED' && targetBefore?.status_2a !== 'RETURNED'
      ? '1a'
      : targetBefore?.status_2a === 'RETURNED' && targetBefore?.status_1a !== 'RETURNED'
      ? '2a'
      : '1a');

  const reqStatus1a =
    resolvedTargetForm === '1a' || resolvedTargetForm === 'both'
      ? 'RETURNED'
      : existingS1a;
  const reqStatus2a =
    resolvedTargetForm === '2a' || resolvedTargetForm === 'both'
      ? 'RETURNED'
      : existingS2a;

  try {
    const res = await request<Application>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({
        isValid,
        reviewNotes,
        revisionNote: reviewNotes,
        rejection_reason: reviewNotes,
        target_form: isValid ? null : resolvedTargetForm,
        rejected_target: isValid ? null : resolvedTargetForm,
        status_1a: isValid ? 'APPROVED' : reqStatus1a,
        status_2a: isValid ? 'APPROVED' : reqStatus2a,
        adminUser: resolvedAdmin,
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

  const ver = Number(target.current_version || target.currentVersion || 1);
  let updated: Application;

  if (isValid) {
    // APPROVE MODE: Chốt Bản cứng chính thức (Official / Final Version)
    const officialSnapshot: any = {
      id: `ver-official-${Date.now()}`,
      dossierId: target.id,
      versionNumber: ver,
      formData: { ...(target.formData || {}) },
      signatureConfig: target.signature_config || (target as any).signatureConfig,
      editedById: adminUser?.id || 'admin',
      editedByName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      changeSummary: `Chốt Bản cứng chính thức v${ver} (Đã duyệt thể thức)`,
      createdAt: new Date().toISOString(),
      isOfficial: true,
      status: 'VALIDATED',
    };

    const existingVersions = (target.versions || []).filter((v: any) => v.versionNumber !== ver);

    updated = {
      ...target,
      status: 'VALIDATED',
      status_1a: 'APPROVED',
      status_2a: 'APPROVED',
      rejected_target: null,
      rejectedTarget: null,
      target_form: null,
      rejection_reason_1a: null,
      rejectionReason1a: null,
      rejection_reason_2a: null,
      rejectionReason2a: null,
      version_type: 'OFFICIAL',
      is_official_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      official_version: ver,
      review_notes: reviewNotes || 'Hồ sơ đã được duyệt hợp lệ.',
      reviewNotes: reviewNotes || 'Hồ sơ đã được duyệt hợp lệ.',
      reviewedAt: new Date().toISOString(),
      approved_pdf_path: `/uploads/pdf/${target.code}-v${ver}.pdf`,
      versions: [...existingVersions, officialSnapshot],
    };
  } else {
    // XỬ LÝ ROLLBACK / SAI SÓT: Nhân bản bản cứng hiện tại ra thành một Bản nháp mới (v+1) để tiếp tục lưu đè
    const nextVer = ver + 1;
    const archivedSnapshot: any = {
      id: `ver-archived-${Date.now()}`,
      dossierId: target.id,
      versionNumber: ver,
      formData: { ...(target.formData || {}) },
      signatureConfig: target.signature_config || (target as any).signatureConfig,
      editedById: adminUser?.id || 'admin',
      editedByName: adminUser?.name || 'Cô Admin (Phòng KH&CN)',
      changeSummary: `Bản cứng lưu vết v${ver} (Trước khi yêu cầu sửa lỗi: "${reviewNotes || ''}")`,
      createdAt: new Date().toISOString(),
      isOfficial: true,
      status: target.status,
    };

    const existingVersions = (target.versions || []).filter((v: any) => v.versionNumber !== ver);

    updated = {
      ...target,
      current_version: nextVer,
      currentVersion: nextVer,
      version_type: 'DRAFT',
      is_official_locked: false,
      status: 'RETURNED_FOR_REVISION',
      status_1a: reqStatus1a,
      status_2a: reqStatus2a,
      rejected_target: resolvedTargetForm,
      rejectedTarget: resolvedTargetForm,
      target_form: resolvedTargetForm,
      rejection_reason_1a:
        resolvedTargetForm === '1a' || resolvedTargetForm === 'both'
          ? reviewNotes || 'Trả về sửa lỗi Biểu mẫu 1a.'
          : null,
      rejectionReason1a:
        resolvedTargetForm === '1a' || resolvedTargetForm === 'both'
          ? reviewNotes || 'Trả về sửa lỗi Biểu mẫu 1a.'
          : null,
      rejection_reason_2a:
        resolvedTargetForm === '2a' || resolvedTargetForm === 'both'
          ? reviewNotes || 'Trả về sửa lỗi Biểu mẫu 2a.'
          : null,
      rejectionReason2a:
        resolvedTargetForm === '2a' || resolvedTargetForm === 'both'
          ? reviewNotes || 'Trả về sửa lỗi Biểu mẫu 2a.'
          : null,
      revision_note: reviewNotes,
      revisionNote: reviewNotes,
      revision_reason: reviewNotes,
      revisionReason: reviewNotes,
      reviewNotes: reviewNotes || 'Trả về sửa lỗi.',
      review_notes: reviewNotes || 'Trả về sửa lỗi.',
      reviewedAt: new Date().toISOString(),
      versions: [...existingVersions, archivedSnapshot],
    };
  }

  saveLocalDossiers(local.map((d) => (d.id === target.id ? updated : d)));
  return updated;
}

// Rollback / Phục hồi hồ sơ về bản cứng trước đó
export async function rollbackDossierVersion(
  id: string,
  targetVersionNumber: number,
  user?: User
): Promise<Application> {
  const local = getLocalDossiers();
  const target = local.find((d) => d.id === id || d.code === id);
  if (!target) throw new Error('Không tìm thấy hồ sơ');

  const snapshot = (target.versions || []).find((v: any) => v.versionNumber === targetVersionNumber);
  if (!snapshot) {
    throw new Error(`Không tìm thấy bản lưu trữ v${targetVersionNumber}`);
  }

  const updated: Application = {
    ...target,
    formData: { ...snapshot.formData },
    form_data: { ...snapshot.formData },
    signature_config: snapshot.signatureConfig || target.signature_config,
    signatureConfig: snapshot.signatureConfig || target.signatureConfig,
    version_type: 'DRAFT',
    is_official_locked: false,
    timeline: [
      ...(target.timeline || []),
      {
        id: `tl-${Date.now()}`,
        title: `Rollback phục hồi dữ liệu từ bản cứng v${targetVersionNumber}`,
        actor: user?.name || 'Admin',
        role: user?.title || 'Quản trị viên',
        timestamp: new Date().toLocaleString('vi-VN'),
        status: target.status,
      },
    ],
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
  const resolvedAdmin = getEffectiveAdminUser(adminUser);
  try {
    const res = await request<Application>(API_ENDPOINTS.SUBMIT_TO_RECTOR(id), {
      method: 'PATCH',
      body: JSON.stringify({ ...flags, adminUser: resolvedAdmin }),
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
  const resolvedAdmin = getEffectiveAdminUser(adminUser);
  try {
    const res = await request<Application>(API_ENDPOINTS.CONFIRM_SIGNED(id), {
      method: 'PATCH',
      body: JSON.stringify({ decisionNumber, decisionDate, finalPdfUrl, adminUser: resolvedAdmin }),
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
  const isAdmin =
    cleanEmail === 'tranthibaotran.2k@gmail.com' ||
    cleanEmail === 'toanhkhai@gmail.com' ||
    cleanEmail === 'toanhkhai12345@gmail.com' ||
    cleanEmail === 'admin@ctump.edu.vn';

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
