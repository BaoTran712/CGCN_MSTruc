import type { DocumentTemplate, Application, ApplicationHistory, User, Notification as NotificationItem } from '../types';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import { OFFICIAL_TEMPLATES, AUTH_TOKEN_KEY } from '../constants';

export { API_BASE_URL };
export const getAuthToken = (): string | null => {
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
};
export const setAuthToken = (token?: string | null): void => {
  try { if (token) localStorage.setItem(AUTH_TOKEN_KEY,token); else localStorage.removeItem(AUTH_TOKEN_KEY); } catch {}
};
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function authorizedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  if (new URL(url,origin).origin === new URL(API_BASE_URL,origin).origin && token) headers.set('Authorization','Bearer ' + token);
  const response = await fetch(url,{ ...options,headers });
  if (response.status === 401 && token) {
    setAuthToken(null);
    window.dispatchEvent(new Event('ctump-auth-expired'));
  }
  return response;
}
export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),90000);
  try {
    const headers = new Headers(options.headers);
    headers.set('Accept','application/json');
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
    const response = await authorizedFetch(url,{ ...options,headers,signal:controller.signal });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.success === false) throw new ApiError(json?.message || 'Không thể xử lý yêu cầu (' + response.status + ').',response.status);
    if (!json) throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
    return ('data' in json ? json.data : json) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') throw new Error('Yêu cầu quá thời gian chờ. Vui lòng kiểm tra danh sách hồ sơ trước khi thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra danh sách hồ sơ trước khi gửi lại để tránh tạo trùng.');
    throw error;
  } finally { clearTimeout(timer); }
}
export interface BackendHealthStatus { online: boolean; message?: string; databaseConnected?: boolean; }
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  try {
    const response = await fetch(API_ENDPOINTS.STATUS,{signal:AbortSignal.timeout(5000)});
    const json = await response.json();
    return {online:response.ok,databaseConnected:json.databaseConnected,message:json.message};
  } catch { return {online:false,databaseConnected:false}; }
}
const enrichTemplate = (item: DocumentTemplate): DocumentTemplate => {
  const fallback = OFFICIAL_TEMPLATES.find(template => template.id === item.id || template.code === item.code);
  return {...fallback,...item,fields:item.fields?.length ? item.fields : fallback?.fields || [],sections:item.sections?.length ? item.sections : fallback?.sections || []};
};
export async function getTemplates(): Promise<DocumentTemplate[]> {
  return (await request<DocumentTemplate[]>(API_ENDPOINTS.GET_TEMPLATES)).map(enrichTemplate);
}
export async function getTemplateById(id: string): Promise<DocumentTemplate | null> {
  const item = await request<DocumentTemplate>(API_ENDPOINTS.GET_TEMPLATE_DETAIL(encodeURIComponent(id)));
  return item ? enrichTemplate(item) : null;
}
export const getAllApplications = () => request<Application[]>(API_ENDPOINTS.GET_ALL_DOSSIERS);
export async function getApplicationById(id: string): Promise<Application | null> {
  try { return await request<Application>(API_ENDPOINTS.GET_DOSSIER_DETAIL(encodeURIComponent(id))); }
  catch(error) { if(error instanceof ApiError && error.status === 404) return null; throw error; }
}
export async function createApplication(payload: Partial<Application>, creator?: User): Promise<Application> {
  const chosenTemplateId = payload.templateId || 'tmpl-cgcn-1a';
  const template = OFFICIAL_TEMPLATES.find(item => item.id === chosenTemplateId || item.code === chosenTemplateId || item.code === payload.templateCode);
  return request<Application>(API_ENDPOINTS.CREATE_DOSSIER,{method:'POST',body:JSON.stringify({
    templateId:chosenTemplateId,templateTitle:template?.title || payload.templateTitle,templateCode:template?.code || payload.templateCode,
    formData:payload.formData || payload.form_data || {},formData1a:payload.formData1a || payload.form_data_1a,formData2a:payload.formData2a || payload.form_data_2a,
    status_1a:payload.status_1a || 'PENDING',status_2a:payload.status_2a || 'PENDING',
    ten_de_tai:payload.ten_de_tai || payload.formData?.ten_de_tai,truong_don_vi:payload.truong_don_vi || payload.formData?.truong_don_vi,
    signature_config:payload.signature_config || payload.signatureConfig,user:creator || payload.createdBy,status:'SUBMITTED'
  })});
}
export const saveApplicationDraft = (id: string,payload: Partial<Application>,actor?: User) => submitApplication(id,payload,actor);
export async function submitApplication(id: string,payload?: Partial<Application>,actor?: User): Promise<Application> {
  const existing = id && !id.startsWith('hs-') && !id.startsWith('dos-temp-') ? await getApplicationById(id) : null;
  if (!existing) return createApplication(payload || {},actor);
  return resubmitApplication(id,payload?.formData || payload?.form_data || {},actor,payload);
}
export const resubmitForm1a = (id: string,formData1a: Record<string,any>,user?: User,extra?: Partial<Application>) =>
  request<Application>(API_ENDPOINTS.RESUBMIT_1A(encodeURIComponent(id)),{method:'PATCH',body:JSON.stringify({formData1a,form_data_1a:formData1a,ten_de_tai:extra?.ten_de_tai || formData1a.ten_de_tai,truong_don_vi:extra?.truong_don_vi || formData1a.truong_don_vi,target_form:'1a',user})});
