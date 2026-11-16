# Bộ Test Cases Kiểm Thử Theo Từng Giai Đoạn — CTUMP DocuGov

Tài liệu này tổng hợp danh sách **27 kịch bản kiểm thử (Test Cases)** bám sát kiến trúc thực tế của hệ thống **CTUMP DocuGov** (Luồng hồ sơ kép **Mẫu 1a - Tờ trình** & **Mẫu 2a - Kế hoạch**, 6 trạng thái **True Flow** & **False Flow**).

---

## Giai đoạn 0: Xác thực & Phân quyền (Authentication & RBAC)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Kiểm tra rỗng khi đăng nhập | 1. Mở trang Đăng nhập<br/>2. Để trống Email hoặc Mật khẩu và bấm **ĐĂNG NHẬP** | Email: `""` hoặc Password: `""` | Hiển thị thông báo lỗi hoặc chặn submit bởi thuộc tính `required` trên form. |
| **TC-02** | Đăng nhập vai trò **Giảng viên (USER)** | 1. Nhập email giảng viên và mật khẩu<br/>2. Bấm **ĐĂNG NHẬP** | Email: `tranthibaotran712@gmail.com`<br/>Pass: `123456` | - Đăng nhập thành công với vai trò `USER` (`Giảng viên`).<br/>- Chuyển hướng vào tab **Hồ sơ của tôi** (`my_dossiers`).<br/>- Chỉ nhìn thấy các hồ sơ do chính `tranthibaotran712@gmail.com` tạo. |
| **TC-03** | Đăng nhập vai trò **Quản trị viên (ADMIN)** | 1. Nhập email nằm trong `ADMIN_EMAILS`<br/>2. Bấm **ĐĂNG NHẬP** | Email: `tranthibaotran.2k@gmail.com` hoặc `admin@ctump.edu.vn`<br/>Pass: `admin123` | - Đăng nhập thành công với vai trò `ADMIN`.<br/>- Chuyển hướng vào tab **Chờ xét duyệt** (`pending_approval`).<br/>- Nhìn thấy toàn bộ hồ sơ của tất cả giảng viên trong hệ thống. |
| **TC-04** | Đăng nhập bằng **Google OAuth (GIS)** | 1. Bấm nút **Sign in with Google**<br/>2. Chọn tài khoản Google | Tài khoản Gmail bất kỳ | Giải mã JWT từ Google, tự động đồng bộ tên/avatar với API `/api/users/login` và phân quyền đúng theo email. |
| **TC-05** | Ghi nhớ đăng nhập & Bảo vệ quyền truy cập | 1. Tích chọn **Ghi nhớ đăng nhập**, đăng nhập rồi đăng xuất<br/>2. Kiểm tra phân quyền tab của User thường | `ctump_remembered_email` trong `localStorage` | - Email tự động điền lại ở lần mở trang đăng nhập tiếp theo.<br/>- User thường không thể truy cập tab `pending_approval` của Admin. |

---

