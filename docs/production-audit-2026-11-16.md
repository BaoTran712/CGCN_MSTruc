# Báo cáo kiểm tra khả năng chạy production — 16/11/2026

**Kết luận: project hiện chưa đủ điều kiện chạy production.** Có lớp truy cập MySQL thật, nhưng cấu hình và schema thực tế không khớp mã nguồn. Các lỗi bị che bằng localStorage hoặc RAM nên giao diện có thể báo thành công khi dữ liệu chưa được lưu vào database.

Phạm vi kiểm tra: mã nguồn frontend/backend, cấu hình đang dùng, cấu trúc MySQL cục bộ, luồng lưu/đọc hồ sơ, xác thực, dọn dữ liệu và cách khởi chạy. Không thay đổi logic nghiệp vụ, mã nguồn ứng dụng, cấu hình, schema hoặc dữ liệu. File báo cáo này là tài liệu được bổ sung.

## 1. Bằng chứng từ môi trường thực tế

Đã kết nối trực tiếp tới `localhost:3306`, database `ctump_docugov`, bằng truy vấn chỉ đọc. Không gọi `initDb()`, không chạy import SQL và không khởi động server gốc.

| Thành phần | Kết quả quan sát |
| --- | --- |
| MySQL | Kết nối thành công |
| Các bảng đang có | `audit_logs`, `departments`, `dossier_files`, `dossiers`, `users` |
| `dossiers` | 1 hồ sơ; trạng thái `PENDING_PRECHECK` |
| `users` | 4 bản ghi |
| `audit_logs` | 5 bản ghi |
| Bảng backend cần nhưng chưa có | `document_templates`, `dossier_versions`, `attachments`, `email_notifications` |
| Cột `dossiers` | Thực tế 23 cột; `server/schema.sql` định nghĩa 54 cột; thiếu 39 cột trong schema đó và có 8 cột kiểu cũ |
| Cột `users` | Có `full_name`, nhưng thiếu `name`, `title`, `department`, `avatar`, `is_active` mà mã nguồn hiện tại sử dụng |
| Cột `audit_logs` | Thiếu `notes`, `metadata`; đang có `comment` |
| Cấu hình frontend đang dùng | `VITE_API_BASE_URL=/api` |
| Cấu hình backend được nạp | `PORT=5000`, `NODE_ENV=development` |
| Proxy Vite | `/api` và `/uploads` cùng trỏ tới `http://localhost:5001` |
| JWT | Đang sử dụng secret mặc định trong mã nguồn |
| SMTP | Có user, chưa có password |
| API cục bộ tại thời điểm kiểm tra | Các cổng `3000`, `5000`, `5001` đều trả `ECONNREFUSED` |
| File upload hiện có | 9 file; không thay đổi trong quá trình kiểm tra |

Hai truy vấn chỉ đọc đã xác nhận trực tiếp lỗi schema:

```sql
SELECT code FROM dossiers LIMIT 1;
-- ER_BAD_FIELD_ERROR: bảng thực tế dùng tracking_code, chưa có code.

SELECT d.id
FROM dossiers d
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN document_templates t ON d.template_id = t.id
LIMIT 1;
-- ER_NO_SUCH_TABLE: chưa có document_templates.
```

Việc truy cập API bị từ chối ở trên chỉ mô tả thời điểm kiểm tra; không phải bằng chứng rằng các dịch vụ chưa từng chạy khi người dùng test.

## 2. Những lỗi chặn production

### P1 — Schema đang dùng là phiên bản khác với backend

Vị trí: `server/src/repositories/dossierRepository.js:13`, `:266`; `server/src/config/database.js:89`, `:110`, `:131`, `:140`.

Backend đọc hồ sơ bằng JOIN với `document_templates` và các cột người dùng như `name`, `title`, `department`. Database thực tế thiếu các thành phần đó. Lệnh INSERT hồ sơ cũng sử dụng hàng loạt cột chưa có, gồm `code`, `title`, `template_id`, `applicant_email`, dữ liệu 1a/2a và đường dẫn tài liệu.

