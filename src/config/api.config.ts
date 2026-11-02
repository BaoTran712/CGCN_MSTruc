/**
 * Centralized API Configuration for CTUMP DocuGov Backend NodeJS Service
 * Strictly adhering to Lean Workflow Architecture (5 Core Tables & 5 Steps)
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // System status
  STATUS: `${API_BASE_URL}/status`,

  // 1. Templates
  GET_TEMPLATES: `${API_BASE_URL}/templates`,
  GET_TEMPLATE_DETAIL: (id: string) => `${API_BASE_URL}/templates/${id}`,

  // 2. Dossiers (Hệ thống duy nhất sử dụng bảng và thuật ngữ dossiers)
  GET_ALL_DOSSIERS: `${API_BASE_URL}/dossiers`,
  GET_DOSSIER_DETAIL: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  CREATE_DOSSIER: `${API_BASE_URL}/dossiers/submit`,
  UPDATE_DOSSIER: (id: string) => `${API_BASE_URL}/dossiers/${id}/resubmit`,
  GET_DEPARTMENTS: `${API_BASE_URL}/dossiers/departments`,
  EXPORT_EXCEL: `${API_BASE_URL}/dossiers/export-excel`,
  DOWNLOAD_FILE: (fileId: string) => `${API_BASE_URL}/dossiers/download/${fileId}`,
  DOWNLOAD_STANDARD: (id: string) => `${API_BASE_URL}/dossiers/${id}/download-standard`,

  // 3. Luồng Nghiệp vụ Tinh gọn 5 bước
  // Bước 2: Admin tiền kiểm
  ADMIN_PRECHECK: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,

  // Bước 3: User upload bản ký cấp Khoa + Minh chứng
  UPLOAD_FACULTY_SIGN: (id: string) => `${API_BASE_URL}/dossiers/${id}/upload-evidence`,

  // Bước 4: Admin kiểm duyệt bộ file upload & cập nhật trạng thái trình Hiệu trưởng
  REVIEW_EVIDENCE: (id: string) => `${API_BASE_URL}/dossiers/${id}/review-evidence`,

  // Bước 5: Ban hành Quyết định & Đóng hồ sơ COMPLETED
  COMPLETE_DOSSIER: (id: string) => `${API_BASE_URL}/dossiers/${id}/complete`,

  // 4. Logs & Users
  GET_USERS: `${API_BASE_URL}/users`,
  GET_AUDIT_LOGS: `${API_BASE_URL}/audit-logs`,
  GET_EMAIL_LOGS: `${API_BASE_URL}/email-logs`,

  // Backward compatibility aliases
  CREATE_APPLICATION: `${API_BASE_URL}/dossiers/submit`,
  SAVE_DRAFT: (id: string) => `${API_BASE_URL}/dossiers/${id}/resubmit`,
  SUBMIT_APPLICATION: (id: string) => `${API_BASE_URL}/dossiers/${id}/resubmit`,
  GET_MY_APPLICATIONS: `${API_BASE_URL}/dossiers`,
  GET_PENDING_APPLICATIONS: `${API_BASE_URL}/dossiers`,
  GET_APPLICATION_DETAIL: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  REQUEST_REVISION: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  APPROVE_APPLICATION: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  MOVE_TO_SIGNING: (id: string) => `${API_BASE_URL}/dossiers/${id}/upload-evidence`,
  GENERATE_DOCUMENT: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  GET_DOCUMENT: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  GET_HISTORY: (id: string) => `${API_BASE_URL}/audit-logs?dossierId=${id}`,
  SYNC_GOOGLE_SHEET: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
};

export const API_TIMEOUT_MS = 2500;

export const isMockMode = (): boolean => {
  return false; // Connect to NodeJS backend with automatic graceful fallback in api.ts
};
