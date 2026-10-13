# CTUMP DocuGov — Quản lý hồ sơ Chuyển giao Công nghệ (CGCN)

Hệ thống quản lý, thẩm định, tự động hóa mapping biểu mẫu Word (.docx) và trình ký số hồ sơ Chuyển giao Công nghệ (CGCN) — Trường Đại học Y Dược Cần Thơ (CTUMP).


## Hướng dẫn Khởi chạy (Getting Started)

### Yêu cầu tiên quyết:
- **Node.js**: v20+ hoặc v24+
- **MySQL Server**: Đang chạy trên cổng 3306 (mặc định user `root`, database `ctump_docugov`)

### Bước 1: Khởi tạo Cơ sở Dữ liệu MySQL
```bash
node server/scripts/run_init.js
```

### Bước 2: Khởi động Toàn bộ Dự án (Frontend & Backend đồng thời)
```bash
npm run dev:all
# hoặc: npm start
```
- **Backend API**: `http://localhost:5000` (Kiểm tra trạng thái: `http://localhost:5000/api/status`)
- **Frontend Client**: `http://localhost:3000`

### Hoặc khởi động riêng lẻ từng phần:
- Chạy Frontend: `npm run dev`
- Chạy Backend: `npm run server` (hoặc watch mode: `npm run server:dev`)
- Kiểm tra TypeScript: `npm run lint`
- Build đóng gói: `npm run build`

---

## Phân Quyền & Tài Khoản Đăng Nhập

Hệ thống phân quyền theo tài khoản Gmail (`http://localhost:3000`):
- **Quản trị viên (Admin duy nhất)**: `toanhkhai12345@gmail.com`
  - *Quyền hạn*: Xem toàn bộ hồ sơ, tiền kiểm hồ sơ, yêu cầu chỉnh sửa/phê duyệt, quản lý trình ký và kết nối Google Sheets.
- **Cán bộ / Giảng viên (User)**: Bất kỳ địa chỉ Gmail nào khác (ví dụ: `canbo@gmail.com` hoặc `user.test@gmail.com`)
  - *Quyền hạn*: Tạo hồ sơ trực tuyến từ biểu mẫu Word, xem và chỉnh sửa bản nháp, theo dõi tiến độ hồ sơ cá nhân.
