-- ===================================================================================
-- HỆ THỐNG QUẢN LÝ HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ (CGCN) - ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
-- Kiến trúc Tinh gọn (Lean Workflow) - 5 Bảng Cốt lõi & Seed Data
-- ===================================================================================

CREATE DATABASE IF NOT EXISTS `ctump_docugov`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ctump_docugov`;

-- -----------------------------------------------------------------------------------
-- 1. KHỞI TẠO LẠI CÁC BẢNG (RESET TABLES)
-- -----------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `dossier_files`;
DROP TABLE IF EXISTS `dossiers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `departments`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------------
-- 2. ĐỊNH NGHĨA 5 BẢNG CỐT LÕI
-- -----------------------------------------------------------------------------------

-- 2.1. Bảng Danh mục Khoa / Đơn vị (departments)
CREATE TABLE `departments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã viết tắt đơn vị (VD: KY, KD, KCNTT)',
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên chuẩn của đơn vị để điền vào file Word',
  `dean_title` VARCHAR(150) NOT NULL DEFAULT 'TRƯỞNG KHOA' COMMENT 'Chức danh ký chân trang (VD: TRƯỞNG KHOA, TRƯỞNG PHÒNG)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục Khoa/Đơn vị chuẩn hóa tên trên biểu mẫu Word';

-- 2.2. Bảng Người dùng (users)
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `staff_code` VARCHAR(50) NULL COMMENT 'Mã số cán bộ (MSCB)',
  `email` VARCHAR(150) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `department_id` INT NULL,
  `role` ENUM('USER', 'ADMIN', 'TECH_ADMIN') NOT NULL DEFAULT 'USER',
  `phone` VARCHAR(30) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_staff_code` (`staff_code`),
  UNIQUE KEY `uk_user_email` (`email`),
  KEY `fk_user_department` (`department_id`),
  CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tài khoản người dùng và quản trị viên';

