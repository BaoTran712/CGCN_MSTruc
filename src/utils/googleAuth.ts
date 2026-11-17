export function getGoogleOriginIssue(origin: string): string | null {
  let url: URL;
  try { url = new URL(origin); }
  catch { return 'Địa chỉ ứng dụng không hợp lệ để đăng nhập Google.'; }

  const hostname = url.hostname.toLowerCase();
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (!loopback && (/^[0-9.]+$/.test(hostname) || hostname.includes(':'))) {
    return 'Google không chấp nhận địa chỉ IP này. Hãy mở hệ thống bằng URL HTTPS đã đăng ký với Google.';
  }
  if (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) {
    return 'Đăng nhập Google cần URL HTTPS. HTTP chỉ dùng được với localhost khi kiểm thử trên chính máy này.';
  }
  if (!loopback && (!hostname.includes('.') || hostname.endsWith('.local'))) {
    return 'Đăng nhập Google cần tên miền HTTPS hợp lệ đã đăng ký với Google.';
  }
  return null;
}