Các giá trị ENUM trạng thái cũng lệch nhau: database hiện có `DRAFT`, `PENDING_PRECHECK`, `NEEDS_REVISION`, `PRECHECK_PASSED`, `EVIDENCE_UPLOADED`, `SCHOOL_PROCESSING`, `COMPLETED`; backend hiện ghi các trạng thái như `SUBMITTED`, `VALIDATED`, `PENDING_SIGNED_REVIEW`, `WAITING_RECTOR_SIGNATURE`, `SIGNED_ARCHIVED`.

`initDb()` chỉ kiểm tra có bảng `dossiers` hay chưa, sau đó cố bổ sung ba cột. Ví dụ câu ALTER đầu tiên yêu cầu `AFTER status_2a`, nhưng database thực tế chưa có `status_2a`. Lỗi bị bỏ qua và `isConnected` vẫn được đặt thành `true`. Do đó `databaseConnected: true` chưa chứng minh schema dùng được.

**Hệ quả:** kết nối MySQL thành công nhưng API không đọc/ghi được hồ sơ theo cấu trúc hiện tại.

### P1 — Frontend và backend lệch cổng

Vị trí: `vite.config.ts:18`, `:22`; `src/config/api.config.ts:6`; `server/src/utils/config.js:19`; `scripts/dev.js:22`.

Với `.env` hiện tại, frontend gọi `/api` qua Vite; Vite chuyển tới cổng `5001`, còn backend đọc `PORT=5000`. Chạy riêng frontend hoặc chạy `npm start` với các giá trị đang có vẫn gặp cấu hình lệch này, trừ khi môi trường bên ngoài ghi đè PORT.

`.env.example` ở root còn đặt URL tuyệt đối `http://localhost:5001/api`. Nếu dùng giá trị đó cho máy B, trình duyệt sẽ gọi localhost của máy B. Nhánh tự suy ra URL trong `api.config.ts` cũng cố định `http` và cổng `5001`, nên cần cấu hình riêng khi triển khai HTTPS.

**Hệ quả:** có backend/database nhưng trình duyệt có thể không gọi tới đúng backend.

### P1 — Frontend báo thành công bằng dữ liệu localStorage khi API lỗi

Vị trí: `src/services/api.ts:232`, `:273`, `:303`, `:341`, `:578`, `:982`; `src/App.tsx:113`.

Khi API lỗi mạng hoặc trả lỗi HTTP, các hàm tạo/cập nhật có thể bắt lỗi, dựng hồ sơ tại máy người dùng rồi trả kết quả như đã lưu thành công. Đăng nhập cũng có nhánh cấp `dev-token-admin` hoặc `dev-token-user` khi API không hoạt động.

localStorage tách theo trình duyệt và origin. Máy B không đọc được dữ liệu localStorage của máy A. Không thấy cơ chế hàng đợi để đưa các hồ sơ lưu cục bộ này lên server khi kết nối phục hồi; GET danh sách thành công còn ghi đè cache bằng danh sách từ server.

Có thêm một lỗi cụ thể: hồ sơ offline đầu tiên được tạo với ID `dos-2026-0001`, nhưng chính bộ lọc dữ liệu test lại loại ID này tại `src/services/api.ts:33`, `:71`. Kiểm tra cô lập cho thấy hàm tạo trả thành công nhưng cache chứa 0 hồ sơ.

**Hệ quả:** thông báo thành công trên máy A không đảm bảo hồ sơ tồn tại trên server, và có trường hợp hồ sơ vừa tạo không còn trong cache.

### P1 — Backend che lỗi SQL bằng RAM

Vị trí: `server/src/config/database.js:145`, `:163`, `:180`; `server/src/repositories/dossierRepository.js:8`, `:41`, `:328`, `:543`; `server/src/utils/mockStore.js:6`.

Khi mất kết nối hoặc SQL lỗi, repository có các nhánh đọc/ghi `mockStore`. Nhánh CREATE có thể trả một hồ sơ từ RAM ngay cả khi INSERT thất bại. RAM không được ghi bền vững, không chia sẻ giữa các tiến trình và mất khi tiến trình kết thúc.

Kiểm tra cô lập còn cho thấy: nếu INSERT lỗi và trả hồ sơ RAM, nhưng lần GET tiếp theo đọc được ít nhất một hồ sơ SQL, danh sách trả về chỉ chứa dữ liệu SQL, không có hồ sơ RAM vừa báo tạo thành công.

