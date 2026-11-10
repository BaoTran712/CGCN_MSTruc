# TÀI LIỆU ĐẶC TẢ CẬP NHẬT HỆ THỐNG: LUỒNG HỒ SƠ KÉP (1A & 2A) VÀ CẤU HÌNH CHỮ KÝ ĐỘNG

## 1. Tổng Quan Thay Đổi

Tài liệu này mô tả các nâng cấp và thay đổi nghiệp vụ cho hệ thống quản lý biểu mẫu, bao gồm 3 nội dung chính:

1. **Hợp nhất luồng xử lý File 1a và File 2a:** Chuyển từ 2 luồng độc lập sang luồng điền biểu mẫu nối tiếp (Wizard) và đồng bộ trạng thái duyệt – ký cho đến khi hoàn tất.
2. **Cấu hình chữ ký phòng ban & Ban Giám hiệu động (Dynamic Signature Block):** Cho phép Admin tùy chỉnh thêm/bớt các đơn vị tham gia ký duyệt (như Phòng TCKT, Phòng KH&CN, v.v.), chức danh Ban Giám hiệu và danh sách *Nơi nhận* tại bước duyệt thể thức trước khi xuất file Word/PDF.
3. **Cập nhật nội dung Biểu mẫu 1a:** Bổ sung mục thông tin chuyển giao tri thức từ kết quả đề tài nghiên cứu.

---

## 2. Chi Tiết Thay Đổi 1: Hợp Nhất Luồng Xử Lý File 1a và File a

### 2.1. Giao diện Điền Biểu Mẫu (Dành cho Người dùng)

Thay vì chọn tạo riêng lẻ từng biểu mẫu như trước, hệ thống gộp thành một quy trình **Điền hồ sơ theo bước (Multi-step Form)**:

* **Bước 1 – Điền thông tin File 1a:**
  * Người dùng nhập đầy đủ các trường thông tin của biểu mẫu 1a (bao gồm trường dữ liệu `{ten_de_tai}`, `{ho_ten}`, `{truong_don_vi}`...).
  * Bấm **"Lưu & Tiếp tục"** để chuyển sang Bước 2 (hệ thống lưu nháp dữ liệu 1a).

* **Bước 2 – Điền thông tin File 2a:**
  * Hệ thống tự động kế thừa các thông tin chung từ File 1a (như Tên đề tài, Họ tên cá nhân/Chủ nhiệm đề tài, Trưởng đơn vị, Đơn vị công tác...) sang File 2a để người dùng không phải nhập lại.
  * Người dùng điền tiếp các thông tin đặc thù của File 2a.

* **Bước 3 – Kiểm tra và Gửi duyệt:**
  * Hệ thống hiển thị bản xem trước (Preview) của cả **File 1a** và **File 2a**.
  * Khi bấm **"Gửi hồ sơ"**, cả 2 file được đóng gói chung vào một **Bộ hồ sơ (Bundle)** và chuyển sang trạng thái `Chờ duyệt`.

### 2.2. Cơ Chế Duyệt Đồng Bộ (Dành cho Admin)

Tại màn hình quản lý của Admin, File 1a và File 2a nằm trong cùng một Bộ hồ sơ nhưng có nút kiểm tra thể thức và xác nhận duyệt riêng cho từng file:

* **Quy tắc "Chờ đồng bộ" (And-Join Synchronization):**
  * **Trường hợp 1:** Admin bấm duyệt **File 1a** trước $\rightarrow$ File 1a chuyển sang trạng thái `Đã duyệt (Chờ File 2a)`. Bộ hồ sơ vẫn giữ trạng thái `Đang xử lý duyệt`.
  * **Trường hợp 2:** Admin bấm duyệt **File 2a** trước $\rightarrow$ File 2a chuyển sang trạng thái `Đã duyệt (Chờ File 1a)`. Bộ hồ sơ vẫn giữ trạng thái `Đang xử lý duyệt`.
  * **Khi cả 2 file đều đã được bấm Duyệt:** Hệ thống tự động kích hoạt chuyển trạng thái của **cả Bộ hồ sơ (gồm cả 1a và 2a)** sang bước **`Chờ ký`** cùng một lúc.

* **Giai đoạn Trình ký & Hoàn tất:**
  * Từ bước `Chờ ký` trở đi, File 1a và File 2a luôn đi chung với nhau như một gói tài liệu thống nhất qua các cấp ký cho đến khi hoàn tất quy trình (`Đã ký / Ban hành`).

