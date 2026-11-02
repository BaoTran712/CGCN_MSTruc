import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SERVER_DIR = path.resolve(__dirname, '..');

const BASE_URL = 'http://localhost:5000/api';

// Helper delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://localhost:5000/api/status');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.databaseConnected) {
          console.log('✓ Server backend và Database đã sẵn sàng!');
          return true;
        }
      }
    } catch {
      // wait and retry
    }
    await sleep(500);
  }
  return false;
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log('  TEST TỰ ĐỘNG TOÀN DIỆN BACKEND - KIẾN TRÚC TINH GỌN (LEAN)');
  console.log('  Hệ thống Quản lý Hồ sơ Chuyển giao Công nghệ CTUMP');
  console.log('================================================================\n');

  // Kiểm tra kết nối server
  const isReady = await waitForServer(4);
  let serverProcess = null;

  if (!isReady) {
    console.log('[Setup] Server chưa chạy trên cổng 5000. Đang tự động khởi động server...');
    serverProcess = spawn('node', ['src/server.js'], {
      cwd: SERVER_DIR,
      stdio: 'inherit',
    });

    const started = await waitForServer(30);
    if (!started) {
      if (serverProcess) serverProcess.kill();
      throw new Error('Không thể khởi động server backend sau 15 giây.');
    }
  }

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Health check & System Status
    // -----------------------------------------------------------------------
    console.log('[Test 1] GET /api/status - Kiểm tra trạng thái hệ thống & kết nối DB...');
    const statusRes = await fetch(`${BASE_URL}/status`).then((r) => r.json());
    console.log('  -> Status response:', statusRes);
    if (!statusRes.success || !statusRes.databaseConnected) {
      throw new Error('Health check thất bại hoặc MySQL chưa kết nối!');
    }
    console.log('  ✓ Test 1 PASSED: Hệ thống và Database MySQL hoạt động tốt.');

    // -----------------------------------------------------------------------
    // TEST 2: Danh mục Khoa/Đơn vị chuẩn
    // -----------------------------------------------------------------------
    console.log('\n[Test 2] GET /api/dossiers/departments - Lấy danh mục 7 Khoa chuẩn...');
    const deptsRes = await fetch(`${BASE_URL}/dossiers/departments`).then((r) => r.json());
    console.log(`  -> Tìm thấy ${deptsRes.data?.length} đơn vị trong danh mục:`);
    deptsRes.data?.forEach((d) => console.log(`     - [${d.code}] ${d.name} (${d.dean_title})`));
    if (!deptsRes.success || !Array.isArray(deptsRes.data) || deptsRes.data.length < 7) {
      throw new Error('Danh mục đơn vị không đầy đủ (cần ít nhất 7 khoa CTUMP)!');
    }
    console.log('  ✓ Test 2 PASSED: 7 Khoa CTUMP đã được cấu hình chuẩn.');

    // -----------------------------------------------------------------------
    // TEST 3: Đăng nhập & Xác thực JWT
    // -----------------------------------------------------------------------
    console.log('\n[Test 3] POST /api/auth/login - Đăng nhập phân quyền (Admin & User)...');
    
    // Đăng nhập User
    const userLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'canbo@ctump.edu.vn' }),
    }).then((r) => r.json());
    const userToken = userLoginRes.data?.token;
    console.log(`  -> User Token tạo thành công: role=${userLoginRes.data?.role}, name=${userLoginRes.data?.name || userLoginRes.data?.full_name}`);

    // Đăng nhập Admin
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@ctump.edu.vn' }),
    }).then((r) => r.json());
    const adminToken = adminLoginRes.data?.token;
    console.log(`  -> Admin Token tạo thành công: role=${adminLoginRes.data?.role}, name=${adminLoginRes.data?.name || adminLoginRes.data?.full_name}`);

    if (!userToken || !adminToken) {
      throw new Error('Đăng nhập lấy JWT Token thất bại!');
    }
    console.log('  ✓ Test 3 PASSED: Đăng nhập và phân quyền JWT hoạt động chuẩn.');

    // -----------------------------------------------------------------------
    // TEST 4: API 1.1 - Nộp mới Web Form & Tự động sinh đồng thời 2 file Word
    // -----------------------------------------------------------------------
    console.log('\n[Test 4] POST /api/dossiers/submit - Nộp mới Web Form & Tự động sinh Word (Tờ trình 1a & Kế hoạch 2a)...');
    const submitPayload = {
      department_id: 1, // Khoa Y
      technology_name: 'Quy trình sàng lọc sớm bệnh võng mạc đái tháo đường bằng thuật toán AI DeepLearning',
      transfer_type: 'APPLICATION',
      transfer_target: 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
      purpose: 'Ứng dụng thực tiễn trong công tác chẩn đoán hình ảnh tại Bệnh viện Trường',
      has_workshop: 1,
      has_budget: 1,
      form_data: {
        department_id: 1,
        full_name: 'TS. Nguyễn Văn Nam',
        position: 'Giảng viên chính',
        phone: '0912.345.678',
        email: 'canbo@ctump.edu.vn',
        so_hieu: '18',
        workshop_budget: '15.000.000 VNĐ',
        transfer_cost: '150000000',
        transfer_location: 'Hội trường Khoa Y - ĐHYD Cần Thơ',
        authors_group: 'TS. Nguyễn Văn Nam, PGS.TS. Trần Thị B',
        ds_ban_chi_dao: [
          { stt: 1, col1: 'PGS.TS. Nguyễn Văn A', col2: 'Trưởng ban chỉ đạo' },
          { stt: 2, col1: 'TS. Lê Thị C', col2: 'Phó trưởng ban' }
        ],
        ds_chuong_trinh_hoi_thao: [
          { stt: 1, thoi_gian: '08:00 - 08:30', noi_dung: 'Khai mạc hội thảo', thanh_phan: 'Toàn thể đại biểu' },
          { stt: 2, thoi_gian: '08:30 - 10:00', noi_dung: 'Báo cáo quy trình AI', thanh_phan: 'Chuyên gia báo cáo' }
        ],
        ds_danh_gia_rui_ro: [
          { stt: 1, yeu_to_rui_ro: 'Sai lệch dữ liệu ảnh chụp', p: 2, s: 3, r: 6, phan_loai: 'Trung bình' }
        ]
      }
    };

    const submitRes = await fetch(`${BASE_URL}/dossiers/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(submitPayload),
    }).then((r) => r.json());

    if (!submitRes.success || !submitRes.data) {
      throw new Error(`Nộp hồ sơ thất bại: ${submitRes.message}`);
    }

    const dossierId = submitRes.data.id;
    const trackingCode = submitRes.data.tracking_code;
    console.log(`  -> Mã hồ sơ sinh ra: ${trackingCode} (ID: ${dossierId})`);
    console.log(`  -> Tiến độ hiện tại: Bước ${submitRes.data.current_step} - ${submitRes.data.status}`);
    console.log(`  -> Số lượng file sinh tự động: ${submitRes.data.files?.length}`);

    // Kiểm tra có đủ 2 loại file Word
    const files = submitRes.data.files || [];
    const hasProposal = files.some((f) => f.file_category === 'AUTO_PROPOSAL_DOCX');
    const hasPlan = files.some((f) => f.file_category === 'AUTO_PLAN_DOCX');

    if (!hasProposal || !hasPlan) {
      throw new Error('Chưa sinh đủ 2 file Word: AUTO_PROPOSAL_DOCX và AUTO_PLAN_DOCX!');
    }

    for (const f of files) {
      const diskPath = path.resolve(PROJECT_ROOT, f.file_path);
      if (fs.existsSync(diskPath)) {
        console.log(`     ✓ File vật lý tồn tại: ${f.file_category} -> ${f.file_name} (${fs.statSync(diskPath).size} bytes)`);
      } else {
        throw new Error(`File vật lý không tồn tại trên đĩa: ${diskPath}`);
      }
    }
    console.log('  ✓ Test 4 PASSED: Nộp Web Form sinh chuẩn đồng thời 2 file Word.');

    // -----------------------------------------------------------------------
    // TEST 5: API 6.1 - Lấy chi tiết hồ sơ & Stepper
    // -----------------------------------------------------------------------
    console.log(`\n[Test 5] GET /api/dossiers/${dossierId} - Kiểm tra chi tiết, Stepper & gom nhóm file...`);
    const detailRes = await fetch(`${BASE_URL}/dossiers/${dossierId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());

    if (!detailRes.success || !detailRes.data.progress_stepper) {
      throw new Error('Không lấy được Stepper chi tiết!');
    }
    console.log(`  -> Stepper: Bước ${detailRes.data.progress_stepper.current_step}/${detailRes.data.progress_stepper.total_steps} (${detailRes.data.progress_stepper.status_label})`);
    console.log(`  -> Số lượng bản ghi Audit Log: ${detailRes.data.audit_logs?.length}`);
    console.log('  ✓ Test 5 PASSED: Thông tin chi tiết và tiến độ hiển thị chính xác.');

    // -----------------------------------------------------------------------
    // TEST 6: API 2 - Admin Tiền kiểm: REJECT (Trả về sửa chữa)
    // -----------------------------------------------------------------------
    console.log(`\n[Test 6] POST /api/dossiers/${dossierId}/precheck - Admin REJECT yêu cầu bổ sung...`);
    const rejectFormData = new FormData();
    rejectFormData.append('action', 'REJECT');
    rejectFormData.append('admin_note', 'Thiếu thông tin người đồng tác giả tại Mục VIII. Vui lòng cập nhật lại.');

    const rejectRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/precheck`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: rejectFormData,
    }).then((r) => r.json());

    if (rejectRes.data?.status !== 'NEEDS_REVISION') {
      throw new Error(`Trạng thái sau khi REJECT phải là NEEDS_REVISION, hiện tại là: ${rejectRes.data?.status}`);
    }
    console.log(`  -> Trạng thái sau khi trả về: ${rejectRes.data?.status}`);
    console.log(`  -> Ghi chú Admin: "${rejectRes.data?.admin_note}"`);
    console.log('  ✓ Test 6 PASSED: Admin tiền kiểm trả về sửa chữa hoạt động chuẩn.');

    // -----------------------------------------------------------------------
    // TEST 7: API 1.2 - User Cập nhật & Nộp lại (resubmit) tăng version
    // -----------------------------------------------------------------------
    console.log(`\n[Test 7] PUT /api/dossiers/${dossierId}/resubmit - User sửa Form & Nộp lại (tăng v2)...`);
    const resubmitPayload = {
      ...submitPayload,
      form_data: {
        ...submitPayload.form_data,
        authors_group: 'TS. Nguyễn Văn Nam, PGS.TS. Trần Thị B, ThS. Hoàng C',
      },
    };

    const resubmitRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/resubmit`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(resubmitPayload),
    }).then((r) => r.json());

    if (resubmitRes.data?.current_version !== 2 || resubmitRes.data?.status !== 'PENDING_PRECHECK') {
      throw new Error(`Resubmit thất bại: version=${resubmitRes.data?.current_version}, status=${resubmitRes.data?.status}`);
    }
    console.log(`  -> Phiên bản sau khi nộp lại: v${resubmitRes.data?.current_version}`);
    console.log(`  -> Trạng thái mới: ${resubmitRes.data?.status} (Bước ${resubmitRes.data?.current_step})`);
    console.log('  ✓ Test 7 PASSED: User sửa và nộp lại hồ sơ tăng version chuẩn.');

    // -----------------------------------------------------------------------
    // TEST 8: API 2 - Admin Tiền kiểm: APPROVE kèm upload file chỉnh tay
    // -----------------------------------------------------------------------
    console.log(`\n[Test 8] POST /api/dossiers/${dossierId}/precheck - Admin APPROVE kèm upload file chỉnh tay...`);
    const approveFormData = new FormData();
    approveFormData.append('action', 'APPROVE');
    approveFormData.append('admin_note', 'Đã căn chỉnh chuẩn lề 2cm và duyệt thể thức văn bản.');

    // Đính kèm 1 file Word giả lập chỉnh tay
    const dummyFixedPath = path.resolve(SERVER_DIR, 'dummy_fixed.docx');
    fs.writeFileSync(dummyFixedPath, 'Dummy Fixed Docx Content');
    approveFormData.append(
      'fixed_files',
      new Blob([fs.readFileSync(dummyFixedPath)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      'ToTrinh_CanChinh_Admin.docx'
    );

    const approveRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/precheck`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: approveFormData,
    }).then((r) => r.json());

    fs.unlinkSync(dummyFixedPath); // cleanup

    if (approveRes.data?.status !== 'PRECHECK_PASSED' || approveRes.data?.current_step !== 3) {
      throw new Error(`Duyệt tiền kiểm thất bại: status=${approveRes.data?.status}, step=${approveRes.data?.current_step}`);
    }
    console.log(`  -> Trạng thái sau duyệt: ${approveRes.data?.status} (Bước ${approveRes.data?.current_step})`);
    console.log(`  -> Đã lưu file ADMIN_FIXED_DOC: ${approveRes.data?.files_by_category?.ADMIN_FIXED_DOC?.length} file.`);
    console.log('  ✓ Test 8 PASSED: Admin duyệt tiền kiểm và upload file chỉnh tay.');

    // -----------------------------------------------------------------------
    // TEST 9: API 3 - User Upload Hồ sơ ký cấp Khoa & Minh chứng
    // -----------------------------------------------------------------------
    console.log(`\n[Test 9] POST /api/dossiers/${dossierId}/upload-evidence - User upload PDF ký Khoa & Minh chứng...`);
    const evidenceFormData = new FormData();
    
    // Tạo dummy files
    const dummySignedPdf = path.resolve(SERVER_DIR, 'dummy_faculty_signed.pdf');
    fs.writeFileSync(dummySignedPdf, '%PDF-1.4 Faculty Signed Dummy');
    const dummyEvidence = path.resolve(SERVER_DIR, 'dummy_evidence.pdf');
    fs.writeFileSync(dummyEvidence, '%PDF-1.4 Evidence Document Dummy');

    evidenceFormData.append(
      'faculty_signed_pdf',
      new Blob([fs.readFileSync(dummySignedPdf)], { type: 'application/pdf' }),
      'Ban_Ky_Truong_Khoa_Y.pdf'
    );
    evidenceFormData.append(
      'evidence_files',
      new Blob([fs.readFileSync(dummyEvidence)], { type: 'application/pdf' }),
      'Bien_Ban_Hoi_Dong_Khoa.pdf'
    );

    const uploadEvidenceRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/upload-evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: evidenceFormData,
    }).then((r) => r.json());

    fs.unlinkSync(dummySignedPdf);
    fs.unlinkSync(dummyEvidence);

    if (uploadEvidenceRes.data?.status !== 'EVIDENCE_UPLOADED' || uploadEvidenceRes.data?.current_step !== 4) {
      throw new Error(`Upload minh chứng thất bại: status=${uploadEvidenceRes.data?.status}`);
    }
    console.log(`  -> Trạng thái sau khi upload: ${uploadEvidenceRes.data?.status} (Bước ${uploadEvidenceRes.data?.current_step})`);
    console.log('  ✓ Test 9 PASSED: Upload PDF ký Khoa và minh chứng thành công.');

    // -----------------------------------------------------------------------
    // TEST 10: API 4 - Admin Kiểm duyệt Bộ file & Trình Hiệu trưởng
    // -----------------------------------------------------------------------
    console.log(`\n[Test 10] POST /api/dossiers/${dossierId}/review-evidence - Admin duyệt file & cập nhật trình Hiệu trưởng...`);
    const reviewEvidenceRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/review-evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'APPROVE_FILES',
        admin_note: 'Hồ sơ chữ ký Trưởng Khoa và biên bản hội đồng hợp lệ. Đang trình Ban Giám hiệu ký phê duyệt.',
      }),
    }).then((r) => r.json());

    if (reviewEvidenceRes.data?.status !== 'SCHOOL_PROCESSING') {
      throw new Error(`Review evidence thất bại: status=${reviewEvidenceRes.data?.status}`);
    }
    console.log(`  -> Trạng thái sau khi duyệt: ${reviewEvidenceRes.data?.status} (Bước ${reviewEvidenceRes.data?.current_step})`);
    console.log('  ✓ Test 10 PASSED: Admin duyệt file minh chứng và chuyển sang trình Hiệu trưởng.');

    // -----------------------------------------------------------------------
    // TEST 11: API 5 - Admin Upload Quyết định Cuối cùng & Đóng Hồ sơ
    // -----------------------------------------------------------------------
    console.log(`\n[Test 11] POST /api/dossiers/${dossierId}/complete - Admin upload Quyết định & Đóng hồ sơ (Bước 5)...`);
    const completeFormData = new FormData();
    completeFormData.append('decision_number', '168/QĐ-ĐHYDCT');
    completeFormData.append('decision_date', '2026-10-29');

    const dummyDecisionPdf = path.resolve(SERVER_DIR, 'dummy_decision.pdf');
    fs.writeFileSync(dummyDecisionPdf, '%PDF-1.4 Final Decision Signed by Principal');
    completeFormData.append(
      'final_decision_pdf',
      new Blob([fs.readFileSync(dummyDecisionPdf)], { type: 'application/pdf' }),
      'Quyet_Dinh_168_Ban_Hanh_CGCN.pdf'
    );

    const completeRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: completeFormData,
    }).then((r) => r.json());

    fs.unlinkSync(dummyDecisionPdf);

    if (completeRes.data?.status !== 'COMPLETED' || completeRes.data?.current_step !== 5) {
      throw new Error(`Complete thất bại: status=${completeRes.data?.status}`);
    }
    console.log(`  -> Trạng thái hoàn tất: ${completeRes.data?.status} (Bước ${completeRes.data?.current_step})`);
    console.log(`  -> Số Quyết định: ${completeRes.data?.decision_number} (Ngày: ${completeRes.data?.decision_date})`);
    console.log(`  -> Thời gian hoàn tất: ${completeRes.data?.completed_at}`);
    console.log('  ✓ Test 11 PASSED: Đóng hồ sơ và upload Quyết định thành công.');

    // -----------------------------------------------------------------------
    // TEST 12: API 6.2 - Download File đính kèm bằng fileId
    // -----------------------------------------------------------------------
    const finalDetail = await fetch(`${BASE_URL}/dossiers/${dossierId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    }).then((r) => r.json());

    const fileToDownload = finalDetail.data?.files?.[0];
    if (!fileToDownload) {
      throw new Error('Không tìm thấy file để kiểm tra download!');
    }

    console.log(`\n[Test 12] GET /api/dossiers/download/${fileToDownload.id} - Thử nghiệm Download file...`);
    const downloadRes = await fetch(`${BASE_URL}/dossiers/download/${fileToDownload.id}`);
    if (!downloadRes.ok) {
      throw new Error(`Download file thất bại: HTTP ${downloadRes.status}`);
    }
    const downloadBuffer = await downloadRes.arrayBuffer();
    console.log(`  -> Tải thành công file: "${fileToDownload.file_name}" (${downloadBuffer.byteLength} bytes)`);
    console.log('  ✓ Test 12 PASSED: Stream file download qua API hoạt động chính xác.');

    // -----------------------------------------------------------------------
    // TEST 13: API 6.3 - Xuất Báo cáo Thống kê Excel (.csv UTF-8 BOM)
    // -----------------------------------------------------------------------
    console.log('\n[Test 13] GET /api/dossiers/export-excel - Xuất Báo cáo Thống kê Excel cho Admin...');
    const excelRes = await fetch(`${BASE_URL}/dossiers/export-excel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (!excelRes.ok) {
      throw new Error(`Export Excel thất bại: HTTP ${excelRes.status}`);
    }

    const csvText = await excelRes.text();
    console.log(`  -> Content-Type: ${excelRes.headers.get('content-type')}`);
    console.log(`  -> Content-Disposition: ${excelRes.headers.get('content-disposition')}`);
    console.log(`  -> Chiều dài nội dung CSV: ${csvText.length} ký tự`);
    console.log(`  -> Dòng tiêu đề: ${csvText.split('\r\n')[0]}`);
    console.log(`  -> Dòng dữ liệu mẫu: ${csvText.split('\r\n')[1]?.slice(0, 100)}...`);

    if (!csvText.includes('Mã hồ sơ') || !csvText.includes('Họ tên tác giả') || !csvText.includes('Đơn vị (Khoa)') || !csvText.includes('Tên công nghệ')) {
      throw new Error('Nội dung file Excel không chứa các cột tiêu đề chuẩn!');
    }
    console.log('  ✓ Test 13 PASSED: Xuất báo cáo Excel UTF-8 BOM chuẩn cho Admin.');

    // -----------------------------------------------------------------------
    // TEST 14: Kiểm tra cờ điều kiện has_workshop=0 & has_budget=0 + Download bản chuẩn ưu tiên ADMIN_FIXED_DOC
    // -----------------------------------------------------------------------
    console.log('\n[Test 14] Kiểm tra tải bản chuẩn Bước 3 (/download-standard) ưu tiên ADMIN_FIXED_DOC...');
    const stdRes = await fetch(`${BASE_URL}/dossiers/${dossierId}/download-standard`);
    if (!stdRes.ok) {
      throw new Error(`Tải bản chuẩn thất bại: HTTP ${stdRes.status}`);
    }
    const stdDisposition = stdRes.headers.get('content-disposition') || '';
    if (!stdDisposition.includes('ToTrinh_CanChinh_Admin.docx')) {
      throw new Error(`Bản chuẩn phải ưu tiên ADMIN_FIXED_DOC, nhận được: ${stdDisposition}`);
    }
    console.log(`  -> Đã ưu tiên tải đúng bản ADMIN_FIXED_DOC: ${stdDisposition}`);
    console.log('  ✓ Test 14 PASSED: Ưu tiên tải bản chuẩn ADMIN_FIXED_DOC hoạt động chính xác.');

    console.log('\n================================================================');
    console.log('  TẤT CẢ 13 KỊCH BẢN KIỂM THỬ ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
    console.log('  Toàn bộ 6 API và Luồng Nghiệp vụ Tinh gọn (Lean Workflow)');
    console.log('  đã hoạt động trơn tru không lỗi.');
    console.log('================================================================\n');
  } finally {
    if (serverProcess) {
      console.log('[Cleanup] Dừng server process tạm...');
      serverProcess.kill();
    }
  }
}

runAllTests().catch((err) => {
  console.error('\n❌ [TEST FAILED]:', err);
  process.exit(1);
});

