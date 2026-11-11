-- ===================================================================================
-- HỆ THỐNG QUẢN LÝ HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ (CGCN) - ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
-- Database Schema Chuẩn 3NF - Hỗ trợ đầy đủ True Flow & False Flow (6 trạng thái)
-- ===================================================================================

CREATE DATABASE IF NOT EXISTS `ctump_docugov` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `ctump_docugov`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `email_notifications`;
DROP TABLE IF EXISTS `dossier_versions`;
DROP TABLE IF EXISTS `dossiers`;
DROP TABLE IF EXISTS `document_templates`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `departments`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. BẢNG DANH MỤC ĐƠN VỊ / KHOA / PHÒNG BAN (departments)
CREATE TABLE `departments` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `short_name` VARCHAR(50) NULL,
  `dean_name` VARCHAR(150) NULL,
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(50) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG NGƯỜI DÙNG NỘI BỘ (users)
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  `title` VARCHAR(150) NULL,
  `department_id` VARCHAR(50) NULL,
  `department` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `avatar` VARCHAR(255) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email` (`email`),
  KEY `fk_user_dept` (`department_id`),
  CONSTRAINT `fk_user_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG BIỂU MẪU CHUẨN CGCN (document_templates)
CREATE TABLE `document_templates` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Khoa học Công nghệ',
  `description` TEXT NULL,
  `version` VARCHAR(20) DEFAULT '2026.1',
  `file_name` VARCHAR(255) NOT NULL,
  `fields_config` JSON NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tmpl_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG HỒ SƠ CGCN (dossiers / applications) - HỖ TRỢ TRUE FLOW + FALSE FLOW (6 TRẠNG THÁI)