**Lưu ý:** hai máy cùng gọi đúng một tiến trình backend có thể cùng thấy RAM của tiến trình đó. RAM riêng trình duyệt là localStorage; RAM backend là `mockStore`. Đây là hai cơ chế khác nhau, cùng tồn tại trong project.

### P0 — Khởi động server có thể xóa file hiện có khi DB/schema lỗi

Vị trí: `server/src/server.js:61`; `server/src/utils/cleanupGarbageData.js:139`, `:143`, `:152`, `:162`, `:178`.

Server luôn gọi `cleanupGarbageData()` sau `initDb()`. Hàm này thực hiện DELETE hồ sơ theo tiêu chí dữ liệu test, có cả `status = 'DRAFT'`, rồi thu thập các file được hồ sơ tham chiếu. Nếu không kết nối DB, hoặc câu DELETE/SELECT lỗi, danh sách hồ sơ có thể rỗng nhưng bước xóa file vẫn tiếp tục.

Database thực tế thiếu `code`, nên câu DELETE trong cleanup có thể lỗi ngay. Khi `mockStore` mới khởi tạo cũng rỗng, file upload hiện có có nguy cơ bị coi là file mồ côi.

Đã kiểm chứng hai tình huống bằng filesystem giả: DB không kết nối và truy vấn lỗi schema; cả hai đều yêu cầu xóa toàn bộ bốn file giả trong bốn thư mục upload. **Không chạy cleanup trên filesystem hoặc database thật.**

### P0 — Xác thực và phân quyền còn cơ chế demo có thể bị vượt qua

Vị trí: `src/pages/LoginPage.tsx:106`, `:157`, `:179`; `server/src/controllers/userController.js:44`; `server/src/services/userService.js:26`, `:32`; `server/src/routes/dossierRoute.js:11`; `server/src/middlewares/authMiddleware.js:67`.

- Form yêu cầu nhập password nhưng không gửi password tới backend. Backend login cấp token dựa trên email và dữ liệu client gửi, chưa kiểm tra mật khẩu.
- Đăng nhập Google giải mã payload tại frontend rồi gửi email/Google ID; backend chưa xác minh Google ID token.
- Email chứa chuỗi `admin` có thể được cấp quyền ADMIN. Tình huống này đã tái hiện ở service, không cần thông tin chứng minh danh tính.
- Router hồ sơ dùng `optionalAuth`, nên các API danh sách, chi tiết, tạo và nhiều thao tác cập nhật không bắt buộc token. Controller/service đọc hồ sơ không lọc theo người sở hữu; việc lọc ở màn hình không thay thế được phân quyền API.
- Khi `req.user` không có, `requireAdmin()` chấp nhận `adminUser`, `user` hoặc `reviewer` từ request body. Đã tái hiện middleware cho phép quyền ADMIN từ body không có token, với `nodeEnv = production`.
- `/uploads` đang được phục vụ trực tiếp bằng `express.static`, không có middleware kiểm tra quyền tải file (`server/src/server.js:16`).

Chỉ đổi `NODE_ENV=production` không xử lý hết các đường vượt quyền trên. Chưa sửa những hành vi này trong lần kiểm tra.

### P1 — Import/khởi tạo SQL hiện có không phải migration bảo toàn dữ liệu

Vị trí: `server/schema.sql:10`, `:13`; `server/ctump_docugov_backup.sql:23`, `:27`; `server/scripts/importDb.js:11`; `server/src/config/database.js:67`, `:89`.

`schema.sql` có DROP TABLE; file backup có DROP DATABASE và dữ liệu snapshot. Cả hai chỉ định tên `ctump_docugov` bên trong SQL. Script import ưu tiên file backup, không phải một tập lệnh nâng cấp schema hiện tại.

Do đó không thể xử lý schema lệch bằng cách chạy ngay `npm run db:import` trên dữ liệu đang có. Lệnh `check:db` cũng gọi `initDb()`, nên không phải công cụ chẩn đoán thuần chỉ đọc.

### P2 — Các điểm vận hành cần hoàn thiện

