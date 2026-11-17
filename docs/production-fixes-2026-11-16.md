# Kết quả sửa lỗi production — 16/11/2026

Đã sửa các lớp kết nối, lưu trữ, xác thực, truyền file và khởi chạy. Bản production cục bộ đã chạy, đăng nhập admin thành công và đọc được hồ sơ từ MySQL thật.

## Truy cập bản đang chạy

- Máy này: http://localhost:5001
- Máy khác cùng mạng: http://192.168.2.2:5001
- Thông tin đăng nhập ban đầu: .local/initial-login.txt. File này bị loại khỏi Git.
- Tiến trình được khởi động ẩn; thông tin tiến trình và log nằm trong .local/production-process.json, .local/production.stdout.log, .local/production.stderr.log.

Đã khởi tạo mật khẩu ngẫu nhiên cho một ADMIN hiện có chưa có mật khẩu. Không đổi role, email, hồ sơ hoặc nội dung nghiệp vụ. Các tài khoản khác vẫn giữ nguyên; có thể đặt mật khẩu qua lệnh user:password trong README hoặc đăng nhập bằng Google đã xác minh.

## Những lỗi đã sửa

| Nhóm | Kết quả |
| --- | --- |
| Kết nối | API dùng /api cùng origin; đồng bộ cổng và proxy; production phục vụ frontend đã build cùng backend. |
| Lưu dữ liệu | Loại bỏ thành công giả bằng localStorage/RAM; lỗi API/SQL được trả về rõ ràng. Cache hồ sơ cũ trong trình duyệt không bị tự xóa. |
| Transaction | Hồ sơ, phiên bản, audit và thông báo email ghi trong transaction; lỗi ghi phiên bản làm rollback hồ sơ. |
| Đồng thời | Sequence MySQL cấp mã nguyên tử; UUID tránh trùng ID; khóa theo hồ sơ chống cập nhật chồng nhau. |
| Migration | Nâng cấp schema cũ theo hướng bổ sung, giữ các cột và bản ghi cũ; schema.sql không còn DROP database/bảng hoặc chèn tài khoản demo. |
| Dữ liệu tương thích | Bổ sung các trường name/code, dữ liệu 1a/2a và bảng còn thiếu; chuẩn hóa URL server/uploads thành /uploads ở các trường tương thích mới. Trạng thái cũ được nhận diện bằng alias khi đọc. |
| Xác thực | Kiểm tra mật khẩu scrypt hoặc Google ID token ở backend; bỏ đăng nhập chỉ bằng email và dev token. |
| Quyền | Lấy role từ database mỗi request; chặn quyền tự khai trong body, đọc/sửa hồ sơ và tải file của người khác. Thu hồi quyền có hiệu lực cả với JWT đã phát. |
| Workflow | Backend kiểm tra đúng ma trận chuyển trạng thái đã có ở frontend; chặn bỏ bước và sửa hồ sơ đã lưu trữ. |
| Upload | Gửi nội dung file bằng multipart, kiểm tra định dạng và nội dung; PDF ký chính có trong danh sách file đã lưu. |
| PDF ký | Trả nguyên file ký đã upload; không ghi đè file chính thức bằng bản export xem trước; báo lỗi khi file ký bị mất. |
| Phiên bản | Giữ file cũ; lưu snapshot hai biểu mẫu/cấu hình để rollback bền vững; bỏ lần resubmit thừa sau rollback trên giao diện. |
| Cleanup | Bỏ cleanup tự động khi startup; mặc định chỉ đọc/báo cáo; không xóa hồ sơ theo ID test hoặc trạng thái nháp. |
| Email | Outbox MySQL gửi sau commit, thử lại khi lỗi, trạng thái PENDING/SENT/FAILED đúng thực tế; không mô phỏng SENT. Đường dẫn đính kèm tương đối để chuyển máy chủ. |
| Vận hành | Readiness kiểm tra schema; startup dừng khi schema chưa sẵn sàng; xử lý UTC/MySQL timezone; backup có checksum và múi giờ; restore chỉ vào database trống. |
| Giao diện | Bỏ chuyển vai trò demo, chờ server xác nhận trước khi hiện trạng thái thành công, hiển thị lỗi tải dữ liệu và gửi email. |

## Phạm vi nghiệp vụ được giữ nguyên

