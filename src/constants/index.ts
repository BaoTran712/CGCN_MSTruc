import { User } from '../types';

export const ADMIN_EMAIL = 'toanhkhai12345@gmail.com';

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

/**
 * Kiểm tra user có phải admin không — ưu tiên role, fallback email
 * Dùng hàm này thống nhất thay vì tự viết logic ở mỗi component.
 */
export const isAdminUser = (user?: { role?: string; email?: string } | null): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return isAdminEmail(user.email);
};

export const DEFAULT_DEV_USER: User = {
  id: 'usr_admin_toanhkhai',
  name: 'Quản trị viên (Toàn Khải)',
  email: ADMIN_EMAIL,
  role: 'ADMIN',
  department: 'Phòng Khoa học Công nghệ',
  departmentId: 'khcn',
  title: 'Quản trị viên Hệ thống (Admin)',
  jobTitle: 'Quản trị viên Hệ thống (Admin)',
  token: 'dev-token-admin',
};

export const DEFAULT_CANBO_USER: User = {
  id: 'usr_user_thayco',
  name: 'Thầy / Cô (Cán bộ - Giảng viên)',
  email: 'thayco.giangvien@ctump.edu.vn',
  role: 'USER',
  department: 'Khoa Y - Trường Đại học Y Dược Cần Thơ',
  departmentId: 'khoa_y',
  title: 'Giảng viên / Nghiên cứu viên',
  jobTitle: 'Cán bộ / Giảng viên (Thầy / Cô)',
  token: 'dev-token-user',
};

export const AUTH_STORAGE_KEY = 'ctump_auth_user';
export const AUTH_TOKEN_KEY = 'ctump_auth_jwt_token';

export * from './templates';
