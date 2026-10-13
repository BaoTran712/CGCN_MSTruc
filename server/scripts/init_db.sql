-- ===================================================================================
-- HỆ THỐNG QUẢN LÝ HỒ SƠ CHUYỂN GIAO CÔNG NGHỆ (CGCN) - ĐẠI HỌC Y DƯỢC CẦN THƠ (CTUMP)
-- Database Initialization Script (server/scripts/init_db.sql)
-- Chứa 4 bảng cốt lõi: users, transfer_projects, attachments, audit_logs
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

-- 2. Bảng Dự án / Hồ sơ Chuyển giao công nghệ (transfer_projects)
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

-- 3. Bảng Tệp đính kèm & Minh chứng (attachments)
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

-- 4. Bảng Nhật ký xử lý & Audit Trail (audit_logs)
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
  KEY `idx_audit_actor` (`actor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Nhật ký lịch sử luân chuyển và kiểm toán hệ thống';

-- -----------------------------------------------------------------------------------
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- -----------------------------------------------------------------------------------

-- Seed Users
INSERT INTO `users` (`id`, `email`, `name`, `role`, `title`, `department`, `phone`)
VALUES
  ('usr-admin-toanhkhai', 'toanhkhai12345@gmail.com', 'Quản trị viên (Toàn Khải)', 'ADMIN', 'Quản trị viên Hệ thống', 'Phòng Khoa học Công nghệ & HTQT', '0912.345.678'),
  ('usr-admin', 'admin@ctump.edu.vn', 'Quản trị viên KH&CN', 'ADMIN', 'Chuyên viên Phòng KH&CN', 'Phòng Khoa học Công nghệ & HTQT', '0292.3831.531'),
  ('usr-canbo', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', 'USER', 'Trưởng bộ môn Công nghệ phần mềm', 'Khoa Công nghệ Thông tin', '0918.123.456'),
  ('usr-dean', 'truongkhoa@ctump.edu.vn', 'PGS.TS. Trần Văn Trưởng', 'DEAN', 'Trưởng Khoa Y', 'Khoa Y', '0903.999.888')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`);

-- Seed Projects
INSERT INTO `transfer_projects` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, `form_data`, `docx_file_url`, `precheck_pdf_url`, `has_financial_implication`, `submitted_at`, `created_at`
)
VALUES
  (
    'proj-001',
    'CGCN-2026-0001',
    'Tờ trình chuyển giao tri thức: Ứng dụng AI phát hiện tổn thương phổi',
    'usr-canbo',
    '1a-TT.CGCN',
    'Khoa Công nghệ Thông tin',
    'NEW',
    JSON_OBJECT(
      'proposal_number', '15/TTr-KCNTT',
      'department', 'Khoa Công nghệ Thông tin',
      'research_title', 'Ứng dụng AI phân tích hình ảnh X-quang phổi phát hiện sớm tổn thương',
      'target_application', 'Chuyển giao cho Bệnh viện Đa khoa Trung ương Cần Thơ ứng dụng tầm soát',
      'financial_plan', 'Kinh phí dự kiến: 150.000.000 VNĐ từ nguồn tài trợ nghiên cứu'
    ),
    '/uploads/docx/CGCN-2026-0001.docx',
    NULL,
    1,
    NOW(),
    NOW()
  ),
  (
    'proj-002',
    'CGCN-2026-0002',
    'Kế hoạch CGCN: Quy trình chiết xuất hoạt chất Curcumin hỗ trợ điều trị viêm dạ dày',
    'usr-canbo',
    '2a-KH.CGCN',
    'Khoa Dược',
    'PRECHECK_PASSED',
    JSON_OBJECT(
      'proposal_number', '08/KH-KD',
      'department', 'Khoa Dược',
      'research_title', 'Quy trình chiết xuất hoạt chất Curcumin nano hỗ trợ điều trị viêm dạ dày',
      'target_application', 'Hợp tác sản xuất thử nghiệm với Công ty Cổ phần Dược Hậu Giang',
      'financial_plan', 'Kinh phí doanh nghiệp đồng chi trả: 300.000.000 VNĐ'
    ),
    '/uploads/docx/CGCN-2026-0002.docx',
    '/uploads/pdf/CGCN-2026-0002-locked.pdf',
    1,
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 3 DAY)
  )
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Seed Attachments
INSERT INTO `attachments` (`id`, `project_id`, `file_name`, `file_path`, `file_url`, `file_type`, `file_size`, `uploaded_by`)
VALUES
  ('att-001', 'proj-001', 'Bao_cao_ket_qua_nghien_cuu_AI.pdf', 'server/uploads/attachments/Bao_cao_ket_qua_nghien_cuu_AI.pdf', '/uploads/attachments/Bao_cao_ket_qua_nghien_cuu_AI.pdf', 'evidence', '2.4 MB', 'usr-canbo'),
  ('att-002', 'proj-002', 'Hop_dong_nguyen_tac_Dược_Hau_Giang.pdf', 'server/uploads/attachments/Hop_dong_nguyen_tac_Dược_Hau_Giang.pdf', '/uploads/attachments/Hop_dong_nguyen_tac_Dược_Hau_Giang.pdf', 'evidence', '1.8 MB', 'usr-canbo')
ON DUPLICATE KEY UPDATE `file_name` = VALUES(`file_name`);

-- Seed Audit Logs
INSERT INTO `audit_logs` (`id`, `project_id`, `dossier_id`, `actor_id`, `actor_name`, `actor_role`, `action`, `from_status`, `to_status`, `notes`, `created_at`)
VALUES
  ('aud-p001-1', 'proj-001', NULL, 'usr-canbo', 'TS. Nguyễn Văn Nam', 'USER', 'CREATE', NULL, 'NEW', 'Khởi tạo hồ sơ CGCN-2026-0001 qua Web Form và tự động mapping file Word chuẩn.', NOW()),
  ('aud-p002-1', 'proj-002', NULL, 'usr-canbo', 'TS. Nguyễn Văn Nam', 'USER', 'CREATE', NULL, 'NEW', 'Khởi tạo hồ sơ CGCN-2026-0002 qua Web Form.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  ('aud-p002-2', 'proj-002', NULL, 'usr-admin', 'Quản trị viên KH&CN', 'ADMIN', 'REVIEW_APPROVE', 'NEW', 'PRECHECK_PASSED', 'Admin tiền kiểm đạt chuẩn thể thức. Hệ thống tự động xuất PDF chuẩn đã khóa layout.', DATE_SUB(NOW(), INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE `notes` = VALUES(`notes`);