export async function resubmitApplication(id: string,formData: Record<string,any>,user?: User,fullPayload?: Partial<Application>): Promise<Application> {
  const existing = await getApplicationById(id);
  const only1a = fullPayload?.target_form === '1a' || fullPayload?.rejected_target === '1a' || existing?.rejected_target === '1a' || (existing?.status_1a === 'RETURNED' && existing?.status_2a !== 'RETURNED');
  if (only1a) return resubmitForm1a(id,fullPayload?.formData1a || fullPayload?.form_data_1a || formData,user,fullPayload);
  return request<Application>(API_ENDPOINTS.RESUBMIT_APPLICATION(encodeURIComponent(id)),{method:'PUT',body:JSON.stringify({
    formData,form_data:formData,formData1a:fullPayload?.formData1a || fullPayload?.form_data_1a,
    formData2a:fullPayload?.formData2a || fullPayload?.form_data_2a,target_form:fullPayload?.target_form || fullPayload?.rejected_target,
    ten_de_tai:fullPayload?.ten_de_tai,truong_don_vi:fullPayload?.truong_don_vi,user
  })});
}
export const updateDossierFields = (id: string,fields: Partial<Application>) =>
  request<Application>(API_ENDPOINTS.UPDATE_DOSSIER(encodeURIComponent(id)),{method:'PUT',body:JSON.stringify(fields)});
export async function adminPrecheck(id: string,isValid: boolean,reviewNotes?: string,adminUser?: User,targetForm?: '1a'|'2a'|'both'): Promise<Application> {
  const before = await getApplicationById(id);
  const target = targetForm || (before?.status_1a === 'RETURNED' && before?.status_2a !== 'RETURNED' ? '1a' : before?.status_2a === 'RETURNED' && before?.status_1a !== 'RETURNED' ? '2a' : '1a');
  return request<Application>(isValid ? API_ENDPOINTS.APPROVE_APPLICATION_TRUE(encodeURIComponent(id)) : API_ENDPOINTS.RETURN_REVISION(encodeURIComponent(id)),{
    method:'PATCH',body:JSON.stringify({isValid,reviewNotes,revisionNote:reviewNotes,rejection_reason:reviewNotes,adminUser,
      target_form:isValid ? null : target,rejected_target:isValid ? null : target,
      status_1a:isValid ? 'APPROVED' : target === '1a' || target === 'both' ? 'RETURNED' : before?.status_1a === 'APPROVED' ? 'APPROVED' : 'PENDING',
      status_2a:isValid ? 'APPROVED' : target === '2a' || target === 'both' ? 'RETURNED' : before?.status_2a === 'APPROVED' ? 'APPROVED' : 'PENDING'
    })
  });
}
export const rollbackDossierVersion = (id: string,targetVersionNumber: number,_user?: User) =>
  request<Application>(API_ENDPOINTS.GET_DOSSIER_DETAIL(encodeURIComponent(id)) + '/rollback',{method:'POST',body:JSON.stringify({targetVersionNumber})});
