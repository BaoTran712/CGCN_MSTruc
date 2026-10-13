/**
 * Centralized API Configuration for CTUMP DocuGov Backend NodeJS Service
 * Strictly adhering to quy_trinh.md Automation Architecture
 */

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // System status
  STATUS: `${API_BASE_URL}/status`,

  // 1. Templates
  GET_TEMPLATES: `${API_BASE_URL}/templates`,
  GET_TEMPLATE_DETAIL: (id: string) => `${API_BASE_URL}/templates/${id}`,

  // 2. Transfer Projects (Hồ sơ dự án CGCN chuẩn mới)
  PROJECTS: `${API_BASE_URL}/projects`,
  GET_ALL_PROJECTS: `${API_BASE_URL}/projects`,
  GET_PROJECT_DETAIL: (id: string) => `${API_BASE_URL}/projects/${id}`,
  CREATE_PROJECT: `${API_BASE_URL}/projects`,
  REVIEW_PROJECT: (id: string) => `${API_BASE_URL}/projects/${id}/review`,
  UPLOAD_DEAN_SIGNED: (id: string) => `${API_BASE_URL}/projects/${id}/upload-dean-signed`,
  COMPLETE_PROJECT: (id: string) => `${API_BASE_URL}/projects/${id}/complete`,

  // 3. Dossiers (Hồ sơ CGCN tương thích ngược)
  GET_ALL_DOSSIERS: `${API_BASE_URL}/dossiers`,
  GET_DOSSIER_DETAIL: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  CREATE_DOSSIER: `${API_BASE_URL}/dossiers`,
  UPDATE_DOSSIER: (id: string) => `${API_BASE_URL}/dossiers/${id}`,

  // 3. Quy trình Automation 8 bước
  // Bước 2: Admin tiền kiểm
  ADMIN_PRECHECK: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,

  // Bước 3 & 6: User upload bản ký cấp Khoa + Minh chứng
  UPLOAD_FACULTY_SIGN: (id: string) => `${API_BASE_URL}/dossiers/${id}/faculty-signed`,

  // Bước 4 & 7: Admin cập nhật tiến độ ký số cấp Trường
  SCHOOL_SIGNING: (id: string) => `${API_BASE_URL}/dossiers/${id}/school-signing`,

  // Bước 4 & 8: Ban hành Quyết định & Đóng hồ sơ COMPLETED
  COMPLETE_DOSSIER: (id: string) => `${API_BASE_URL}/dossiers/${id}/complete`,

  // 4. Logs & Users
  GET_USERS: `${API_BASE_URL}/users`,
  GET_AUDIT_LOGS: `${API_BASE_URL}/audit-logs`,
  GET_EMAIL_LOGS: `${API_BASE_URL}/email-logs`,

  // Backward compatibility aliases
  CREATE_APPLICATION: `${API_BASE_URL}/dossiers`,
  SAVE_DRAFT: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  SUBMIT_APPLICATION: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  GET_MY_APPLICATIONS: `${API_BASE_URL}/dossiers`,
  GET_PENDING_APPLICATIONS: `${API_BASE_URL}/dossiers`,
  GET_APPLICATION_DETAIL: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  REQUEST_REVISION: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  APPROVE_APPLICATION: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  MOVE_TO_SIGNING: (id: string) => `${API_BASE_URL}/dossiers/${id}/faculty-signed`,
  GENERATE_DOCUMENT: (id: string) => `${API_BASE_URL}/dossiers/${id}/precheck`,
  GET_DOCUMENT: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
  GET_HISTORY: (id: string) => `${API_BASE_URL}/audit-logs?dossierId=${id}`,
  SYNC_GOOGLE_SHEET: (id: string) => `${API_BASE_URL}/dossiers/${id}`,
};

export const API_TIMEOUT_MS = 2500;

export const isMockMode = (): boolean => {
  return false; // Connect to NodeJS backend with automatic graceful fallback in api.ts
};
