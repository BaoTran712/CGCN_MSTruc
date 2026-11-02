import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Shield,
  Building2,
  LogOut,
  ChevronDown,
  Bell,
  CheckCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSignature,
  Send,
  Mail,
} from 'lucide-react';
import { User, ActiveNavTab, Application } from '../../types';
import { isAdminUser } from '../../constants';
import { normalizeStatus } from '../../services/workflowEngine';
import logoUrl from '../../assets/logo.png';

interface HeaderProps {
  currentUser: User;
  onNavigate: (tab: ActiveNavTab) => void;
  activeTab: ActiveNavTab;
  pendingCount: number;
  dossiers?: Application[];
  onSelectDossier?: (dossier: Application) => void;
  onSignOut?: () => void;
}

interface HeaderNotificationItem {
  id: string;
  dossier: Application;
  code: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'action' | 'email';
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onNavigate,
  activeTab,
  dossiers = [],
  onSelectDossier,
  onSignOut,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminUser(currentUser);
  const storageKey = `ctump_read_notifs_${currentUser?.id || currentUser?.email || 'default'}`;

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setReadIds(saved ? JSON.parse(saved) : []);
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = useMemo<HeaderNotificationItem[]>(() => {
    const list: HeaderNotificationItem[] = [];

    for (const d of dossiers) {
      const st = normalizeStatus(d.status);
      const ver = d.current_version || d.currentVersion || 1;
      const timeStr =
        d.updatedAt ||
        d.completedAt ||
        d.approvedAt ||
        d.reviewedAt ||
        d.submittedAt ||
        d.createdAt ||
        new Date().toISOString();
      const docTitle =
        d.title ||
        d.formData?.product_name ||
        d.formData?.research_title ||
        d.templateTitle ||
        'Hồ sơ Chuyển giao Công nghệ';

      // 1. Thông báo trạng thái chính của hồ sơ
      if (st === 'RETURNED_FOR_REVISION') {
        const reason =
          d.revision_note ||
          d.revisionNote ||
          d.returnReason ||
          d.reviewNotes ||
          'Đề nghị rà soát và chỉnh sửa lại nội dung đơn.';
        list.push({
          id: `status-${d.id}-returned-v${ver}`,
          dossier: d,
          code: d.code,
          title: `Hồ sơ ${d.code} trả về sửa lỗi (v${ver})`,
          message: `Gợi ý chỉnh sửa: ${reason}`,
          timestamp: timeStr,
          type: 'warning',
        });
      } else if (st === 'SUBMITTED') {
        if (ver > 1) {
          list.push({
            id: `status-${d.id}-resubmitted-v${ver}`,
            dossier: d,
            code: d.code,
            title: isAdmin
              ? `Hồ sơ ${d.code} đã sửa và nộp lại (v${ver})`
              : `Đã nộp lại hồ sơ ${d.code} (v${ver})`,
            message: `${docTitle} đang chờ Admin kiểm tra và duyệt.`,
            timestamp: timeStr,
            type: isAdmin ? 'action' : 'info',
          });
        } else {
          list.push({
            id: `status-${d.id}-submitted-v1`,
            dossier: d,
            code: d.code,
            title: isAdmin
              ? `Hồ sơ mới chờ duyệt: ${d.code} (v1)`
              : `Đã gửi hồ sơ ${d.code} (v1)`,
            message: `${docTitle} — Người nộp: ${d.createdBy?.name || d.formData?.full_name || 'Giảng viên'}.`,
            timestamp: timeStr,
            type: isAdmin ? 'action' : 'info',
          });
        }
      } else if (st === 'VALIDATED') {
        list.push({
          id: `status-${d.id}-validated-v${ver}`,
          dossier: d,
          code: d.code,
          title: `Hồ sơ ${d.code} (v${ver}) đã được duyệt hợp lệ`,
          message: isAdmin
            ? `Đã gửi file PDF chuẩn cho giảng viên để trình ký phòng ban.`
            : `Vui lòng tải file PDF chuẩn đi trình ký phòng ban và upload lại bản ký.`,
          timestamp: timeStr,
          type: 'success',
        });
      } else if (st === 'PENDING_SIGNED_REVIEW') {
        list.push({
          id: `status-${d.id}-signed-upload-v${ver}`,
          dossier: d,
          code: d.code,
          title: isAdmin
            ? `Cần kiểm tra bản ký phòng ban: ${d.code}`
            : `Đã tải lên bản ký phòng ban: ${d.code}`,
          message: `${docTitle} — Chờ kiểm tra trước khi trình ký Hiệu trưởng.`,
          timestamp: timeStr,
          type: isAdmin ? 'action' : 'info',
        });
      } else if (st === 'WAITING_RECTOR_SIGNATURE') {
        list.push({
          id: `status-${d.id}-rector-v${ver}`,
          dossier: d,
          code: d.code,
          title: `Hồ sơ ${d.code} đang chờ ký Hiệu trưởng`,
          message: `${docTitle} đã qua kiểm tra chữ ký phòng ban.`,
          timestamp: timeStr,
          type: 'info',
        });
      } else if (st === 'SIGNED_ARCHIVED') {
        list.push({
          id: `status-${d.id}-archived-v${ver}`,
          dossier: d,
          code: d.code,
          title: `Hoàn tất ký & lưu trữ: ${d.code}`,
          message: `Hồ sơ "${docTitle}" đã được Hiệu trưởng ký ban hành và lưu trữ chính thức.`,
          timestamp: timeStr,
          type: 'success',
        });
      }

      // 2. Thông báo từ lịch sử email (nếu có)
      if (Array.isArray(d.emailLogs)) {
        d.emailLogs.slice(0, 2).forEach((mail: any, idx: number) => {
          const mailId = mail.id || `${d.id}-mail-${idx}-${mail.sentAt || mail.createdAt || ''}`;
          list.push({
            id: `mail-${mailId}`,
            dossier: d,
            code: d.code,
            title: mail.subject || `Thông báo Email hồ sơ ${d.code}`,
            message: `Tới: ${mail.to || mail.recipient || d.applicant_email || 'Giảng viên'}`,
            timestamp: mail.sentAt || mail.createdAt || timeStr,
            type: 'email',
          });
        });
      }
    }

    return list.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime() || 0;
      const tB = new Date(b.timestamp).getTime() || 0;
      return tB - tA;
    });
  }, [dossiers, isAdmin]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)).length,
    [notifications, readIds]
  );

  const displayedNotifications = useMemo(
    () =>
      notifFilter === 'unread'
        ? notifications.filter((n) => !readIds.includes(n.id))
        : notifications,
    [notifications, notifFilter, readIds]
  );

  const markAsRead = (id: string) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem(storageKey, JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getNotifIcon = (type: HeaderNotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'action':
        return <FileSignature className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'email':
        return <Mail className="w-4 h-4 text-indigo-600 shrink-0" />;
      default:
        return <Send className="w-4 h-4 text-blue-600 shrink-0" />;
    }
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
        return 'Tiền kiểm hồ sơ (Admin)';
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

      {/* Zone 2: Role Badge, Notification Bell & User Profile */}
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

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifMenu((prev) => !prev);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-full text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Thông báo hệ thống"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-bold text-slate-900">Thông báo</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Đọc tất cả</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-white">
                <button
                  type="button"
                  onClick={() => setNotifFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    notifFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifFilter('unread')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    notifFilter === 'unread'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {displayedNotifications.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      Không có thông báo nào.
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((item) => {
                    const isRead = readIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          markAsRead(item.id);
                          setShowNotifMenu(false);
                          if (onSelectDossier) {
                            onSelectDossier(item.dossier);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                          !isRead ? 'bg-blue-50/40' : 'bg-white'
                        }`}
                      >
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 shrink-0">
                          {getNotifIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className={`text-xs leading-snug ${
                                !isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                              }`}
                            >
                              {item.title}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatTime(item.timestamp)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
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
