/**
 * Centralized API Configuration for CTUMP DocuGov Backend NodeJS Service
 * Hỗ trợ đầy đủ True Flow + False Flow (6 trạng thái)
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // System status
  STATUS: `${API_BASE_URL}/status`,

  // 1. Templates
  GET_TEMPLATES: `${API_BASE_URL}/templates`,
  GET_TEMPLATE_DETAIL: (id: string) => `${API_BASE_URL}/templates/${id}`,

  // 2. Applications / Dossiers (True Flow + False Flow)
  APPLICATIONS: `${API_BASE_URL}/applications`,
  GET_ALL_DOSSIERS: `${API_BASE_URL}/applications`,
  GET_DOSSIER_DETAIL: (id: string) => `${API_BASE_URL}/applications/${id}`,
  CREATE_DOSSIER: `${API_BASE_URL}/applications`,
  UPDATE_DOSSIER: (id: string) => `${API_BASE_URL}/applications/${id}`,

  // Bước 2A [Luồng False]: Admin Trả về sửa lỗi
  RETURN_REVISION: (id: string) => `${API_BASE_URL}/applications/${id}/return-revision`,
  ADMIN_PRECHECK: (id: string) => `${API_BASE_URL}/applications/${id}/precheck`,

  // Bước 2B [Luồng False]: Thầy/Cô chỉnh sửa & Nộp lại
  RESUBMIT_APPLICATION: (id: string) => `${API_BASE_URL}/applications/${id}/resubmit`,
  RESUBMIT_1A: (id: string) => `${API_BASE_URL}/applications/${id}/resubmit-1a`,
  RESUBMIT_2A: (id: string) => `${API_BASE_URL}/applications/${id}/resubmit-2a`,

  // Bước 3 [Luồng True]: Admin nhấn Duyệt (VALIDATED + gửi Mail kèm PDF)
  APPROVE_APPLICATION_TRUE: (id: string) => `${API_BASE_URL}/applications/${id}/approve`,

  // Bước 4: Thầy/Cô upload bản ký phòng ban + minh chứng (PENDING_SIGNED_REVIEW)
  REUPLOAD_SIGNED: (id: string) => `${API_BASE_URL}/applications/${id}/reupload-signed`,
  UPLOAD_FACULTY_SIGN: (id: string) => `${API_BASE_URL}/applications/${id}/reupload-signed`,

  // Bước 5: Admin chuyển sang Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
  SUBMIT_TO_RECTOR: (id: string) => `${API_BASE_URL}/applications/${id}/submit-to-rector`,
  SCHOOL_SIGNING: (id: string) => `${API_BASE_URL}/applications/${id}/submit-to-rector`,

  // Bước 6: Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED)
  CONFIRM_SIGNED: (id: string) => `${API_BASE_URL}/applications/${id}/confirm-signed`,
  COMPLETE_DOSSIER: (id: string) => `${API_BASE_URL}/applications/${id}/confirm-signed`,

  // 3. Logs & Users
  GET_USERS: `${API_BASE_URL}/users`,
  GET_AUDIT_LOGS: `${API_BASE_URL}/audit-logs`,
  GET_EMAIL_LOGS: `${API_BASE_URL}/email-logs`,
  CLEANUP_GARBAGE: `${API_BASE_URL}/applications/cleanup-garbage`,

  // Backward compatibility aliases
  CREATE_APPLICATION: `${API_BASE_URL}/applications`,
  SAVE_DRAFT: (id: string) => `${API_BASE_URL}/applications/${id}`,
  SUBMIT_APPLICATION: (id: string) => `${API_BASE_URL}/applications/${id}/resubmit`,
  GET_MY_APPLICATIONS: `${API_BASE_URL}/applications`,
  GET_PENDING_APPLICATIONS: `${API_BASE_URL}/applications`,
  GET_APPLICATION_DETAIL: (id: string) => `${API_BASE_URL}/applications/${id}`,
  REQUEST_REVISION: (id: string) => `${API_BASE_URL}/applications/${id}/return-revision`,
  APPROVE_APPLICATION: (id: string) => `${API_BASE_URL}/applications/${id}/approve`,
  MOVE_TO_SIGNING: (id: string) => `${API_BASE_URL}/applications/${id}/reupload-signed`,
  GENERATE_DOCUMENT: (id: string) => `${API_BASE_URL}/applications/${id}/approve`,
  GET_DOCUMENT: (id: string) => `${API_BASE_URL}/applications/${id}`,
  GET_HISTORY: (id: string) => `${API_BASE_URL}/audit-logs?dossierId=${id}`,
  SYNC_GOOGLE_SHEET: (id: string) => `${API_BASE_URL}/applications/${id}`,
};

export const API_TIMEOUT_MS = 2500;

export const isMockMode = (): boolean => {
  return false;
};
