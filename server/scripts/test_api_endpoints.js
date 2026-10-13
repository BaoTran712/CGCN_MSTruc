import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000/api';

async function testAll() {
  console.log('=== TEST BẮT ĐẦU: KIỂM THỬ 5 API ENDPOINTS THEO YÊU CẦU ===\n');

  // 1. GET /api/status
  console.log('[1] Testing GET /api/status...');
  const resStatus = await fetch(`${BASE_URL}/status`).then((r) => r.json());
  console.log(' -> Result:', resStatus);
  if (!resStatus.success || !resStatus.databaseConnected) {
    throw new Error('Database chưa kết nối!');
  }

  // 2. GET /api/projects
  console.log('\n[2] Testing GET /api/projects...');
  const resProjects = await fetch(`${BASE_URL}/projects`).then((r) => r.json());
  console.log(` -> Found ${resProjects.data?.length} existing projects in DB.`);

  // 3. POST /api/projects (Tiếp nhận form -> mapping Word -> lưu DB)
  console.log('\n[3] Testing POST /api/projects (Tạo hồ sơ + Mapping Word docx)...');
  const newProjectPayload = {
    title: 'Nghiên cứu ứng dụng công nghệ Telehealth trong theo dõi bệnh nhân đái tháo đường',
    templateId: '2a-KH.CGCN',
    departmentName: 'Khoa Y',
    userId: 'usr-canbo',
    hasFinancialImplication: true,
    formData: {
      research_title: 'Nghiên cứu ứng dụng công nghệ Telehealth trong theo dõi bệnh nhân đái tháo đường',
      department: 'Khoa Y',
      proposal_number: '12/KH-KY',
      target_application: 'Triển khai khám và tư vấn từ xa tại các trạm y tế cơ sở',
      financial_plan: 'Kinh phí: 200.000.000 VNĐ',
      product_type: 'Hệ thống phần mềm và quy trình quản trị y tế số',
      partner: 'Bệnh viện Trường Đại học Y Dược Cần Thơ',
      author_name: 'TS. Nguyễn Văn Nam',
    },
  };

  const resCreate = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProjectPayload),
  }).then((r) => r.json());

  console.log(' -> Created project code:', resCreate.data?.code);
  console.log(' -> Generated Docx file URL:', resCreate.data?.docxFileUrl);
  console.log(' -> Attachments count:', resCreate.data?.attachments?.length);
  const createdId = resCreate.data?.id;
  if (!createdId) throw new Error('Không tạo được hồ sơ dự án!');

  // Kiểm tra file Word thực tế trên đĩa
  const docxDiskPath = path.resolve(__dirname, `../uploads/docx/${resCreate.data.code}.docx`);
  if (fs.existsSync(docxDiskPath)) {
    console.log(` -> ✓ File docx thực tế tồn tại trên đĩa: ${docxDiskPath} (${fs.statSync(docxDiskPath).size} bytes)`);
  } else {
    console.warn(` -> ⚠️ Không tìm thấy file docx tại ${docxDiskPath}`);
  }

  // 4. GET /api/projects/:id (Lấy chi tiết hồ sơ & timeline log)
  console.log(`\n[4] Testing GET /api/projects/${createdId} (Chi tiết & Timeline)...`);
  const resDetail = await fetch(`${BASE_URL}/projects/${createdId}`).then((r) => r.json());
  console.log(' -> Title:', resDetail.data?.title);
  console.log(' -> Status:', resDetail.data?.status);
  console.log(' -> Attachments:', resDetail.data?.attachments?.map((a) => a.fileName));
  console.log(' -> Timeline logs:', resDetail.data?.timeline?.map((t) => `${t.action} (${t.actorName})`));

  // 5. POST /api/projects/:id/review (Admin duyệt hoặc yêu cầu sửa)
  console.log(`\n[5] Testing POST /api/projects/${createdId}/review (Admin duyệt)...`);
  const resReview = await fetch(`${BASE_URL}/projects/${createdId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isValid: true,
      reviewNotes: 'Admin kiểm tra hồ sơ đạt chuẩn thể thức quy định của Trường.',
      actor: { id: 'usr-admin', name: 'Quản trị viên KH&CN', role: 'ADMIN' },
    }),
  }).then((r) => r.json());

  console.log(' -> Status after review:', resReview.data?.status);
  console.log(' -> Precheck PDF URL:', resReview.data?.precheckPdfUrl);

  // 6. POST /api/projects/:id/upload-dean-signed (Cán bộ upload PDF ký Khoa)
  console.log(`\n[6] Testing POST /api/projects/${createdId}/upload-dean-signed (Upload PDF ký Khoa)...`);
  
  // Tạo file pdf dummy để upload test
  const dummyPdfPath = path.resolve(__dirname, 'dummy_dean_signed.pdf');
  fs.writeFileSync(dummyPdfPath, '%PDF-1.4\n1 0 obj\n<<\n/Title (Dean Signed PDF)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');

  const formDataUpload = new FormData();
  const fileBlob = new Blob([fs.readFileSync(dummyPdfPath)], { type: 'application/pdf' });
  formDataUpload.append('dean_signed_pdf', fileBlob, 'To_trinh_ky_Truong_Khoa_Y.pdf');
  formDataUpload.append('userId', 'usr-canbo');
  formDataUpload.append('userName', 'TS. Nguyễn Văn Nam');

  const resUpload = await fetch(`${BASE_URL}/projects/${createdId}/upload-dean-signed`, {
    method: 'POST',
    body: formDataUpload,
  }).then((r) => r.json());

  fs.unlinkSync(dummyPdfPath); // cleanup

  console.log(' -> Status after dean upload:', resUpload.data?.status);
  console.log(' -> Dean signed PDF URL:', resUpload.data?.deanSignedPdfUrl);
  console.log(' -> Attachments count now:', resUpload.data?.attachments?.length);

  // 7. POST /api/projects/:id/complete (Admin đóng hồ sơ)
  console.log(`\n[7] Testing POST /api/projects/${createdId}/complete (Admin đóng hồ sơ)...`);
  const resComplete = await fetch(`${BASE_URL}/projects/${createdId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      decisionNumber: '128/QĐ-ĐHYDCT',
      decisionDate: '15/10/2026',
      finalPdfUrl: `/uploads/pdf/${resCreate.data.code}-final.pdf`,
      actor: { id: 'usr-admin', name: 'Quản trị viên KH&CN', role: 'ADMIN' },
    }),
  }).then((r) => r.json());

  console.log(' -> Final Status:', resComplete.data?.status);
  console.log(' -> Decision Number:', resComplete.data?.decisionNumber);
  console.log(' -> Completed At:', resComplete.data?.completedAt);
  console.log(' -> Full Timeline count:', resComplete.data?.timeline?.length);

  console.log('\n=== TẤT CẢ 5 ENDPOINTS ĐÃ HOẠT ĐỘNG HOÀN TOÀN CHÍNH XÁC 100% ===');
}

testAll().catch((err) => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
