# Hoàn thiện vòng trả lại bản ký/minh chứng — 19/11/2026

Đã bổ sung thao tác Admin trả lại bản ký/minh chứng không hợp lệ, theo nhánh PENDING_SIGNED_REVIEW → VALIDATED đã có. Không thay đổi ma trận trạng thái, nội dung/phiên bản biểu mẫu hay luồng trả sửa nội dung 1a/2a.

## Hành vi

- Admin nhập lý do, backend kiểm tra quyền/trạng thái và lưu việc trả lại, audit, metadata file và email trong cùng transaction. Gửi mail theo outbox sau commit.
- Người nộp thấy lý do tại bước tải lại, chọn riêng PDF Mẫu 1a/Mẫu 2a và minh chứng. File đúng trong lượt hiện tại có thể được giữ lại. Hai PDF ký phải khác nhau, tồn tại thật và đúng định dạng; PDF minh chứng không bị nhận nhầm thành bản ký.
- Lượt nộp cũ và file của từng lượt vẫn xem/tải được bởi chủ hồ sơ hoặc Admin. Tham chiếu attachments bảo vệ file cũ khỏi cleanup; lịch sử được lưu tại timeline_logs và audit metadata, không tạo thêm phiên bản biểu mẫu.
- API và giao diện chặn nộp đè khi hồ sơ đang chờ duyệt. Cập nhật trạng thái chung về bước tải lại cũng phải có lý do và đi qua xử lý audit/thông báo. Không thể cập nhật trực tiếp các mảng file bằng API cập nhật chung.
- Bộ file cũ chưa phân loại đủ 1a/2a không được chuyển trình ký/hoàn tất trực tiếp từ bước chờ duyệt. Admin cần trả lại để người nộp chọn đúng hai bản ký; không tự đoán thứ tự file lịch sử.
- Lỗi xác thực file/dữ liệu không để lại upload mới bị bỏ rơi. Khi xem file vừa chọn, dùng File/Blob trực tiếp; URL xem trước được giải phóng sau khi đóng.

## Bảo toàn nghiệp vụ

Không tăng current_version, không mở sửa lại biểu mẫu đã duyệt và không sinh lại/ghi đè bộ tài liệu khi trả/tải lại minh chứng. Hai trạng thái duyệt 1a/2a, dữ liệu form, signature_config và các file tài liệu sinh trước đó được đối chiếu trong kiểm thử. Quyền USER/ADMIN và các bước trình ký/lưu trữ giữ theo ma trận hiện có.

## Kiểm tra

- 13 unit/regression tests, gồm trường multipart 1a/2a/evidence và thông báo theo lượt nộp.
- 28 nhóm tình huống API/MySQL: cả vòng trả lại/nộp lại, vai trò/quyền file, metadata/audit/email, rollback khi audit lỗi, lưu qua restart, file thiếu/sai/trùng, file cũ và cleanup, luồng 1a/2a/trình ký/lưu trữ hiện có.
- 4 kiểm tra render giao diện thực bằng fixture: nút Admin, khóa upload lúc chờ, lý do/ô chọn riêng/lịch sử sau trả lại, đóng upload và giữ lịch sử sau nộp lại. Các thao tác tải xuống không được thực thi trong kiểm tra render.
- SQL SOURCE trên database mới: schema đầy đủ, chạy lại không ghi đè dữ liệu, không đánh dấu schema thiếu là sẵn sàng; toàn bộ workflow chạy trên database SOURCE.
- SMTP/outbox được kiểm thử riêng bằng máy chủ cục bộ; các kiểm thử workflow dùng MAIL_DISABLED=true. Không phát thư kiểm thử ra ngoài hoặc tạo hồ sơ trên database chính.

Không đổi schema nên không cần chạy lại SOURCE hoặc reset dữ liệu. Khi đưa bản sửa sang máy server, cập nhật đồng thời frontend/backend, chạy npm run build, khởi động lại backend và tải lại trang. Đây là thay đổi định dạng multipart để phân loại rõ hai bản ký.
