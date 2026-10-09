import React, { useState, useEffect } from 'react';
import {
  Plus,
  UserCheck,
  Shield,
  Bell,
  FileText,
  Building2,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { User, UserRole, ActiveNavTab, Notification } from '../../types';
import * as api from '../../services/api';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (role: UserRole) => void;
  onNavigate: (tab: ActiveNavTab) => void;
  activeTab: ActiveNavTab;
  pendingCount: number;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onNavigate,
  activeTab,
  pendingCount,
  onLogout,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'admin';

  useEffect(() => {
    async function loadNotifications() {
      try {
        const notifs = await api.getNotifications(currentUser.id);
        setNotifications(notifs);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadNotifications();
  }, [currentUser.id]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (notifId: string) => {
    await api.markNotificationAsRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  const getTabTitle = (tab: ActiveNavTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Tổng quan';
      case 'templates':
        return 'Danh mục Biểu mẫu';
      case 'create_dossier':
        return 'Tạo hồ sơ trực tuyến';
      case 'my_dossiers':
        return 'Hồ sơ của tôi';
      case 'pending_approval':
        return 'Quản lý & Duyệt hồ sơ';
      case 'history_sheets':
        return 'Lịch sử & Google Sheets';
      case 'template_management':
        return 'Quản lý Biểu mẫu Word XML';
      default:
        return 'Trang chính';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-white border-b border-slate-200 shadow-2xs">
      {/* Zone 1: Brand title & breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-800 flex items-center justify-center text-white font-bold text-base shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 hidden sm:inline">
            CTUMP DocuGov
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <span className="text-slate-400">Trường ĐH Y Dược Cần Thơ</span>
          <span>/</span>
          <span className="font-semibold text-slate-800 truncate">{getTabTitle(activeTab)}</span>
        </div>
      </div>

      {/* Zone 2: Role Switcher & Notifications & User Dropdown */}
      <div className="flex items-center gap-3">
        {/* Quick 2-Role Switcher for testing/demo */}
        <div className="hidden md:flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => onSwitchUser('USER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all cursor-pointer ${
              !isAdmin
                ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tài khoản Cán bộ trường (nvnam@ctump.edu.vn)"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Cán bộ trường</span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchUser('ADMIN')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-all relative cursor-pointer ${
              isAdmin
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Tài khoản Admin duy nhất (admin@ctump.edu.vn)"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
            {pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors cursor-pointer"
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifPopover && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-md border border-slate-200 z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Thông báo quy trình ({notifications.length})
                </span>
                <span className="text-[11px] text-slate-500">{unreadCount} chưa đọc</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Không có thông báo mới.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className={`p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notif.isRead ? 'bg-blue-50/40 font-medium' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(notif.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10.5px] font-mono text-slate-500 leading-tight">
                {currentUser.email}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-md border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="p-2.5 bg-slate-50 rounded-md border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] font-mono text-slate-500">{currentUser.email}</p>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                    isAdmin
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {isAdmin ? 'Quản trị viên (Admin)' : 'Cán bộ trường'}
                </span>
              </div>

              {/* Mobile Quick Switcher */}
              <div className="md:hidden pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchUser(isAdmin ? 'USER' : 'ADMIN');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2"
                >
                  {isAdmin ? <UserCheck className="w-4 h-4 text-blue-700" /> : <Shield className="w-4 h-4 text-emerald-700" />}
                  <span>Chuyển sang {isAdmin ? 'Cán bộ trường' : 'Admin'}</span>
                </button>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create new dossier CTA for Cán bộ */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => onNavigate('create_dossier')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tạo hồ sơ mới</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        )}
      </div>
    </header>
  );
};