-- 2.3. Bảng Trung tâm quản lý Hồ sơ (dossiers)
CREATE TABLE `dossiers` (
  `id` VARCHAR(50) NOT NULL,
  `tracking_code` VARCHAR(50) NOT NULL COMMENT 'Mã theo dõi hồ sơ (VD: CGCN-2026-0001)',
  `user_id` VARCHAR(50) NOT NULL,
  `department_id` INT NOT NULL COMMENT 'ID Khoa/Đơn vị từ Dropdown chuẩn',
  `technology_name` VARCHAR(500) NOT NULL COMMENT 'Tên công nghệ / quy trình chuyển giao',
  `transfer_type` ENUM('KNOWLEDGE', 'APPLICATION') NOT NULL DEFAULT 'APPLICATION' COMMENT 'KNOWLEDGE: Mẫu 1a (Tri thức), APPLICATION: Mẫu 2a (Ứng dụng)',
  `transfer_target` VARCHAR(255) NULL COMMENT 'Đơn vị tiếp nhận chuyển giao',
  `purpose` TEXT NULL COMMENT 'Mục đích chuyển giao',
  `has_workshop` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Có tổ chức hội thảo, 0: Tự động cắt bỏ mục Hội thảo trong file Word',
  `has_budget` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Có kinh phí / Hợp đồng, 0: Không',
  `form_data` JSON NOT NULL COMMENT 'Toàn bộ dữ liệu chi tiết nhập từ Web Form',
  `current_step` TINYINT NOT NULL DEFAULT 1 COMMENT 'Thanh tiến độ (Progress Stepper từ 1 đến 5)',
  `status` ENUM(
    'DRAFT',             -- Bước 1: Đang lưu nháp
    'PENDING_PRECHECK',  -- Bước 2: Mới gửi, chờ Admin tải Word tiền kiểm
    'NEEDS_REVISION',    -- Bước 2 hoặc 4: Admin trả về yêu cầu sửa lại Form hoặc Upload lại file
    'PRECHECK_PASSED',   -- Bước 3: Admin đã duyệt thể thức, chờ User tải file chuẩn về đi xin chữ ký Khoa
    'EVIDENCE_UPLOADED', -- Bước 4: User đã upload PDF ký Khoa + Minh chứng, chờ Admin kiểm duyệt
    'SCHOOL_PROCESSING', -- Bước 4: Admin đã duyệt file upload & đang trình Hiệu trưởng ký bên ngoài
    'COMPLETED'          -- Bước 5: Admin đã upload Quyết định cuối cùng & đóng hồ sơ
  ) NOT NULL DEFAULT 'DRAFT',
  `current_version` INT NOT NULL DEFAULT 1,
  `admin_note` TEXT NULL COMMENT 'Nhận xét của Admin khi trả về sửa chữa',
  `decision_number` VARCHAR(100) NULL COMMENT 'Số Quyết định ban hành',
  `decision_date` DATE NULL COMMENT 'Ngày ban hành Quyết định',
  `drive_folder_url` VARCHAR(500) NULL,
  `submitted_at` TIMESTAMP NULL,
  `reviewed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dossier_tracking_code` (`tracking_code`),
  KEY `fk_dossier_user` (`user_id`),
  KEY `fk_dossier_dept` (`department_id`),
  KEY `idx_dossier_status` (`status`),
  KEY `idx_dossier_step` (`current_step`),
  CONSTRAINT `fk_dossier_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dossier_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng trung tâm quản lý Hồ sơ Chuyển giao Công nghệ';

-- 2.4. Bảng Quản lý Tệp đính kèm qua từng bước (dossier_files)
CREATE TABLE `dossier_files` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `file_category` ENUM(
    'AUTO_PROPOSAL_DOCX', -- File Word Tờ trình tự sinh từ Form
    'AUTO_PLAN_DOCX',     -- File Word Kế hoạch tự sinh từ Form
    'ADMIN_FIXED_DOC',    -- File Word/PDF do Admin tự chỉnh tay lề/bảng biểu rồi upload đè lên khi Duyệt
    'FACULTY_SIGNED_PDF', -- File PDF đã có chữ ký cấp Khoa do User upload
    'CONTRACT_DOC',       -- File Hợp đồng chuyển giao (nếu has_budget = 1)
    'ACCEPTANCE_MINUTES', -- Biên bản nghiệm thu chuyển giao
    'EVIDENCE_FILE',      -- Các file tài liệu/hình ảnh/sản phẩm minh chứng khác
    'FINAL_DECISION_PDF'  -- File PDF Quyết định ban hành do Admin upload ở bước cuối
  ) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` VARCHAR(50) NULL,
  `uploaded_by` VARCHAR(50) NULL,
  `is_latest` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_file_dossier` (`dossier_id`),
  KEY `idx_file_category_latest` (`dossier_id`, `file_category`, `is_latest`),
  CONSTRAINT `fk_file_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quản lý toàn bộ Upload / Download qua từng bước';

-- 2.5. Bảng Nhật ký xử lý & Lịch sử trạng thái (audit_logs)
CREATE TABLE `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `dossier_id` VARCHAR(50) NOT NULL,
  `actor_id` VARCHAR(50) NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_audit_dossier` (`dossier_id`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký xử lý và lịch sử trạng thái hồ sơ';

-- -----------------------------------------------------------------------------------
-- 3. DỮ LIỆU KHỞI TẠO (SEED DATA)
-- -----------------------------------------------------------------------------------

-- 3.1. Danh mục 7 Khoa chuyên môn của Trường Đại học Y Dược Cần Thơ (CTUMP)
INSERT INTO `departments` (`id`, `code`, `name`, `dean_title`, `is_active`) VALUES
(1, 'KY',    'Khoa Y',                             'TRƯỞNG KHOA Y', 1),
(2, 'KD',    'Khoa Dược',                          'TRƯỞNG KHOA DƯỢC', 1),
(3, 'KRHM',  'Khoa Răng Hàm Mặt',                  'TRƯỞNG KHOA RĂNG HÀM MẶT', 1),
(4, 'KDD',   'Khoa Điều dưỡng - Kỹ thuật Y học',   'TRƯỞNG KHOA ĐIỀU DƯỠNG - KTYH', 1),
(5, 'KYTCC', 'Khoa Y tế công cộng',                'TRƯỞNG KHOA Y TẾ CÔNG CỘNG', 1),
(6, 'KYHCT', 'Khoa Y học cổ truyền',               'TRƯỞNG KHOA Y HỌC CỔ TRUYỀN', 1),
(7, 'KKHCB', 'Khoa Khoa học cơ bản',               'TRƯỞNG KHOA KHOA HỌC CƠ BẢN', 1);

-- 3.2. Tài khoản mẫu: 1 ADMIN và 1 USER
INSERT INTO `users` (`id`, `staff_code`, `email`, `full_name`, `department_id`, `role`, `phone`) VALUES
('usr-admin', 'CB0001', 'admin@ctump.edu.vn', 'Quản trị viên Phòng KH&CN', 1, 'ADMIN', '0292.3831.531'),
('usr-user',  'CB1024', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam',         1, 'USER',  '0912.345.678');