### 2.3. Sơ Đồ Luồng Trạng Thái (State Flow)

```text
[Người dùng]
  |
  +--> Bước 1: Điền File 1a --> Bước 2: Điền File 2a --> [Gửi Bộ Hồ Sơ]
                                                               |
  +------------------------------------------------------------+
  |
  v
[Admin: Bước Duyệt Hồ Sơ & Xác Nhận Thể Thức (Cấu hình chữ ký)]
  |
  +--> Nhánh A: Duyệt File 1a --> [Trạng thái: 1a Đã duyệt / Đợi 2a] --+
  |                                                                    +--> (Cả 2 đã duyệt)
  +--> Nhánh B: Duyệt File 2a --> [Trạng thái: 2a Đã duyệt / Đợi 1a] --+          |
                                                                                  v
[Luồng Ký Chung] <-- Chuyển cả 2 file 1a & 2a sang "CHỜ KÝ" <---------------------+
  |
  +--> Ký Cấp Đơn vị / Cá nhân --> Ký Cấp Phòng Ban --> Ký Ban Giám Hiệu --> [HOÀN TẤT]
```

---

## 3. Chi Tiết Thay Đổi 2: Cấu Hình Khung Chữ Ký Động Tại Bước Duyệt Thể Thức

### 3.1. Phân tích cấu trúc mẫu chữ ký chuẩn trên File Word/PDF

Dựa trên mẫu văn bản hiện hành, phần cuối văn bản (sau dòng *"Trân trọng./."*) được chia làm **2 bảng (Table)** không viền khi in (ẩn đường lưới):

#### **Bảng 1: Khối chữ ký Đơn vị, Cá nhân và Các Phòng ban chức năng (Bố cục 3 cột)**
* **Cột 1 (Trái - 45%):** Chứa chức danh/đơn vị ký bên trái.
* **Cột 2 (Giữa - 10%):** Cột trống làm khoảng cách (Spacer).
* **Cột 3 (Phải - 45%):** Chứa chức danh/đơn vị ký bên phải.

| Hàng | Cột 1 (Trái) | Cột 2 (Giữa) | Cột 3 (Phải) | Ghi chú |
| :--- | :---: | :---: | :---: | :--- |
| **Hàng tiêu đề 1** | **Trưởng đơn vị** | *(Trống)* | **Cá nhân/Chủ nhiệm đề tài** | Cố định theo người nộp |
| **Hàng khoảng trống ký 1** | *(3-4 dòng trống)* | *(Trống)* | *(3-4 dòng trống)* | Khoảng trống để ký tên |
| **Hàng họ tên 1** | **{truong_don_vi}** | *(Trống)* | **{ho_ten}** | Tự động điền từ Form |
| **Hàng tiêu đề 2 (Động)** | **Phòng KH&CN** | *(Trống)* | **Phòng TCKT** *(Có thể ẩn/thêm)* | **Admin cấu hình trước khi duyệt** |
| **Hàng khoảng trống ký 2** | *(4-5 dòng trống)* | *(Trống)* | *(4-5 dòng trống)* | Khoảng trống để ký & ghi tên |

#### **Bảng 2: Khối Nơi nhận và Chữ ký Ban Giám hiệu (Bố cục 4 cột)**
* **Cột 1 (Trái):** Danh sách ***Nơi nhận:*** (`{noi_nhan_don_vi}`, `TCKT`, `TTDV&ĐTTNCXH`, `Lưu: VT, KHCN.`).
* **Cột 2 (Giữa trái):** Cột trống tạo khoảng cách.
* **Cột 3 (Phải):** Chức danh Ban Giám hiệu (**`HIỆU TRƯỞNG`** hoặc **`KT. HIỆU TRƯỞNG / PHÓ HIỆU TRƯỞNG`**) và khoảng trống ký tên phía dưới.
* **Cột 4 (Ngoài cùng phải):** Cột căn lề phải.

---

### 3.2. Chức năng dành cho Admin tại bước "Duyệt hồ sơ & Xác nhận thể thức"

Vì thực tế có những hồ sơ **không qua Phòng TCKT** hoặc cần **thêm/đổi các phòng ban khác**, hệ thống cung cấp bảng điều khiển **"Tùy chỉnh thành phần ký & Nơi nhận"** ngay trên màn hình duyệt của Admin:

