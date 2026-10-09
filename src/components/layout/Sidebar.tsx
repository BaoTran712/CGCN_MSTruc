import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FilePlus,
  FolderOpen,
  ClipboardCheck,
  FileCode2,
  TableProperties,
  LogOut,
  Building2,
  Shield,
  UserCheck,
} from 'lucide-react';
import { ActiveNavTab, User } from '../../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onNavigate: (tab: ActiveNavTab) => void;
  currentUser: User;
  pendingCount: number;
  myDossierCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  pendingCount,
  myDossierCount,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'admin';

  interface NavItem {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }

  // Navigation tinh gọn theo đúng 2 role:
  // 1. Cán bộ trường: Tổng quan, Hồ sơ của tôi, Tạo hồ sơ, Danh mục biểu mẫu
  // 2. Admin (Duy nhất 1 tài khoản): Tổng quan, Duyệt hồ sơ, Quản lý biểu mẫu Word, Lịch sử & Google Sheets
  const navItems: NavItem[] = isAdmin
    ? [
        {
          id: 'dashboard',
          label: 'Tổng quan hệ thống',
          icon: LayoutDashboard,
        },
        {
          id: 'pending_approval',
          label: 'Duyệt & Quản lý hồ sơ',
          icon: ClipboardCheck,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'bg-amber-500 text-white font-bold',
        },
        {
          id: 'template_management',
          label: 'Quản lý biểu mẫu Word',
          icon: FileCode2,
        },
        {
          id: 'history_sheets',
          label: 'Lịch sử & Google Sheets',
          icon: TableProperties,
        },
      ]
    : [
        {
          id: 'dashboard',
          label: 'Tổng quan',
          icon: LayoutDashboard,
        },
        {
          id: 'my_dossiers',
          label: 'Hồ sơ của tôi',
          icon: FolderOpen,
          badge: myDossierCount > 0 ? myDossierCount : undefined,
          badgeColor: 'bg-blue-600 text-white font-semibold',
        },
        {
          id: 'create_dossier',
          label: 'Tạo hồ sơ mới',
          icon: FilePlus,
        },
        {
          id: 'templates',
          label: 'Danh mục Biểu mẫu',
          icon: FileSpreadsheet,
        },
      ];

  const handleItemClick = (id: ActiveNavTab) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* CTUMP Logo & Brand Title */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 shrink-0 bg-slate-950">
          <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
            CTU
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs uppercase tracking-wider text-white truncate">
              ĐH Y DƯỢC CẦN THƠ
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              Hệ thống DocuGov
            </span>
          </div>
        </div>

        {/* User Card: Simple 2-role identifier */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/50">
          <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Tài khoản</span>
              <span
                className={`inline-flex items-center gap-1 font-sans px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  isAdmin
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-blue-950 text-blue-300 border border-blue-800'
                }`}
              >
                {isAdmin ? 'Quản trị viên' : 'Cán bộ trường'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-100 truncate">
              {currentUser.name}
            </p>
            <p className="text-[10.5px] font-mono text-slate-400 truncate">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isAdmin ? 'Quản trị & Phê duyệt' : 'Chức năng Cán bộ'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors cursor-pointer group ${
                  isActive
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer with Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/60 rounded-md border border-rose-900/40 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất khỏi hệ thống</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
