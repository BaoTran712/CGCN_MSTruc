# Sửa lỗi kỹ thuật — 17/11/2026

Đã nạp bản sửa vào backend cổng 5001. Giữ nguyên biểu mẫu, ma trận quyền/chuyển trạng thái, nội dung hồ sơ, lịch sử phiên bản, người nhận/nội dung email và file ký.

## Các lỗi đã sửa

- Giới hạn đăng nhập không còn gom mọi người dùng qua tunnel vào IP của proxy. Mặc định chỉ tin proxy loopback, có thể cấu hình IP/CIDR hoặc tắt qua TRUST_PROXY. Đăng nhập thành công và lỗi dịch vụ 5xx không còn tiêu tốn hạn mức nhập sai mật khẩu; vẫn chặn sau 30 lần thất bại trong 15 phút, kể cả các yêu cầu đang xác thực.
- Ghi hồ sơ vẫn đợi transaction commit, nhưng không đợi SMTP. Hàng đợi được đánh thức sau commit, tiếp tục kiểm tra mỗi 30 giây và dùng khóa MySQL để chống gửi trùng do nhiều worker. Khi rollback, không phát thư.
- Metadata tệp đính kèm lỗi được ghi nhận và thử lại theo chính sách năm lần hiện có, không làm dừng xử lý các thư tiếp theo.
- Dừng backend có kiểm soát chờ kết quả thư đang gửi được ghi vào database trước khi đóng pool.
- Lỗi mạng trên trình duyệt hướng dẫn kiểm tra danh sách trước khi gửi lại, không khẳng định hồ sơ chưa lưu khi chưa biết kết quả phía server. Thông báo upload phân biệt việc ghi nhận thông báo với việc SMTP đã chấp nhận thư.
- File lịch sử không tồn tại trả 404 với hướng dẫn phục hồi file gốc; URI sai trả 400. Không trả đường dẫn filesystem từ kiểm tra file thiếu.
- Script HTTPS kiểm tra executable, command và thời điểm tạo tiến trình trước khi tái sử dụng; không nhận nhầm PID bị hệ điều hành cấp lại. Tài liệu hướng dẫn lấy URL hiện tại thay cho sao chép URL cũ.

Thiết lập proxy đối chiếu [Express](https://expressjs.com/en/guide/behind-proxies/) và [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/). Không tin toàn bộ header từ mọi kết nối trực tiếp.

## Kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript và build | Qua; còn cảnh báo kích thước bundle |
| Unit/hồi quy cũ | 11 qua, bao gồm đối chiếu ma trận nghiệp vụ frontend/backend |
| SMTP cục bộ | 9 qua, không relay ra ngoài |
| Đăng nhập/proxy | 1 bài với nhiều tình huống IP, giả header, 30 lỗi, đăng nhập thành công, lỗi dịch vụ và hết thời hạn |
| Outbox/MySQL riêng | 6 tình huống qua: SMTP chậm, shutdown, rollback, thư lỗi không chặn hàng đợi, năm lần thử và năm worker đồng thời |
| Runtime/file/tunnel | 2 qua |
| Tích hợp quy trình/MySQL | 21 tình huống qua trên database/upload riêng, SMTP bị tắt |
| Cú pháp backend/script | 66 file qua; git diff --check qua |

Tổng 50 kiểm thử/tình huống. Các bài mail mới chỉ dùng SMTP trên 127.0.0.1, chấp nhận địa chỉ .invalid và lưu thư trong bộ nhớ.

## Bản đang chạy và bảo toàn dữ liệu

Đã tái sử dụng URL https://gamecube-maple-thru-frozen.trycloudflare.com, không đổi origin Google. Sau khi nạp lại backend:

- Localhost và HTTPS đều trả 200 cho frontend, JavaScript và readiness có databaseConnected=true; API hồ sơ vô danh trả 401.
- Kết nối/xác thực Gmail SMTP qua; bước kiểm tra không phát thêm thư. Bốn email cũ vẫn SENT.
- Checksum toàn bộ bản ghi của users, dossiers, dossier_versions, audit_logs, attachments, email_notifications khớp trước/sau. Checksum 15 file uploads giữ nguyên.
- Log lỗi backend trống tại thời điểm kiểm tra.

Bằng chứng tại .local/runtime-integrity-before.json, .local/runtime-integrity-after.json, .local/runtime-live-verification.json và .local/outbox-results.json (gitignored).

## Phần cần dữ liệu/cấu hình bên ngoài

Năm file lịch sử CGCN-2026-0001 không có trong workspace và các bản backup hiện có; đã tìm theo tên gốc. Cần đúng file gốc để phục hồi, đặc biệt file ký. Quick Tunnel vẫn là URL tạm, tên miền ổn định cần cấu hình triển khai riêng. Mật khẩu ứng dụng SMTP đã xuất hiện trong chat cần người dùng thu hồi/tạo lại ở Google, cập nhật riêng server/.env và nạp lại backend.
