/**
 * DocuGov API Service Layer
 *
 * Provides dedicated functions for all 15 workflow operations.
 * Designed to connect seamlessly with real n8n webhook backend nodes
 * while providing an instant, robust in-memory mock fallback.
 */

import {
  DocumentTemplate,
  Application,
  ApplicationHistory,
  GeneratedDocument,
  GoogleSheetRow,
  User,
  Department,
  Notification as NotificationItem,
} from '../types';
import {
  API_ENDPOINTS,
  API_TIMEOUT_MS,
  isMockMode,
} from '../config/api.config';
import { mockBackend } from './mockRepository';

/**
 * Generic fetch wrapper with timeout and automatic mock fallback
 */
async function fetchWithFallback<T>(
  url: string,
  options: RequestInit,
  mockFallbackFn: () => T | Promise<T>
): Promise<T> {
  if (isMockMode()) {
    return Promise.resolve(mockFallbackFn());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

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
      console.warn(`[DocuGov API] n8n responded with status ${response.status} at ${url}. Falling back to mock data.`);
      return Promise.resolve(mockFallbackFn());
    }

    const data = await response.json();
    return data as T;
  } catch (err) {
    clearTimeout(timeoutId);
    console.info(`[DocuGov API] n8n endpoint not reachable at ${url} (${err}). Using mock fallback.`);
    return Promise.resolve(mockFallbackFn());
  }
}

// 1. Get document templates
export async function getTemplates(): Promise<DocumentTemplate[]> {
  return fetchWithFallback<DocumentTemplate[]>(
    API_ENDPOINTS.GET_TEMPLATES,
    { method: 'GET' },
    () => mockBackend.getTemplates()
  );
}

// 2. Get template details
export async function getTemplateById(id: string): Promise<DocumentTemplate | null> {
  return fetchWithFallback<DocumentTemplate | null>(
    API_ENDPOINTS.GET_TEMPLATE_DETAIL(id),
    { method: 'GET' },
    () => mockBackend.getTemplateById(id)
  );
}

// 3. Create a new application
export async function createApplication(payload: Partial<Application>, creator?: User): Promise<Application> {
  return fetchWithFallback<Application>(
    API_ENDPOINTS.CREATE_APPLICATION,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => mockBackend.createApplication(payload, creator)
  );
}

// 4. Save application draft
export async function saveApplicationDraft(id: string, payload: Partial<Application>, actor?: User): Promise<Application> {
  return fetchWithFallback<Application>(
    API_ENDPOINTS.SAVE_DRAFT(id),
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    () => mockBackend.saveDraft(id, payload, actor)
  );
}

// 5. Submit application
export async function submitApplication(id: string, payload?: Partial<Application>, actor?: User): Promise<Application> {
  return fetchWithFallback<Application>(
    API_ENDPOINTS.SUBMIT_APPLICATION(id),
    {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    },
    () => mockBackend.submitApplication(id, payload, actor)
  );
}

// 6. Get user's applications
export async function getMyApplications(userId?: string): Promise<Application[]> {
  const url = userId
    ? `${API_ENDPOINTS.GET_MY_APPLICATIONS}?userId=${encodeURIComponent(userId)}`
    : API_ENDPOINTS.GET_MY_APPLICATIONS;

  return fetchWithFallback<Application[]>(
    url,
    { method: 'GET' },
    () => mockBackend.getMyApplications(userId)
  );
}

// 7. Get applications waiting for manager approval
export async function getPendingApplications(): Promise<Application[]> {
  return fetchWithFallback<Application[]>(
    API_ENDPOINTS.GET_PENDING_APPLICATIONS,
    { method: 'GET' },
    () => mockBackend.getPendingApplications()
  );
}

// 8. Get application details
export async function getApplicationById(id: string): Promise<Application | null> {
  return fetchWithFallback<Application | null>(
    API_ENDPOINTS.GET_APPLICATION_DETAIL(id),
    { method: 'GET' },
    () => mockBackend.getApplicationById(id)
  );
}

// 9. Request application revision (legacy alias)
export async function requestApplicationRevision(
  id: string,
  comment: string,
  reviewerName?: string
): Promise<Application> {
  return fetchWithFallback<Application>(
    API_ENDPOINTS.REQUEST_REVISION(id),
    {
      method: 'POST',
      body: JSON.stringify({ comment, reviewerName }),
    },
    () => mockBackend.returnApplication(id, comment)
  );
}

// 10. Approve application
export async function approveApplication(
  id: string,
  note?: string,
  reviewer?: string | User
): Promise<Application> {
  const managerObj = typeof reviewer === 'object' ? reviewer : undefined;
  return fetchWithFallback<Application>(
    API_ENDPOINTS.APPROVE_APPLICATION(id),
    {
      method: 'POST',
      body: JSON.stringify({ note, reviewerName: typeof reviewer === 'string' ? reviewer : reviewer?.name }),
    },
    () => mockBackend.approveApplication(id, note, managerObj)
  );
}

// 11. Move application to signing (legacy alias)
export async function moveApplicationToSigning(
  id: string,
  reviewerName?: string
): Promise<{ application: Application; sheetSyncResult: GoogleSheetRow }> {
  return fetchWithFallback<{ application: Application; sheetSyncResult: GoogleSheetRow }>(
    API_ENDPOINTS.MOVE_TO_SIGNING(id),
    {
      method: 'POST',
      body: JSON.stringify({ reviewerName }),
    },
    () => mockBackend.completeDossierBySecretary(id, `drive_stamped_${Date.now()}`)
  );
}

