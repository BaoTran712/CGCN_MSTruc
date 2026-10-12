import React from 'react';
import {
  Users,
  Shield,
  User,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowRightLeft,
  KeyRound,
  Building,
} from 'lucide-react';
import { UserProfile } from '../types';

interface UsersViewProps {
  currentUser: UserProfile;
  onSwitchUser: (role: 'employee' | 'manager') => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onSwitchUser }) => {
  const isAdmin = currentUser.role === 'manager' || currentUser.role === 'admin';

  // Danh sách tài khoản khởi tạo chuẩn hệ thống (from scratch)
  const systemAccounts = [
    {
      id: 'usr-admin',
      name: 'Quản trị viên Hệ thống (Admin)',
      title: 'Quản trị viên (Toàn quyền)',
      department: 'Ban Giám Hiệu - Trường ĐH Y Dược Cần Thơ',
      email: 'admin@ctump.edu.vn',
      role: 'manager' as const,
      roleName: 'Quản trị viên (Admin)',
      description: 'Tài khoản quản trị khởi tạo mặc định của hệ thống',
      isCurrent: isAdmin,
    },
    {
      id: 'usr-canbo',
      name: 'Cán bộ / Giảng viên (Tài khoản mẫu)',
      title: 'Cán bộ Khoa chuyên môn',
      department: 'Khoa chuyên môn',
      email: 'canbo@ctump.edu.vn',
      role: 'employee' as const,
      roleName: 'Cán bộ trường',
      description: 'Phiên kiểm thử vai trò người lập hồ sơ',
      isCurrent: !isAdmin,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              QUẢN TRỊ NGƯỜI DÙNG & TÀI KHOẢN
            </span>
            <span className="text-xs text-slate-500 font-mono">Trạng thái: Khởi tạo mới (From Scratch)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Tài khoản Người dùng & Phân quyền Hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân quyền 2 vai trò chuẩn theo quy chế CGCN: Cán bộ trường (đăng nhập qua Google Workspace) và Quản trị viên (Admin)
          </p>
        </div>

        {/* Quick Role Switcher for Testing */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
          <span className="text-xs text-slate-600 font-medium px-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            Đổi vai trò kiểm thử:
          </span>
          <button
            type="button"
            onClick={() => onSwitchUser('employee')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              !isAdmin
                ? 'bg-white text-blue-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cán bộ trường
          </button>
          <button
            type="button"
            onClick={() => onSwitchUser('manager')}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              isAdmin
                ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quản trị viên (Admin)
          </button>
        </div>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`p-4 rounded-xl border transition-all ${
            !isAdmin
              ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-200'
              : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm text-slate-900">Vai trò: Cán bộ trường (Cán bộ / Giảng viên)</span>
            </div>
            {!isAdmin && (
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                Đang kích hoạt
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Đăng nhập bằng tài khoản Google Workspace cơ quan (<code>@ctump.edu.vn</code>). Quyền: xem danh mục 7 biểu mẫu CGCN, lập hồ sơ trực tuyến, lưu nháp, nộp thẩm định, theo dõi tiến độ xử lý và tải bản Word đã được duyệt.
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border transition-all ${
            isAdmin
              ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200'
              : 'bg-white border-slate-200 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="font-bold text-sm text-slate-900">Vai trò: Quản trị viên (Admin / Lãnh đạo)</span>
            </div>
            {isAdmin && (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Đang kích hoạt
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tài khoản quản trị (<code>admin@ctump.edu.vn</code>). Quyền: thẩm định đối soát hồ sơ, yêu cầu cán bộ chỉnh sửa hoặc phê duyệt hồ sơ, tiếp nhận văn thư, cấu hình biểu mẫu Word XML, kiểm soát đồng bộ Google Sheets và cơ cấu phòng ban.
          </p>
        </div>
      </div>

      {/* Account Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Tài khoản Khởi tạo & Kiểm thử Hệ thống
            </h3>
          </div>
          <span className="text-xs text-slate-500">2 tài khoản chuẩn</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Tài khoản & Tên hiển thị</th>
                <th className="py-3 px-4">Đơn vị / Phòng ban</th>
                <th className="py-3 px-4">Email đăng nhập</th>
                <th className="py-3 px-4">Vai trò hệ thống</th>
                <th className="py-3 px-4 text-right">Trạng thái phiên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {systemAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs ${
                          acc.role === 'manager'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {acc.role === 'manager' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{acc.description}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{acc.department}</div>
                  </td>

                  <td className="py-3.5 px-4 text-[11px] font-mono">
                    <span className="text-blue-700 font-medium">{acc.email}</span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        acc.role === 'manager'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {acc.roleName}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {acc.isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đang sử dụng
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSwitchUser(acc.role)}
                        className="text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-blue-700 font-medium"
                      >
                        Chuyển sang tài khoản này
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* From-Scratch Notice Card */}
      <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900">
            Hệ thống đang ở giai đoạn khởi tạo ban đầu (From Scratch)
          </p>
          <p className="text-amber-800 leading-relaxed">
            Hệ thống chưa có cán bộ nào sử dụng trước đó. Khi đưa vào vận hành chính thức, tài khoản của các cán bộ, giảng viên Trường Đại học Y Dược Cần Thơ sẽ được tự động kích hoạt và ghi nhận vào cơ sở dữ liệu ngay khi đăng nhập lần đầu bằng Google Workspace của trường (<code>...@ctump.edu.vn</code>).
          </p>
        </div>
      </div>
    </div>
  );
};