**Quy trình ký:**
- Khi người dùng điền dữ liệu, phần chữ ký không xuất hiện và không ảnh hưởng tới dữ liệu nhập.
- Khi hồ sơ được gửi cho Admin để duyệt, Admin sẽ chọn số lượng chữ ký cho từng phòng ban và vị trí ký tương ứng (ví dụ: Trưởng phòng, Phó phòng).
- Hệ thống sẽ tự động căn chỉnh các khối chữ ký theo chuẩn Nghị định 30 về định dạng văn bản, đảm bảo bố cục và khoảng cách đúng quy định.

1. **Quản lý danh sách Đơn vị / Phòng ban tham gia ký (Hàng tiêu đề 2 của Bảng 1):**
   * **Mặc định hiển thị:**
     * Vị trí 1 (Bên trái): `Phòng KH&CN`
     * Vị trí 2 (Bên phải): `Phòng TCKT`
   * **Thao tác của Admin:**
     * **Xóa đơn vị:** Admin có thể bấm nút `[Xóa]` hoặc bỏ tích chọn `Phòng TCKT` nếu hồ sơ không liên quan tài chính. Khi đó, ô bên phải trên file Word/PDF sẽ tự động để trống.
     * **Thêm / Đổi đơn vị:** Admin có thể bấm **`+ Thêm đơn vị ký`** hoặc chọn từ danh sách có sẵn (Dropdown) / nhập tay tên đơn vị mới (ví dụ: *Phòng Đào tạo*, *Phòng TCCB*, *TTDV&ĐTTNCXH*, *Trưởng bộ môn A*, *Thư ký*...).
   * **Quy tắc tự động dàn trang trên bảng Word/PDF:**
     * Nếu có **1 phòng ban** (VD: chỉ có *Phòng KH&CN*): Hiển thị ở Cột 1, Cột 3 để trống.
     * Nếu có **2 phòng ban** (VD: *Phòng KH&CN* và *Phòng TCKT*): Hiển thị lần lượt ở Cột 1 và Cột 3 trên cùng một hàng.
     * Nếu có **3 hoặc 4 phòng ban**: Hệ thống tự động sinh thêm một cụm hàng mới phía dưới trong Bảng 1 theo đúng chuẩn Cột 1 (Trái) và Cột 3 (Phải).

2. **Tùy chỉnh Khung Ban Giám Hiệu (Bảng 2):**
   * Admin chọn người có thẩm quyền ký cuối:
     * Tùy chọn 1: **`HIỆU TRƯỞNG`** (Mặc định).
     * Tùy chọn 2: **`KT. HIỆU TRƯỞNG`** (Kèm dòng phụ **`PHÓ HIỆU TRƯỞNG`** ở ngay bên dưới).
     * Tùy chọn 3: Chọn tên người ký cụ thể (nếu cần điền sẵn họ tên Ban Giám hiệu ở cuối khung).

3. **Tự động đồng bộ mục "Nơi nhận" (Bảng 2):**
   * Khi Admin bỏ chọn `Phòng TCKT` ở phần chữ ký, hệ thống gợi ý (hoặc tự động bỏ dòng `- TCKT;`) trong danh sách *Nơi nhận*, đồng thời cho phép Admin sửa trực tiếp các dòng trong *Nơi nhận* trước khi bấm xác nhận duyệt.

---

## 4. Chi Tiết Thay Đổi 3: Cập Nhật Nội Dung Biểu Mẫu 1a

### 4.1. Nội dung bổ sung trên Biểu mẫu 1a

Tại phần nội dung/trích yếu của **File 1a**, bổ sung thêm mục chuyển giao tri thức với cấu trúc văn bản chuẩn như sau:

> **Về việc chuyển giao tri thức:** từ kết quả đề tài nghiên cứu **{ten_de_tai}** vào bài giảng – giáo trình, tài liệu tập huấn giảng dạy.

### 4.2. Quy tắc xử lý dữ liệu tại Bước 1 (Điền File 1a)

* **Trường dữ liệu `{ten_de_tai}`:**
  * Trên giao diện điền Form Bước 1 (File 1a), cung cấp ô nhập liệu **Tên đề tài nghiên cứu** (Bắt buộc nhập).
  * Khi xuất ra bản xem trước (Preview) và bản Word/PDF của File 1a, hệ thống tự động điền giá trị `{ten_de_tai}` vào đúng vị trí trong câu:
    *"Về việc chuyển giao tri thức: từ kết quả đề tài nghiên cứu [Tên đề tài người dùng đã nhập] vào bài giảng – giáo trình, tài liệu tập huấn giảng dạy"*
  * Giá trị `{ten_de_tai}` này cũng được tự động truyền sang Bước 2 (File 2a) để đảm bảo tính nhất quán dữ liệu giữa 2 biểu mẫu trong cùng một bộ hồ sơ.

