import { User } from '../types';

export const DEFAULT_DEV_USER: User = {
  id: 'usr_admin_01',
  name: 'Trần Văn Quản Trị',
  email: 'admin@ctump.edu.vn',
  role: 'ADMIN',
  department: 'Ban Giám hiệu / Quản trị hệ thống',
  departmentId: 'bgh',
  title: 'Quản trị viên Hệ thống',
  jobTitle: 'Quản trị viên Hệ thống',
};

export const DEFAULT_CANBO_USER: User = {
  id: 'usr_canbo_01',
  name: 'TS. Nguyễn Văn An',
  email: 'nvan@ctump.edu.vn',
  role: 'USER',
  department: 'Khoa Y',
  departmentId: 'khoa_y',
  title: 'Giảng viên chính',
  jobTitle: 'Giảng viên chính',
};

export const AUTH_STORAGE_KEY = 'ctump_auth_user';
