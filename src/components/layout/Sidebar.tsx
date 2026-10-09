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
  Users,
  FileSignature,
} from 'lucide-react';
import { ActiveNavTab, User } from '../../types';
import logoUrl from '../../assets/logo.png';

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

  // Toàn bộ tính năng mở sẵn cho việc kiểm thử hệ thống (không bị rào cản phân quyền)
  const navSections: NavSection[] = [
    {
      title: 'Hồ sơ & Nghiệp vụ',
      items: [
        {
          id: 'dashboard',
          label: 'Tổng quan hệ thống',
          icon: LayoutDashboard,
        },
        {
          id: 'create_dossier',
          label: 'Tạo hồ sơ mới',
          icon: FilePlus,
        },
        {
          id: 'my_dossiers',
          label: 'Danh sách hồ sơ',
          icon: FolderOpen,
          badge: myDossierCount > 0 ? myDossierCount : undefined,
        },
        {
          id: 'templates',
          label: 'Danh mục Biểu mẫu',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'Thẩm định & Tiếp nhận',
      items: [
        {
          id: 'pending_approval',
          label: 'Duyệt & Quản lý hồ sơ',
          icon: ClipboardCheck,
          badge: pendingCount > 0 ? pendingCount : undefined,
          badgeColor: 'bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold',
        },
        {
          id: 'secretary_queue',
          label: 'Tiếp nhận Văn thư',
          icon: FileSignature,
        },
        {
          id: 'history_sheets',
          label: 'Lịch sử & Google Sheets',
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
          id: 'departments',
          label: 'Cơ cấu Phòng ban',
          icon: Building2,
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
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-800 shrink-0 bg-slate-950">
          <div className="w-9 h-9 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 ring-1 ring-slate-700/60 shadow-xs">
            <img
              src={logoUrl || '/logo.png'}
              alt="ĐH Y Dược Cần Thơ"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-xs uppercase tracking-wide text-white truncate">
              ĐH Y DƯỢC CẦN THƠ
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              Hệ thống DocuGov
            </span>
          </div>
        </div>

        {/* User Profile: Clean & Minimalist */}
        <div className="px-3.5 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200 text-xs font-semibold shrink-0">
              {currentUser.name.split(' ').slice(-1)[0]?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-slate-100 truncate">
                  {currentUser.name}
                </span>
                <span
                  className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.2 rounded shrink-0 bg-blue-950 text-blue-300 border border-blue-800/60"
                >
                  Toàn quyền test
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-mono truncate mt-0.5">
                {currentUser.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-r transition-colors cursor-pointer group ${
                      isActive
                        ? 'border-l-2 border-blue-500 bg-slate-800/80 text-white font-medium pl-2.5'
                        : 'border-l-2 border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white pl-2.5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          item.badgeColor
                            ? item.badgeColor
                            : isActive
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
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

        {/* Footer with Reset */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded border border-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Làm mới phiên kiểm thử</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