---

## 5. Tóm Tắt Các Trường Biến (Placeholders) Trong Template Word/PDF

Để phục vụ việc xuất file tự động, hệ thống quản lý các biến sau trong mẫu văn bản:

| Tên biến | Mô tả | Nguồn dữ liệu |
| :--- | :--- | :--- |
| `{truong_don_vi}` | Họ và tên Trưởng đơn vị | Người dùng nhập / Lấy từ danh mục đơn vị |
| `{ho_ten}` | Họ và tên Cá nhân / Chủ nhiệm đề tài | Người dùng nhập (Bước 1) |
| `{ten_de_tai}` | Tên đề tài nghiên cứu chuyển giao tri thức | Người dùng nhập (Bước 1 - File 1a) |
| `{ds_phong_ban_ky}` | Mảng danh sách các phòng ban tham gia ký (VD: `["Phòng KH&CN", "Phòng TCKT"]`) | Admin cấu hình tại bước Duyệt thể thức |
| `{noi_nhan_don_vi}` | Tên đơn vị nhận văn bản | Tự động theo đơn vị người nộp / Admin chỉnh sửa |
| `{ds_noi_nhan}` | Danh sách các đơn vị trong mục *Nơi nhận* | Tự động đồng bộ theo phòng ban ký / Admin chỉnh sửa |
| `{chuc_danh_bgh}` | Chức danh ký cấp trường (`HIỆU TRƯỞNG` hoặc `KT. HIỆU TRƯỞNG...`) | Admin chọn tại bước Duyệt thể thức |

## 6. Kế hoạch thực hiện

### 6.1 Mục tiêu & Phạm vi
- Tích hợp luồng xử lý đồng thời cho File 1A và 2A (wizard).
- Triển khai cấu hình chữ ký động cho các phòng ban và Ban Giám hiệu.
- Cập nhật nội dung bổ sung vào biểu mẫu 1A (chuyển giao tri thức).
- Đảm bảo tính tương thích với quy trình hiện tại và khả năng mở rộng.

### 6.2 Timeline & Milestones
| Giai đoạn | Thời gian dự kiến | Mốc hoàn thành |
|---|---|---|
| Phân tích yêu cầu & thiết kế chi tiết | 1 tuần | Tài liệu thiết kế hoàn thiện |
| Phát triển giao diện wizard & sync backend | 2 tuần | UI/UX và API đồng bộ hoàn tất |
| Phát triển cấu hình chữ ký động | 1.5 tuần | Module cấu hình và lưu trữ |
| Cập nhật biểu mẫu 1A & kiểm thử tích hợp | 1 tuần | Biểu mẫu mới hoạt động |
| Kiểm thử hệ thống (unit, integration, UI) | 1 tuần | Báo cáo QA |
| Đánh giá bảo mật & hiệu năng | 3 ngày | Kết quả audit |
| Đào tạo Admin & cập nhật tài liệu | 2 ngày | Hướng dẫn sử dụng |
| Triển khai lên môi trường staging & review | 2 ngày | Phê duyệt cuối cùng |
| Merge vào `main` & phát hành | 1 ngày | Release notes |

### 6.3 Vai trò & Trách nhiệm
- **Product Owner**: Xác định yêu cầu, ưu tiên backlog.
- **Dev Frontend**: Thực hiện wizard UI, cập nhật form.
- **Dev Backend**: Xây dựng API đồng bộ, lưu cấu hình chữ ký.
- **QA Engineer**: Viết kịch bản test, thực hiện kiểm thử.
- **Admin/Team Lead**: Kiểm tra cấu hình chữ ký, đào tạo người dùng.

### 6.4 Công việc chi tiết
- Thiết kế flow diagram cho wizard (multi‑step).
- Implement các component React cho Step 1, Step 2, Preview & Submit.
- Tạo service `signatureConfigService` để lưu/đọc cấu hình chữ ký.
- Mở rộng schema DB cho `signature_blocks`.
- Cập nhật template Word/PDF để chèn các placeholder động.
- Viết unit test cho các service mới.
- Thực hiện integration test trên môi trường staging.
- Kiểm tra regression các quy trình cũ.

### 6.5 Kiểm thử & Đánh giá
- **Test Cases**: Đăng nhập, điền Form 1A, chuyển sang 2A, duyệt từng file, cấu hình chữ ký đa phòng ban, export PDF.
- **Môi trường**: Local, Staging.
- **Tiêu chí chấp nhận**: Không lỗi runtime, dữ liệu đồng bộ, PDF chứa đúng chữ ký và nơi nhận.

