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

-- 2.1. Bảng Danh mục Đơn vị / Khoa / Phòng ban (departments)
CREATE TABLE `departments` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL COMMENT 'Mã đơn vị: khoa_y, khoa_duoc, khcn...',
  `name` VARCHAR(150) NOT NULL COMMENT 'Tên đơn vị đầy đủ',
  `dean_name` VARCHAR(150) NULL COMMENT 'Trưởng đơn vị',
  `email` VARCHAR(150) NULL,
  `phone` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Danh mục Đơn vị / Khoa / Phòng ban CTUMP';

-- 2.2. Bảng Người dùng / Cán bộ / Admin (users)
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
    'DRAFT',           -- Bản nháp đang soạn thảo
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
  `submitted_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dossier_code` (`code`),
  KEY `fk_dossier_user` (`user_id`),
  KEY `fk_dossier_tmpl` (`template_id`),
  KEY `idx_dossier_status` (`status`),
  KEY `idx_dossier_user_status` (`user_id`, `status`),
  KEY `idx_dossier_created` (`created_at`),
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

-- 2.6. Bảng Tệp đính kèm & Minh chứng (attachments)
CREATE TABLE `attachments` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL COMMENT 'Mã hồ sơ CGCN',
  `file_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL DEFAULT 'evidence' COMMENT 'faculty_signed_pdf, evidence, docx, final_pdf',
  `file_size` VARCHAR(50) NULL,
  `uploaded_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attach_dossier` (`dossier_id`),
  CONSTRAINT `fk_attach_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tệp đính kèm và tài liệu minh chứng của hồ sơ';

