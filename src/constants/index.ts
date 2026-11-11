import { User } from '../types';

export const ADMIN_EMAILS = [
<<<<<<< HEAD
  'tranthibaotran.2k@gmail.com',
  'toanhkhai@gmail.com',
  'toanhkhai12345@gmail.com',
  'admin@ctump.edu.vn',
];

export const ADMIN_EMAIL = 'tranthibaotran.2k@gmail.com';
=======
  'toanhkhai12345@gmail.com',
  'heykagvip@gmail.com',
];

export const ADMIN_EMAIL = 'heykagvip@gmail.com';
>>>>>>> origin/main

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
<<<<<<< HEAD
  return (
    ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean) ||
    clean.startsWith('admin@') ||
    clean.includes('admin')
  );
=======
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
>>>>>>> origin/main
};

/**
 * Kiểm tra user có phải admin không — ưu tiên role, fallback email
 * Dùng hàm này thống nhất thay vì tự viết logic ở mỗi component.
 */
export const isAdminUser = (user?: { role?: string; email?: string } | null): boolean => {
  if (!user) return false;
  const roleUpper = String(user.role || '').trim().toUpperCase();
  if (roleUpper === 'ADMIN') return true;
  if (roleUpper === 'USER' || roleUpper === 'LECTURER' || roleUpper === 'APPLICANT') return false;
  if (user.email) {
    return isAdminEmail(user.email);
  }
  return false;
};

export const DEFAULT_DEV_USER: User = {
  id: 'usr_admin_tran',
  name: 'Bảo Trân (Admin)',
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