### 6.6 Triển khai & Roll‑out
- Merge `tran` → `main` sau khi QA phê duyệt.
- Tag release `v1.2‑wizard‑signature`.
- Deploy lên môi trường production (CI/CD pipeline).
- Theo dõi logs trong 48h đầu để phát hiện bug.
- Kế hoạch rollback: revert commit và redeploy previous tag.

### 6.7 Bảo trì & Hỗ trợ
- Giám sát định kỳ (weekly) cấu hình chữ ký.
- Thu thập phản hồi người dùng, lên backlog cải tiến.
- Định kỳ cập nhật tài liệu hướng dẫn admin.

## 6. Kế hoạch thực hiện

### 6.1 Mục tiêu & Phạm vi
- Tích hợp luồng xử lý đồng thời cho File 1A và 2A (wizard).
- Triển khai cấu hình chữ ký động cho các phòng ban và Ban Giám hiệu.
- Cập nhật nội dung bổ sung vào biểu mẫu 1A (chuyển giao tri thức).
- Đảm bảo tính tương thích với quy trình hiện tại và khả năng mở rộng.

### 6.2 Timeline & Milestones
| Giai đoạn | Thời gian dự kiến | Mốc hoàn thành |
|---|---|---|
| Phân tích yêu cầu & thiết kế chi tiết | 1 tuần | Tài liệu thiết kế hoàn thiện |
| Phát triển giao diện wizard & sync backend | 2 tuần | UI/UX và API đồng bộ hoàn tất |
| Phát triển cấu hình chữ ký động | 1.5 tuần | Module cấu hình và lưu trữ |
| Cập nhật biểu mẫu 1A & kiểm thử tích hợp | 1 tuần | Biểu mẫu mới hoạt động |
| Kiểm thử hệ thống (unit, integration, UI) | 1 tuần | Báo cáo QA |
| Đánh giá bảo mật & hiệu năng | 3 ngày | Kết quả audit |
| Đào tạo Admin & cập nhật tài liệu | 2 ngày | Hướng dẫn sử dụng |
| Triển khai lên môi trường staging & review | 2 ngày | Phê duyệt cuối cùng |
| Merge vào `main` & phát hành | 1 ngày | Release notes |

### 6.3 Vai trò & Trách nhiệm
- **Product Owner**: Xác định yêu cầu, ưu tiên backlog.
- **Dev Frontend**: Thực hiện wizard UI, cập nhật form.
- **Dev Backend**: Xây dựng API đồng bộ, lưu cấu hình chữ ký.
- **QA Engineer**: Viết kịch bản test, thực hiện kiểm thử.
- **Admin/Team Lead**: Kiểm tra cấu hình chữ ký, đào tạo người dùng.

### 6.4 Công việc chi tiết
- Thiết kế flow diagram cho wizard (multi‑step).
- Implement các component React cho Step 1, Step 2, Preview & Submit.
- Tạo service `signatureConfigService` để lưu/đọc cấu hình chữ ký.
- Mở rộng schema DB cho `signature_blocks`.
- Cập nhật template Word/PDF để chèn các placeholder động.
- Viết unit test cho các service mới.
- Thực hiện integration test trên môi trường staging.
- Kiểm tra regression các quy trình cũ.

### 6.5 Kiểm thử & Đánh giá
- **Test Cases**: Đăng nhập, điền Form 1A, chuyển sang 2A, duyệt từng file, cấu hình chữ ký đa phòng ban, export PDF.
- **Môi trường**: Local, Staging.
- **Tiêu chí chấp nhận**: Không lỗi runtime, dữ liệu đồng bộ, PDF chứa đúng chữ ký và nơi nhận.

### 6.6 Triển khai & Roll‑out
- Merge `tran` → `main` sau khi QA phê duyệt.
- Tag release `v1.2‑wizard‑signature`.
- Deploy lên môi trường production (CI/CD pipeline).
- Theo dõi logs trong 48h đầu để phát hiện bug.
- Kế hoạch rollback: revert commit và redeploy previous tag.

### 6.7 Bảo trì & Hỗ trợ
- Giám sát định kỳ (weekly) cấu hình chữ ký.
- Thu thập phản hồi người dùng, lên backlog cải tiến.
- Định kỳ cập nhật tài liệu hướng dẫn admin.