// 12. Generate document
export async function generateDocument(
  id: string,
  format: 'docx' | 'pdf' = 'docx'
): Promise<GeneratedDocument> {
  return fetchWithFallback<GeneratedDocument>(
    API_ENDPOINTS.GENERATE_DOCUMENT(id),
    {
      method: 'POST',
      body: JSON.stringify({ format }),
    },
    () => mockBackend.generateDocument(id, format)
  );
}

// 13. Get generated document
export async function getGeneratedDocument(id: string): Promise<GeneratedDocument> {
  return fetchWithFallback<GeneratedDocument>(
    API_ENDPOINTS.GET_DOCUMENT(id),
    { method: 'GET' },
    () => mockBackend.generateDocument(id, 'docx')
  );
}

// 14. Get processing history
export async function getApplicationHistory(id: string): Promise<ApplicationHistory[]> {
  return fetchWithFallback<ApplicationHistory[]>(
    API_ENDPOINTS.GET_HISTORY(id),
    { method: 'GET' },
    () => mockBackend.getHistory(id)
  );
}

// 15. Send application data to Google Sheets
export async function syncApplicationToSheet(
  id: string,
  data?: Partial<GoogleSheetRow>
): Promise<GoogleSheetRow> {
  return fetchWithFallback<GoogleSheetRow>(
    API_ENDPOINTS.SYNC_GOOGLE_SHEET(id),
    {
      method: 'POST',
      body: JSON.stringify(data || {}),
    },
    () => {
      const app = mockBackend.getApplicationById(id);
      const todayDate = new Date().toISOString().slice(0, 10);
      const row: GoogleSheetRow = {
        dossierCode: app ? app.code : id,
        templateTitle: app ? app.templateTitle : 'Biểu mẫu',
        creatorName: app ? app.createdBy.name : 'Người dùng',
        department: app ? app.createdBy.department : 'Đơn vị',
        createdAt: app?.createdAt?.slice(0, 10) || todayDate,
        submittedAt: app?.submittedAt?.slice(0, 10) || todayDate,
        approvedAt: app?.approvedAt?.slice(0, 10) || todayDate,
        status: app?.status === 'for_signature' ? 'Trình ký' : (app?.status || 'Trình ký'),
        reviewerName: app?.assignedManager?.name || 'Người quản lý',
        updatedAt: `${todayDate} ${new Date().toLocaleTimeString('vi-VN')}`,
        syncStatus: 'Đã đồng bộ',
        ...(data || {}),
      };
      return mockBackend.syncSheetRow(row);
    }
  );
}

export async function returnApplication(id: string, returnReason: string, manager?: User): Promise<Application> {
  return Promise.resolve(mockBackend.returnApplication(id, returnReason, manager));
}

export async function updateDossierDataByManager(
  id: string,
  newFormData: Record<string, any>,
  changeSummary: string,
  manager?: User
): Promise<Application> {
  return Promise.resolve(mockBackend.updateDossierDataByManager(id, newFormData, changeSummary, manager));
}

export async function uploadUserSignature(id: string, driveFileId: string, actor?: User): Promise<Application> {
  return Promise.resolve(mockBackend.uploadUserSignature(id, driveFileId, actor));
}

export async function receiveSecretaryDossier(id: string, secretary?: User): Promise<Application> {
  return Promise.resolve(mockBackend.receiveSecretaryDossier(id, secretary));
}

export async function completeDossierBySecretary(
  id: string,
  finalDriveFileId: string,
  secretary?: User
): Promise<{ application: Application; sheetSyncResult: GoogleSheetRow }> {
  return Promise.resolve(mockBackend.completeDossierBySecretary(id, finalDriveFileId, secretary));
}

export async function getSecretaryQueueApplications(): Promise<Application[]> {
  return Promise.resolve(mockBackend.getSecretaryQueueApplications());
}

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  return Promise.resolve(mockBackend.getNotifications(userId));
}

export async function markNotificationAsRead(id: string): Promise<void> {
  return Promise.resolve(mockBackend.markNotificationAsRead(id));
}

export async function getDepartments(): Promise<Department[]> {
  return Promise.resolve(mockBackend.getDepartments());
}

export async function saveDepartment(dept: Department): Promise<Department> {
  return Promise.resolve(mockBackend.saveDepartment(dept));
}

export async function getUsers(): Promise<User[]> {
  return Promise.resolve(mockBackend.getUsers());
}

export async function saveUser(user: User): Promise<User> {
  return Promise.resolve(mockBackend.saveUser(user));
}

export async function getAllApplications(): Promise<Application[]> {
  return Promise.resolve(mockBackend.getApplications());
}

export async function getAllSheetRows(): Promise<GoogleSheetRow[]> {
  return Promise.resolve(mockBackend.getSheetRows());
}

export async function saveTemplate(template: DocumentTemplate, isNew = false): Promise<DocumentTemplate> {
  if (isNew) {
    return Promise.resolve(mockBackend.addTemplate(template));
  }
  return Promise.resolve(mockBackend.updateTemplate(template));
}