export interface EvidenceUpload { name:string; url:string; size?:string; dataUrl?:string; mimeType?:string; }
export async function uploadFacultySignature(id: string,facultySignedPdfUrl?: string,evidenceFiles: EvidenceUpload[] = [],_user?: User): Promise<Application> {
  const body = new FormData();
  const retained = [];
  for (const item of evidenceFiles) {
    if (item.dataUrl?.startsWith('data:')) {
      const blob = await fetch(item.dataUrl).then(response => response.blob());
      body.append('files',blob,item.name);
    } else retained.push({name:item.name,url:item.url,size:item.size});
  }
  if (facultySignedPdfUrl && !evidenceFiles.some(item => item.dataUrl)) body.set('facultySignedPdfUrl',facultySignedPdfUrl);
  body.set('evidenceFiles',JSON.stringify(retained));
  return request<Application>(API_ENDPOINTS.REUPLOAD_SIGNED(encodeURIComponent(id)),{method:'POST',body});
}
export const updateSchoolSigning = (id: string,flags: {khcnSigned?:boolean;khtcSigned?:boolean;bghSigned?:boolean;note?:string},_adminUser?:User) =>
  request<Application>(API_ENDPOINTS.SUBMIT_TO_RECTOR(encodeURIComponent(id)),{method:'PATCH',body:JSON.stringify(flags)});
export async function completeDossier(id:string,decisionNumber?:string,decisionDate?:string,finalPdfUrl?:string|File,_adminUser?:User): Promise<Application> {
  const body = new FormData();
  if (decisionNumber) body.set('decisionNumber',decisionNumber);
  if (decisionDate) body.set('decisionDate',decisionDate);
  if (typeof finalPdfUrl === 'string') body.set('finalPdfUrl',finalPdfUrl);
  else if(finalPdfUrl) body.set('file',finalPdfUrl);
  return request<Application>(API_ENDPOINTS.CONFIRM_SIGNED(encodeURIComponent(id)),{method:'PATCH',body});
}
export async function login(email:string,credentials?:{password?:string;credential?:string;name?:string;avatar?:string;googleId?:string}):Promise<User> {
  const user = await request<User>(API_BASE_URL + '/users/login',{method:'POST',body:JSON.stringify({email:email.trim().toLowerCase(),password:credentials?.password,credential:credentials?.credential})});
  if (!user.token) throw new Error('Máy chủ không trả về phiên đăng nhập.');
  setAuthToken(user.token);
  return user;
}
export const getCurrentUser = () => request<User>(API_BASE_URL + '/users/me');
export const getUsers = () => request<User[]>(API_ENDPOINTS.GET_USERS);
export const getAuditLogs = (dossierId?:string) => request<any[]>(API_ENDPOINTS.GET_AUDIT_LOGS + (dossierId ? '?dossierId=' + encodeURIComponent(dossierId) : ''));
export const getEmailLogs = (dossierId?:string) => request<any[]>(API_ENDPOINTS.GET_EMAIL_LOGS + (dossierId ? '?dossierId=' + encodeURIComponent(dossierId) : ''));
export const approveApplication = (id:string,note?:string,reviewer?:string|User) => adminPrecheck(id,true,note,typeof reviewer === 'object' ? reviewer : undefined);
export const returnApplication = (id:string,reason:string,manager?:User) => adminPrecheck(id,false,reason,manager);
export async function getApplicationHistory(id:string):Promise<ApplicationHistory[]> {
  return (await getAuditLogs(id)).map(log => ({
    id:log.id,applicationId:id,title:log.action || 'Nhật ký xử lý',actor:log.actorName || 'Hệ thống',role:log.actorRole || 'SYSTEM',
    timestamp:log.createdAt,status:log.toStatus || 'SUBMITTED',action:log.action,fromStatus:log.fromStatus,toStatus:log.toStatus,performedAt:log.createdAt,comments:log.notes,comment:log.notes,description:log.notes
  }));
}
export async function getNotifications(userId:string):Promise<NotificationItem[]> {
  return (await getEmailLogs()).map((log,index) => ({
    id:'notif-' + (log.id || index),userId,dossierId:log.dossierId || log.dossier_id || '',dossierCode:log.dossier_code || '',
    title:log.subject || 'Thông báo hệ thống',message:log.stepName || log.step_name || '',type:'INFO',isRead:false,createdAt:log.sentAt || log.sent_at
  }));
}
export async function markNotificationAsRead(_id:string):Promise<void> {}
