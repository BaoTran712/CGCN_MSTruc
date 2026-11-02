-- ===================================================================================
-- HỆ THỐNG QUẢN LÝ HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ (CGCN) - ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
-- Database Schema & Initial Seed Data for MySQL
-- Tuân thủ chặt chẽ đặc tả Quy trình Automation trong file quy_trinh.md
-- ===================================================================================

-- 1. TẠO CƠ SỞ DỮ LIỆU
CREATE DATABASE IF NOT EXISTS `ctump_docugov` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `ctump_docugov`;

-- -----------------------------------------------------------------------------------
-- 2. TẠO CÁC BẢNG (TABLES)
-- -----------------------------------------------------------------------------------

-- 2.1. Khởi tạo lại các bảng (Reset tables)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `email_notifications`;
DROP TABLE IF EXISTS `dossier_versions`;
DROP TABLE IF EXISTS `transfer_projects`;
DROP TABLE IF EXISTS `dossiers`;
DROP TABLE IF EXISTS `document_templates`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- 2.1. Bảng Người dùng / Cán bộ / Admin (users)
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('USER', 'ADMIN', 'MANAGER', 'DEAN') NOT NULL DEFAULT 'USER' COMMENT 'USER: Cán bộ/Giảng viên, ADMIN: Chuyên viên/Lãnh đạo Phòng KH&CN, DEAN: Lãnh đạo Khoa',
  `title` VARCHAR(150) NULL,
  `department` VARCHAR(150) NULL,
  `phone` VARCHAR(30) NULL,
  `avatar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Người dùng nội bộ @ctump.edu.vn';

-- 2.3. Bảng Biểu mẫu CGCN điện tử (document_templates)
CREATE TABLE `document_templates` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Ví dụ: Mẫu 1a-TT.CGCN, Mẫu 2a-KH.CGCN',
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'Khoa học Công nghệ',
  `description` TEXT NULL,
  `version` VARCHAR(20) DEFAULT '1.0',
  `file_name` VARCHAR(255) NOT NULL,
  `fields_config` JSON NULL COMMENT 'Cấu hình các trường nhập liệu Web Form',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tmpl_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Biểu mẫu chuẩn trường để mapping Word .docx';

-- 2.4. Bảng Hồ sơ CGCN (dossiers) - Bảng trung tâm của quy trình automation
CREATE TABLE `dossiers` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã định danh tra cứu: CGCN-2026-XXXX',
  `title` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL COMMENT 'Cán bộ khởi tạo hồ sơ',
  `template_id` VARCHAR(50) NOT NULL COMMENT 'Loại biểu mẫu CGCN',
  `department_name` VARCHAR(150) NULL,
  `status` ENUM(
    'NEW',             -- Bước 1-2: Mới nộp, chờ Admin tiền kiểm
    'NEEDS_REVISION',  -- Bước 2: Admin yêu cầu sửa đổi/chưa duyệt
    'PRECHECK_PASSED', -- Bước 2-4: Admin duyệt hợp lệ, hệ thống xuất PDF chuẩn
    'FACULTY_SIGNED',  -- Bước 3-6: User đã nộp PDF ký cấp Khoa + minh chứng
    'SCHOOL_SIGNING',  -- Bước 4-7: Đang trình ký cấp Trường (KH&CN, KHTC, BGH)
    'COMPLETED',       -- Bước 4-8: Đã ban hành QĐ CGCN & Đóng hồ sơ
    'CANCELLED'        -- Hủy hồ sơ
  ) NOT NULL DEFAULT 'NEW',
  `form_data` JSON NOT NULL COMMENT 'Dữ liệu nhập từ Web Form đã mapping',
  `docx_file_url` VARCHAR(500) NULL COMMENT 'Đường dẫn file Word đã mapping tự động',
  `precheck_pdf_url` VARCHAR(500) NULL COMMENT 'Đường dẫn file PDF chuẩn đã khóa layout',
  `faculty_signed_pdf_url` VARCHAR(500) NULL COMMENT 'Đường dẫn file PDF đã có chữ ký số cấp Khoa',
  `evidence_files` JSON NULL COMMENT 'Danh sách tài liệu/sản phẩm minh chứng',
  `final_pdf_url` VARCHAR(500) NULL COMMENT 'Đường dẫn file PDF Quyết định hoàn tất có chữ ký BGH',
  `decision_number` VARCHAR(100) NULL COMMENT 'Số Quyết định ban hành (VD: 125/QĐ-ĐHYDCT)',
  `decision_date` DATE NULL,
  `has_financial_implication` TINYINT(1) DEFAULT 0 COMMENT '1: Có phát sinh kinh phí (cần Phòng KHTC ký)',
  `khcn_signed` TINYINT(1) DEFAULT 0 COMMENT '1: Trưởng phòng KH&CN đã ký',
  `khtc_signed` TINYINT(1) DEFAULT 0 COMMENT '1: Trưởng phòng KHTC đã ký',
  `bgh_signed` TINYINT(1) DEFAULT 0 COMMENT '1: Hiệu trưởng (BGH) đã ký',
  `review_notes` TEXT NULL COMMENT 'Nhận xét chi tiết của Admin tiền kiểm',
  `drive_folder_url` VARCHAR(500) DEFAULT 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-?usp=drive_link',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dossier_code` (`code`),
  KEY `fk_dossier_user` (`user_id`),
  KEY `fk_dossier_tmpl` (`template_id`),
  KEY `idx_dossier_status` (`status`),
  CONSTRAINT `fk_dossier_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dossier_tmpl` FOREIGN KEY (`template_id`) REFERENCES `document_templates` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ Chuyển giao công nghệ';

