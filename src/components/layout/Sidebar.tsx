import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FilePlus,
  FolderOpen,
  ClipboardCheck,
  LogOut,
  X,
} from 'lucide-react';
import { ActiveNavTab, User } from '../../types';
import { isAdminUser } from '../../constants';
import logoUrl from '../../assets/logo.png';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onNavigate: (tab: ActiveNavTab) => void;
  currentUser?: User;
  pendingCount: number;
  myDossierCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  pendingCount,
  myDossierCount,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}) => {
  interface NavItem {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeTone?: 'default' | 'alert';
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const isAdmin = isAdminUser(currentUser);

  const navSections: NavSection[] = [
    {
      title: 'Tổng quan',
      items: [
        {
          id: 'dashboard',
          label: 'Bảng điều khiển',
          icon: LayoutDashboard,
        },
        {
          id: 'templates',
          label: 'Biểu mẫu chuẩn',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'Hồ sơ cá nhân',
      items: [
        {
          id: 'create_dossier',
          label: 'Tạo hồ sơ mới',
          icon: FilePlus,
        },
        {
          id: 'my_dossiers',
          label: 'Hồ sơ của tôi',
          icon: FolderOpen,
          badge: myDossierCount > 0 ? myDossierCount : undefined,
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Quản trị & Xét duyệt',
            items: [
              {
                id: 'pending_approval' as ActiveNavTab,
                label: 'Xét duyệt & Trình ký',
                icon: ClipboardCheck,
                badge: pendingCount > 0 ? pendingCount : undefined,
                badgeTone: 'alert' as const,
              },
            ],
          },
        ]
      : []),
  ];

  const handleItemClick = (id: ActiveNavTab) => {
    onNavigate(id);
    onCloseMobile();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 p-1 flex items-center justify-center border border-slate-200/80 shrink-0">
              <img
                src={logoUrl || '/logo.png'}
                alt="CTUMP Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight text-slate-900 truncate">
                CTUMP DocuGov
              </div>
              <div className="text-[10px] font-medium text-slate-400 truncate">
                Quản lý Hồ sơ CGCN
              </div>
            </div>
          </div>

          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-slate-700 lg:hidden rounded-lg transition-colors cursor-pointer"
              title="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
          {navSections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-xl transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeTone === 'alert'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            : 'bg-slate-100 text-slate-600'
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

        {/* Footer Sign-out */}
        <div className="p-3.5 border-t border-slate-100">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50/70 rounded-xl transition-colors cursor-pointer"
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
