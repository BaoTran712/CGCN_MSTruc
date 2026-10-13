import { query } from '../src/utils/db.js';

const TEMPLATES_DATA = [
  {
    id: 'tmpl-cgcn-1a',
    code: 'Mẫu 1a-TT.CGCN',
    title: 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu',
    category: 'Đào tạo',
    description: 'Tờ trình trình Ban Giám hiệu Trường Đại học Y Dược Cần Thơ xin phê duyệt chuyển giao tri thức từ kết quả đề tài nghiên cứu vào bài giảng, giáo trình, tài liệu tập huấn giảng dạy.',
    fileName: 'Mẫu 1a-TT.CGCN- Tờ trình CG Tri thức.docx',
    sections: ['Thông tin chung & Người trình', 'Mục đích & Nội dung chuyển giao', 'Thời gian, Địa điểm & Kinh phí'],
    fields: [
      { id: 'f-1a-proposal-number', name: 'proposal_number', label: 'Số tờ trình', type: 'text', required: true, placeholder: 'Ví dụ: 15/TTr-KCNTT', wordPlaceholder: '{{so_to_trinh}}', section: 'Thông tin chung & Người trình', order: 1 },
      { id: 'f-1a-department', name: 'department', label: 'Khoa / Đơn vị / Bộ môn trình', type: 'text', required: true, placeholder: 'Ví dụ: Khoa Công nghệ Thông tin', wordPlaceholder: '{{don_vi_uppercase}}', section: 'Thông tin chung & Người trình', order: 2 },
      { id: 'f-1a-full-name', name: 'full_name', label: 'Họ và tên người trình / Chủ nhiệm đề tài', type: 'text', required: true, placeholder: 'Ví dụ: TS. Nguyễn Văn Nam', wordPlaceholder: '{{ho_ten}}', section: 'Thông tin chung & Người trình', order: 3 },
      { id: 'f-1a-position', name: 'position', label: 'Chức danh / Học hàm, học vị', type: 'text', required: false, placeholder: 'Ví dụ: Giảng viên chính', section: 'Thông tin chung & Người trình', order: 4 },
      { id: 'f-1a-phone', name: 'phone', label: 'Số điện thoại liên hệ', type: 'text', required: false, placeholder: 'Ví dụ: 0912.345.678', section: 'Thông tin chung & Người trình', order: 5 },
      { id: 'f-1a-email', name: 'email', label: 'Email công vụ (@ctump.edu.vn)', type: 'text', required: false, placeholder: 'Ví dụ: canbo@ctump.edu.vn', section: 'Thông tin chung & Người trình', order: 6 },
      { id: 'f-1a-purpose', name: 'purpose', label: 'I. Mục đích chuyển giao', type: 'textarea', required: true, placeholder: 'Trình bày vắn tắt lý do cần thiết của chuyển giao sản phẩm từ kết quả đề tài nghiên cứu vào bài giảng, giáo trình...', wordPlaceholder: '{{muc_dich}}', section: 'Mục đích & Nội dung chuyển giao', order: 7 },
      { id: 'f-1a-receiver-needs', name: 'receiver_needs', label: 'II.1. Nhu cầu cần sử dụng của đơn vị tiếp nhận', type: 'textarea', required: true, placeholder: 'Mô tả nhu cầu thực tế của đơn vị/bộ môn/sinh viên tiếp nhận sản phẩm chuyển giao...', wordPlaceholder: '{{nhu_cau_tiep_nhan}}', section: 'Mục đích & Nội dung chuyển giao', order: 8 },
      { id: 'f-1a-provider-capacity', name: 'provider_capacity', label: 'II.2. Đáp ứng thực hiện của cá nhân / đơn vị chuyển giao', type: 'textarea', required: true, placeholder: 'Mô tả năng lực, sản phẩm đã nghiệm thu, mức độ sẵn sàng chuyển giao...', wordPlaceholder: '{{dap_ung_thuc_hien}}', section: 'Mục đích & Nội dung chuyển giao', order: 9 },
      { id: 'f-1a-transfer-goals', name: 'transfer_goals', label: 'II.3. Mục tiêu của chuyển giao', type: 'textarea', required: true, placeholder: 'Ví dụ: Nhằm tăng cường sự hiểu biết về..., đưa vào bài giảng của giáo trình...', wordPlaceholder: '{{muc_tieu}}', section: 'Mục đích & Nội dung chuyển giao', order: 10 },
      { id: 'f-1a-transfer-target', name: 'transfer_target', label: 'II.4. Đối tượng chuyển giao', type: 'textarea', required: true, placeholder: 'Kiến thức hoặc số liệu kết quả của đề tài nghiên cứu phát hiện được...', wordPlaceholder: '{{doi_tuong}}', section: 'Mục đích & Nội dung chuyển giao', order: 11 },
      { id: 'f-1a-transfer-method', name: 'transfer_method', label: 'II.5. Phương thức chuyển giao', type: 'textarea', required: true, placeholder: 'Là bài giảng có nội dung liên quan và thuộc giáo trình sẽ được tái bản / xuất bản...', wordPlaceholder: '{{phuong_thuc}}', section: 'Mục đích & Nội dung chuyển giao', order: 12 },
      { id: 'f-1a-transfer-form', name: 'transfer_form', label: 'II.6. Hình thức chuyển giao', type: 'select', required: true, defaultValue: 'Chuyển giao công nghệ độc lập.', options: ['Chuyển giao công nghệ độc lập.', 'Chuyển giao công nghệ có điều kiện.', 'Chuyển giao quyền tác giả bài giảng và giáo trình.'], wordPlaceholder: '{{hinh_thuc}}', section: 'Mục đích & Nội dung chuyển giao', order: 13 },
      { id: 'f-1a-transfer-rights', name: 'transfer_rights', label: 'II.7. Quyền chuyển giao cụ thể đối với sản phẩm tri thức', type: 'textarea', required: true, placeholder: 'Chuyển giao quyền sử dụng có độc quyền, hoặc không độc quyền, hoặc quyền sở hữu...', wordPlaceholder: '{{quyen_chuyen_giao}}', section: 'Mục đích & Nội dung chuyển giao', order: 14 },
      { id: 'f-1a-transfer-time', name: 'transfer_time', label: 'III. Thời gian chuyển giao (dự kiến)', type: 'text', required: true, placeholder: 'Ví dụ: Từ tháng 10/2026 đến tháng 12/2026', wordPlaceholder: '{{thoi_gian}}', section: 'Thời gian, Địa điểm & Kinh phí', order: 15 },
      { id: 'f-1a-transfer-location', name: 'transfer_location', label: 'IV. Địa điểm chuyển giao', type: 'text', required: true, defaultValue: 'Tại Trường Đại học Y Dược Cần Thơ', placeholder: 'Tại Khoa / Bộ môn / Phòng học...', wordPlaceholder: '{{dia_diem}}', section: 'Thời gian, Địa điểm & Kinh phí', order: 16 },
      { id: 'f-1a-attendees', name: 'attendees', label: 'V. Thành phần tham dự', type: 'textarea', required: true, placeholder: 'Giảng viên các bộ môn liên quan, sinh viên Y đa khoa, học viên sau đại học...', wordPlaceholder: '{{thanh_phan}}', section: 'Thời gian, Địa điểm & Kinh phí', order: 17 },
      { id: 'f-1a-funding-source', name: 'funding_source', label: 'VI. Kinh phí tổ chức', type: 'textarea', required: true, defaultValue: 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.', placeholder: 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ hoặc theo thỏa thuận hợp đồng nếu có', wordPlaceholder: '{{kinh_phi}}', section: 'Thời gian, Địa điểm & Kinh phí', order: 18 }
    ]
  },
  {
    id: 'tmpl-cgcn-2a',
    code: 'Mẫu 2a-KH.CGCN',
    title: 'Kế hoạch tổ chức chuyển giao công nghệ trong trường',
    category: 'Khoa học Công nghệ',
    description: 'Kế hoạch chi tiết về việc tổ chức chuyển giao công nghệ sản phẩm nghiên cứu ứng dụng trong trường Đại học Y Dược Cần Thơ (kèm phân công nhiệm vụ, kế hoạch hội thảo và quản lý rủi ro).',
    fileName: 'Mẫu 2a-KH.CGCN -Ke hoach CGCN - Trong trường.docx',
    sections: ['Thông tin chung & Sản phẩm', 'Nội dung kế hoạch chuyển giao', 'Thời gian, Địa điểm & Chi phí', 'Nhân sự chỉ đạo & Hội thảo'],
    fields: [
      { id: 'f-2a-plan-code', name: 'plan_code', label: 'Số kế hoạch', type: 'text', required: true, placeholder: 'Ví dụ: 05/KH-KCNTT', wordPlaceholder: '{{so_ke_hoach}}', section: 'Thông tin chung & Sản phẩm', order: 1 },
      { id: 'f-2a-department', name: 'department', label: 'Khoa / Đơn vị lập kế hoạch', type: 'text', required: true, placeholder: 'Ví dụ: Khoa Công nghệ Thông tin', section: 'Thông tin chung & Sản phẩm', order: 2 },
      { id: 'f-2a-product-name', name: 'product_name', label: 'Tên sản phẩm chuyển giao công nghệ', type: 'text', required: true, placeholder: 'Ví dụ: Phần mềm tư vấn sức khỏe từ xa Telehealth CTUMP', wordPlaceholder: '{{ten_san_pham}}', section: 'Thông tin chung & Sản phẩm', order: 3 },
      { id: 'f-2a-full-name', name: 'full_name', label: 'Chủ nhiệm đề tài / Người lập kế hoạch', type: 'text', required: true, placeholder: 'Ví dụ: TS. Nguyễn Văn Nam', wordPlaceholder: '{{ho_ten}}', section: 'Thông tin chung & Sản phẩm', order: 4 },
      { id: 'f-2a-phone', name: 'phone', label: 'Số điện thoại liên hệ', type: 'text', placeholder: 'Ví dụ: 0912.345.678', section: 'Thông tin chung & Sản phẩm', order: 5 },
      { id: 'f-2a-email', name: 'email', label: 'Email liên hệ', type: 'text', placeholder: 'Ví dụ: canbo@ctump.edu.vn', section: 'Thông tin chung & Sản phẩm', order: 6 },
      { id: 'f-2a-purpose', name: 'purpose', label: 'I. Mục đích (Giới thiệu SPCGCN & Mục đích chuyển giao)', type: 'textarea', required: true, placeholder: 'Giới thiệu đôi nét về sản phẩm chuyển giao công nghệ và mục đích của việc tổ chức chuyển giao...', wordPlaceholder: '{{muc_dich}}', section: 'Nội dung kế hoạch chuyển giao', order: 7 },
      { id: 'f-2a-authors-group', name: 'authors_group', label: 'II. Nhóm tác giả của sản phẩm chuyển giao', type: 'textarea', required: true, placeholder: '1. TS. Nguyễn Văn Nam (Chủ nhiệm, Khoa CNTT)\n2. ThS.BS. Lê Thị Thu Hà (Đồng nghiên cứu, Khoa Y)', wordPlaceholder: '{{nhom_tac_gia}}', section: 'Nội dung kế hoạch chuyển giao', order: 8 },
      { id: 'f-2a-product-type', name: 'product_type', label: 'III. Loại hình sản phẩm chuyển giao', type: 'select', required: true, defaultValue: 'Hệ thống phần mềm ứng dụng y tế', options: ['Hệ thống phần mềm ứng dụng y tế', 'Quy trình kỹ thuật lâm sàng / chẩn đoán', 'Thiết bị y sinh - công nghệ y tế', 'Công thức / Dược phẩm / Mỹ phẩm y học', 'Tài liệu đào tạo và chuyển giao tri thức', 'Loại hình khác'], wordPlaceholder: '{{loai_hinh_san_pham}}', section: 'Nội dung kế hoạch chuyển giao', order: 9 },
      { id: 'f-2a-transfer-method', name: 'transfer_method', label: 'IV. Phương thức chuyển giao', type: 'textarea', required: true, placeholder: 'Cài đặt hệ thống, bàn giao tài liệu kỹ thuật, chuyển giao mã nguồn và đào tạo vận hành trực tiếp...', wordPlaceholder: '{{phuong_thuc}}', section: 'Nội dung kế hoạch chuyển giao', order: 10 },
      { id: 'f-2a-receiving-party', name: 'receiving_party', label: 'V. Bên nhận chuyển giao', type: 'text', required: true, placeholder: 'Ví dụ: Bệnh viện Trường Đại học Y Dược Cần Thơ', wordPlaceholder: '{{ben_nhan_chuyen_giao}}', section: 'Nội dung kế hoạch chuyển giao', order: 11 },
      { id: 'f-2a-transfer-date', name: 'transfer_date', label: '6.1. Thời gian chuyển giao (dự kiến)', type: 'date', required: true, wordPlaceholder: '{{thoi_gian}}', section: 'Thời gian, Địa điểm & Chi phí', order: 12 },
      { id: 'f-2a-transfer-location', name: 'transfer_location', label: '6.2. Địa điểm chuyển giao', type: 'text', required: true, defaultValue: 'Tại Trường Đại học Y Dược Cần Thơ', placeholder: 'Hội trường Bệnh viện Trường / Phòng hội thảo...', wordPlaceholder: '{{dia_diem}}', section: 'Thời gian, Địa điểm & Chi phí', order: 13 },
      { id: 'f-2a-transfer-cost', name: 'transfer_cost', label: 'VII. Chi phí chuyển giao (VNĐ)', type: 'number', defaultValue: 0, placeholder: 'Nhập 0 nếu không thu phí (kinh phí hoạt động Nhà trường)', wordPlaceholder: '{{chi_phi}}', section: 'Thời gian, Địa điểm & Chi phí', order: 14 },
      { id: 'f-2a-steering-committee', name: 'steering_committee', label: 'VIII.1. Ban chỉ đạo', type: 'textarea', required: true, placeholder: '1. Đại diện Ban Giám Hiệu - Trưởng ban\n2. Trưởng Phòng KH&CN - Phó Trưởng ban', wordPlaceholder: '{{ban_chi_dao}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 15 },
      { id: 'f-2a-organizing-committee', name: 'organizing_committee', label: 'VIII.2. Ban tổ chức', type: 'textarea', required: true, placeholder: '1. Trưởng Khoa - Trưởng ban\n2. Đại diện Bên nhận chuyển giao - Đồng Trưởng ban', wordPlaceholder: '{{ban_to_chuc}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 16 },
      { id: 'f-2a-implementing-staff', name: 'implementing_staff', label: 'VIII.3. Nhân sự thực hiện', type: 'textarea', required: true, placeholder: '1. Chủ nhiệm đề tài\n2. Nhóm tác giả và chuyên viên kỹ thuật', wordPlaceholder: '{{nhan_su}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 17 },
      { id: 'f-2a-workshop-chair', name: 'workshop_chair', label: 'IX.1. Chủ tọa hội thảo (nếu có)', type: 'text', placeholder: '1. Ban Giám Hiệu; 2. Đại diện Khoa', wordPlaceholder: '{{chu_toa}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 18 },
      { id: 'f-2a-workshop-speaker', name: 'workshop_speaker', label: 'IX.2. Báo cáo viên hội thảo (nếu có)', type: 'text', placeholder: '1. Chủ nhiệm đề tài; 2. Báo cáo viên lâm sàng', wordPlaceholder: '{{bao_cao_vien}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 19 },
      { id: 'f-2a-workshop-budget', name: 'workshop_budget', label: 'IX.5. Dự trù kinh phí hội thảo', type: 'text', defaultValue: 'Từ nguồn kinh phí của Trường theo quy chế chi tiêu nội bộ.', placeholder: 'Theo quy chế chi tiêu nội bộ hoặc thỏa thuận hợp đồng', wordPlaceholder: '{{kinh_phi_hoi_thao}}', section: 'Nhân sự chỉ đạo & Hội thảo', order: 20 }
    ]
  }
];

async function main() {
  console.log('Synchronizing templates with full fields to MySQL...');
  for (const tmpl of TEMPLATES_DATA) {
    const fieldsJson = JSON.stringify(tmpl.fields);
    await query(`
      INSERT INTO document_templates (id, code, title, category, description, version, file_name, fields_config, is_active)
      VALUES (?, ?, ?, ?, ?, '1.0', ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        description = VALUES(description),
        file_name = VALUES(file_name),
        fields_config = VALUES(fields_config),
        is_active = 1
    `, [
      tmpl.id,
      tmpl.code,
      tmpl.title,
      tmpl.category,
      tmpl.description,
      tmpl.fileName,
      fieldsJson
    ]);
    console.log(`Synced: ${tmpl.code} with ${tmpl.fields.length} fields.`);
  }

  // Delete any other templates so that ONLY these 2 exist in the system
  await query(`
    DELETE FROM document_templates 
    WHERE id NOT IN ('tmpl-cgcn-1a', 'tmpl-cgcn-2a')
  `);

  const res = await query('SELECT id, code, title, JSON_LENGTH(fields_config) as field_count FROM document_templates');
  console.log('Updated templates table:');
  console.table(res);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