-- 2.5. Bảng Lịch sử Phiên bản (dossier_versions) khi User sửa form
CREATE TABLE `dossier_versions` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL,
  `version_number` INT NOT NULL,
  `form_data` JSON NOT NULL,
  `edited_by_id` VARCHAR(50) NOT NULL,
  `edited_by_name` VARCHAR(150) NOT NULL,
  `change_summary` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_ver_dossier` (`dossier_id`),
  CONSTRAINT `fk_ver_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử phiên bản chỉnh sửa hồ sơ';

-- 2.6. Bảng Dự án / Hồ sơ Chuyển giao công nghệ (transfer_projects)
CREATE TABLE `transfer_projects` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã định danh tra cứu: CGCN-YYYY-XXXX',
  `title` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL COMMENT 'Cán bộ khởi tạo hồ sơ',
  `template_id` VARCHAR(50) DEFAULT '1a-TT.CGCN' COMMENT 'Loại biểu mẫu áp dụng',
  `department_name` VARCHAR(150) NULL,
  `status` ENUM(
    'DRAFT',
    'NEW',
    'NEEDS_REVISION',
    'PRECHECK_PASSED',
    'FACULTY_SIGNED',
    'SCHOOL_SIGNING',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'NEW',
  `form_data` JSON NULL COMMENT 'Dữ liệu nhập từ Web Form',
  `docx_file_url` VARCHAR(255) NULL COMMENT 'Đường dẫn file Word bản thảo đã mapping',
  `precheck_pdf_url` VARCHAR(255) NULL COMMENT 'Đường dẫn file PDF đã khóa layout',
  `dean_signed_pdf_url` VARCHAR(255) NULL COMMENT 'Đường dẫn file PDF đã có chữ ký số Trưởng khoa',
  `final_pdf_url` VARCHAR(255) NULL COMMENT 'Đường dẫn file PDF có chữ ký số Ban Giám hiệu',
  `has_financial_implication` TINYINT(1) DEFAULT 0,
  `khcn_signed` TINYINT(1) DEFAULT 0,
  `khtc_signed` TINYINT(1) DEFAULT 0,
  `bgh_signed` TINYINT(1) DEFAULT 0,
  `decision_number` VARCHAR(100) NULL,
  `decision_date` VARCHAR(50) NULL,
  `review_notes` TEXT NULL,
  `submitted_at` TIMESTAMP NULL,
  `reviewed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_code` (`code`),
  KEY `idx_project_user` (`user_id`),
  KEY `idx_project_status` (`status`),
  CONSTRAINT `fk_project_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hồ sơ dự án chuyển giao công nghệ';

-- 2.7. Bảng Tệp đính kèm & Minh chứng (attachments)
CREATE TABLE `attachments` (
  `id` VARCHAR(50) NOT NULL,
  `project_id` VARCHAR(50) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL DEFAULT 'evidence' COMMENT 'dean_signed_pdf, evidence, docx, final_pdf',
  `file_size` VARCHAR(50) NULL,
  `uploaded_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attach_project` (`project_id`),
  CONSTRAINT `fk_attach_project` FOREIGN KEY (`project_id`) REFERENCES `transfer_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tệp đính kèm và tài liệu minh chứng của dự án';

-- 2.8. Bảng Nhật ký xử lý & Lưu vết lịch sử (audit_logs) - Audit Trail
CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `project_id` VARCHAR(50) NULL COMMENT 'Mã dự án chuyển giao công nghệ',
  `dossier_id` VARCHAR(50) NULL COMMENT 'Mã hồ sơ (tương thích ngược)',
  `actor_id` VARCHAR(50) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'CREATE, SUBMIT, PRECHECK_REJECT, PRECHECK_APPROVE, UPLOAD_FACULTY_SIGN, SCHOOL_SIGN, COMPLETE',
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_audit_dossier` (`dossier_id`),
  KEY `idx_audit_project` (`project_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit Trail lưu vết thời gian thực';

-- 2.7. Bảng Nhật ký gửi Gmail tự động (email_notifications)
CREATE TABLE `email_notifications` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NULL,
  `recipient_email` VARCHAR(150) NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `step_name` VARCHAR(100) NOT NULL COMMENT 'Tên bước trong quy trình automation',
  `status` ENUM('SENT', 'PENDING', 'FAILED') DEFAULT 'SENT',
  `sent_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_email_dossier` (`dossier_id`),
  CONSTRAINT `fk_email_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử gửi email tự động qua các mốc';


-- -----------------------------------------------------------------------------------
-- 3. DỮ LIỆU KHỞI TẠO (SEED DATA)
-- -----------------------------------------------------------------------------------

-- 3.1. Người dùng mẫu (@ctump.edu.vn)
INSERT INTO `users` (`id`, `email`, `name`, `role`, `title`, `department`, `phone`) VALUES
('usr-admin', 'admin@ctump.edu.vn', 'Quản trị viên KH&CN', 'ADMIN', 'Chuyên viên Phòng KH&CN', 'Phòng Khoa học Công nghệ & HTQT', '0292.3831.531'),
('usr-canbo', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', 'USER', 'Giảng viên chính', 'Khoa Công nghệ Thông tin', '0912.345.678'),
('usr-giangvien', 'giangvien@ctump.edu.vn', 'ThS.BS. Lê Thị Thu Hà', 'USER', 'Giảng viên Bộ môn Nội', 'Khoa Y', '0988.765.432');

-- 3.3. Biểu mẫu CGCN chuẩn
INSERT INTO `document_templates` (`id`, `code`, `title`, `category`, `description`, `version`, `file_name`, `is_active`) VALUES
('tmpl-cgcn-1a', 'Mẫu 1a-TT.CGCN', 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu', 'Đào tạo & Tri thức', 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức vào bài giảng, giáo trình, tài liệu tập huấn.', '1.0', 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.doc', 1),
('tmpl-cgcn-2a', 'Mẫu 2a-KH.CGCN', 'Kế hoạch tổ chức chuyển giao công nghệ trong trường', 'Khoa học Công nghệ', 'Kế hoạch chi tiết về việc tổ chức chuyển giao công nghệ sản phẩm nghiên cứu ứng dụng trong trường Đại học Y Dược Cần Thơ (kèm đánh giá rủi ro).', '1.0', 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx', 1);

-- 3.4. Hồ sơ mẫu: Đã xóa để hệ thống bắt đầu với CSDL sạch

