import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import * as api from '../services/api';
import { AlertCircle, Loader2 } from 'lucide-react';
import { DEFAULT_DEV_USER, DEFAULT_CANBO_USER } from '../constants';
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
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGisReady, setIsGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Xử lý phản hồi xác thực từ Google Identity Services
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setErrorMsg('Không nhận được mã xác thực từ Google. Vui lòng thử lại.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Giải mã JWT payload từ Google credential
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const googleData = JSON.parse(jsonPayload);
      const email = (googleData.email || '').trim().toLowerCase();
      const name = googleData.name || googleData.given_name || 'Người dùng Google';
      const avatar = googleData.picture || '';
      const googleId = googleData.sub || '';

      if (!email) {
        throw new Error('Google không cung cấp địa chỉ email.');
      }

      const isAdmin = email === 'toanhkhai12345@gmail.com';

      // Gửi thông tin về backend API để lưu/cập nhật vào CSDL MySQL
      let user: User;
      try {
        user = await api.login(email, { name, avatar, googleId });
      } catch (backendErr) {
        console.warn('Backend login fallback:', backendErr);
        user = {
          id: `usr-${googleId || Date.now()}`,
          name: name,
          email: email,
          role: isAdmin ? 'ADMIN' : 'USER',
          title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
          department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Trường Đại học Y Dược Cần Thơ',
          avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
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

  // Khởi tạo nút Google Sign-In chính thức (GIS)
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
            width: 340,
          });

          setIsGisReady(true);

          // Kích hoạt Google One Tap nếu trình duyệt hỗ trợ
          try {
            window.google.accounts.id.prompt();
          } catch {
            // One Tap optional
          }
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
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800">
      {/* Official Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 shadow-2xs">
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
                Hệ thống Quản lý Biểu mẫu & Trình ký Trực tuyến (DocuGov)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Card Header with Google Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-100 mx-auto p-3 ring-4 ring-slate-100/80">
              <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                Đăng nhập bằng tài khoản Google
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Sử dụng tài khoản Gmail để đăng nhập vào hệ thống
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Google Sign-In Action Area */}
          <div className="py-2 flex flex-col items-center justify-center min-h-[56px]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2.5 py-3 text-xs text-blue-700 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực thông tin tài khoản Google...</span>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center">
                <div
                  ref={googleBtnRef}
                  className="w-full flex justify-center min-h-[44px]"
                ></div>
                {!isGisReady && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải dịch vụ xác thực Google...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2.5 text-slate-500 font-medium">Hoặc đăng nhập nhanh theo vai trò</span>
            </div>
          </div>

          {/* Quick Role-based Login Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onLoginSuccess(DEFAULT_CANBO_USER);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  👨‍🏫
                </span>
                <div className="text-left">
                  <div className="font-bold text-slate-900">Thầy / Cô (Cán bộ - Giảng viên)</div>
                  <div className="text-[11px] text-blue-700/90 font-normal">Quyền: Lập hồ sơ, xem hồ sơ cá nhân, ký Khoa & gửi thẩm định</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform shrink-0">
                Vào ngay →
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLoginSuccess(DEFAULT_DEV_USER);
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  🛡️
                </span>
                <div className="text-left">
                  <div className="font-bold text-slate-900">Quản trị viên (Admin - Phòng KH&CN)</div>
                  <div className="text-[11px] text-emerald-700/90 font-normal">Quyền: Tiền kiểm hồ sơ, duyệt thể thức, điều phối ký số cấp Trường</div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform shrink-0">
                Vào ngay →
              </span>
            </button>
          </div>

          {/* Security Note */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hệ thống phân quyền độc lập theo 2 vai trò: Quản trị viên (Admin - Phòng KH&CN) & Cán bộ / Giảng viên (Thầy / Cô).
            </p>
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
            Hệ thống Quản lý Biểu mẫu & Trình ký Trực tuyến (DocuGov)
          </p>
        </div>
      </footer>
    </div>
  );
};
