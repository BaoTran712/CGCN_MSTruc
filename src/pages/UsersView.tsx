import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  User as UserIcon,
  Mail,
  Search,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Building2,
  CheckCircle2,
  ShieldCheck,
  X,
  RefreshCw,
  Award,
} from 'lucide-react';
import { User, UserRole, ActiveNavTab } from '../types';
import { useToast } from '../contexts/ToastContext';
import * as api from '../services/api';
import { CTUMP_DEPARTMENT_GROUPS } from '../components/common/DepartmentSelect';
import { isAdminUser } from '../constants';

interface UsersViewProps {
  currentUser: User;
  onNavigate?: (tab: ActiveNavTab) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onNavigate }) => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'Khoa Y',
    title: 'Cán bộ / Giảng viên',
    role: 'USER' as UserRole,
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Không thể tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((u) => isAdminUser(u)).length;
    const userCount = total - adminCount;
    const departments = new Set(users.map((u) => u.department).filter(Boolean)).size;
    return { total, adminCount, userCount, departments };
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        searchQuery === '' ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const isUserAdmin = isAdminUser(u);
      const matchesRole =
        roleFilter === 'ALL' ||
        (roleFilter === 'ADMIN' && isUserAdmin) ||
        (roleFilter === 'USER' && !isUserAdmin);

      const matchesDept =
        deptFilter === 'ALL' || u.department === deptFilter;

      return matchesSearch && matchesRole && matchesDept;
    });
  }, [users, searchQuery, roleFilter, deptFilter]);

  // Role change handler
  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    const currentIsAdmin = isAdminUser(targetUser);
    const targetIsAdmin = newRole === 'ADMIN';

    if (currentIsAdmin === targetIsAdmin) return;

    // Prevent Admin from accidentally removing their own admin role
    if (targetUser.id === currentUser.id && targetUser.role === 'ADMIN' && newRole === 'USER') {
      showToast('Bạn không thể tự hạ quyền Quản trị viên của chính tài khoản mình!', 'warning');
      return;
    }

    try {
      const updated = await api.updateUserRole(targetUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));

      const roleLabel = newRole === 'ADMIN' ? 'Quản trị viên (Admin)' : 'Thầy / Cô (User)';
      showToast(`Đã phân quyền cho "${targetUser.name}" thành ${roleLabel}!`);
    } catch (err: any) {
      console.error('Error updating role:', err);
      showToast(err.message || 'Lỗi khi cập nhật vai trò người dùng', 'error');
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      department: 'Khoa Y',
      title: 'Cán bộ / Giảng viên',
      role: 'USER',
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      department: user.department || 'Khoa Y',
      title: user.title || 'Cán bộ / Giảng viên',
      role: (isAdminUser(user) ? 'ADMIN' : 'USER') as UserRole,
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update) User
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Vui lòng điền đầy đủ Họ tên và Email', 'warning');
      return;
    }

    try {
      const payload: Partial<User> = {
        id: editingUser?.id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        department: formData.department,
        title: formData.title.trim(),
        role: formData.role,
      };

      const saved = await api.saveUser(payload);

      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === saved.id || u.email.toLowerCase() === saved.email.toLowerCase());
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
      showToast(
        editingUser
          ? `Đã cập nhật thông tin và phân quyền cho ${saved.name}!`
          : `Đã thêm tài khoản mới và phân quyền cho ${saved.name}!`
      );
    } catch (err: any) {
      console.error('Error saving user:', err);
      showToast(err.message || 'Lỗi khi lưu thông tin người dùng', 'error');
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser.id || targetUser.email.toLowerCase() === currentUser.email.toLowerCase()) {
      showToast('Bạn không thể xóa tài khoản của chính mình!', 'warning');
      setDeleteConfirmUser(null);
      return;
    }

    try {
      const currentList = api.getUsers ? await api.getUsers() : users;
      const nextList = currentList.filter((u) => u.id !== targetUser.id);
      localStorage.setItem('ctump_users_cache', JSON.stringify(nextList));
      setUsers(nextList);
      setDeleteConfirmUser(null);
      showToast(`Đã xóa tài khoản "${targetUser.name}" khỏi hệ thống.`);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xóa người dùng', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>PHÒNG KH&CN — QUẢN TRỊ VIÊN HỆ THỐNG</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">Đồng bộ MySQL & Google</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản trị Người dùng & Phân quyền Hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin trực tiếp gán vai trò <span className="font-semibold text-emerald-800">Quản trị viên (Admin)</span> hoặc <span className="font-semibold text-blue-800">Thầy / Cô (Cán bộ - Giảng viên)</span> để kiểm soát quyền tiền kiểm, lập hồ sơ và ký số.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadUsers}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm & Phân quyền người dùng</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">Tổng tài khoản</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-emerald-200 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-semibold text-emerald-800">Quản trị viên (Admin)</div>
            <div className="text-xl font-bold text-emerald-950 mt-0.5">{stats.adminCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-blue-200 bg-blue-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-semibold text-blue-800">Thầy / Cô (Giảng viên)</div>
            <div className="text-xl font-bold text-blue-950 mt-0.5">{stats.userCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <span className="text-base">👨‍🏫</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-medium text-slate-500">Đơn vị / Khoa trực thuộc</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.departments}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, đơn vị..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Vai trò:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">🛡️ Quản trị viên (Admin)</option>
              <option value="USER">👨‍🏫 Thầy / Cô (User)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium hidden sm:inline">Đơn vị:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px] truncate"
            >
              <option value="ALL">Tất cả đơn vị</option>
              {CTUMP_DEPARTMENT_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Người dùng</th>
                <th className="py-3 px-4">Đơn vị / Khoa</th>
                <th className="py-3 px-4">Chức vụ / Học vị</th>
                <th className="py-3 px-4">Vai trò hiện tại</th>
                <th className="py-3 px-4">Phân quyền thao tác</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Không tìm thấy người dùng phù hợp với bộ lọc</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUserAdmin = isAdminUser(user);
                  const isSelf = user.id === currentUser.id || user.email?.toLowerCase() === currentUser.email?.toLowerCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${isUserAdmin ? 'bg-emerald-700' : 'bg-blue-800'}`}>
                            {user.name ? user.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isSelf && (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[220px]" title={user.department}>
                            {user.department || 'Chưa cập nhật'}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 text-slate-600">
                        <span>{user.title || user.jobTitle || 'Cán bộ'}</span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span>Quản trị viên (Admin)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300 rounded-full">
                            <span>👨‍🏫</span>
                            <span>Thầy / Cô (User)</span>
                          </span>
                        )}
                      </td>

                      {/* Role Switcher Action */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRoleChange(user, 'USER')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              !isUserAdmin
                                ? 'bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs font-bold'
                                : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                            title="Gán vai trò Thầy / Cô: lập hồ sơ, xem hồ sơ cá nhân"
                          >
                            👨‍🏫 Thầy / Cô
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRoleChange(user, 'ADMIN')}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              isUserAdmin
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs font-bold'
                                : 'text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                            title="Gán vai trò Admin: tiền kiểm, thẩm định, trình ký cấp trường"
                          >
                            🛡️ Admin
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(user)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Thêm / Sửa Người dùng & Phân quyền */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingUser ? 'Chỉnh sửa & Phân quyền Người dùng' : 'Thêm Người dùng & Phân quyền'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUser ? 'Cập nhật chức vụ, đơn vị và vai trò quyền hạn' : 'Tạo mới tài khoản và phân quyền thao tác'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: PGS. TS. Nguyễn Văn A"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ví dụ: nva@ctump.edu.vn"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn vị / Khoa
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {CTUMP_DEPARTMENT_GROUPS.map((g) => (
                      <optgroup key={g.group} label={g.group}>
                        {g.items.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chức danh / Học vị
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ví dụ: Giảng viên chính / Trưởng Khoa"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Role selection radio cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phân quyền vai trò hệ thống <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      formData.role === 'USER'
                        ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                        <span>👨‍🏫</span>
                        <span>Thầy / Cô (User)</span>
                      </span>
                      <input
                        type="radio"
                        name="role"
                        checked={formData.role === 'USER'}
                        onChange={() => setFormData({ ...formData, role: 'USER' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Lập hồ sơ CGCN, nộp hồ sơ, tải PDF chuẩn để ký Khoa, xem hồ sơ cá nhân.
                    </p>
                  </label>

                  <label
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      formData.role === 'ADMIN'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Quản trị viên (Admin)</span>
                      </span>
                      <input
                        type="radio"
                        name="role"
                        checked={formData.role === 'ADMIN'}
                        onChange={() => setFormData({ ...formData, role: 'ADMIN' })}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Tiền kiểm hồ sơ, duyệt hợp lệ thể thức, điều phối ký số cấp Trường, ban hành QĐ.
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  {editingUser ? 'Lưu thay đổi' : 'Tạo & Phân quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận xóa người dùng */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Xác nhận xóa tài khoản?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa người dùng <strong className="text-slate-800">{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email}) khỏi hệ thống?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteConfirmUser)}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
