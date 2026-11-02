-- ===================================================================================
-- HỆ THỐNG QUẢN LÝ HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ (CGCN) - ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
-- Database Initialization Script (server/scripts/init_db.sql)
-- Chứa đầy đủ các bảng cốt lõi theo quy trình tự động hóa
-- ===================================================================================

CREATE DATABASE IF NOT EXISTS `ctump_docugov` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `ctump_docugov`;

-- 1. Bảng Người dùng / Cán bộ / Admin (users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('USER', 'ADMIN', 'MANAGER', 'DEAN') NOT NULL DEFAULT 'USER' COMMENT 'USER: Cán bộ/Giảng viên, ADMIN: Chuyên viên/Lãnh đạo Phòng KH&CN, DEAN: Lãnh đạo Khoa',
  `title` VARCHAR(150) NULL,
  `department` VARCHAR(150) NULL,
  `department_id` VARCHAR(50) NULL,
  `phone` VARCHAR(30) NULL,
  `avatar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục Người dùng nội bộ @ctump.edu.vn';

-- 2. Bảng Biểu mẫu CGCN điện tử (document_templates)
CREATE TABLE IF NOT EXISTS `document_templates` (
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

-- 3. Bảng Hồ sơ CGCN (dossiers) - Bảng trung tâm của quy trình automation
CREATE TABLE IF NOT EXISTS `dossiers` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã định danh tra cứu: CGCN-YYYY-XXXX',
  `title` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(50) NOT NULL COMMENT 'Cán bộ khởi tạo hồ sơ',
  `template_id` VARCHAR(50) NOT NULL COMMENT 'Loại biểu mẫu CGCN',
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

-- 4. Bảng Lịch sử Phiên bản (dossier_versions) khi User sửa form
CREATE TABLE IF NOT EXISTS `dossier_versions` (
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

-- 5. Bảng Dự án / Hồ sơ Chuyển giao công nghệ (transfer_projects)
CREATE TABLE IF NOT EXISTS `transfer_projects` (
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

-- 6. Bảng Tệp đính kèm & Minh chứng (attachments)
CREATE TABLE IF NOT EXISTS `attachments` (
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

-- 7. Bảng Nhật ký xử lý & Audit Trail (audit_logs)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `project_id` VARCHAR(50) NULL COMMENT 'Mã dự án chuyển giao công nghệ',
  `dossier_id` VARCHAR(50) NULL COMMENT 'Tương thích ngược với dossier_id',
  `actor_id` VARCHAR(50) NOT NULL COMMENT 'ID người thực hiện thao tác',
  `actor_name` VARCHAR(150) NOT NULL COMMENT 'Tên người thực hiện',
  `actor_role` VARCHAR(50) NOT NULL COMMENT 'Vai trò người thực hiện (USER, ADMIN, DEAN, SYSTEM)',
  `action` VARCHAR(50) NOT NULL COMMENT 'Hành động: CREATE, REVIEW_APPROVE, REVIEW_REJECT, UPLOAD_DEAN_SIGNED, COMPLETE',
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_project` (`project_id`),
  KEY `idx_audit_dossier` (`dossier_id`),
  KEY `idx_audit_actor` (`actor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký lịch sử luân chuyển và kiểm toán hệ thống';

-- 8. Bảng Nhật ký gửi Gmail tự động (email_notifications)
CREATE TABLE IF NOT EXISTS `email_notifications` (
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
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- -----------------------------------------------------------------------------------

-- Seed Users
INSERT INTO `users` (`id`, `email`, `name`, `role`, `title`, `department`, `phone`)
VALUES
  ('usr-admin-heykagvip', 'heykagvip@gmail.com', 'Quản trị viên Hệ thống', 'ADMIN', 'Quản trị viên Hệ thống', 'Phòng Khoa học Công nghệ & HTQT', '0912.345.678'),
  ('usr-admin-toanhkhai', 'toanhkhai12345@gmail.com', 'Quản trị viên (Toàn Khải)', 'ADMIN', 'Quản trị viên Hệ thống', 'Phòng Khoa học Công nghệ & HTQT', '0912.345.678'),
  ('usr-admin', 'admin@ctump.edu.vn', 'Quản trị viên KH&CN', 'ADMIN', 'Chuyên viên Phòng KH&CN', 'Phòng Khoa học Công nghệ & HTQT', '0292.3831.531'),
  ('usr-canbo', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', 'USER', 'Trưởng bộ môn Công nghệ phần mềm', 'Khoa Công nghệ Thông tin', '0918.123.456'),
  ('usr-dean', 'truongkhoa@ctump.edu.vn', 'PGS.TS. Trần Văn Trưởng', 'DEAN', 'Trưởng Khoa Y', 'Khoa Y', '0903.999.888')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`), `title` = VALUES(`title`), `department` = VALUES(`department`);

-- Seed Document Templates
INSERT INTO `document_templates` (`id`, `code`, `title`, `category`, `description`, `version`, `file_name`, `is_active`)
VALUES
  ('tmpl-cgcn-1a', 'Mẫu 1a-TT.CGCN', 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu', 'Đào tạo & Tri thức', 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức vào bài giảng, giáo trình, tài liệu tập huấn.', '1.0', 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.doc', 1),
  ('tmpl-cgcn-2a', 'Mẫu 2a-KH.CGCN', 'Kế hoạch tổ chức chuyển giao công nghệ trong trường', 'Khoa học Công nghệ', 'Kế hoạch chi tiết về việc tổ chức chuyển giao công nghệ sản phẩm nghiên cứu ứng dụng trong trường Đại học Y Dược Cần Thơ (kèm đánh giá rủi ro).', '1.0', 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx', 1)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `file_name` = VALUES(`file_name`);