CREATE TABLE `dossiers` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã định danh duy nhất: CGCN-2026-XXXX',
  `title` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL,
  `template_id` VARCHAR(50) NOT NULL,
  `department_id` VARCHAR(50) NULL,
  `department_name` VARCHAR(150) NULL,

  -- 6 Trạng thái chính (True Flow + False Flow) + các alias tương thích
  `status` ENUM(
    'SUBMITTED',                -- 1. Đã gửi / Chờ duyệt (hoặc Đã nộp lại)
    'RETURNED_FOR_REVISION',    -- 2. Trả về sửa lỗi (Luồng False)
    'VALIDATED',                -- 3. Đã hợp lệ / Hồ sơ đã được duyệt
    'PENDING_SIGNED_REVIEW',    -- 4. Chờ duyệt (Sau khi Thầy/Cô upload bản ký phòng ban)
    'WAITING_RECTOR_SIGNATURE', -- 5. Chờ ký Hiệu trưởng
    'SIGNED_ARCHIVED',          -- 6. Đã ký và lưu trữ
    'NEW',
    'NEEDS_REVISION',
    'PRECHECK_PASSED',
    'WAITING_FOR_SUBMISSION',
    'FACULTY_SIGNED',
    'SCHOOL_SIGNING',
    'SIGNED',
    'COMPLETED'
  ) NOT NULL DEFAULT 'SUBMITTED',

  `current_version` INT NOT NULL DEFAULT 1 COMMENT 'Phiên bản tài liệu hiện tại (v1, v2, v3...)',
  `applicant_email` VARCHAR(150) NULL COMMENT 'Email của Thầy/Cô nộp đơn để gửi Gmail SMTP',
  `form_data` JSON NOT NULL COMMENT 'Dữ liệu Web Form đã làm sạch (Single Source of Truth)',
  `has_workshop` TINYINT(1) DEFAULT 0,
  `has_financial_implication` TINYINT(1) DEFAULT 0,

  -- Dữ liệu mở rộng luồng kép 1A & 2A (Đặc tả cập nhật)
  `ten_de_tai` VARCHAR(255) NULL COMMENT 'Tên đề tài nghiên cứu chuyển giao tri thức',
  `truong_don_vi` VARCHAR(150) NULL COMMENT 'Họ tên Trưởng đơn vị',
  `status_1a` VARCHAR(30) DEFAULT 'PENDING' COMMENT 'Trạng thái duyệt 1a: PENDING, APPROVED, RETURNED',
  `status_2a` VARCHAR(30) DEFAULT 'PENDING' COMMENT 'Trạng thái duyệt 2a: PENDING, APPROVED, RETURNED',
  `rejected_target` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Biểu mẫu mục tiêu bị trả về: 1a, 2a, both',
  `rejection_reason_1a` TEXT NULL COMMENT 'Lý do trả về riêng cho Biểu mẫu 1a',
  `rejection_reason_2a` TEXT NULL COMMENT 'Lý do trả về riêng cho Biểu mẫu 2a',
  `form_data_1a` JSON NULL COMMENT 'Dữ liệu biểu mẫu 1a trong bộ hồ sơ kép',
  `form_data_2a` JSON NULL COMMENT 'Dữ liệu biểu mẫu 2a trong bộ hồ sơ kép',
  `signature_config` JSON NULL COMMENT 'Cấu hình khung chữ ký động (phòng ban, BGH, nơi nhận)',

  -- Đường dẫn tài liệu đồng bộ theo phiên bản hiện tại (v1, v2...)
  `generated_docx_path` VARCHAR(500) NULL COMMENT 'Đường dẫn file Word (.docx) phiên bản mới nhất',
  `generated_pdf_path` VARCHAR(500) NULL COMMENT 'Đường dẫn file PDF (.pdf) phiên bản mới nhất',
  `docx_file_url` VARCHAR(500) NULL,
  `to_trinh_docx_url` VARCHAR(500) NULL,
  `ke_hoach_docx_url` VARCHAR(500) NULL,

  -- Tài liệu qua các bước duyệt & trình ký
  `approved_pdf_path` VARCHAR(500) NULL COMMENT 'File PDF chuẩn chốt khi Admin nhấn Duyệt (VALIDATED)',
  `precheck_pdf_url` VARCHAR(500) NULL,
  `department_signed_files` JSON NULL COMMENT 'Danh sách file PDF đã ký phòng ban + ảnh/PDF minh chứng',
  `resubmitted_signed_files` JSON NULL,
  `faculty_signed_pdf_url` VARCHAR(500) NULL,
  `evidence_files` JSON NULL,
  `final_signed_pdf_path` VARCHAR(500) NULL COMMENT 'File PDF hoàn tất có chữ ký Hiệu trưởng (SIGNED_ARCHIVED)',
  `final_pdf_url` VARCHAR(500) NULL,

  -- Ghi chú sửa lỗi & Lịch sử tiến trình
  `revision_note` TEXT NULL COMMENT 'Gợi ý chỗ sai cần sửa chữa của Admin khi Trả về sửa lỗi',
  `review_notes` TEXT NULL,
  `timeline_logs` JSON NULL COMMENT 'Mảng lưu lịch sử chuyển trạng thái và timestamp',

  -- Thông tin Quyết định ban hành
  `decision_number` VARCHAR(100) NULL,
  `decision_date` DATE NULL,
  `khcn_signed` TINYINT(1) DEFAULT 0,
  `khcn_signed_at` TIMESTAMP NULL,
  `khtc_signed` TINYINT(1) DEFAULT 0,
  `khtc_signed_at` TIMESTAMP NULL,
  `bgh_signed` TINYINT(1) DEFAULT 0,
  `bgh_signed_at` TIMESTAMP NULL,
  `drive_folder_url` VARCHAR(500) DEFAULT 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link',

  `submitted_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  `faculty_signed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dossier_code` (`code`),
  KEY `fk_dossier_user` (`user_id`),
  KEY `fk_dossier_tmpl` (`template_id`),
  KEY `fk_dossier_dept` (`department_id`),
  KEY `idx_dossier_status` (`status`),
  CONSTRAINT `fk_dossier_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dossier_tmpl` FOREIGN KEY (`template_id`) REFERENCES `document_templates` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dossier_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG LỊCH SỬ PHIÊN BẢN (dossier_versions)
CREATE TABLE `dossier_versions` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL,
  `version_number` INT NOT NULL,
  `form_data` JSON NOT NULL,
  `generated_docx_path` VARCHAR(500) NULL,
  `generated_pdf_path` VARCHAR(500) NULL,
  `edited_by_id` VARCHAR(50) NOT NULL,
  `edited_by_name` VARCHAR(150) NOT NULL,
  `change_summary` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dossier_version` (`dossier_id`, `version_number`),
  KEY `fk_ver_dossier` (`dossier_id`),
  CONSTRAINT `fk_ver_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG TỆP ĐÍNH KÈM & MINH CHỨNG (attachments)
CREATE TABLE `attachments` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` ENUM('TO_TRINH_DOCX', 'KE_HOACH_DOCX', 'PRECHECK_PDF', 'FACULTY_SIGNED_PDF', 'EVIDENCE', 'FINAL_DECISION_PDF') NOT NULL DEFAULT 'EVIDENCE',
  `file_size` VARCHAR(50) NULL,
  `uploaded_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attach_dossier` (`dossier_id`),
  CONSTRAINT `fk_attach_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG NHẬT KÝ KIỂM TOÁN (audit_logs)
CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL,
  `actor_id` VARCHAR(50) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_audit_dossier` (`dossier_id`),
  CONSTRAINT `fk_audit_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG NHẬT KÝ THÔNG BÁO EMAIL TỰ ĐỘNG (email_notifications)
CREATE TABLE `email_notifications` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NULL,
  `recipient_email` VARCHAR(150) NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `step_name` VARCHAR(100) NOT NULL,
  `status` ENUM('SENT', 'PENDING', 'FAILED') DEFAULT 'SENT',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_email_dossier` (`dossier_id`),
  CONSTRAINT `fk_email_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================================
-- DỮ LIỆU KHỞI TẠO DANH MỤC CỐT LÕI (KHÔNG CHỨA HỒ SƠ NHÁP/TEST RÁC)
-- ===================================================================================

INSERT INTO `departments` (`id`, `code`, `name`, `short_name`, `dean_name`, `email`, `phone`) VALUES
('dept-y', 'khoa_y', 'Khoa Y', 'KY', 'PGS.TS.BS. Trưởng Khoa Y', 'khoay@ctump.edu.vn', '0292.3831.501'),
('dept-duoc', 'khoa_duoc', 'Khoa Dược', 'KD', 'PGS.TS. Trưởng Khoa Dược', 'khoaduoc@ctump.edu.vn', '0292.3831.502'),
('dept-rhm', 'khoa_rhm', 'Khoa Răng Hàm Mặt', 'KRHM', 'TS. Trưởng Khoa Răng Hàm Mặt', 'khoarhm@ctump.edu.vn', '0292.3831.503'),
('dept-ytcc', 'khoa_ytcc', 'Khoa Y tế Công cộng', 'KYTCC', 'TS. Trưởng Khoa Y tế Công cộng', 'khoaytcc@ctump.edu.vn', '0292.3831.504'),
('dept-dd', 'khoa_dd', 'Khoa Điều dưỡng & KTYH', 'KDD', 'TS. Trưởng Khoa Điều dưỡng', 'khoadieuduong@ctump.edu.vn', '0292.3831.505'),
('dept-khcn', 'phong_khcn', 'Phòng Khoa học Công nghệ & HTQT', 'PKHCN', 'TS. Trưởng phòng KH&CN', 'khcn@ctump.edu.vn', '0292.3831.531'),
('dept-khtc', 'phong_khtc', 'Phòng Kế hoạch Tài chính', 'PKHTC', 'ThS. Trưởng phòng KHTC', 'khtc@ctump.edu.vn', '0292.3831.532'),
('dept-bgh', 'ban_giam_hieu', 'Ban Giám hiệu (Hiệu trưởng)', 'BGH', 'GS.TS. Hiệu trưởng CTUMP', 'bgh@ctump.edu.vn', '0292.3831.500');

INSERT INTO `users` (`id`, `email`, `name`, `role`, `title`, `department_id`, `department`, `phone`) VALUES
('usr-admin-tran', 'tranthibaotran.2k@gmail.com', 'Bảo Trân (Admin)', 'ADMIN', 'Quản trị viên Hệ thống', 'dept-khcn', 'Phòng Khoa học Công nghệ & HTQT', '0912.345.678'),
('usr-admin-truc', 'admin@ctump.edu.vn', 'Cô Trúc (Phòng KH&CN)', 'ADMIN', 'Chuyên viên Quản lý CGCN', 'dept-khcn', 'Phòng Khoa học Công nghệ & HTQT', '0292.3831.531'),
('usr-admin-dev', 'toanhkhai12345@gmail.com', 'Quản trị viên (Toàn Khải)', 'ADMIN', 'Quản trị viên Hệ thống', 'dept-khcn', 'Phòng Khoa học Công nghệ & HTQT', '0912.345.678'),
('usr-canbo', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', 'USER', 'Giảng viên chính', 'dept-y', 'Khoa Y', '0912.345.678'),
('usr-giangvien', 'giangvien@ctump.edu.vn', 'ThS.BS. Lê Thị Thu Hà', 'USER', 'Giảng viên Bộ môn Nội', 'dept-y', 'Khoa Y', '0988.765.432'),
('usr-giangvien-demo', 'thayco.giangvien@ctump.edu.vn', 'Trần Thị Bảo Trân', 'USER', 'Cán bộ / Giảng viên', 'dept-y', 'Khoa Y', '0909.888.999');

INSERT INTO `document_templates` (`id`, `code`, `title`, `category`, `description`, `version`, `file_name`, `is_active`) VALUES
<<<<<<< HEAD
('tmpl-cgcn-1a', 'Mẫu 1a-TT.CGCN', 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu', 'Đào tạo & Tri thức', 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức vào giảng dạy, tập huấn.', '2026.1', 'mau_1a_chuan.docx', 1),
('tmpl-cgcn-2a', 'Mẫu 2a-KH.CGCN', 'Kế hoạch tổ chức chuyển giao công nghệ trong trường', 'Khoa học Công nghệ', 'Kế hoạch chi tiết về nhân sự, hội thảo, kinh phí và rủi ro chuyển giao công nghệ ứng dụng.', '2026.1', 'mau_2a_chuan.docx', 1);
=======
('tmpl-cgcn-1a', 'Mẫu 1a-TT.CGCN', 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu', 'Đào tạo & Tri thức', 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức vào bài giảng, giáo trình, tài liệu tập huấn.', '1.0', 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.doc', 1),
('tmpl-cgcn-2a', 'Mẫu 2a-KH.CGCN', 'Kế hoạch tổ chức chuyển giao công nghệ trong trường', 'Khoa học Công nghệ', 'Kế hoạch chi tiết về việc tổ chức chuyển giao công nghệ sản phẩm nghiên cứu ứng dụng trong trường Đại học Y Dược Cần Thơ (kèm đánh giá rủi ro).', '1.0', 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx', 1);

-- 3.4. Hồ sơ mẫu: Đã xóa để hệ thống bắt đầu với CSDL sạch

>>>>>>> origin/main
