import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { Shield, UserCheck, AlertCircle, ArrowRight, CheckCircle2, Info } from 'lucide-react';
import logoUrl from '../assets/logo.png';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCustomEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();

    if (!email) {
      setErrorMsg('Vui lòng nhập địa chỉ email @ctump.edu.vn.');
      return;
    }

    if (!email.endsWith('@ctump.edu.vn')) {
      setErrorMsg('Hệ thống chỉ chấp nhận tài khoản email nội bộ của Trường Đại học Y Dược Cần Thơ có đuôi @ctump.edu.vn.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      if (email === 'admin@ctump.edu.vn') {
        onLoginSuccess(MOCK_USERS.admin);
      } else {
        const username = email.replace('@ctump.edu.vn', '');
        const formattedName = username
          .split(/[._-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

        const canBoUser: User = {
          id: `usr-${username}`,
          name: formattedName || 'Cán bộ Trường ĐH Y Dược Cần Thơ',
          title: 'Cán bộ / Giảng viên',
          department: 'Trường Đại học Y Dược Cần Thơ',
          email: email,
          phone: '0912 345 678',
          role: 'USER',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
        };
        onLoginSuccess(canBoUser);
      }
    }, 350);
  };

  const handleQuickLogin = (userType: 'can_bo' | 'admin') => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsLoading(false);
      if (userType === 'admin') {
        onLoginSuccess(MOCK_USERS.admin);
      } else {
        onLoginSuccess(MOCK_USERS.can_bo || MOCK_USERS.employee);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      {/* Official Top Institutional Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-white p-0.5 flex items-center justify-center ring-1 ring-slate-200 shrink-0 shadow-2xs">
              <img src={logoUrl || '/logo.png'} alt="CTUMP Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 leading-none">
                BỘ Y TẾ
              </p>
              <h1 className="text-sm font-bold text-blue-950 uppercase tracking-tight leading-snug">
                TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
              </h1>
              <p className="text-[11.5px] text-slate-600 leading-none">
                Hệ thống Quản lý Biểu mẫu & Trình ký Trực tuyến (DocuGov)
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cổng xác thực nội bộ SSO</span>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Title */}
          <div className="space-y-1.5 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sử dụng tài khoản thư điện tử của Nhà trường (<span className="font-mono text-slate-700">@ctump.edu.vn</span>) để truy cập.
            </p>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Standard Email Input Form */}
          <form onSubmit={handleCustomEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email-input" className="block text-xs font-semibold text-slate-700">
                Email công vụ (@ctump.edu.vn)
              </label>
              <input
                id="email-input"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="hovaten@ctump.edu.vn"
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng nhập với email trường'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Hoặc chọn tài khoản thử nghiệm
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Quick Demo Login Cards - Clean Enterprise Design */}
          <div className="space-y-2">
            {/* Account 1: Cán bộ trường */}
            <button
              type="button"
              onClick={() => handleQuickLogin('can_bo')}
              className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                  CB
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    ThS. Nguyễn Văn Nam
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-medium border border-blue-200">
                      Cán bộ trường
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    nvnam@ctump.edu.vn
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Vào ngay &rarr;
              </span>
            </button>

            {/* Account 2: Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  AD
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    TS. Lê Hoàng Quân
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium border border-emerald-200">
                      Admin duyệt hồ sơ
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    admin@ctump.edu.vn
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                Vào ngay &rarr;
              </span>
            </button>
          </div>

          {/* Institutional note */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-500 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Trường hợp chưa được cấp hòm thư @ctump.edu.vn hoặc quên mật khẩu, vui lòng liên hệ Trung tâm Công nghệ thông tin để được hỗ trợ.
            </span>
          </div>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto space-y-1">
          <p className="font-medium text-slate-700">
            © 2026 TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
          </p>
          <p className="text-[11px]">
            Địa chỉ: Số 179, đường Nguyễn Văn Cừ, phường An Khánh, quận Ninh Kiều, TP. Cần Thơ | Điện thoại: (0292) 3 739 730
          </p>
        </div>
      </footer>
    </div>
  );
};
