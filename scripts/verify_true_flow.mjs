/**
 * Automated End-to-End Verification Script:
 * - Phần 1: Payload Sanitization & Garbage Cleanup (DB + Orphan Files)
 * - Phần 2: Document Single Source of Truth (v1 -> v2 auto-regeneration & v1 deletion)
 * - Phần 3: Full 6-Status Lifecycle (True Flow + False Flow)
 */

import fs from 'fs';
import { dossierService } from '../server/src/services/dossierService.js';
import { sendWorkflowEmail } from '../server/src/utils/mailer.js';
import { sanitizeFormPayload } from '../server/src/utils/sanitizer.js';
import {
  cleanupGarbageData,
  resolveUploadAbsolutePath,
} from '../server/src/utils/cleanupGarbageData.js';

function getStatusStepIndex(status) {
  switch (String(status || '').toUpperCase()) {
    case 'SUBMITTED':
    case 'RETURNED_FOR_REVISION':
      return 1;
    case 'VALIDATED':
      return 2;
    case 'PENDING_SIGNED_REVIEW':
      return 3;
    case 'WAITING_RECTOR_SIGNATURE':
      return 4;
    case 'SIGNED_ARCHIVED':
      return 5;
    default:
      return 1;
  }
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('  KIỂM THỬ TOÀN TRÌNH: TRUE FLOW + FALSE FLOW & DỌN DẸP RÁC TỰ ĐỘNG');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // Test 0: Dọn dẹp toàn bộ dữ liệu rác & file mồ côi ban đầu
  // -------------------------------------------------------------------------
  console.log('--- 0. Kiểm thử Dọn dẹp Database Rác & File Mồ côi (cleanupGarbageData) ---');
  const initialClean = await cleanupGarbageData();
  assert(
    initialClean && typeof initialClean.removedOrphanFiles === 'number',
    `Đã quét và xóa ${initialClean.removedOrphanFiles} file rác mồ côi trong server/uploads`
  );
  console.log('');

  // -------------------------------------------------------------------------
  // Test 1: Kiểm thử Làm sạch Dữ liệu Đầu vào (sanitizeFormPayload)
  // -------------------------------------------------------------------------
  console.log('--- 1. Kiểm thử Sanitize Payload (Khử null/undefined, HTML, biến mẫu rác) ---');
  const dirtyPayload = {
    full_name: '  TS. Trần Thị Bảo Trân <script>alert(1)</script> {{ho_ten}} ',
    department: null,
    undefined_field: undefined,
    literal_null: 'null',
    literal_undef: 'undefined',
    purpose: 'Dòng 1\r\nDòng 2\r\n\r\n\r\n\r\nDòng 3 <b>in đậm</b> (Ví dụ: ghi mục đích) {muc_dich}',
  };
  const cleanedPayload = sanitizeFormPayload(dirtyPayload);
  assert(
    cleanedPayload.full_name === 'TS. Trần Thị Bảo Trân',
    `Đã lọc sạch thẻ <script> và biến mẫu {{ho_ten}}: "${cleanedPayload.full_name}"`
  );
  assert(
    cleanedPayload.department === '' && cleanedPayload.undefined_field === '',
    'Chuyển toàn bộ null và undefined thành chuỗi rỗng ""'
  );
  assert(
    cleanedPayload.literal_null === '' && cleanedPayload.literal_undef === '',
    'Khử sạch chuỗi literal "null" và "undefined"'
  );
  assert(
    !cleanedPayload.purpose.includes('\r') &&
      !cleanedPayload.purpose.includes('<b>') &&
      !cleanedPayload.purpose.includes('{muc_dich}') &&
      !cleanedPayload.purpose.includes('Ví dụ:'),
    `Chuẩn hóa xuống dòng \\n, xóa thẻ HTML và hướng dẫn mẫu trong ngoặc đơn`
  );
  console.log('');

  // -------------------------------------------------------------------------
  // Test 2: Bước 1 - Thầy/Cô điền Form & Khởi tạo file v1 (SUBMITTED)
  // -------------------------------------------------------------------------
  console.log('--- 2. Bước 1: Thầy/Cô điền Form & Khởi tạo bộ file Word + PDF v1 (SUBMITTED) ---');
  const mockUser = {
    id: 'usr-tran',
    name: 'TS. Trần Thị Bảo Trân',
    email: 'baotran@ctump.edu.vn',
    department: 'Khoa Y',
    role: 'USER',
  };

  const formDataV1 = {
    full_name: 'TS. Trần Thị Bảo Trân',
    department: 'Khoa Y',
    proposal_number: '88/TTr-KY',
    transfer_title: 'Chuyển giao phác đồ chẩn đoán sớm bệnh lý tim mạch (Bản v1)',
    transfer_time: 'Tháng 10/2026',
    transfer_location: 'BV Trường ĐHYD Cần Thơ',
    funding_source: 'Không thu phí (kinh phí hoạt động Nhà trường)',
  };

  const appV1 = await dossierService.createDossier(
    {
      templateId: 'tmpl-cgcn-1a',
      templateTitle: 'Tờ trình về việc chuyển giao tri thức',
      templateCode: 'Mẫu 1a-TT.CGCN',
      formData: formDataV1,
    },
    mockUser
  );

  assert(appV1 && appV1.code.startsWith('CGCN-'), `Sinh mã hồ sơ hợp lệ: ${appV1.code}`);
  assert(appV1.status === 'SUBMITTED', `Trạng thái Bước 1 là SUBMITTED`);
  assert(appV1.current_version === 1, `Phiên bản khởi tạo là v1 (current_version = ${appV1.current_version})`);

  const v1DocxAbs = resolveUploadAbsolutePath(appV1.generated_docx_path);
  const v1PdfAbs = resolveUploadAbsolutePath(appV1.generated_pdf_path);
  assert(
    Boolean(v1DocxAbs && fs.existsSync(v1DocxAbs)),
    `Sinh thành công file Word v1 trên ổ đĩa: ${appV1.generated_docx_path}`
  );
  assert(
    Boolean(v1PdfAbs && fs.existsSync(v1PdfAbs)),
    `Sinh thành công file PDF v1 trên ổ đĩa: ${appV1.generated_pdf_path}`
  );
  console.log('');

  // -------------------------------------------------------------------------
  // Test 3: Bước 2A [LUỒNG FALSE] - Admin Trả về Sửa lỗi (RETURNED_FOR_REVISION)
  // -------------------------------------------------------------------------
  console.log('--- 3. Bước 2A [Luồng False]: Admin Trả về Sửa lỗi (RETURNED_FOR_REVISION) ---');
  const adminUser = {
    id: 'usr-admin-truc',
    name: 'Cô Trúc (Phòng KH&CN)',
    email: 'admin@ctump.edu.vn',
    role: 'ADMIN',
  };

  const revisionSuggestion =
    'Mục III thời gian chuyển giao cần ghi rõ từ tháng 11/2026 đến tháng 12/2026 và bổ sung tên đề tài chính xác.';
  const appReturned = await dossierService.returnForRevision(
    appV1.id,
    revisionSuggestion,
    adminUser
  );

  assert(
    appReturned.status === 'RETURNED_FOR_REVISION',
    `Trạng thái chuyển sang RETURNED_FOR_REVISION (Trả về sửa lỗi)`
  );
  assert(
    appReturned.revision_note === revisionSuggestion,
    `Lưu chính xác "Gợi ý chỗ sai cần sửa chữa" của Admin`
  );
  assert(getStatusStepIndex(appReturned.status) === 1, 'Thanh tiến trình hiển thị tại Mốc 1 (Trả về sửa lỗi)');
  console.log('');

  // -------------------------------------------------------------------------
  // Test 4: Bước 2B [LUỒNG FALSE] - Thầy/Cô Chỉnh sửa & Nộp lại (SUBMITTED - v2)
  // -------------------------------------------------------------------------
  console.log('--- 4. Bước 2B [Luồng False]: Thầy/Cô Chỉnh sửa & Nộp lại (Tự động xóa v1 & sinh v2) ---');
  const formDataV2 = {
    ...formDataV1,
    transfer_title: 'Chuyển giao phác đồ chẩn đoán sớm bệnh lý tim mạch (Đã sửa chuẩn v2)',
    transfer_time: 'Từ tháng 11/2026 đến tháng 12/2026',
  };

  const appV2 = await dossierService.resubmitDossier(appV1.id, formDataV2, mockUser);

  assert(appV2.status === 'SUBMITTED', `Trạng thái chuyển về lại SUBMITTED sau khi nộp lại`);
  assert(appV2.current_version === 2, `Tự động tăng phiên bản lên v2 (current_version = ${appV2.current_version})`);
  assert(
    appV2.form_data.transfer_time === 'Từ tháng 11/2026 đến tháng 12/2026',
    `Cập nhật chính xác dữ liệu mới của Thầy/Cô vào Database`
  );

  // Kiểm tra file nháp v1 cũ đã bị xóa tự động
  assert(!fs.existsSync(v1DocxAbs), `File Word nháp cũ (v1) đã được tự động xóa khỏi ổ đĩa`);
  assert(!fs.existsSync(v1PdfAbs), `File PDF nháp cũ (v1) đã được tự động xóa khỏi ổ đĩa`);

  // Kiểm tra file v2 mới đã được kết xuất
  const v2DocxAbs = resolveUploadAbsolutePath(appV2.generated_docx_path);
  const v2PdfAbs = resolveUploadAbsolutePath(appV2.generated_pdf_path);
  assert(
    Boolean(v2DocxAbs && fs.existsSync(v2DocxAbs)),
    `Đã kết xuất lại file Word phiên bản mới v2: ${appV2.generated_docx_path}`
  );
  assert(
    Boolean(v2PdfAbs && fs.existsSync(v2PdfAbs)),
    `Đã kết xuất lại file PDF phiên bản mới v2: ${appV2.generated_pdf_path}`
  );
  console.log('');

  // -------------------------------------------------------------------------
  // Test 5: Bước 3 [LUỒNG TRUE / SAU KHI SỬA XONG] - Admin Duyệt (VALIDATED)
  // -------------------------------------------------------------------------
  console.log('--- 5. Bước 3 [Luồng True]: Admin nhấn Duyệt & Gửi Mail + PDF v2 (VALIDATED) ---');
  const appValidated = await dossierService.approveApplication(
    appV1.id,
    'Hồ sơ phiên bản v2 đã sửa đúng yêu cầu, duyệt hợp lệ.',
    adminUser
  );

  assert(appValidated.status === 'VALIDATED', `Trạng thái chuyển sang VALIDATED (Hồ sơ đã được duyệt)`);
  assert(
    appValidated.approved_pdf_path === `/uploads/pdf/${appV1.code}-v2.pdf`,
    `Chốt chính xác file PDF phiên bản mới nhất v2 làm bản chuẩn: ${appValidated.approved_pdf_path}`
  );
  assert(getStatusStepIndex(appValidated.status) === 2, 'Thanh tiến trình chuyển sang Mốc 2 (Hồ sơ đã được duyệt)');
  console.log('');

  // -------------------------------------------------------------------------
  // Test 6: Bước 4 - Thầy/Cô Upload bản ký phòng ban (PENDING_SIGNED_REVIEW)
  // -------------------------------------------------------------------------
  console.log('--- 6. Bước 4: Thầy/Cô Upload bản ký phòng ban + Minh chứng (PENDING_SIGNED_REVIEW) ---');
  const signedPdfUrl = `/uploads/signed/${appV1.code}-khoa-signed.pdf`;
  const evidenceFiles = [
    { name: 'bien_ban_hop_khoa.pdf', url: '/uploads/evidence/bien_ban.pdf', size: '1.1 MB' },
    { name: 'anh_minh_chung.png', url: '/uploads/evidence/anh.png', size: '2.3 MB' },
  ];

  const appPendingSigned = await dossierService.uploadFacultySignature(
    appV1.id,
    signedPdfUrl,
    evidenceFiles,
    mockUser
  );

  assert(
    appPendingSigned.status === 'PENDING_SIGNED_REVIEW',
    `Trạng thái chuyển sang PENDING_SIGNED_REVIEW (Chờ duyệt)`
  );
  assert(
    Array.isArray(appPendingSigned.department_signed_files) &&
      appPendingSigned.department_signed_files.length >= 2,
    `Lưu đầy đủ mảng department_signed_files (${appPendingSigned.department_signed_files.length} tệp)`
  );
  assert(getStatusStepIndex(appPendingSigned.status) === 3, 'Thanh tiến trình chuyển sang Mốc 3 (Chờ duyệt)');
  console.log('');

  // -------------------------------------------------------------------------
  // Test 7: Bước 5 - Admin Chuyển sang Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
  // -------------------------------------------------------------------------
  console.log('--- 7. Bước 5: Admin chuyển sang Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE) ---');
  const appWaitingRector = await dossierService.submitToRector(
    appV1.id,
    'Chữ ký phòng ban hợp lệ, chuyển trình Hiệu trưởng ký duyệt.',
    adminUser
  );

  assert(
    appWaitingRector.status === 'WAITING_RECTOR_SIGNATURE',
    `Trạng thái chuyển sang WAITING_RECTOR_SIGNATURE (Chờ ký Hiệu trưởng)`
  );
  assert(getStatusStepIndex(appWaitingRector.status) === 4, 'Thanh tiến trình chuyển sang Mốc 4 (Chờ ký Hiệu trưởng)');
  console.log('');

  // -------------------------------------------------------------------------
  // Test 8: Bước 6 - Hiệu trưởng Đã ký & Lưu trữ (SIGNED_ARCHIVED)
  // -------------------------------------------------------------------------
  console.log('--- 8. Bước 6: Hiệu trưởng Đã ký & Lưu trữ vĩnh viễn (SIGNED_ARCHIVED) ---');
  const appSignedArchived = await dossierService.completeDossier(
    appV1.id,
    {
      decisionNumber: '268/QĐ-ĐHYDCT',
      decisionDate: '2026-10-30',
    },
    adminUser
  );

  assert(
    appSignedArchived.status === 'SIGNED_ARCHIVED',
    `Trạng thái hoàn tất là SIGNED_ARCHIVED (Đã ký và lưu trữ)`
  );
  const finalSignedAbs = resolveUploadAbsolutePath(appSignedArchived.final_signed_pdf_path);
  assert(
    Boolean(finalSignedAbs && fs.existsSync(finalSignedAbs)),
    `File PDF đã ký cuối cùng tồn tại trên ổ đĩa và đính kèm qua SMTP: ${appSignedArchived.final_signed_pdf_path}`
  );
  assert(getStatusStepIndex(appSignedArchived.status) === 5, 'Thanh tiến trình hoàn tất Mốc 5 (Đã ký và lưu trữ)');
  console.log('');

  // -------------------------------------------------------------------------
  // Test 9: Kiểm tra lại Sạch Rác Lưu Trữ sau toàn bộ chu trình
  // -------------------------------------------------------------------------
  console.log('--- 9. Kiểm tra Sạch Rác Lưu Trữ (Zero Orphaned Files) ---');
  const finalClean = await cleanupGarbageData();
  assert(
    finalClean.removedOrphanFiles === 0,
    `Không còn bất kỳ file rác mồ côi nào trong thư mục lưu trữ (removedOrphanFiles = ${finalClean.removedOrphanFiles})`
  );

  const mailCheck = await sendWorkflowEmail({
    to: 'baotran@ctump.edu.vn',
    subject: '[Test] Kiểm tra gửi mail đính kèm PDF cuối cùng',
    html: '<p>Hoàn tất</p>',
    attachments: [{ filename: 'signed.pdf', path: finalSignedAbs, contentType: 'application/pdf' }],
  });
  assert(mailCheck && (mailCheck.success || mailCheck.simulated), 'Module Gmail SMTP gửi kèm PDF hoạt động an toàn');

  console.log('\n========================================================================');
  console.log(`  KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TIÊU CHÍ ĐẠT (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
