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
  Users,
  FileSignature,
  X,
} from 'lucide-react';
import { ActiveNavTab, User } from '../../types';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onNavigate: (tab: ActiveNavTab) => void;
  currentUser?: User;
  pendingCount: number;
  myDossierCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  pendingCount,
  myDossierCount,
  mobileOpen,
  onCloseMobile,
  onLogout,
  onSignOut,
}) => {
  interface NavItem {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  // Toàn bộ tính năng mở sẵn cho việc kiểm thử hệ thống
  const navSections: NavSection[] = [
    {
      title: 'Cán bộ / Đề xuất',
      items: [
        {
          id: 'dashboard',
          label: 'Tổng quan hệ thống',
          icon: LayoutDashboard,
        },
        {
          id: 'create_dossier',
          label: 'Tạo hồ sơ CGCN (Web Form)',
          icon: FilePlus,
        },
        {
          id: 'my_dossiers',
          label: 'Hồ sơ của tôi',
          icon: FolderOpen,
          badge: myDossierCount > 0 ? myDossierCount : undefined,
        },
        {
          id: 'templates',
          label: 'Danh mục Biểu mẫu chuẩn',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'Phòng KH&CN / Thẩm định',
      items: [
        {
          id: 'pending_approval',
          label: 'Tiền kiểm hồ sơ (Admin)',
          icon: ClipboardCheck,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
        },
        {
          id: 'secretary_queue',
          label: 'Trình ký & Ban hành QĐ',
          icon: FileSignature,
        },
        {
          id: 'history_sheets',
          label: 'Audit Trail & Báo cáo BGH',
          icon: TableProperties,
        },
      ],
    },
    {
      title: 'Cấu hình & Quản trị',
      items: [
        {
          id: 'template_management',
          label: 'Cấu hình Biểu mẫu Word',
          icon: FileCode2,
        },
        {
          id: 'users',
          label: 'Tài khoản người dùng',
          icon: Users,
        },
      ],
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
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container - Light Blue Palette */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#edf4fc] text-slate-700 flex flex-col border-r border-blue-200/80 shadow-xs transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: MENU */}
        <div className="pt-6 pb-2.5 px-5 flex items-center justify-between shrink-0">
          <span className="font-bold text-sm tracking-widest uppercase text-blue-950">
            MENU
          </span>
          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-500 hover:text-slate-800 lg:hidden rounded-md transition-colors cursor-pointer"
              title="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-blue-900/60">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-blue-100/70 hover:text-blue-950 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-blue-600 group-hover:text-blue-700'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-blue-700 text-white'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer with Reset & Logout */}
        <div className="p-3.5 space-y-1.5">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:text-blue-900 bg-white hover:bg-blue-50/80 rounded-lg border border-blue-200/80 shadow-2xs transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-blue-600" />
              <span>Làm mới phiên kiểm thử</span>
            </button>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
