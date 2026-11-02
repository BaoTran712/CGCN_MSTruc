import { User } from '../types';

export const ADMIN_EMAILS = [
  'toanhkhai12345@gmail.com',
  'heykagvip@gmail.com',
];

export const ADMIN_EMAIL = 'heykagvip@gmail.com';

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
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
};

export const DEFAULT_CANBO_USER: User = {
  id: 'usr_user_test',
  name: 'Cán bộ / Giảng viên (User)',
  email: 'user.test@gmail.com',
  role: 'USER',
  department: 'Trường Đại học Y Dược Cần Thơ',
  departmentId: 'khoa_y',
  title: 'Cán bộ / Giảng viên',
  jobTitle: 'Cán bộ / Giảng viên',
};

export const AUTH_STORAGE_KEY = 'ctump_auth_user';

export * from './templates';
