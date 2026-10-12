import { User } from '../types';

/**
 * Tài khoản kiểm thử mặc định cho 2 vai trò chuẩn của hệ thống:
 * 1. Cán bộ trường (Lập hồ sơ CGCN)
 * 2. Quản trị viên (Admin phê duyệt & cấu hình hệ thống)
 */
export const MOCK_USERS: Record<string, User> = {
  can_bo: {
    id: 'usr-canbo',
    name: 'Cán bộ / Giảng viên',
    title: 'Cán bộ Khoa chuyên môn',
    jobTitle: 'Cán bộ lập hồ sơ CGCN',
    department: 'Khoa chuyên môn',
    departmentId: 'dept-04',
    email: 'canbo@ctump.edu.vn',
    phone: '',
    role: 'USER',
  },
  employee: {
    id: 'usr-canbo',
    name: 'Cán bộ / Giảng viên',
    title: 'Cán bộ Khoa chuyên môn',
    jobTitle: 'Cán bộ lập hồ sơ CGCN',
    department: 'Khoa chuyên môn',
    departmentId: 'dept-04',
    email: 'canbo@ctump.edu.vn',
    phone: '',
    role: 'USER',
  },
  admin: {
    id: 'usr-admin',
    name: 'Quản trị viên Hệ thống',
    title: 'Quản trị viên (Toàn quyền)',
    jobTitle: 'Quản trị viên hệ thống & Phê duyệt',
    department: 'Ban Giám Hiệu - Trường ĐH Y Dược Cần Thơ',
    departmentId: 'dept-00',
    email: 'admin@ctump.edu.vn',
    phone: '',
    role: 'ADMIN',
  },
  manager: {
    id: 'usr-admin',
    name: 'Quản trị viên Hệ thống',
    title: 'Quản trị viên (Toàn quyền)',
    jobTitle: 'Quản trị viên hệ thống & Phê duyệt',
    department: 'Ban Giám Hiệu - Trường ĐH Y Dược Cần Thơ',
    departmentId: 'dept-00',
    email: 'admin@ctump.edu.vn',
    phone: '',
    role: 'ADMIN',
  },
  secretary: {
    id: 'usr-admin',
    name: 'Quản trị viên Hệ thống',
    title: 'Quản trị viên (Toàn quyền)',
    jobTitle: 'Văn thư & Tiếp nhận hồ sơ',
    department: 'Ban Giám Hiệu - Trường ĐH Y Dược Cần Thơ',
    departmentId: 'dept-00',
    email: 'admin@ctump.edu.vn',
    phone: '',
    role: 'ADMIN',
  },
};