-- 2.7. Bảng Nhật ký xử lý & Lưu vết lịch sử (audit_logs) - Audit Trail
CREATE TABLE `audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `dossier_id` VARCHAR(50) NOT NULL COMMENT 'Mã hồ sơ CGCN',
  `actor_id` VARCHAR(50) NOT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'CREATE, SAVE_DRAFT, SUBMIT, PRECHECK_REJECT, PRECHECK_APPROVE, UPLOAD_FACULTY_SIGN, SCHOOL_SIGN, COMPLETE',
  `from_status` VARCHAR(50) NULL,
  `to_status` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_audit_dossier` (`dossier_id`),
  KEY `idx_audit_created` (`created_at`),
  CONSTRAINT `fk_audit_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Audit Trail lưu vết thời gian thực';

-- 2.8. Bảng Nhật ký gửi Gmail tự động (email_notifications)
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

-- 3.1. Danh mục Khoa / Phòng ban CTUMP
INSERT INTO `departments` (`id`, `code`, `name`, `dean_name`, `email`, `phone`) VALUES
('dept-y', 'khoa_y', 'Khoa Y', 'PGS.TS. BS. Trưởng Khoa Y', 'khoay@ctump.edu.vn', '0292.3831.501'),
('dept-duoc', 'khoa_duoc', 'Khoa Dược', 'PGS.TS. Trưởng Khoa Dược', 'khoaduoc@ctump.edu.vn', '0292.3831.502'),
('dept-rhm', 'khoa_rhm', 'Khoa Răng Hàm Mặt', 'TS. Trưởng Khoa RHM', 'khoarhm@ctump.edu.vn', '0292.3831.503'),
('dept-ytcc', 'khoa_ytcc', 'Khoa Y tế Công cộng', 'TS. Trưởng Khoa YTCC', 'khoaytcc@ctump.edu.vn', '0292.3831.504'),
('dept-cntt', 'khoa_cntt', 'Khoa Công nghệ Thông tin', 'TS. Trưởng Khoa CNTT', 'khoacntt@ctump.edu.vn', '0292.3831.505'),
('dept-khcn', 'phong_khcn', 'Phòng Khoa học Công nghệ & HTQT', 'TS. Trưởng phòng KH&CN', 'khcn@ctump.edu.vn', '0292.3831.531'),
('dept-khtc', 'phong_khtc', 'Phòng Kế hoạch Tài chính', 'ThS. Trưởng phòng KHTC', 'khtc@ctump.edu.vn', '0292.3831.532'),
('dept-bgh', 'ban_giam_hieu', 'Ban Giám hiệu (Hiệu trưởng)', 'GS.TS. Hiệu trưởng CTUMP', 'bgh@ctump.edu.vn', '0292.3831.500');

-- 3.2. Người dùng mẫu (@ctump.edu.vn)
INSERT INTO `users` (`id`, `email`, `name`, `role`, `title`, `department`, `phone`) VALUES
('usr-admin', 'admin@ctump.edu.vn', 'Quản trị viên KH&CN', 'ADMIN', 'Chuyên viên Phòng KH&CN', 'Phòng Khoa học Công nghệ & HTQT', '0292.3831.531'),
('usr-canbo', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', 'USER', 'Giảng viên chính', 'Khoa Công nghệ Thông tin', '0912.345.678'),
('usr-giangvien', 'giangvien@ctump.edu.vn', 'ThS.BS. Lê Thị Thu Hà', 'USER', 'Giảng viên Bộ môn Nội', 'Khoa Y', '0988.765.432');

-- 3.3. Biểu mẫu CGCN chuẩn
INSERT INTO `document_templates` (`id`, `code`, `title`, `category`, `description`, `version`, `file_name`, `is_active`) VALUES
('tmpl-cgcn-1a', 'Mẫu 1a-TT.CGCN', 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu', 'Đào tạo & Tri thức', 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức vào bài giảng, giáo trình, tài liệu tập huấn.', '1.0', 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.doc', 1),
('tmpl-cgcn-2a', 'Mẫu 2a-KH.CGCN', 'Kế hoạch tổ chức chuyển giao công nghệ trong trường', 'Khoa học Công nghệ', 'Kế hoạch chi tiết về việc tổ chức chuyển giao công nghệ sản phẩm nghiên cứu ứng dụng trong trường Đại học Y Dược Cần Thơ (kèm đánh giá rủi ro).', '1.0', 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx', 1);

-- 3.4. Hồ sơ mẫu thể hiện các giai đoạn trong quy trình automation
-- Hồ sơ 1: Mới nộp (Bước 1-2)
INSERT INTO `dossiers` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, 
  `form_data`, `docx_file_url`, `has_financial_implication`, `submitted_at`
) VALUES (
  'dos-2026-0001', 'CGCN-2026-0001', 
  'Tờ trình chuyển giao tri thức đề tài: Ứng dụng AI phát hiện tổn thương phổi', 
  'usr-canbo', 'tmpl-cgcn-1a', 'Khoa Công nghệ Thông tin', 'NEW',
  JSON_OBJECT(
    'full_name', 'TS. Nguyễn Văn Nam',
    'department', 'Khoa Công nghệ Thông tin',
    'proposal_number', '15/TTr-KCNTT',
    'research_title', 'Ứng dụng AI phân tích hình ảnh X-quang phổi phát hiện sớm tổn thương',
    'target_application', 'Đưa vào học phần Chẩn đoán hình ảnh kỹ thuật số cho sinh viên Y đa khoa',
    'transfer_content', 'Chuyển giao bộ dữ liệu 10.000 ảnh đã gán nhãn và mô hình deep learning',
    'financial_plan', 'Không phát sinh kinh phí'
  ),
  '/uploads/docx/CGCN-2026-0001.docx', 0, NOW() - INTERVAL 2 HOUR
);

-- Hồ sơ 2: Yêu cầu bổ sung (Bước 2: Admin chưa duyệt do sai sót)
INSERT INTO `dossiers` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, 
  `form_data`, `docx_file_url`, `review_notes`, `has_financial_implication`, `submitted_at`, `reviewed_at`
) VALUES (
  'dos-2026-0002', 'CGCN-2026-0002', 
  'Kế hoạch CGCN: Thiết bị đo SpO2 tích hợp truyền dữ liệu IoT', 
  'usr-giangvien', 'tmpl-cgcn-2a', 'Khoa Y', 'NEEDS_REVISION',
  JSON_OBJECT(
    'plan_code', '02/KH-CGCN-KY',
    'product_name', 'Thiết bị đo SpO2 tích hợp truyền dữ liệu IoT',
    'full_name', 'ThS.BS. Lê Thị Thu Hà',
    'department', 'Khoa Y',
    'transfer_target', 'Trung tâm Mô phỏng lâm sàng'
  ),
  '/uploads/docx/CGCN-2026-0002.docx',
  'Mục VIII (Dự trù kinh phí) chưa ghi rõ nguồn tài trợ. Vui lòng bổ sung bảng thuyết minh chi phí theo biểu mẫu quy định.',
  1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 18 HOUR
);

-- Hồ sơ 3: Đã duyệt thể thức & xuất PDF chuẩn (Bước 2-4: Chờ User xin ký Khoa)
INSERT INTO `dossiers` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, 
  `form_data`, `docx_file_url`, `precheck_pdf_url`, `has_financial_implication`, `submitted_at`, `reviewed_at`
) VALUES (
  'dos-2026-0003', 'CGCN-2026-0003', 
  'Tờ trình chuyển giao tri thức: Quy trình bào chế Gel kháng khuẩn từ Nano bạc', 
  'usr-canbo', 'tmpl-cgcn-1a', 'Khoa Dược', 'PRECHECK_PASSED',
  JSON_OBJECT(
    'full_name', 'TS. Nguyễn Văn Nam',
    'department', 'Khoa Dược',
    'proposal_number', '09/TTr-KD',
    'research_title', 'Nghiên cứu công thức bào chế gel nano bạc hỗ trợ điều trị vết thương',
    'target_application', 'Bài thực hành môn Bào chế học 2',
    'financial_plan', 'Kinh phí từ đề tài cấp cơ sở đã nghiệm thu'
  ),
  '/uploads/docx/CGCN-2026-0003.docx',
  '/uploads/pdf/CGCN-2026-0003-locked.pdf',
  0, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY
);

-- Hồ sơ 4: Đã ký cấp Khoa & nộp minh chứng (Bước 3-6: Chờ Admin trình ký cấp Trường)
INSERT INTO `dossiers` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, 
  `form_data`, `docx_file_url`, `precheck_pdf_url`, `faculty_signed_pdf_url`, 
  `evidence_files`, `has_financial_implication`, `khcn_signed`, `submitted_at`, `reviewed_at`
) VALUES (
  'dos-2026-0004', 'CGCN-2026-0004', 
  'Kế hoạch chuyển giao công nghệ Hệ thống Telehealth cho Bệnh viện Trường', 
  'usr-canbo', 'tmpl-cgcn-2a', 'Khoa Công nghệ Thông tin', 'FACULTY_SIGNED',
  JSON_OBJECT(
    'plan_code', '05/KH-KCNTT',
    'product_name', 'Phần mềm tư vấn sức khỏe từ xa Telehealth CTUMP',
    'full_name', 'TS. Nguyễn Văn Nam',
    'department', 'Khoa Công nghệ Thông tin'
  ),
  '/uploads/docx/CGCN-2026-0004.docx',
  '/uploads/pdf/CGCN-2026-0004-locked.pdf',
  '/uploads/pdf/CGCN-2026-0004-faculty-signed.pdf',
  JSON_ARRAY(
    JSON_OBJECT('name', 'Bien_ban_nghiem_thu_khoa.pdf', 'url', '/uploads/evidence/bb_khoa_0004.pdf', 'size', '1.4 MB'),
    JSON_OBJECT('name', 'Hop_dong_nghiem_thu_ky_thuat.pdf', 'url', '/uploads/evidence/hd_0004.pdf', 'size', '2.8 MB')
  ),
  1, 1, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY
);

-- Hồ sơ 5: Hoàn tất & Đã ban hành Quyết định (Bước 4-8: Closed)
INSERT INTO `dossiers` (
  `id`, `code`, `title`, `user_id`, `template_id`, `department_name`, `status`, 
  `form_data`, `docx_file_url`, `precheck_pdf_url`, `faculty_signed_pdf_url`, `final_pdf_url`, 
  `decision_number`, `decision_date`, `has_financial_implication`, `khcn_signed`, `khtc_signed`, `bgh_signed`, 
  `submitted_at`, `reviewed_at`, `completed_at`
) VALUES (
  'dos-2026-0005', 'CGCN-2026-0005', 
  'Tờ trình chuyển giao quy trình sàng lọc đái tháo đường thai kỳ', 
  'usr-giangvien', 'tmpl-cgcn-1a', 'Khoa Y', 'COMPLETED',
  JSON_OBJECT(
    'full_name', 'ThS.BS. Lê Thị Thu Hà',
    'department', 'Khoa Y',
    'proposal_number', '18/TTr-KY',
    'research_title', 'Quy trình lâm sàng phát hiện sớm đái tháo đường thai kỳ'
  ),
  '/uploads/docx/CGCN-2026-0005.docx',
  '/uploads/pdf/CGCN-2026-0005-locked.pdf',
  '/uploads/pdf/CGCN-2026-0005-faculty-signed.pdf',
  '/uploads/pdf/CGCN-2026-0005-quyet-dinh-ban-hanh.pdf',
  '128/QĐ-ĐHYDCT', '2026-03-10', 0, 1, 1, 1,
  NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 2 DAY
);

-- 3.5. Audit Logs mẫu
INSERT INTO `audit_logs` (`id`, `dossier_id`, `actor_id`, `actor_name`, `actor_role`, `action`, `from_status`, `to_status`, `notes`, `created_at`) VALUES
('aud-001', 'dos-2026-0001', 'usr-canbo', 'TS. Nguyễn Văn Nam', 'USER', 'CREATE', NULL, 'NEW', 'Cán bộ khởi tạo hồ sơ và điền thông tin qua Web Form', NOW() - INTERVAL 2 HOUR),
('aud-002', 'dos-2026-0002', 'usr-giangvien', 'ThS.BS. Lê Thị Thu Hà', 'USER', 'CREATE', NULL, 'NEW', 'Cán bộ khởi tạo hồ sơ', NOW() - INTERVAL 1 DAY),
('aud-003', 'dos-2026-0002', 'usr-admin', 'Quản trị viên KH&CN', 'ADMIN', 'PRECHECK_REJECT', 'NEW', 'NEEDS_REVISION', 'Admin kiểm tra bản thảo Word và yêu cầu bổ sung bảng thuyết minh kinh phí', NOW() - INTERVAL 18 HOUR),
('aud-004', 'dos-2026-0003', 'usr-admin', 'Quản trị viên KH&CN', 'ADMIN', 'PRECHECK_APPROVE', 'NEW', 'PRECHECK_PASSED', 'Admin duyệt hợp lệ thể thức. Hệ thống tự động chuyển đổi PDF chuẩn và gửi Gmail thông báo.', NOW() - INTERVAL 2 DAY),
('aud-005', 'dos-2026-0004', 'usr-canbo', 'TS. Nguyễn Văn Nam', 'USER', 'UPLOAD_FACULTY_SIGN', 'PRECHECK_PASSED', 'FACULTY_SIGNED', 'User upload file PDF đã có chữ ký số của Trưởng Khoa và 2 tệp minh chứng', NOW() - INTERVAL 4 DAY),
('aud-006', 'dos-2026-0005', 'usr-admin', 'Quản trị viên KH&CN', 'ADMIN', 'COMPLETE', 'SCHOOL_SIGNING', 'COMPLETED', 'Hiệu trưởng ký phê duyệt và ban hành Quyết định số 128/QĐ-ĐHYDCT. Đóng hồ sơ và lưu trữ Google Drive.', NOW() - INTERVAL 2 DAY);

-- 3.6. Email Notifications mẫu
INSERT INTO `email_notifications` (`id`, `dossier_id`, `recipient_email`, `recipient_name`, `subject`, `content`, `step_name`, `status`, `sent_at`) VALUES
('em-001', 'dos-2026-0001', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', '[CTUMP DocuGov] Tiếp nhận hồ sơ CGCN-2026-0001', 'Hồ sơ CGCN của Thầy/Cô đã được tiếp nhận trên hệ thống và cấp mã tra cứu CGCN-2026-0001. Admin đang tiến hành tiền kiểm.', 'Bước 1: Tiếp nhận hồ sơ', 'SENT', NOW() - INTERVAL 2 HOUR),
('em-002', 'dos-2026-0002', 'giangvien@ctump.edu.vn', 'ThS.BS. Lê Thị Thu Hà', '[CTUMP DocuGov] Yêu cầu chỉnh sửa bổ sung hồ sơ CGCN-2026-0002', 'Hồ sơ CGCN-2026-0002 có sai sót: Mục VIII (Dự trù kinh phí) chưa ghi rõ nguồn tài trợ. Vui lòng đăng nhập hệ thống để cập nhật lại.', 'Bước 2: Yêu cầu bổ sung', 'SENT', NOW() - INTERVAL 18 HOUR),
('em-003', 'dos-2026-0003', 'canbo@ctump.edu.vn', 'TS. Nguyễn Văn Nam', '[CTUMP DocuGov] Hồ sơ CGCN-2026-0003 đã được duyệt hợp lệ - Tải PDF ký số', 'Hồ sơ CGCN-2026-0003 đã được duyệt thể thức thành công. Vui lòng tải file PDF chuẩn đính kèm để thực hiện xin chữ ký số Trưởng Khoa.', 'Bước 4: Xuất bản PDF chuẩn', 'SENT', NOW() - INTERVAL 2 DAY),
('em-004', 'dos-2026-0005', 'giangvien@ctump.edu.vn', 'ThS.BS. Lê Thị Thu Hà', '[CTUMP DocuGov] Chúc mừng: Quyết định CGCN số 128/QĐ-ĐHYDCT đã được ban hành', 'Hiệu trưởng Trường ĐH Y Dược Cần Thơ đã ký ban hành Quyết định chuyển giao công nghệ chính thức. Hồ sơ đã được lưu trữ thành công.', 'Bước 8: Hoàn tất & Ban hành QĐ', 'SENT', NOW() - INTERVAL 2 DAY);
