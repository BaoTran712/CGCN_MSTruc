import React, { useState } from 'react';
import {
  Plus,
  Shield,
  Building2,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { User, ActiveNavTab } from '../../types';
import { isAdminUser } from '../../constants';
import logoUrl from '../../assets/logo.png';

interface HeaderProps {
  currentUser: User;
  onNavigate: (tab: ActiveNavTab) => void;
  activeTab: ActiveNavTab;
  pendingCount: number;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onNavigate,
  activeTab,
  pendingCount,
  onSignOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = isAdminUser(currentUser);

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
        return 'Tiền kiểm hồ sơ (Admin)';
      case 'secretary_queue':
        return 'Trình ký & Ban hành QĐ';
      case 'history_sheets':
        return 'Audit Trail & Báo cáo BGH';
      case 'users':
        return 'Quản lý & Phân quyền User';
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

      {/* Zone 2: Role Badge & User Profile */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        {isAdmin ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Quản trị viên (Admin)</span>
            <span className="sm:hidden">Admin</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300 rounded-full shadow-2xs">
            <span className="text-xs">👨‍🏫</span>
            <span className="hidden sm:inline">Thầy / Cô (User)</span>
            <span className="sm:hidden">Thầy / Cô</span>
          </span>
        )}

        {/* User Card & Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left cursor-pointer"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${isAdmin ? 'bg-emerald-700' : 'bg-blue-800'}`}>
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
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-50 p-2.5 animate-in fade-in zoom-in-95 duration-100 space-y-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1.5">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] font-mono text-slate-500 truncate">{currentUser.email}</p>
                {currentUser.department && (
                  <p className="text-[11px] text-slate-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.department}</span>
                  </p>
                )}
                <div className="pt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-bold border ${
                      isAdmin
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300'
                    }`}
                  >
                    {isAdmin ? '🛡️ Quản trị viên (Admin - Phòng KH&CN)' : '👨‍🏫 Thầy / Cô (Cán bộ / Giảng viên)'}
                  </span>
                </div>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-md flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100 pt-2"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span className="font-medium">Đăng xuất tài khoản</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* CTA theo vai trò */}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => onNavigate('pending_approval')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tiền kiểm hồ sơ</span>
            <span className="sm:hidden">Tiền kiểm</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('create_dossier')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tạo hồ sơ mới</span>
            <span className="sm:hidden">Tạo</span>
          </button>
        )}
      </div>
    </header>
  );
};