## Giai đoạn 1: Khởi tạo & Nộp Hồ sơ Kép Mẫu 1a & 2a (`SUBMITTED` - v1)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-06** | Kiểm tra bắt buộc ở **Bước 1 (Mẫu 1a - Tờ trình)** | 1. Chọn **Tạo hồ sơ mới**<br/>2. Để trống `Tên đề tài` hoặc `Trưởng đơn vị`<br/>3. Bấm **Tiếp theo (Sang Bước 2)** | `ten_de_tai = ""` | Hệ thống báo lỗi đỏ tại trường bắt buộc, không cho chuyển sang Bước 2. |
| **TC-07** | Điền hoàn chỉnh **Bước 1 (Mẫu 1a)** & Xem trước trực tiếp | 1. Nhập Tên đề tài, Đơn vị, Trưởng đơn vị, Phương thức & Thời gian chuyển giao<br/>2. Quan sát khung **Xem trước A4** bên phải | Đề tài: `"Nghiên cứu ứng dụng kỹ thuật số..."`<br/>Đơn vị: `"Khoa Y"` | Bản xem trước A4 của **Tờ trình (Mẫu 1a)** cập nhật thời gian thực đúng chuẩn thể thức hành chính ĐHYDCT. |
| **TC-08** | Điền **Bước 2 (Mẫu 2a - Kế hoạch)** với bảng động | 1. Chuyển sang Bước 2<br/>2. Thêm/xóa dòng trong bảng Thành viên, Kinh phí dự kiến, Đánh giá rủi ro<br/>3. Bật/tắt tùy chọn **Tổ chức hội thảo** | `has_workshop = true`, thêm 2 dòng rủi ro | Dữ liệu bảng động và mục Hội thảo hiển thị chính xác trên tab xem trước **Kế hoạch (Mẫu 2a)**. |
| **TC-09** | Xác nhận & Nộp bộ hồ sơ kép (**Bước 3**) | 1. Chuyển sang Bước 3 (Kiểm tra tổng thể 1a & 2a)<br/>2. Bấm **Nộp hồ sơ chính thức** | Bộ hồ sơ đầy đủ 1a + 2a | - Sinh mã định danh `CGCN-2026-XXXX`, phiên bản `v1`.<br/>- Trạng thái: `SUBMITTED`, `status_1a = PENDING`, `status_2a = PENDING`.<br/>- Backend tự động kết xuất file `.docx` & `.pdf` v1.<br/>- Ghi Audit Log `SUBMIT` và gửi 2 email (1 cho Admin, 1 xác nhận cho Giảng viên). |
| **TC-10** | Chống tạo trùng hồ sơ khi bấm đúp (Idempotency) | Bấm liên tiếp nút **Nộp hồ sơ** trong vòng 45 giây cho cùng một đề tài | Cùng `user_id` và `ten_de_tai` | Hệ thống cập nhật trên cùng bản ghi vừa tạo thay vì sinh ra 2 mã hồ sơ trùng lặp. |

---

## Giai đoạn 2A [Luồng False]: Admin Trả về Sửa lỗi (`RETURNED_FOR_REVISION`)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-11** | Admin trả về **chỉ riêng Mẫu 1a** | 1. Đăng nhập Admin, mở hồ sơ `SUBMITTED`<br/>2. Chọn mục tiêu trả về: **Chỉ Mẫu 1a (Tờ trình)**<br/>3. Nhập lý do và bấm **Yêu cầu sửa lỗi** | `target_form = '1a'`<br/>Lý do: `"Sai tên Trưởng đơn vị ở Tờ trình"` | - Hồ sơ chuyển sang `RETURNED_FOR_REVISION`.<br/>- `status_1a = 'RETURNED'`, `status_2a` giữ nguyên (`PENDING` hoặc `APPROVED`).<br/>- `rejected_target = '1a'`, lưu `rejection_reason_1a`.<br/>- Gửi email thông báo yêu cầu sửa Mẫu 1a cho Giảng viên. |
| **TC-12** | Admin trả về **chỉ riêng Mẫu 2a** | 1. Mở hồ sơ `SUBMITTED`<br/>2. Chọn mục tiêu trả về: **Chỉ Mẫu 2a (Kế hoạch)**<br/>3. Nhập lý do và bấm **Yêu cầu sửa lỗi** | `target_form = '2a'`<br/>Lý do: `"Bổ sung bảng dự toán kinh phí"` | - `status_2a = 'RETURNED'`, `status_1a` giữ nguyên.<br/>- `rejected_target = '2a'`, lưu `rejection_reason_2a`. |
| **TC-13** | Admin trả về **cả 2 biểu mẫu (1a & 2a)** | 1. Chọn mục tiêu trả về: **Cả 2 biểu mẫu (1a & 2a)**<br/>2. Nhập lý do và xác nhận | `target_form = 'both'` | Cả `status_1a` và `status_2a` đều chuyển sang `'RETURNED'`, cho phép Giảng viên sửa toàn bộ. |

---

