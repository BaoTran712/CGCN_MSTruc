export function normalizeSmtpSettings(settings) {
  const host = String(settings.host || '').trim();
  const user = String(settings.user || '').trim();
  let pass = String(settings.pass || '').trim();
  // Google displays app passwords in groups separated by spaces.
  if (host.toLowerCase() === 'smtp.gmail.com') pass = pass.replace(/\s+/g, '');
  return { ...settings, host, user, pass, port: Number(settings.port), secure: Boolean(settings.secure) };
}

export function getSmtpReadiness(settings, disabled = false) {
  const smtp = normalizeSmtpSettings(settings);
  if (disabled) return { ready: false, code: 'SMTP_DISABLED', message: 'Gửi email đang tạm dừng (MAIL_DISABLED=true).' };
  if (!smtp.host) return { ready: false, code: 'SMTP_HOST_MISSING', message: 'Chưa cấu hình SMTP_HOST.' };
  if (!Number.isInteger(smtp.port) || smtp.port < 1 || smtp.port > 65535) return { ready: false, code: 'SMTP_PORT_INVALID', message: 'SMTP_PORT không hợp lệ.' };
  if (!smtp.user) return { ready: false, code: 'SMTP_USER_MISSING', message: 'Chưa cấu hình SMTP_USER — tài khoản gửi email của hệ thống.' };
  if (!smtp.pass) return { ready: false, code: 'SMTP_PASSWORD_MISSING', message: 'SMTP_PASS đang trống. Điền mật khẩu ứng dụng của tài khoản SMTP_USER trong server/.env rồi nạp lại backend.' };
  return { ready: true, code: 'SMTP_CONFIGURED', message: 'Đã có cấu hình SMTP; cần kiểm tra kết nối và xác thực.' };
}

export function smtpTransportOptions(settings) {
  const smtp = normalizeSmtpSettings(settings);
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: !smtp.secure && !['127.0.0.1', 'localhost', '::1'].includes(smtp.host),
    auth: { user: smtp.user, pass: smtp.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  };
}

export function smtpErrorMessage(error) {
  if (error.code === 'EAUTH') return 'SMTP từ chối xác thực. Kiểm tra SMTP_USER và mật khẩu ứng dụng của đúng tài khoản đó; đăng nhập Google trên website không cấp quyền gửi SMTP.';
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ESOCKET', 'EDNS', 'ENOTFOUND'].includes(error.code)) return 'Không kết nối được máy chủ SMTP. Kiểm tra hostname, cổng, TLS và kết nối mạng.';
  return error.message || 'Không gửi được email qua SMTP.';
}
