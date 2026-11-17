# Làm mới dữ liệu trước khi sử dụng — 17/11/2026

Thực hiện theo phạm vi người dùng chọn: xóa dữ liệu nghiệp vụ, giữ cả 6 tài khoản. Không sửa logic ứng dụng trong bước này.

Đã xóa khỏi database đang chạy: 2 hồ sơ, 1 bản ghi phiên bản, 8 audit, 4 nhật ký mail, 5 attachments, 5 bản ghi dossier_files và bộ đếm mã hồ sơ. Những email đã phát trước reset không thể bị thu hồi từ hộp thư người nhận.

Đã chuyển 15 file upload cũ ra khỏi thư mục phục vụ của ứng dụng, giữ tại backup. Thư mục uploads hiện có đủ docx/pdf/signed/evidence và không có file. Bộ cấp mã thật đã được thử trong transaction rồi rollback; hồ sơ mới đầu tiên sẽ mang mã CGCN-2026-0001.

Giữ nguyên 6 tài khoản (3 ADMIN, 3 USER), thông tin và quyền, mật khẩu đã có, 2 biểu mẫu, 7 đơn vị, schema/migration và cấu hình Google/SMTP/HTTPS. Đã tăng token_version để thu hồi các phiên cũ; cần tải lại trang và đăng nhập lại.

Backup cuối, chụp sau khi dừng backend:

`backups/ctump_docugov-2026-11-17T02-00-08-855Z/`

- database.json và database.sha256: dữ liệu/schema trước reset, checksum đã đối chiếu.
- uploads/ và uploads.sha256.json: bản sao 15 file cùng checksum.
- archived-uploads/: cây thư mục upload gốc đã chuyển ra khỏi hệ thống đang chạy.
- reset-result.json: kết quả thao tác và số lượng sau reset.

Backup đã phục hồi thử vào database riêng và so sánh từng giá trị của tất cả bảng trước khi xóa. Hai phương án reset cũng đã kiểm thử trên database riêng. Không drop hoặc ghi đè schema/database chính; các thao tác xóa bản ghi thực hiện trong transaction, không tắt khóa ngoại.

Sau khi khởi động lại: HTTPS/localhost và readiness trả 200, MySQL sẵn sàng, hồ sơ vô danh trả 401. Đăng nhập ADMIN bằng mật khẩu cũ thành công. API trả 0 hồ sơ, 0 mail, 6 tài khoản và 2 biểu mẫu. Đã đối chiếu lại từng giá trị của tài khoản/danh mục với backup; log lỗi backend trống.

URL vẫn giữ https://gamecube-maple-thru-frozen.trycloudflare.com. Đây là tunnel tạm; hostname ổn định và việc thay mật khẩu ứng dụng SMTP đã xuất hiện trong chat vẫn cần hoàn tất cho vận hành chính thức.

Kết quả kiểm tra cục bộ: .local/reset-result.json, .local/reset-live-verification.json. Script reset một lần đã đánh dấu hoàn tất và chặn chạy lại với cùng phê duyệt.