- `npm start` ở root chạy `scripts/dev.js`, khởi động Vite dev server và Node watch. Build frontend chưa kèm cấu hình phục vụ production/reverse proxy trong project.
- Chưa có bộ kiểm thử tích hợp lưu bền vững, hai phiên độc lập và restart trong mã nguồn được kiểm tra. `npm run lint` chỉ kiểm tra TypeScript ở `src`, loại trừ backend.
- SMTP đang thiếu password; mailer trả `success: true, simulated: true` khi không gửi thật. Email service vẫn suy ra trạng thái `SENT` từ `success`. Nguồn: `server/src/utils/mailer.js:93`, `:149`; `server/src/services/emailService.js:291`.
- Mã hồ sơ được cấp bằng `MAX + 1` tách khỏi INSERT, chưa có transaction/khóa để chống hai yêu cầu đồng thời lấy cùng mã. Lỗi trùng mã lại có thể đi vào nhánh RAM. Nguồn: `server/src/repositories/dossierRepository.js:82`, `:266`, `:328`.
- `saveApplicationDraft()` hiện gọi `submitApplication()` (`src/services/api.ts:345`). Ghi nhận để đối chiếu yêu cầu về lưu nháp; không thay đổi hành vi nghiệp vụ này.
- README hướng dẫn chạy `server/scripts/run_init.js`, nhưng file đó không tồn tại trong project được kiểm tra.

## 3. Giải thích hiện tượng máy A có hồ sơ, máy B không có

Chuỗi lỗi phù hợp với mã nguồn và cấu hình hiện tại:

1. Frontend gọi sai cổng backend, hoặc API gặp lỗi do schema cũ.
2. Frontend bỏ qua lỗi, tạo hồ sơ ở localStorage rồi trả thành công.
3. Máy A nhìn thấy hồ sơ trong state/cache của mình.
4. Máy B có localStorage riêng; đăng nhập admin vẫn không truy cập được hồ sơ chưa từng lên server.

Một chuỗi khác là backend nhận yêu cầu nhưng INSERT lỗi schema và lưu RAM. Hồ sơ sẽ mất sau restart, khác tiến trình backend, hoặc không xuất hiện trong danh sách SQL khi có dữ liệu SQL khác.

Đã xác nhận các mắt xích bằng cấu hình thực tế, truy vấn SQL chỉ đọc và kiểm tra cô lập. Chưa quan sát trực tiếp request của hai máy A/B trong lần test trước, nên không khẳng định chỉ có một chuỗi duy nhất đã xảy ra.

## 4. Kiểm chứng đã thực hiện

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Qua |
| `npm run build -- --outDir <thư mục tạm riêng>` | Qua; có cảnh báo bundle lớn hơn 500 kB |
| `node --check` trên backend và script Node | 43 file, không lỗi cú pháp |
| Kết nối MySQL bằng driver thật | Thành công; dùng SELECT/SHOW, không ghi |
| So sánh schema hiện có với `server/schema.sql` | Xác nhận thiếu bảng/cột và lệch ENUM |
| Hai truy vấn SELECT dùng cấu trúc backend cần | Xác nhận `ER_BAD_FIELD_ERROR` và `ER_NO_SUCH_TABLE` |
| API status cục bộ | Không có dịch vụ nhận kết nối trên ba cổng kiểm tra tại thời điểm đó |
| Thực thi nguồn trong VM cô lập | 11 tình huống tái hiện bên dưới |
| Kiểm tra cấu hình secret | Có secret development mặc định, đang được dùng |

Các tình huống thực thi cô lập gồm: login khi API tắt; hồ sơ offline đầu tiên bị lọc; hai phiên không chia sẻ hồ sơ local; cache local bị thay khi API phục hồi; dữ liệu RAM mất ở ngữ cảnh tiến trình mới; INSERT lỗi vẫn trả thành công rồi không xuất hiện trong GET; admin middleware nhận quyền từ body trong production; login cấp admin theo email; cleanup khi DB tắt; cleanup khi SQL lỗi; init báo kết nối dù ALTER thất bại.

Harness nạp mã nguồn hiện tại bằng Node VM, cô lập localStorage và thay các tác động ngoài bằng đối tượng giả. Đây là kiểm chứng các nhánh thực thi, không phải kiểm thử end-to-end trên hai máy thật. Không gửi email, không gọi API nghiệp vụ ghi, không khởi tạo hay sửa DB, không tạo/xóa file trong `server/uploads`.

