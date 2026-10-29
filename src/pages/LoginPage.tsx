import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import * as api from '../services/api';
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  HelpCircle,
  Shield,
  UserCheck,
} from 'lucide-react';
import { DEFAULT_DEV_USER, DEFAULT_CANBO_USER, ADMIN_EMAIL } from '../constants';
import logoUrl from '../assets/logo.png';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '155584685837-ggv7pj77tb2r1entrs988ocg5qvmpp4t.apps.googleusercontent.com';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Tự động khôi phục tài khoản đã nhớ từ localStorage
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('ctump_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Xử lý đăng nhập thông thường bằng Form (Email & Password)
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Email hoặc Tên tài khoản.');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('ctump_remembered_email', cleanEmail);
      } else {
        localStorage.removeItem('ctump_remembered_email');
      }

      // Xác định quyền Admin hoặc Cán bộ
      const isAdmin =
        cleanEmail === ADMIN_EMAIL.toLowerCase() ||
        cleanEmail === 'admin@ctump.edu.vn' ||
        cleanEmail.includes('admin');

      // Tên hiển thị dự phòng dựa trên email
      let displayName = isAdmin ? 'Quản trị viên KH&CN' : 'Cán bộ / Giảng viên';
      if (cleanEmail === 'canbo@ctump.edu.vn' || cleanEmail.includes('nam')) {
        displayName = 'TS. Nguyễn Văn Nam';
      } else if (cleanEmail.includes('ha') || cleanEmail.includes('thu')) {
        displayName = 'ThS.BS. Lê Thị Thu Hà';
      } else if (cleanEmail.includes('toan') || cleanEmail.includes('khai')) {
        displayName = 'Quản trị viên (Toàn Khải)';
      }

      let user: User;
      try {
        user = await api.login(cleanEmail, {
          name: displayName,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        });
      } catch (backendErr) {
        console.warn('Backend login fallback:', backendErr);
        // Fallback người dùng nội bộ
        if (isAdmin) {
          user = {
            ...DEFAULT_DEV_USER,
            email: cleanEmail,
            name: displayName,
          };
        } else {
          user = {
            ...DEFAULT_CANBO_USER,
            email: cleanEmail,
            name: displayName,
            department: cleanEmail.includes('duoc') ? 'Khoa Dược' : 'Khoa Công nghệ Thông tin',
          };
        }
      }

      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Lỗi đăng nhập:', err);
      setErrorMsg(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  // Nạp nhanh tài khoản mẫu vào form
  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMsg('');
    setInfoMsg(`Đã điền tài khoản: ${fillEmail}. Bấm "Đăng nhập" để tiếp tục.`);
  };

  // Xử lý phản hồi từ Google Identity Services (GIS)
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setErrorMsg('Không nhận được mã xác thực từ Google. Vui lòng thử lại.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleData = JSON.parse(jsonPayload);
      const gEmail = (googleData.email || '').trim().toLowerCase();
      const gName = googleData.name || googleData.given_name || 'Người dùng Google';
      const gAvatar = googleData.picture || '';
      const googleId = googleData.sub || '';

      if (!gEmail) {
        throw new Error('Google không cung cấp địa chỉ email.');
      }

      const isAdmin = gEmail === ADMIN_EMAIL.toLowerCase();

      let user: User;
      try {
        user = await api.login(gEmail, { name: gName, avatar: gAvatar, googleId });
      } catch (backendErr) {
        console.warn('Backend login fallback:', backendErr);
        user = {
          id: `usr-${googleId || Date.now()}`,
          name: gName,
          email: gEmail,
          role: isAdmin ? 'ADMIN' : 'USER',
          title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
          department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Trường Đại học Y Dược Cần Thơ',
          avatar: gAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(gName)}`,
        };
      }

      onLoginSuccess(user);
    } catch (err: any) {
      console.error('Lỗi xác thực Google:', err);
      setErrorMsg(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Khởi tạo nút Google Sign-In
  useEffect(() => {
    let checkInterval: any = null;
    let isMounted = true;

    const renderGoogleBtn = () => {
      if (!isMounted) return;
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,
          });

          setIsGisReady(true);
        } catch (err) {
          console.error('Lỗi khởi tạo nút Google:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderGoogleBtn();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          renderGoogleBtn();
        }
      }, 200);
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800 antialiased">
      {/* Official CTUMP Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-white p-0.5 flex items-center justify-center ring-1 ring-slate-200 shrink-0 shadow-2xs">
              <img
                src={logoUrl || '/logo.png'}
                alt="CTUMP Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-blue-950 uppercase tracking-tight leading-snug">
                TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ
              </h1>
              <p className="text-[11.5px] text-slate-600 leading-none">
                Hệ thống Quản lý Biểu mẫu & Trình ký Trực tuyến (CTUMP DocuGov)
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Cổng xác thực nội bộ</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-md p-6 sm:p-8 space-y-5">
          {/* Form Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs mb-1">
              <LogIn className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs text-slate-500">
              Nhập email và mật khẩu tài khoản trường để tiếp tục
            </p>
          </div>

          {/* Error & Info Notices */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{infoMsg}</div>
            </div>
          )}

          {/* Standard Login Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Tên đăng nhập hoặc Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="canbo@ctump.edu.vn hoặc admin@ctump.edu.vn"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white placeholder:text-slate-400 transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full pl-9 pr-10 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 bg-white placeholder:text-slate-400 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600 cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực thông tin...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ĐĂNG NHẬP</span>
                </>
              )}
            </button>
          </form>

          {/* Quick autofill helper box for testing */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Tài khoản mẫu (Nhấp để tự điền form):</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickFill('canbo@ctump.edu.vn', '123456')}
                className="p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800 group-hover:text-blue-800">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Thầy / Cô</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                  canbo@ctump.edu.vn
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('admin@ctump.edu.vn', 'admin123')}
                className="p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold text-slate-800 group-hover:text-emerald-800">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Quản trị viên</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                  admin@ctump.edu.vn
                </div>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2.5 text-slate-500 font-medium">Hoặc đăng nhập bằng Google</span>
            </div>
          </div>

          {/* Google GIS Button */}
          <div className="flex flex-col items-center justify-center min-h-[44px]">
            <div ref={googleBtnRef} className="w-full flex justify-center"></div>
            {!isGisReady && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang kết nối dịch vụ Google...</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-blue-900 font-bold text-sm">
              <HelpCircle className="w-5 h-5 text-blue-700" />
              <span>Hỗ trợ cấp lại Mật khẩu</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Đối với tài khoản cán bộ, giảng viên Trường ĐH Y Dược Cần Thơ, vui lòng liên hệ:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-700">
              <p><strong>Phòng Khoa học Công nghệ & HTQT</strong></p>
              <p>Email: <span className="font-mono text-blue-700">khcn@ctump.edu.vn</span></p>
              <p>Điện thoại nội bộ: <strong>0292.3831.531 (Số máy lẻ: 104)</strong></p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Đóng thông báo
            </button>
          </div>
        </div>
      )}

      {/* Official CTUMP Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto space-y-0.5">
          <p className="font-semibold text-slate-700">
            © 2026 TRƯỜNG ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
          </p>
          <p className="text-[11px] text-slate-500">
            Hệ thống Quản lý Biểu mẫu & Trình ký Trực tuyến (DocuGov) - Phòng Khoa học Công nghệ & HTQT
          </p>
        </div>
      </footer>
    </div>
  );
};
