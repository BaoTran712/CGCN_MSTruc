import React, { useState } from 'react';
import {
  Plus,
  UserCheck,
  Shield,
  FileText,
  Building2,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { User, UserRole, ActiveNavTab } from '../../types';
import logoUrl from '../../assets/logo.png';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (role: UserRole) => void;
  onNavigate: (tab: ActiveNavTab) => void;
  activeTab: ActiveNavTab;
  pendingCount: number;
  onLogout?: () => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onNavigate,
  activeTab,
  pendingCount,
  onLogout,
  onSignOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'admin';

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
      default:
        return 'Trang chính';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-white border-b border-slate-200 shadow-2xs">
      {/* Zone 1: Brand title & breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white p-0.5 flex items-center justify-center ring-1 ring-slate-200 shrink-0 shadow-2xs">
            <img src={logoUrl || '/logo.png'} alt="CTUMP Logo" className="w-full h-full object-contain rounded-full" />
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

      {/* Zone 2: Role Switcher & User Dropdown */}
      <div className="flex items-center gap-3">
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
                    currentUser.email?.trim().toLowerCase() === 'toanhkhai12345@gmail.com' ||
                    currentUser.role === 'ADMIN' ||
                    currentUser.role === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  {currentUser.email?.trim().toLowerCase() === 'toanhkhai12345@gmail.com' ||
                  currentUser.role === 'ADMIN' ||
                  currentUser.role === 'admin'
                    ? 'Quản trị viên (Admin)'
                    : 'Cán bộ / Giảng viên (User)'}
                </span>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Làm mới phiên kiểm thử</span>
                </button>
              )}

              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-md flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Create new dossier CTA */}
        <button
          type="button"
          onClick={() => onNavigate('create_dossier')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tạo hồ sơ mới</span>
          <span className="sm:hidden">Tạo</span>
        </button>
      </div>
    </header>
  );
};