## 5. Thứ tự khắc phục đề xuất, giữ nguyên nghiệp vụ

1. **Bảo toàn dữ liệu trước khi chạy lại backend:** sao lưu database hiện tại và toàn bộ uploads; tách hoặc vô hiệu hóa cleanup tự động khi startup; chỉ dọn file khi việc đọc dữ liệu tham chiếu thành công và có quy tắc lưu giữ rõ ràng.
2. **Chốt một backend dùng chung:** thống nhất cổng và API origin; phục vụ frontend production qua HTTPS với proxy `/api`, `/uploads` tới backend chung. Hai máy cùng truy cập một hệ thống và cùng database.
3. **Chuẩn bị migration bảo toàn dữ liệu trên bản sao:** đối chiếu schema cũ với cấu trúc backend; bổ sung bảng/cột, ràng buộc và dữ liệu biểu mẫu. Lập bảng ánh xạ `tracking_code`/`code`, `full_name`/`name`, các trạng thái cũ và đường dẫn trong `dossier_files`; xác nhận ý nghĩa trước khi chuyển đổi. Không dùng DROP/import snapshot để thay thế dữ liệu thật.
4. **Làm lỗi lưu trữ hiển thị đúng:** production phải từ chối thao tác ghi nếu DB/schema không sẵn sàng; frontend báo lỗi và giữ nội dung form để người dùng thử lại. Chỉ báo “đã nộp/đã lưu” sau khi server xác nhận commit. Mọi chế độ demo cần được bật tường minh, tách khỏi production.
5. **Hoàn thiện xác thực và quyền API:** xác minh danh tính phía server; quyền lấy từ nguồn tin cậy; bắt buộc xác thực và kiểm tra sở hữu/quyền trên hồ sơ và file; bỏ quyền từ body và token demo trong production; cấu hình secret riêng.
6. **Đảm bảo tính nhất quán:** cấp mã hồ sơ an toàn khi đồng thời, xử lý transaction/idempotency, lưu phiên bản/audit bền vững, giữ nguyên các điều kiện và bước nghiệp vụ đã được xác nhận.
7. **Hoàn thiện vận hành:** tách lệnh development/production, cấu hình SMTP thật và trạng thái gửi đúng, readiness kiểm tra schema/migration, log lỗi quan sát được, sao lưu DB cùng file và quy trình phục hồi.

Các quy tắc biểu mẫu 1a/2a, nội dung tài liệu, điều kiện xét duyệt và trình tự trình ký phải được giữ nguyên khi xử lý các lớp kỹ thuật trên. Báo cáo này không thực hiện chuyển trạng thái, ánh xạ dữ liệu hay sửa quy tắc đó.

## 6. Điều kiện nghiệm thu sau khi sửa

- Máy A đăng nhập tài khoản cán bộ, tạo hồ sơ; server trả ID/mã và có bản ghi MySQL tương ứng, đúng người tạo.
- Máy B dùng phiên trình duyệt độc lập, đăng nhập admin, thấy đúng ID/mã và tải được cùng tài liệu từ server chung.
- Khởi động lại backend, tải lại cả hai trình duyệt: hồ sơ, trạng thái, dữ liệu 1a/2a và file vẫn còn.
- Khi DB không truy cập được hoặc schema sai: readiness không đạt, thao tác ghi báo lỗi rõ ràng; không tạo hồ sơ thành công cục bộ hoặc xóa file.
- Hai yêu cầu tạo đồng thời không trùng mã và không làm hồ sơ rơi vào RAM.
- Yêu cầu không có token, token giả và request tự khai `role: ADMIN` đều bị từ chối trên API được bảo vệ; cán bộ không đọc/sửa được hồ sơ người khác.
- Luồng nộp, trả sửa từng biểu mẫu, nộp lại, duyệt, tải bản ký và lưu trữ cho kết quả nghiệp vụ như trước; dữ liệu tồn tại trong DB sau mỗi bước.
- Đối chiếu số lượng và nội dung dữ liệu trước/sau migration trên bản sao; thử phục hồi backup thành công trước khi áp dụng lên dữ liệu chính.

Chỉ đạt build và lint chưa đáp ứng các điều kiện nghiệm thu này.
