import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🚀 Bắt đầu kiểm tra logic phân biệt Mẫu 1a và Mẫu 2a...');

  const { dossierService } = await import('../server/src/services/dossierService.js');
  const { documentService } = await import('../server/src/services/documentService.js');

  const mockUser = {
    id: 'usr-gv-01',
    name: 'TS. Nguyễn Văn Nam',
    email: 'nam.nv@ctump.edu.vn',
    department: 'Khoa CNTT',
    role: 'USER',
  };

  const mockAdmin = {
    id: 'usr-admin-01',
    name: 'Cô Trúc',
    email: 'admin@ctump.edu.vn',
    department: 'Phòng KH&CN',
    role: 'ADMIN',
  };

  // =========================================================================
  // TEST 1: KIỂM TRA MẪU 1A (TỜ TRÌNH) - TRUE FLOW & FALSE FLOW
  // =========================================================================
  console.log('\n--- 1. KIỂM TRA MẪU 1A (TỜ TRÌNH) ---');
  const payload1a = {
    templateId: 'tmpl-cgcn-1a',
    templateCode: 'Mẫu 1a-TT.CGCN',
    templateTitle: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
    formData: {
      proposal_number: '12/TTr-KCNTT',
      purpose: 'Chuyển giao tri thức vào bài giảng Giải phẫu học chuyên sâu',
      receiver_needs: 'Nâng cao chất lượng sinh viên',
      provider_capacity: 'Nhóm nghiên cứu đã hoàn tất nghiệm thu',
      transfer_goals: 'Ứng dụng thực tế',
      department: 'Khoa Y',
      full_name: 'TS. Nguyễn Văn Nam',
      email: 'nam.nv@ctump.edu.vn',
    },
  };

  const dossier1a = await dossierService.createDossier(payload1a, mockUser);
  console.log(`[1A-1] Tạo đơn thành công: ${dossier1a.code}`);
  assert.strictEqual(dossier1a.templateId, 'tmpl-cgcn-1a', 'templateId phải là tmpl-cgcn-1a');
  assert.ok(dossier1a.templateCode.includes('1a'), 'templateCode phải là 1a');
  assert.ok(dossier1a.title.includes('Tờ trình') || dossier1a.templateTitle.includes('Tờ trình'), 'Title phải là Tờ trình');

  // Verify DOCX file
  const docx1aPath = path.resolve(__dirname, '..', 'server', dossier1a.generated_docx_path.replace(/^\//, ''));
  assert.ok(fs.existsSync(docx1aPath), 'File DOCX 1a phải tồn tại');

  // Test False Flow on 1a: Admin returns -> User edits & resubmits
  const returned1a = await dossierService.returnForRevision(dossier1a.id, 'Sửa lại số tờ trình', mockAdmin);
  assert.strictEqual(returned1a.status, 'RETURNED_FOR_REVISION');

  const resubmitted1a = await dossierService.resubmitDossier(
    dossier1a.id,
    { proposal_number: '12-B/TTr-KCNTT', purpose: 'Đã cập nhật mục đích' },
    mockUser
  );
  console.log(`[1A-2] False flow resubmit thành công: v${resubmitted1a.current_version}`);
  assert.strictEqual(resubmitted1a.current_version, 2, 'Phiên bản phải lên v2');
  assert.strictEqual(resubmitted1a.templateId, 'tmpl-cgcn-1a', 'Sau khi nộp lại vẫn phải là tmpl-cgcn-1a');

  // Test True Flow on 1a: Admin approves
  const approved1a = await dossierService.approveApplication(dossier1a.id, 'Hồ sơ 1a hợp lệ', mockAdmin);
  assert.strictEqual(approved1a.status, 'VALIDATED');
  assert.strictEqual(approved1a.templateId, 'tmpl-cgcn-1a');

  // =========================================================================
  // TEST 2: KIỂM TRA MẪU 2A (KẾ HOẠCH) - TRUE FLOW & FALSE FLOW
  // =========================================================================
  console.log('\n--- 2. KIỂM TRA MẪU 2A (KẾ HOẠCH) ---');
  const payload2a = {
    templateId: 'tmpl-cgcn-2a',
    templateCode: 'Mẫu 2a-KH.CGCN',
    templateTitle: 'Kế hoạch tổ chức chuyển giao công nghệ trong trường',
    formData: {
      // 2a không cần plan_code
      product_name: 'Phần mềm tư vấn sức khỏe từ xa Telehealth CTUMP',
      purpose: 'Ứng dụng phần mềm vào khám chữa bệnh từ xa',
      authors_group: '1. TS. Nguyễn Văn Nam, 2. ThS. Lê Thu Hà',
      product_type: 'Hệ thống phần mềm ứng dụng y tế',
      transfer_method: 'Cài đặt và hướng dẫn vận hành',
      receiving_party: 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
      department: 'Khoa CNTT',
      full_name: 'TS. Nguyễn Văn Nam',
      email: 'nam.nv@ctump.edu.vn',
      transfer_cost: 0,
    },
  };

  const dossier2a = await dossierService.createDossier(payload2a, mockUser);
  console.log(`[2A-1] Tạo đơn Mẫu 2a thành công: ${dossier2a.code}`);
  assert.strictEqual(dossier2a.templateId, 'tmpl-cgcn-2a', 'templateId phải là tmpl-cgcn-2a');
  assert.ok(dossier2a.templateCode.includes('2a'), 'templateCode phải chứa 2a');
  assert.ok(dossier2a.title.includes('Kế hoạch') || dossier2a.templateTitle.includes('Kế hoạch'), 'Title phải là Kế hoạch');
  assert.ok(!dossier2a.title.includes('Tờ trình'), 'Title Mẫu 2a không được chứa Tờ trình');

  // Verify DOCX file exists and was generated from 2a template
  const docx2aPath = path.resolve(__dirname, '..', 'server', dossier2a.generated_docx_path.replace(/^\//, ''));
  assert.ok(fs.existsSync(docx2aPath), 'File DOCX 2a phải tồn tại');

  // Test False Flow on 2a: Admin returns -> User edits & resubmits
  const returned2a = await dossierService.returnForRevision(dossier2a.id, 'Chỉnh sửa lại nhóm tác giả', mockAdmin);
  assert.strictEqual(returned2a.status, 'RETURNED_FOR_REVISION');

  const resubmitted2a = await dossierService.resubmitDossier(
    dossier2a.id,
    {
      authors_group: '1. TS. Nguyễn Văn Nam (Chủ nhiệm), 2. ThS. Lê Thu Hà (Đồng nghiên cứu)',
      product_name: 'Phần mềm Telehealth CTUMP (Phiên bản v2)',
    },
    mockUser
  );
  console.log(`[2A-2] False flow resubmit Mẫu 2a thành công: v${resubmitted2a.current_version}`);
  assert.strictEqual(resubmitted2a.current_version, 2, 'Phiên bản phải lên v2');
  assert.strictEqual(resubmitted2a.templateId, 'tmpl-cgcn-2a', 'Sau khi nộp lại vẫn phải là tmpl-cgcn-2a');
  assert.ok(resubmitted2a.templateCode.includes('2a'), 'templateCode sau nộp lại phải là 2a');
  assert.ok(!resubmitted2a.title.includes('Tờ trình'), 'Title sau khi nộp lại không được biến thành Tờ trình');

  // Test True Flow on 2a: Admin approves
  const approved2a = await dossierService.approveApplication(dossier2a.id, 'Kế hoạch 2a hoàn toàn hợp lệ', mockAdmin);
  console.log(`[2A-3] Admin duyệt Mẫu 2a thành công: ${approved2a.status}`);
  assert.strictEqual(approved2a.status, 'VALIDATED');
  assert.strictEqual(approved2a.templateId, 'tmpl-cgcn-2a');
  assert.ok(approved2a.approved_pdf_path, 'Phải có approved_pdf_path');

  // Step 3: Faculty upload signed document
  const facultySigned2a = await dossierService.uploadFacultySignature(
    dossier2a.id,
    '/uploads/signed/CGCN-2a-signed.pdf',
    [{ name: 'minh_chung_2a.pdf', url: '/uploads/evidence/mc2a.pdf', size: '100 KB' }],
    mockUser
  );
  console.log(`[2A-4] Giảng viên upload bản ký thành công: ${facultySigned2a.status}`);
  assert.ok(
    facultySigned2a.status === 'PENDING_SIGNED_REVIEW' || facultySigned2a.status === 'WAITING_FOR_SUBMISSION',
    'Trạng thái sau khi upload bản ký'
  );

  // Step 4: Admin submit to rector
  const toRector2a = await dossierService.updateSchoolSigning(dossier2a.id, 'Đã nộp trình Hiệu trưởng', mockAdmin);
  assert.strictEqual(toRector2a.status, 'WAITING_RECTOR_SIGNATURE');

  // Step 5: Admin complete signed
  const signedFinal2a = await dossierService.completeDossier(
    dossier2a.id,
    '45/QĐ-ĐHYDCT',
    '2026-11-02',
    '/uploads/pdf/final-signed-2a.pdf',
    mockAdmin
  );
  console.log(`[2A-5] Hoàn tất ký Hiệu trưởng & lưu trữ: ${signedFinal2a.status}`);
  assert.ok(
    signedFinal2a.status === 'SIGNED' || signedFinal2a.status === 'SIGNED_ARCHIVED',
    'Trạng thái cuối cùng phải là SIGNED hoặc SIGNED_ARCHIVED'
  );
  assert.strictEqual(signedFinal2a.templateId, 'tmpl-cgcn-2a');

  // =========================================================================
  // TEST 3: KIỂM TRA FIND_TEMPLATE_FILE VỚI ĐƯỜNG DẪN TRỰC TIẾP TỪ USER
  // =========================================================================
  console.log('\n--- 3. KIỂM TRA CHỌN FILE TỰ DO / TEMPLATE FILE SELECTION ---');
  const directPathUser = 'docs/templates/Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx';
  const foundUser = documentService.findTemplateFile(directPathUser);
  console.log(`[3-1] Tìm file qua đường dẫn: filePath = ${foundUser.filePath}, is1a = ${foundUser.is1a}`);
  assert.strictEqual(foundUser.is1a, false, 'Khi chọn Mẫu 2a thì is1a phải là false');
  assert.ok(fs.existsSync(foundUser.filePath), 'File tìm thấy phải tồn tại trên ổ đĩa');

  const directPath1a = 'docs/templates/Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx';
  const found1a = documentService.findTemplateFile(directPath1a);
  console.log(`[3-2] Tìm file Mẫu 1a: filePath = ${found1a.filePath}, is1a = ${found1a.is1a}`);
  assert.strictEqual(found1a.is1a, true, 'Khi chọn Mẫu 1a thì is1a phải là true');

  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST PHÂN BIỆT MẪU 1A VÀ MẪU 2A ĐỀU ĐẠT CHUẨN 100%!');
}

runTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