- Biểu mẫu 1a/2a, dữ liệu trường biểu mẫu, nội dung tài liệu và quy tắc mapping Word.
- Ma trận quyền/chuyển trạng thái của src/services/workflowEngine.ts. Bộ test đối chiếu tất cả cặp trạng thái theo USER/ADMIN với policy backend.
- Trả sửa riêng 1a/2a, giữ biểu mẫu đã được duyệt; thứ tự nộp, thẩm định, upload bản ký, chuyển Hiệu trưởng và lưu trữ.
- Hành vi lưu hồ sơ hiện có: không tự đổi “lưu hồ sơ” thành một quy trình nháp khác.
- Quyền/tài khoản/dữ liệu cũ trong database. Không nhập snapshot SQL demo hoặc tự chuyển dữ liệu localStorage thành hồ sơ đã được duyệt.

Các kiểm tra quyền và trạng thái được thực thi tại backend theo quy tắc đang có, thay cho việc chỉ dựa vào giao diện.

## Bảo toàn dữ liệu thực tế

Backup trước migration:

backups/ctump_docugov-2026-11-16T08-37-13-974Z/

Bản sao chứa schema cũ, toàn bộ dữ liệu và uploads, checksum và múi giờ +07:00 của lần chụp. Quy trình backup mới chuẩn hóa session sang UTC trước khi chụp; restore đọc timezone trong metadata.

Kết quả đối chiếu:

- 22 bản ghi cũ giữ nguyên tất cả giá trị; audit ID số được giữ cùng giá trị khi đổi sang kiểu chuỗi.
- 4 người dùng vẫn gồm 2 ADMIN, 2 USER.
- Hồ sơ thực tế vẫn là 1; không tạo hồ sơ kiểm thử trên database chính.
- 9 file có sẵn giữ nguyên checksum SHA-256.
- 5 bản ghi file lịch sử được giữ và đưa vào bảng tương thích attachments.

Có 5 file lịch sử vốn không tồn tại trong thư mục upload đầu vào:

- /uploads/docx/CGCN-2026-0001_ToTrinh_1a_v1.docx
- /uploads/docx/CGCN-2026-0001_ToTrinh_1a_v2.docx
- /uploads/docx/CGCN-2026-0001_KeHoach_2a_v1.docx
- /uploads/docx/CGCN-2026-0001_KeHoach_2a_v2.docx
- /uploads/pdf/1793673225612-Load_Balancing_in_the_Cloud.pdf

Các file đang có thuộc bộ CGCN-2026-0006, nên không tự gán chúng vào hồ sơ CGCN-2026-0001. Cần bản gốc/bản sao phù hợp để phục hồi những file lịch sử này; không thể tạo lại chữ ký đã mất từ dữ liệu biểu mẫu. Tham chiếu cũ và file hiện có đều được giữ lại.

## Kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript | npm run lint qua |
| Build production | npm run build qua |
| Unit/regression | 10 test qua |
| Tích hợp API/MySQL | 20 nhóm tình huống qua trên database/upload riêng |
| Migration cũ | Chạy được, chạy lại không trùng dữ liệu, đối chiếu từng giá trị cũ |
| Cài mới | Không có tài khoản/hồ sơ demo; có hai biểu mẫu chính thức |
| Restore | Phục hồi đầy đủ dữ liệu/timestamp, đúng cả khi múi giờ khác; từ chối ghi đè database có sẵn |
| Production thực tế | HTTP 200 frontend/assets/readiness; login admin thật; API trả hồ sơ MySQL; API vô danh trả 401 |
| File vật lý | Giữ nguyên 9 checksum của uploads gốc |

Các test tích hợp dùng các phiên HTTP độc lập trên cùng máy kiểm thử, có restart tiến trình backend thật. Chưa thực hiện thao tác trực tiếp trên hai máy vật lý. Kết quả chi tiết nằm trong .local/integration-results.json và .local/production-verification.json.

Dockerfile đã được bổ sung cho triển khai Linux nhưng chưa build image trong môi trường này vì Docker engine chưa chạy. Build hiện còn cảnh báo kích thước bundle; không có lỗi build.

## Cấu hình cần hoàn tất khi triển khai chính thức

- Tại lần kiểm tra 16/11, SMTP_PASS còn trống. Đã cấu hình và kiểm tra gửi thật ngày 17/11; xem [kết quả sửa SMTP](mail-fix-2026-11-17.md).
- APP_URL cần là URL người dùng truy cập. Google OAuth cần client ID khớp frontend/backend và origin được đăng ký trên Google Cloud.
- Với máy chủ công khai, cấu hình HTTPS và lưu trữ uploads/backup bền vững.
- Phục hồi đúng 5 file lịch sử còn thiếu nếu cần xem/tải chúng.

Hướng dẫn lệnh cài đặt, chạy production, đặt mật khẩu, backup và restore đã cập nhật trong README.md.
