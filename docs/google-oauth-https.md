# Google Sign-In qua HTTPS — 16/11/2026

Đã tạo URL HTTPS riêng cho CGCN và người dùng đã xác nhận đăng nhập Google thành công. Lấy URL đang dùng bằng `npm run share:https` hoặc đọc `.local/google-origins.txt`; không dùng lại một URL Quick Tunnel cũ trong lịch sử chat.

Máy A và máy B đều mở URL này. Cloudflare Tunnel chuyển yêu cầu tới backend http://127.0.0.1:5001 trên máy chủ hiện tại; cả hai phiên dùng chung MySQL.

## Nguyên nhân

Địa chỉ http://192.168.2.2:5001 truy cập được ứng dụng qua LAN nhưng không hợp lệ làm Google OAuth JavaScript origin. Localhost là ngoại lệ để kiểm thử trên chính máy đang mở trình duyệt; thêm localhost trên Google Cloud không làm IP LAN của máy khác trở thành origin hợp lệ.

Google hướng dẫn thêm đúng hostname/scheme vào Authorized JavaScript origins; thử trên máy chủ cục bộ dùng cả http://localhost và http://localhost:5001.

Nguồn: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## Cấu hình đã hoàn tất

- Đã mở Cloudflare Quick Tunnel riêng; không dùng hoặc thay đổi URL workers.dev của project khác.
- Binary cloudflared 2026.11.0 lấy từ bản phát hành chính thức của Cloudflare trên GitHub và được kiểm tra SHA-256.
- APP_URL và ALLOWED_ORIGINS trong server/.env đã cập nhật sang URL HTTPS trên.
- Frontend tiếp tục gọi /api cùng origin; không gọi về localhost của máy B.
- Backend đã được khởi động lại để nạp cấu hình mới.
- Google Cloud đã được người dùng thêm origin HTTPS và lưu đúng OAuth client.
- Người dùng đã xác nhận đăng nhập Google thành công.

Thêm URL HTTPS do lệnh in ra cùng các origin localhost sau:

~~~text
http://localhost
http://localhost:5001
~~~

Client ID phải trùng giữa Google Cloud, VITE_GOOGLE_CLIENT_ID ở root .env và GOOGLE_CLIENT_ID ở server/.env. Không cần thêm đường dẫn /api vào origin. Luồng hiện tại nhận Google credential qua JavaScript callback và xác minh tại backend.

Danh sách để sao chép: .local/google-origins.txt.

## Các sửa đổi hỗ trợ Google

- Referrer-Policy dùng no-referrer-when-downgrade cho localhost, strict-origin-when-cross-origin cho tên miền.
- Cross-Origin-Opener-Policy dùng same-origin-allow-popups để cửa sổ đăng nhập liên lạc được với ứng dụng.
- Giao diện phát hiện IP LAN/HTTP không hợp lệ và báo rõ nguyên nhân.
- Không còn chờ dịch vụ Google vô hạn khi script không tải được.
- Không dùng Client ID dự phòng hardcode để che cấu hình còn thiếu.
- Lint, build và 11 test hồi quy đã qua. HTTPS đã kiểm tra được trang, assets, API trạng thái và việc chặn hồ sơ vô danh bằng 401.

Không thay đổi biểu mẫu, quyền nghiệp vụ, dữ liệu hồ sơ hay thứ tự xét duyệt/trình ký trong lần sửa này.

## Vận hành URL tạm trên máy này

Backend và cloudflared phải tiếp tục chạy; máy chủ cần có kết nối Internet. Đóng trình duyệt không làm dừng backend hoặc tunnel.

~~~powershell
npm run share:https
~~~

Lệnh trên dùng binary đã chuẩn bị trong .local/bin, kiểm tra đúng executable, lệnh và thời điểm tạo tiến trình trước khi tái sử dụng tunnel. PID bị hệ điều hành dùng lại không còn làm script nhận nhầm một ứng dụng khác là tunnel. Nếu tiến trình cũ đã dừng, lệnh tạo tunnel mới, có thể nhận URL khác. Khi URL đổi:

1. Thêm origin mới vào đúng OAuth client trên Google Cloud và lưu.
2. Nạp lại APP_URL/ALLOWED_ORIGINS bằng cách khởi động lại backend.
3. Mở URL HTTPS mới trên cả hai máy.

Thông tin tiến trình: .local/tunnel-process.json.
Log: .local/tunnel.stderr.log và .local/tunnel.stdout.log.

Quick Tunnel chỉ dùng cho kiểm thử, không có cam kết uptime và hostname thay đổi khi tạo tunnel mới. Khi triển khai chính thức, cần hostname ổn định bằng Cloudflare Tunnel có cấu hình hoặc máy chủ HTTPS/tên miền riêng.

Nguồn: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
