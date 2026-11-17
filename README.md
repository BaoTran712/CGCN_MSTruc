# CTUMP DocuGov — Quản lý hồ sơ CGCN

Ứng dụng quản lý biểu mẫu 1a/2a, xét duyệt và trình ký. Production dùng một backend chung và MySQL làm nguồn dữ liệu chính. Lỗi API/SQL được báo rõ; hồ sơ không được lưu thay thế vào trình duyệt hoặc RAM.

## Chạy trên máy này

Database hiện có đã được nâng cấp bảo toàn dữ liệu. Cấu hình API dùng cổng 5001. Chạy:

~~~powershell
npm run build
npm start
~~~

Mở http://localhost:5001. Máy B truy cập cùng địa chỉ IP/tên miền của máy chạy backend, ví dụ http://IP_MAY_CHU:5001. Cả hai máy dùng cùng hệ thống; không chạy database/backend riêng trên từng máy.

Thông tin đăng nhập ban đầu, nếu đã tạo bằng bootstrap, nằm tại .local/initial-login.txt và không được đưa vào Git. Mật khẩu mẫu trước đây không còn được chấp nhận.

## Cài đặt trên máy chủ khác

Yêu cầu Node.js 24 và MySQL 8+. Trên Linux, cài font Liberation Serif (gói fonts-liberation), hoặc cấu hình FONT_DIR chứa đủ bốn font thường/đậm/nghiêng/đậm nghiêng. Windows dùng Times New Roman đã có trên hệ điều hành.

~~~powershell
npm run setup
~~~

Lệnh setup cài dependency frontend/backend, tạo file .env nếu chưa có và tạo JWT_SECRET riêng nếu chưa cấu hình. Giữ nguyên cấu hình đã tồn tại.

Điền server/.env:

- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME: database dùng chung.
- PORT: mặc định 5001.
- APP_URL: URL thật mà người dùng truy cập, dùng cho liên kết thông báo.
- GOOGLE_CLIENT_ID: cùng OAuth Client ID với VITE_GOOGLE_CLIENT_ID trong .env ở root.
- SMTP_USER, SMTP_PASS, SMTP_FROM: thông tin gửi mail thật.
- UPLOAD_DIR: thư mục lưu trữ bền vững; mặc định server/uploads.
- JWT_SECRET: giá trị riêng tối thiểu 32 ký tự; setup đã tạo nếu thiếu.

Đăng ký origin production và localhost trong Google Cloud OAuth client. Google ID token được xác minh ở backend, không giới hạn tên miền email. Với tài khoản đã có, quyền lấy từ database; ADMIN_EMAILS chỉ áp dụng khi tạo tài khoản Google đã xác minh lần đầu.

~~~powershell
npm run db:migrate
npm run check:db
npm run user:password -- --email admin@your-domain.example --role ADMIN
npm run build
npm start
~~~

Lệnh user:password hỏi mật khẩu mới và không hiển thị khi nhập. Tài khoản mới nhận role được chỉ định; tài khoản đã tồn tại giữ nguyên quyền. Mật khẩu từ 12 ký tự, lưu bằng scrypt; thay mật khẩu thu hồi các phiên cũ.

## Khởi tạo database mới bằng MySQL SOURCE

File `server/init-production.sql` là bản SQL độc lập cho MySQL 8+, gồm schema runtime hoàn chỉnh, bảng xác thực/bộ đếm/outbox/migration, hai biểu mẫu và danh mục đơn vị. Không tạo tài khoản, mật khẩu hay hồ sơ demo; không chèn thông tin người đứng đầu/liên hệ giả. File này dành cho database mới, không thay thế migration khi nâng cấp schema cũ.

Đăng nhập MySQL bằng `mysql -u root -p`, sau đó chạy tại dấu nhắc `mysql>` (đổi đường dẫn theo máy, dùng dấu `/` trên Windows):

~~~sql
SOURCE C:/Users/Admin/Documents/CGCN_MSTruc/server/init-production.sql;
~~~

