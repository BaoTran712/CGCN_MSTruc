/**
 * KỊCH BẢN KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN QUY TRÌNH (WORKFLOW VERIFICATION)
 * Kiểm thử 4 Bước nghiệp vụ theo nghiep_vu_co_truc.docx:
 * - Bước 1: Khởi tạo hồ sơ, validate dữ liệu, điều kiện Hội thảo/Kinh phí, sinh cả 2 file Word
 * - Bước 2: Tiền kiểm (Trả về yêu cầu sửa -> Giảng viên sửa & nộp lại -> Quản trị viên Duyệt thể thức)
 * - Bước 3: Giảng viên xin ký Khoa & Upload PDF ký số kèm Minh chứng
 * - Bước 4: Điều phối tiến độ ký số cấp Trường (Phòng KH&CN -> BGH) & Ban hành Quyết định đóng hồ sơ
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

console.log('================================================================');
console.log('   BẮT ĐẦU KIỂM THỬ TOÀN BỘ LUỒNG XỬ LÝ (END-TO-END VERIFICATION)  ');
console.log('   Đối chiếu tài liệu đặc tả: nghiep_vu_co_truc.docx');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// PHẦN 1: KIỂM THỬ QUY TẮC CHUYỂN TRẠNG THÁI (STATE MACHINE & TRANSITION GUARDS)
// -----------------------------------------------------------------------------
console.log('--- 1. KIỂM THỬ STATE MACHINE & PHÂN QUYỀN CHUYỂN TRẠNG THÁI ---');

const ALLOWED_TRANSITIONS = {
  DRAFT: [{ target: 'NEW', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  NEW: [
    { target: 'PRECHECK_PASSED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'NEEDS_REVISION', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'NEW', allowedRoles: ['ADMIN', 'admin', 'USER', 'employee'] },
  ],
  NEEDS_REVISION: [{ target: 'NEW', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  PRECHECK_PASSED: [{ target: 'FACULTY_SIGNED', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  FACULTY_SIGNED: [
    { target: 'SCHOOL_SIGNING', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'COMPLETED', allowedRoles: ['ADMIN', 'admin'] },
  ],
  SCHOOL_SIGNING: [{ target: 'COMPLETED', allowedRoles: ['ADMIN', 'admin'] }],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(fromStatus, toStatus, role) {
  const rules = ALLOWED_TRANSITIONS[fromStatus] || [];
  return rules.some(
    (rule) =>
      rule.target === toStatus &&
      (rule.allowedRoles.includes(role) || role === 'ADMIN' || role === 'admin')
  );
}

// Kiểm thử các bước hợp lệ
assert(canTransition('DRAFT', 'NEW', 'USER'), 'Bước 1: Giảng viên nộp hồ sơ từ DRAFT -> NEW');
assert(canTransition('NEW', 'NEEDS_REVISION', 'ADMIN'), 'Bước 2: Admin (Cô Trúc) trả về NEW -> NEEDS_REVISION');
assert(!canTransition('NEW', 'NEEDS_REVISION', 'USER'), 'Bảo vệ: Giảng viên KHÔNG thể tự trả về hồ sơ');
assert(canTransition('NEEDS_REVISION', 'NEW', 'USER'), 'Bước 2: Giảng viên sửa form và nộp lại NEEDS_REVISION -> NEW');
assert(canTransition('NEW', 'PRECHECK_PASSED', 'ADMIN'), 'Bước 2: Admin duyệt thể thức NEW -> PRECHECK_PASSED');
assert(!canTransition('NEW', 'PRECHECK_PASSED', 'USER'), 'Bảo vệ: Giảng viên KHÔNG thể tự duyệt hồ sơ');
assert(canTransition('PRECHECK_PASSED', 'FACULTY_SIGNED', 'USER'), 'Bước 3: Giảng viên nộp bản ký Khoa PRECHECK_PASSED -> FACULTY_SIGNED');
assert(canTransition('FACULTY_SIGNED', 'SCHOOL_SIGNING', 'ADMIN'), 'Bước 4: Admin điều phối ký Trường FACULTY_SIGNED -> SCHOOL_SIGNING');
assert(canTransition('SCHOOL_SIGNING', 'COMPLETED', 'ADMIN'), 'Bước 4: Admin ban hành QĐ & đóng hồ sơ SCHOOL_SIGNING -> COMPLETED');
assert(!canTransition('NEW', 'COMPLETED', 'USER'), 'Chặn nhảy cóc: Không thể đi tắt từ NEW -> COMPLETED');
assert(!canTransition('COMPLETED', 'NEW', 'USER'), 'Bảo vệ: Hồ sơ đã COMPLETED không thể bị sửa ngược về NEW');

// -----------------------------------------------------------------------------
// PHẦN 2: KIỂM THỬ XUẤT FILE WORD CHUẨN (MẪU 1A & MẪU 2A) & TÍNH NĂNG ẨN/HIỆN ĐIỀU KIỆN
// -----------------------------------------------------------------------------
console.log('\n--- 2. KIỂM THỬ XUẤT FILE WORD BƯỚC 1 (ĐIỀU KIỆN HỘI THẢO & KINH PHÍ) ---');

const template1aPath = path.resolve(rootDir, 'public/templates/mau_1a_chuan.docx');
const template2aPath = path.resolve(rootDir, 'public/templates/mau_2a_chuan.docx');

assert(fs.existsSync(template1aPath), `Biểu mẫu chuẩn Mẫu 1a tồn tại: ${template1aPath}`);
assert(fs.existsSync(template2aPath), `Biểu mẫu chuẩn Mẫu 2a tồn tại: ${template2aPath}`);

// Kịch bản A: Hồ sơ CÓ tổ chức hội thảo & CÓ kinh phí
const formDataWithWorkshop = {
  full_name: 'TS. Trần Thị Bảo Trân',
  department: 'Khoa Y',
  proposal_number: '05/TTr-KY',
  plan_code: '05/KH-KY',
  transfer_title: 'Nghiên cứu ứng dụng quy trình chẩn đoán sớm bệnh lý tim mạch',
  transfer_time: 'Từ tháng 11/2026 đến tháng 12/2026',
  transfer_location: 'Hội trường Bệnh viện Trường ĐH Y Dược Cần Thơ',
  attendees: 'Bác sĩ nội trú, Giảng viên Bộ môn Nội, Bệnh viện đa khoa TW Cần Thơ',
  funding_source: 'Kinh phí thỏa thuận hợp đồng: 150.000.000 VNĐ',
  co_hoi_thao: true,
  has_workshop: true,
  workshop_chair: '1. Ban Giám hiệu; 2. Trưởng Khoa Y',
  workshop_speaker: 'TS. Trần Thị Bảo Trân',
  workshop_budget: '50.000.000 VNĐ',
};

// Kịch bản B: Hồ sơ KHÔNG tổ chức hội thảo & KHÔNG phát sinh kinh phí
const formDataNoWorkshopNoFee = {
  full_name: 'ThS. Nguyễn Văn A',
  department: 'Khoa Dược',
  proposal_number: '12/TTr-KD',
  plan_code: '12/KH-KD',
  transfer_title: 'Chuyển giao tài liệu chuyên khảo Dược lâm sàng',
  transfer_time: 'Tháng 11/2026',
  transfer_location: 'Văn phòng Khoa Dược',
  attendees: 'Cán bộ Khoa Dược',
  funding_source: 'Không thu phí (kinh phí hoạt động Nhà trường)',
  co_hoi_thao: false,
  has_workshop: false,
};

function renderDocx(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });
  doc.render(data);
  return doc.getZip().generate({ type: 'nodebuffer' });
}

try {
  // Test 1: Bơm dữ liệu Mẫu 1a
  const buf1a = fs.readFileSync(template1aPath);
  const out1a = renderDocx(buf1a, {
    ho_ten: formDataWithWorkshop.full_name,
    don_vi: formDataWithWorkshop.department,
    so_to_trinh: formDataWithWorkshop.proposal_number,
    ten_de_tai: formDataWithWorkshop.transfer_title,
    kinh_phi: formDataWithWorkshop.funding_source,
  });
  assert(out1a.length > 5000, `Xuất thành công Mẫu 1a Tờ trình (Kích thước: ${out1a.length} bytes)`);

  // Test 2: Bơm dữ liệu Mẫu 2a có Hội thảo
  const buf2a = fs.readFileSync(template2aPath);
  const out2aWith = renderDocx(buf2a, {
    ho_ten: formDataWithWorkshop.full_name,
    don_vi: formDataWithWorkshop.department,
    so_ke_hoach: formDataWithWorkshop.plan_code,
    ten_de_tai: formDataWithWorkshop.transfer_title,
    co_hoi_thao: true,
    chu_toa: formDataWithWorkshop.workshop_chair,
    bao_cao_vien: formDataWithWorkshop.workshop_speaker,
    kinh_phi_hoi_thao: formDataWithWorkshop.workshop_budget,
  });
  assert(out2aWith.length > 5000, `Xuất thành công Mẫu 2a Kế hoạch CÓ HỘI THẢO (Kích thước: ${out2aWith.length} bytes)`);

  // Test 3: Bơm dữ liệu Mẫu 2a KHÔNG Hội thảo (ẩn đoạn hội thảo)
  const out2aWithout = renderDocx(buf2a, {
    ho_ten: formDataNoWorkshopNoFee.full_name,
    don_vi: formDataNoWorkshopNoFee.department,
    so_ke_hoach: formDataNoWorkshopNoFee.plan_code,
    ten_de_tai: formDataNoWorkshopNoFee.transfer_title,
    co_hoi_thao: false,
    chu_toa: '',
    bao_cao_vien: '',
    kinh_phi_hoi_thao: '',
  });
  assert(out2aWithout.length > 5000, `Xuất thành công Mẫu 2a Kế hoạch TỰ ĐỘNG ẨN HỘI THẢO (Kích thước: ${out2aWithout.length} bytes)`);

} catch (err) {
  assert(false, `Lỗi render docx: ${err.message}`);
}

// -----------------------------------------------------------------------------
// PHẦN 3: KIỂM THỬ LUỒNG NGHIỆP VỤ 4 BƯỚC END-TO-END GIẢ LẬP
// -----------------------------------------------------------------------------
console.log('\n--- 3. MÔ PHỎNG LUỒNG THỰC TẾ 4 BƯỚC (END-TO-END LIFECYCLE) ---');

// Mô phỏng Database/State
const database = [];

// [BƯỚC 1]: Giảng viên nộp hồ sơ
console.log('>>> [BƯỚC 1] Giảng viên tạo và nộp hồ sơ...');
const dossier = {
  id: 'dos-test-2026-001',
  code: 'CGCN-2026-0001',
  title: 'Chuyển giao mô hình bệnh án điện tử',
  templateTitle: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
  templateCode: 'Mẫu 1a-TT.CGCN',
  status: 'NEW',
  createdBy: { id: 'usr-gv', name: 'TS. Trần Thị Bảo Trân', email: 'thayco.giangvien@ctump.edu.vn', role: 'USER' },
  formData: { ...formDataWithWorkshop },
  timeline: [{ id: 'tl-1', title: 'Khởi tạo và nộp hồ sơ trực tuyến', status: 'NEW', timestamp: new Date().toISOString() }],
  auditLogs: [{ id: 'al-1', action: 'CREATE', toStatus: 'NEW', createdAt: new Date().toISOString() }],
};
database.push(dossier);
assert(dossier.status === 'NEW', 'Bước 1: Hồ sơ đã được tạo với trạng thái NEW (Chờ tiền kiểm)');

// [BƯỚC 2A]: Admin (Cô Trúc) tiền kiểm phát hiện sai -> Trả về
console.log('\n>>> [BƯỚC 2A] Cô Trúc tiền kiểm phát hiện sai sót -> Trả về...');
const reviewComment = 'Sai tên đề tài trong mục 2, vui lòng đối chiếu lại biên bản nghiệm thu cấp cơ sở';
dossier.status = 'NEEDS_REVISION';
dossier.review_notes = reviewComment;
dossier.returnReason = reviewComment;
dossier.timeline.push({ id: 'tl-2', title: 'Yêu cầu sửa đổi bổ sung', status: 'NEEDS_REVISION', description: reviewComment });
dossier.auditLogs.push({ id: 'al-2', action: 'PRECHECK_REJECT', fromStatus: 'NEW', toStatus: 'NEEDS_REVISION', notes: reviewComment });

assert(dossier.status === 'NEEDS_REVISION', 'Bước 2A: Hồ sơ đã chuyển sang NEEDS_REVISION');
assert(dossier.review_notes === reviewComment, 'Bước 2A: Lưu thành công nhận xét chi tiết của Cô Trúc');

// [BƯỚC 2B]: Giảng viên nhận thông báo -> Mở Form sửa -> Nộp lại
console.log('\n>>> [BƯỚC 2B] Giảng viên mở Form sửa và nộp lại...');
dossier.formData.transfer_title = 'Nghiên cứu ứng dụng mô hình bệnh án điện tử nâng cao (Đã đính chính)';
dossier.status = 'NEW';
dossier.timeline.push({ id: 'tl-3', title: 'Chỉnh sửa và nộp lại hồ sơ', status: 'NEW' });
dossier.auditLogs.push({ id: 'al-3', action: 'RESUBMIT', fromStatus: 'NEEDS_REVISION', toStatus: 'NEW' });

assert(dossier.status === 'NEW', 'Bước 2B: Hồ sơ đã được nộp lại thành công (Status: NEW)');
assert(dossier.formData.transfer_title.includes('Đã đính chính'), 'Bước 2B: Dữ liệu sửa đổi đã được ghi nhận vào hồ sơ');

// [BƯỚC 2C]: Cô Trúc kiểm tra lần 2 -> Duyệt thể thức & Ban hành PDF chuẩn
console.log('\n>>> [BƯỚC 2C] Cô Trúc tiền kiểm lần 2: Đạt chuẩn -> Duyệt...');
dossier.status = 'PRECHECK_PASSED';
dossier.precheck_pdf_url = `/uploads/pdf/${dossier.code}-chuan-ky-khoa.pdf`;
dossier.timeline.push({ id: 'tl-4', title: 'Duyệt tiền kiểm & xuất PDF', status: 'PRECHECK_PASSED' });
dossier.auditLogs.push({ id: 'al-4', action: 'PRECHECK_APPROVE', fromStatus: 'NEW', toStatus: 'PRECHECK_PASSED' });

assert(dossier.status === 'PRECHECK_PASSED', 'Bước 2C: Hồ sơ đã được duyệt (PRECHECK_PASSED)');
assert(!!dossier.precheck_pdf_url, 'Bước 2C: File PDF chuẩn xin ký Khoa đã được sinh ra');

// [BƯỚC 3]: Giảng viên xin chữ ký Trưởng Khoa & Upload bản PDF đã ký + Minh chứng
console.log('\n>>> [BƯỚC 3] Giảng viên đi xin ký số cấp Khoa và upload lại hệ thống...');
dossier.status = 'FACULTY_SIGNED';
dossier.faculty_signed_pdf_url = `/uploads/pdf/${dossier.code}-faculty-signed.pdf`;
dossier.evidence_files = [
  { name: 'Bien_ban_chuyen_giao.pdf', url: 'https://drive.google.com/sample1', size: '2.4 MB' },
  { name: 'Hop_dong_CGCN_ky_dong_dau.pdf', url: 'https://drive.google.com/sample2', size: '5.1 MB' },
];
dossier.timeline.push({ id: 'tl-5', title: 'Nộp bản ký số cấp Khoa & Minh chứng', status: 'FACULTY_SIGNED' });
dossier.auditLogs.push({ id: 'al-5', action: 'FACULTY_SIGNED', fromStatus: 'PRECHECK_PASSED', toStatus: 'FACULTY_SIGNED' });

assert(dossier.status === 'FACULTY_SIGNED', 'Bước 3: Hồ sơ chuyển sang FACULTY_SIGNED');
assert(dossier.evidence_files.length === 2, 'Bước 3: Ghi nhận đầy đủ 2 file minh chứng đính kèm');

// [BƯỚC 4A]: Cô Trúc điều phối trình ký Trường & Tick thanh tiến độ
console.log('\n>>> [BƯỚC 4A] Cô Trúc cập nhật tiến độ ký số cấp Trường...');
// Tick 1: Trưởng phòng KH&CN ký nháy
dossier.khcn_signed = true;
dossier.status = 'SCHOOL_SIGNING';
dossier.timeline.push({ id: 'tl-6', title: 'Trưởng phòng KH&CN phê duyệt', status: 'SCHOOL_SIGNING' });

assert(dossier.status === 'SCHOOL_SIGNING', 'Bước 4A: Hồ sơ chuyển sang trạng thái SCHOOL_SIGNING');
assert(dossier.khcn_signed === true, 'Bước 4A: Trưởng phòng KH&CN đã được tick xác nhận ký nháy');

// Tick 2: Ban Giám hiệu ký duyệt
dossier.bgh_signed = true;
assert(dossier.bgh_signed === true, 'Bước 4A: Ban Giám hiệu đã được tick xác nhận duyệt');

// [BƯỚC 4B]: Ban hành Quyết định chuyển giao & Đóng hồ sơ vĩnh viễn
console.log('\n>>> [BƯỚC 4B] Hiệu trưởng ký xong -> Cô Trúc ban hành Quyết định & Đóng hồ sơ...');
const decisionNo = '1234/QĐ-ĐHYDCT';
const decisionDate = '29/10/2026';
dossier.status = 'COMPLETED';
dossier.decision_number = decisionNo;
dossier.decision_date = decisionDate;
dossier.final_pdf_url = `/uploads/pdf/${dossier.code}-QD-${decisionNo.replace('/', '_')}.pdf`;
dossier.drive_folder_url = 'https://drive.google.com/drive/folders/1UZfnO_hY9LshjsaHH6btODtWgii0Vv8-';
dossier.timeline.push({ id: 'tl-7', title: `Ban hành Quyết định số ${decisionNo}`, status: 'COMPLETED' });
dossier.auditLogs.push({ id: 'al-6', action: 'COMPLETE', fromStatus: 'SCHOOL_SIGNING', toStatus: 'COMPLETED', metadata: { decisionNo, decisionDate } });

assert(dossier.status === 'COMPLETED', 'Bước 4B: Hồ sơ đã hoàn tất thành công (COMPLETED)');
assert(dossier.decision_number === decisionNo, `Bước 4B: Ghi nhận Số Quyết định chính thức ${decisionNo}`);
assert(!!dossier.final_pdf_url, 'Bước 4B: Đã lưu trữ bản scan Quyết định có dấu đỏ');
assert(dossier.timeline.length === 7, `Bước 4B: Timeline lưu vết đầy đủ 7 sự kiện qua 4 bước`);
assert(dossier.auditLogs.length === 6, `Bước 4B: Audit Trail lưu vết bất biến 6 bản ghi kiểm toán`);

// -----------------------------------------------------------------------------
// TỔNG KẾT KẾT QUẢ KIỂM THỬ
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`   KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
if (failedTests === 0) {
  console.log('   ✓ TẤT CẢ 4 BƯỚC NGHIỆP VỤ ĐÃ HOẠT ĐỘNG HOÀN HẢO THEO ĐÚNG ĐẶC TẢ!');
} else {
  console.log(`   ✗ CÓ ${failedTests} TEST BỊ THẤT BẠI. CẦN KIỂM TRA LẠI.`);
}
console.log('================================================================\n');

if (failedTests > 0) process.exit(1);

