import React from 'react';
import { Users, Shield, User, Mail, Phone, Building, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { MOCK_USERS } from '../services/mockData';

interface UsersViewProps {
  currentUser: UserProfile;
  onSwitchUser: (role: 'employee' | 'manager') => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onSwitchUser }) => {
  const usersList: UserProfile[] = [
    {
      id: 'usr-001',
      name: 'TS. Lê Hoàng Quân',
      title: 'Quản trị viên Hệ thống (Admin)',
      department: 'Phòng Hành chính - Tổng hợp',
      email: 'admin@ctump.edu.vn',
      phone: '0913 882 119',
      role: 'manager',
    },
    {
      id: 'usr-002',
      name: 'ThS. Nguyễn Văn Nam',
      title: 'Cán bộ Giảng viên',
      department: 'Khoa Y',
      email: 'nvnam@ctump.edu.vn',
      phone: '0988 123 456',
      role: 'employee',
    },
    {
      id: 'usr-003',
      name: 'BS.CKII. Trần Thị Mai',
      title: 'Bác sĩ - Giảng viên lâm sàng',
      department: 'Khoa Dược',
      email: 'ttmai@ctump.edu.vn',
      phone: '0912 345 678',
      role: 'employee',
    },
    {
      id: 'usr-004',
      name: 'TS. Phạm Thị Lan',
      title: 'Giảng viên chính',
      department: 'Khoa Răng Hàm Mặt',
      email: 'ptlan@ctump.edu.vn',
      phone: '0904 889 900',
      role: 'employee',
    },
    {
      id: 'usr-005',
      name: 'Đặng Quốc Huy',
      title: 'Chuyên viên Công tác sinh viên',
      department: 'Phòng Đào tạo Đại học',
      email: 'dqhuy@ctump.edu.vn',
      phone: '0977 123 456',
      role: 'employee',
    },
    {
      id: 'usr-006',
      name: 'Vũ Thị Minh Hạnh',
      title: 'Kế toán viên',
      department: 'Phòng Tài chính - Kế toán',
      email: 'vtmhanh@ctump.edu.vn',
      phone: '0943 221 100',
      role: 'employee',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              QUẢN TRỊ NGƯỜI DÙNG & TÀI KHOẢN
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh sách Người dùng & Phân quyền Hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân quyền 2 vai trò chuẩn: Cán bộ trường (login qua Gmail @ctump.edu.vn) và Quản trị viên (Admin duy nhất)
          </p>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-slate-900">Vai trò: Cán bộ trường (Cán bộ / Giảng viên)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Đăng nhập bằng tài khoản Gmail cơ quan dạng <code>...@ctump.edu.vn</code>. Xem biểu mẫu, lập hồ sơ online, theo dõi tiến độ thẩm định và tải văn bản Word đã duyệt.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Shield className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-slate-900">Vai trò: Quản trị viên (Admin duy nhất: admin@ctump.edu.vn)</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Quyền kiểm tra, sửa đổi nội dung hồ sơ, yêu cầu chỉnh sửa hoặc phê duyệt hồ sơ, cấu hình biểu mẫu Word XML, kiểm soát đồng bộ Google Sheets và quản lý phòng ban.
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Chức vụ & Đơn vị</th>
                <th className="py-3 px-4">Email CTUMP & SĐT</th>
                <th className="py-3 px-4">Vai trò hệ thống</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usersList.map((user) => {
                const isCurrent = currentUser.email === user.email || currentUser.id === user.id;
                const isAdmin = user.email === 'admin@ctump.edu.vn' || user.role === 'manager';

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div>{user.name}</div>
                          {isCurrent && (
                            <span className="text-[10.5px] text-blue-700 font-bold font-mono">
                              (Đang đăng nhập)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{user.title}</div>
                      <div className="text-[11px] text-slate-500">{user.department}</div>
                    </td>

                    <td className="py-3 px-4 text-[11px] font-mono text-slate-600">
                      <div className="text-blue-700 font-medium">{user.email}</div>
                      <div className="text-slate-400">{user.phone}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isAdmin
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {isAdmin ? 'Quản trị viên (Admin)' : 'Cán bộ trường'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSwitchUser(isAdmin ? 'manager' : 'employee')}
                        className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-800 font-medium border border-slate-300'
                            : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {isCurrent ? 'Tài khoản hiện tại' : 'Chuyển sang tài khoản này'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
