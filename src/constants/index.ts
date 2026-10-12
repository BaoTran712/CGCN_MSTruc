import { User } from '../types';

export const DEFAULT_DEV_USER: User = {
  id: 'dev_admin',
  name: 'Quản trị viên Hệ thống',
  email: 'admin@ctump.edu.vn',
  role: 'ADMIN',
  department: 'Trường Đại học Y Dược Cần Thơ',
  departmentId: 'bgh',
  title: 'Quản trị viên (Toàn quyền)',
  jobTitle: 'Quản trị viên (Toàn quyền)',
};

export const AUTH_STORAGE_KEY = 'ctump_auth_user';