## Giai đoạn 2B [Luồng False]: Giảng viên Sửa & Nộp lại Độc lập (`SUBMITTED` - v2, v3...)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-14** | Kiểm tra khóa biểu mẫu khi chỉ bị trả về **Mẫu 1a** | 1. Đăng nhập Giảng viên, mở hồ sơ bị trả về ở **TC-11** (`rejected_target = '1a'`)<br/>2. Quan sát trạng thái khóa của Mẫu 1a và Mẫu 2a | Hồ sơ `RETURNED_FOR_REVISION` (`status_1a = RETURNED`, `status_2a != RETURNED`) | - Nhãn hiển thị: **Mẫu 1a: Mở khóa sửa**, **Mẫu 2a: Hợp lệ (Chỉ xem)**.<br/>- Khi chuyển sang tab Mẫu 2a, banner báo lỗi của 1a được ẩn đi và Mẫu 2a bị khóa không cho sửa. |
| **TC-15** | Nộp lại độc lập **Mẫu 1a** (`resubmit1a`) | 1. Sửa nội dung Mẫu 1a theo góp ý của Admin<br/>2. Bấm **Nộp lại Biểu mẫu 1a** | Sửa `truong_don_vi` | - Tăng phiên bản lên `v2` (`current_version = 2`).<br/>- Trạng thái đơn về `SUBMITTED`, `status_1a = 'PENDING'`, dữ liệu & trạng thái `2a` được bảo toàn 100%.<br/>- Lưu bản ghi mới vào `dossier_versions` kèm danh sách các trường đã thay đổi. |
| **TC-16** | Nộp lại độc lập **Mẫu 2a** (`resubmit2a`) | 1. Mở hồ sơ bị trả về riêng Mẫu 2a (**TC-12**)<br/>2. Sửa dữ liệu Mẫu 2a và bấm **Nộp lại Biểu mẫu 2a** | Sửa nội dung Kế hoạch 2a | - Tăng phiên bản lên `v2`, `status_2a = 'PENDING'`, dữ liệu `1a` giữ nguyên 100%. |

---

## Giai đoạn 3 [Luồng True]: Admin Duyệt Hợp lệ & Xuất PDF Khóa Layout (`VALIDATED`)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-17** | Cấu hình chữ ký động trước khi duyệt | 1. Đăng nhập Admin, mở hồ sơ `SUBMITTED`<br/>2. Mở **Cấu hình khung chữ ký động** (chọn các phòng ban đồng kính trình, Ban Giám hiệu, Nơi nhận)<br/>3. Bấm Lưu cấu hình | `signature_config` cập nhật | Bản xem trước A4 và file xuất PDF/Word cập nhật ngay khung chữ ký và danh sách nơi nhận theo cấu hình. |
| **TC-18** | Duyệt từng phần (Duyệt Mẫu 1a trước, Mẫu 2a sau) | 1. Tại tab Mẫu 1a, Admin bấm **Duyệt Mẫu 1a**<br/>2. Chuyển sang tab Mẫu 2a, bấm **Duyệt Mẫu 2a** | `handleApprove1a` -> `handleApprove2a` | - Khi mới duyệt 1a: `status_1a = 'APPROVED'`, hồ sơ vẫn ở `SUBMITTED`.<br/>- Khi duyệt tiếp 2a (cả 2 đều `APPROVED`): Tự động kích hoạt duyệt toàn bộ hồ sơ sang `VALIDATED`. |
| **TC-19** | Duyệt toàn bộ hồ sơ (`VALIDATED`) & Gửi Gmail kèm 2 file PDF | 1. Admin bấm **Duyệt hợp lệ (Cả 1a & 2a)** | Ghi chú: `"Hồ sơ đạt chuẩn thể thức"` | - Trạng thái chuyển sang `VALIDATED`, `status_1a = 'APPROVED'`, `status_2a = 'APPROVED'`.<br/>- Chốt bản cứng chính thức (`is_official_locked = true`).<br/>- Kết xuất 2 file PDF riêng biệt (`{code}_Mau_1a_v{ver}.pdf` và `{code}_Mau_2a_v{ver}.pdf`).<br/>- Gửi email cho Giảng viên có **đính kèm trực tiếp 2 file PDF** này. |

---

## Giai đoạn 4: Giảng viên Tải lên Bản ký Phòng ban & Minh chứng (`PENDING_SIGNED_REVIEW`)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-20** | Tải về 2 file PDF chuẩn đã duyệt để đi trình ký | 1. Đăng nhập Giảng viên, mở hồ sơ ở trạng thái `VALIDATED`<br/>2. Bấm **Tải PDF** ở tab Mẫu 1a và Mẫu 2a | Hồ sơ `VALIDATED` | Tải xuống 2 file PDF chuẩn đã khóa nội dung của Mẫu 1a và Mẫu 2a. |
| **TC-21** | Upload bản PDF đã ký cấp Khoa/Phòng ban + Minh chứng | 1. Tại cột thao tác bên phải, chọn tệp PDF đã ký và các ảnh/PDF minh chứng<br/>2. Bấm **Gửi bản ký phòng ban** | 1 file `.pdf` + 1 file ảnh `.png`/`.jpg` | - Lưu tệp vật lý vào `/uploads/signed/`.<br/>- Trạng thái chuyển sang `PENDING_SIGNED_REVIEW` (*Chờ duyệt bản ký*).<br/>- Ghi Audit Log `UPLOAD_DEPARTMENT_SIGNED` và gửi email báo cho Admin. |
| **TC-22** | Xem trực tiếp tệp đã tải lên trên giao diện | Bấm vào tên tệp PDF/ảnh trong danh sách **Tệp đã nộp từ đơn vị** | File trong `department_signed_files` | Mở modal xem trước trực tiếp nội dung PDF hoặc hình ảnh minh chứng ngay trên trình duyệt. |