File tự tạo và chọn database `ctump_docugov`. Nếu dùng tên khác, sửa hai dòng `CREATE DATABASE` và `USE` đầu file, đồng thời đặt `DB_NAME` trong `server/.env` trùng tên đó. Kết quả cuối cần là `READY`. Sau khi đặt đúng `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, chạy `npm run check:db` và `npm start`.

Tài khoản Google đã xác minh được tạo khi đăng nhập theo cấu hình quyền hiện có. Để tạo ADMIN đăng nhập Email/Mật khẩu, dùng `npm run user:password -- --email email-cua-ban@example.com --role ADMIN`; mật khẩu được nhập ẩn. SQL khởi tạo không sao chép tài khoản từ laptop cũ.

Khi cần xuất lại file: `npm run db:sql`; tên database tùy chọn: `npm run db:sql -- --database ten_database`. Kiểm tra file bằng MySQL SOURCE thật và quy trình API trên database riêng: `npm run test:sql` (SMTP bị tắt khi kiểm thử quy trình).

Production phục vụ frontend đã build, API và file qua cùng cổng. Đặt HTTPS/reverse proxy ở máy chủ công khai. Nếu dùng proxy, cấu hình APP_URL, ALLOWED_ORIGINS và TRUST_PROXY tương ứng môi trường thật.

Mặc định `TRUST_PROXY=loopback` phù hợp cloudflared/nginx chạy trên cùng máy. Proxy ở máy khác cần khai báo đúng IP/CIDR được tin cậy; truy cập trực tiếp có thể đặt `TRUST_PROXY=false`. Bộ đếm đăng nhập tách theo IP người dùng qua proxy và không trừ lượt khi đăng nhập thành công hoặc dịch vụ gặp lỗi. Không đặt tin cậy toàn bộ proxy. Cách chọn proxy theo [hướng dẫn Express](https://expressjs.com/en/guide/behind-proxies/).

## Migration và sao lưu

npm run db:migrate nâng cấp bổ sung schema cũ, giữ lại cột cũ, hồ sơ, người dùng, quyền, trạng thái, lịch sử và timestamp. Mỗi lần nâng cấp database đã có sẽ tạo backup trước trong backups/<database>-<timestamp>/:

- database.json: cấu trúc và dữ liệu, có múi giờ của bản sao.
- database.sha256: checksum.
- uploads/: bản sao các file đang có trên đĩa.

Không dùng file ctump_docugov_backup.sql cũ để ghi đè dữ liệu hiện tại. db:import đã chuyển thành alias của migration an toàn. schema.sql là cấu trúc tham chiếu; nâng cấp database hiện có phải dùng db:migrate.

~~~powershell
npm run db:backup
node server/scripts/restoreDb.js backups/<thu-muc>/database.json --database ctump_docugov_restore
~~~

Restore kiểm tra checksum và chỉ ghi vào database trống; không xóa hay thay thế database đang có. Chọn database phục hồi riêng, kiểm tra dữ liệu và bản sao uploads trước khi chuyển cấu hình sử dụng.

Server không dọn dữ liệu khi startup. API cleanup mặc định chỉ báo cáo; không xóa hồ sơ. File phiên bản cũ được giữ lại để xem lịch sử.

## Email và file ký

Thông báo được lưu trong MySQL cùng transaction nghiệp vụ. Worker gửi sau commit và thử lại khi SMTP lỗi; trạng thái thực là PENDING, SENT hoặc FAILED. Thiếu SMTP không giả lập gửi thành công. Trạng thái FAILED sau năm lần thử cần quản trị viên kiểm tra nguyên nhân.

API hoàn tất khi dữ liệu và thông báo đã được lưu bền vững, không chờ SMTP trả lời. Worker được đánh thức sau commit và kiểm tra lại hàng đợi mỗi 30 giây; khi dừng backend có kiểm soát, worker chờ ghi nhận kết quả thư đang gửi trước khi đóng MySQL. Một thư lỗi không chặn các thư tiếp theo.

Với Gmail, đặt `SMTP_USER` và mật khẩu ứng dụng của chính tài khoản đó vào `SMTP_PASS` trong `server/.env`; mật khẩu đăng nhập Google trên website không thay thế cấu hình SMTP. Hướng dẫn của Google: [tạo mật khẩu ứng dụng](https://support.google.com/accounts/answer/185833?hl=vi). Không đưa mật khẩu vào mã nguồn, log hoặc chat.

Chạy `npm run check:smtp` để kiểm tra kết nối/TLS và xác thực; lệnh này không gửi email. Sau khi cập nhật cấu hình, khởi động lại backend để nạp biến môi trường mới. Worker sẽ tự gửi các email PENDING, vì vậy cần kiểm tra người nhận và nội dung đang chờ trước khi bật SMTP trên dữ liệu cũ. Gmail dùng cổng 587 với `SMTP_SECURE=false` (STARTTLS), hoặc cổng 465 với `SMTP_SECURE=true`. `SENT` nghĩa là máy chủ SMTP chấp nhận email, không phải xác nhận người nhận đã đọc hoặc email đã vào Inbox.

Lệnh `npm run test:mail` kiểm thử xác thực, lỗi SMTP và tệp đính kèm bằng máy chủ SMTP cục bộ, không gửi thư ra ngoài.

File ký và minh chứng được gửi bằng multipart, lưu trên server và kiểm tra quyền khi tải. File PDF cuối đã upload được giữ nguyên nội dung khi tải/xuất, gồm chữ ký có trong file. Hệ thống không thay thế file ký đã mất bằng PDF sinh lại từ biểu mẫu.

Cần sao lưu MySQL cùng UPLOAD_DIR; chỉ sao lưu một phía không đủ phục hồi hồ sơ đầy đủ. Dữ liệu tham chiếu tới file đã mất trước khi sửa phải được phục hồi từ nguồn/bản sao gốc hoặc upload lại đúng file.

## Development và kiểm thử

~~~powershell
npm run dev:all
npm run lint
npm test
npm run test:login
npm run test:mail
npm run test:outbox
npm run test:runtime
npm run test:migration
npm run test:integration
~~~

Development dùng Vite tại cổng 3000, proxy tới cổng backend trong server/.env. Production dùng npm start, không chạy Vite dev server.

test:migration tạo database riêng có tiền tố ctump_docugov_verify_, sao chép dữ liệu, kiểm tra migration và đối chiếu dữ liệu cũ. test:integration dùng bản sao đó, thư mục upload riêng, tắt SMTP và kiểm tra các phiên đăng nhập độc lập, luồng 1a/2a, file thật, transaction, quyền, mã đồng thời và restart. Không chạy các thao tác ghi kiểm thử lên database chính.

## Docker

Dockerfile build frontend và backend, cài font tiếng Việt và chạy bằng user node. Ví dụ:

~~~powershell
docker build --build-arg VITE_GOOGLE_CLIENT_ID=<client-id> -t ctump-docugov .
docker run --rm --env-file server/.env -e DB_HOST=<mysql-host> -v <thu-muc-upload>:/app/server/uploads -v <thu-muc-backup>:/app/backups ctump-docugov npm run db:migrate
docker run -d --name ctump-docugov --env-file server/.env -e DB_HOST=<mysql-host> -p 5001:5001 -v <thu-muc-upload>:/app/server/uploads -v <thu-muc-backup>:/app/backups ctump-docugov
~~~

Mount thư mục upload và backup có quyền ghi cho user node. Truyền credential bằng môi trường; chúng không được đóng gói vào image.

## Google Sign-In khi truy cập từ hai máy

IP LAN dùng để truy cập ứng dụng nhưng không phải Google OAuth origin hợp lệ. CGCN đã có URL HTTPS kiểm thử riêng; xem [hướng dẫn Google/HTTPS](docs/google-oauth-https.md). Trên máy này, npm run share:https in URL tunnel hiện tại và danh sách origin cần đăng ký. Hai máy phải mở cùng URL HTTPS để dùng Google và chung MySQL.