---

## Giai đoạn 5 & 6: Trình ký Hiệu trưởng (`WAITING_RECTOR_SIGNATURE`) & Lưu trữ (`SIGNED_ARCHIVED`)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-23** | Admin kiểm tra bản ký phòng ban & Chuyển trình ký Hiệu trưởng | 1. Đăng nhập Admin, mở hồ sơ `PENDING_SIGNED_REVIEW`<br/>2. Kiểm tra tệp đính kèm, tích xác nhận Phòng KH&CN<br/>3. Bấm **Chuyển sang Chờ ký Hiệu trưởng** | Ghi chú: `"Đủ chữ ký cấp Khoa, trình BGH"` | - Trạng thái chuyển sang `WAITING_RECTOR_SIGNATURE`.<br/>- `khcn_signed = true`.<br/>- Ghi Audit Log `SUBMIT_TO_RECTOR` và gửi email thông báo cho Giảng viên. |
| **TC-24** | Xác nhận Hiệu trưởng đã ký & Lưu trữ vĩnh viễn (`SIGNED_ARCHIVED`) | 1. Mở hồ sơ `WAITING_RECTOR_SIGNATURE`<br/>2. Nhập **Số Quyết định**, **Ngày ban hành**, tải lên PDF cuối cùng (nếu có)<br/>3. Bấm **Xác nhận Đã ký & Lưu trữ** | Số QĐ: `125/QĐ-ĐHYDCT`<br/>Ngày: `2026-11-16` | - Trạng thái chuyển sang `SIGNED_ARCHIVED` (*Đã ký và lưu trữ*).<br/>- `bgh_signed = true`, lưu `decision_number`, `decision_date`, `completed_at`.<br/>- Gửi email chúc mừng Giảng viên kèm tệp PDF chính thức đã ký. |

---

## Giai đoạn 7: Các Chức năng Bổ trợ (Xuất File, Lịch sử Phiên bản, Audit & Email Logs)

| Mã TC | Tên kịch bản | Bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| **TC-25** | Xuất file Word (`.docx`) cho từng biểu mẫu 1a & 2a | 1. Mở chi tiết hồ sơ bất kỳ<br/>2. Chọn tab **Tờ trình (Mẫu 1a)** -> bấm **Tải DOCX**<br/>3. Chọn tab **Kế hoạch (Mẫu 2a)** -> bấm **Tải DOCX** | Hồ sơ có dữ liệu tiếng Việt dựng sẵn | File `.docx` tải về mở bằng Microsoft Word không bị lỗi font, giữ đúng chuẩn NFC tiếng Việt và điền đầy đủ các trường từ template gốc. |
| **TC-26** | Xem lịch sử phiên bản (`v1`, `v2`...) & Rollback | 1. Bấm nút **Lịch sử** trên trang Chi tiết đơn<br/>2. Xem danh sách các phiên bản `dossier_versions`<br/>3. (Admin) Bấm **Phục hồi (Rollback)** về một phiên bản trước đó | Hồ sơ có từ 2 phiên bản trở lên (`v1`, `v2`) | Khôi phục chính xác `form_data` và `signature_config` từ bản snapshot đã chọn và ghi nhận vào timeline. |
| **TC-27** | Tra cứu Nhật ký Kiểm toán (Audit Trail) & Nhật ký Email | Mở phần **Nhật ký xử lý (Audit Logs)** và **Lịch sử Email** trong chi tiết hồ sơ | Hồ sơ đã đi qua các bước 1 → 6 | Hiển thị đầy đủ chuỗi thời gian, người thực hiện (`actorName`, `actorRole`), trạng thái chuyển đổi (`fromStatus` → `toStatus`) và trạng thái gửi mail (`SENT`). |

