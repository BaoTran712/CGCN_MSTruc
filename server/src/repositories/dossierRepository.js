import { query, execute } from '../utils/db.js';

export const dossierRepository = {
  // Lấy tất cả hồ sơ kèm thông tin người tạo và biểu mẫu
  async findAll() {
    const rows = await query(`
      SELECT 
        d.*,
        u.name as creator_name,
        u.email as creator_email,
        u.title as creator_title,
        u.department as creator_department,
        t.title as templateTitle,
        t.code as templateCode
      FROM dossiers d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN document_templates t ON d.template_id = t.id
      ORDER BY d.created_at DESC
    `);

    return rows.map(formatDossierRow);
  },

  // Lấy hồ sơ theo ID hoặc Mã định danh
  async findById(id) {
    const rows = await query(`
      SELECT 
        d.*,
        u.name as creator_name,
        u.email as creator_email,
        u.title as creator_title,
        u.department as creator_department,
        t.title as templateTitle,
        t.code as templateCode
      FROM dossiers d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN document_templates t ON d.template_id = t.id
      WHERE d.id = ? OR d.code = ?
      LIMIT 1
    `, [id, id]);

    if (!rows || rows.length === 0) return null;
    return formatDossierRow(rows[0]);
  },

  // Sinh mã định danh tiếp theo CGCN-YYYY-XXXX
  async getNextCode() {
    const year = new Date().getFullYear();
    const rows = await query(
      `SELECT COUNT(*) as total FROM dossiers WHERE code LIKE ?`,
      [`CGCN-${year}-%`]
    );
    const count = (rows[0]?.total || 0) + 1;
    const numStr = String(count).padStart(4, '0');
    return `CGCN-${year}-${numStr}`;
  },

  // Tạo mới hồ sơ
  async create(dossier) {
    const formDataJson = typeof dossier.form_data === 'string'
      ? dossier.form_data
      : JSON.stringify(dossier.form_data || {});

    const evidenceJson = dossier.evidence_files
      ? (typeof dossier.evidence_files === 'string' ? dossier.evidence_files : JSON.stringify(dossier.evidence_files))
      : null;

    await execute(`
      INSERT INTO dossiers (
        id, code, title, user_id, template_id, department_name, status,
        form_data, docx_file_url, precheck_pdf_url, faculty_signed_pdf_url,
        evidence_files, final_pdf_url, decision_number, decision_date,
        has_financial_implication, khcn_signed, khtc_signed, bgh_signed,
        review_notes, drive_folder_url, submitted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dossier.id,
      dossier.code,
      dossier.title,
      dossier.user_id,
      dossier.template_id,
      dossier.department_name,
      dossier.status || 'NEW',
      formDataJson,
      dossier.docx_file_url || null,
      dossier.precheck_pdf_url || null,
      dossier.faculty_signed_pdf_url || null,
      evidenceJson,
      dossier.final_pdf_url || null,
      dossier.decision_number || null,
      dossier.decision_date || null,
      dossier.has_financial_implication ? 1 : 0,
      dossier.khcn_signed ? 1 : 0,
      dossier.khtc_signed ? 1 : 0,
      dossier.bgh_signed ? 1 : 0,
      dossier.review_notes || null,
      dossier.drive_folder_url || null,
      dossier.submitted_at || new Date(),
      dossier.created_at || new Date(),
    ]);

    return this.findById(dossier.id);
  },

  // Cập nhật thông tin hồ sơ
  async update(id, fields) {
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (key === 'id') continue;
      updates.push(`\`${key}\` = ?`);
      if (key === 'form_data' || key === 'evidence_files') {
        values.push(typeof val === 'string' ? val : JSON.stringify(val));
      } else if (typeof val === 'boolean') {
        values.push(val ? 1 : 0);
      } else {
        values.push(val);
      }
    }

    if (updates.length === 0) return this.findById(id);

    values.push(id);
    await execute(`UPDATE dossiers SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  // Lưu bản ghi lịch sử phiên bản khi sửa form
  async saveVersion(versionData) {
    const formDataJson = typeof versionData.formData === 'string'
      ? versionData.formData
      : JSON.stringify(versionData.formData || {});

    await execute(`
      INSERT INTO dossier_versions (id, dossier_id, version_number, form_data, edited_by_id, edited_by_name, change_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      versionData.id,
      versionData.dossierId,
      versionData.versionNumber,
      formDataJson,
      versionData.editedById,
      versionData.editedByName,
      versionData.changeSummary || 'Cập nhật thông tin hồ sơ',
      new Date(),
    ]);
  },
};

// Chuẩn hóa một dòng dữ liệu từ DB sang object chuẩn cho Application
function formatDossierRow(row) {
  if (!row) return null;

  let formData = {};
  if (row.form_data) {
    formData = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
  }

  let evidenceFiles = [];
  if (row.evidence_files) {
    evidenceFiles = typeof row.evidence_files === 'string' ? JSON.parse(row.evidence_files) : row.evidence_files;
  }

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    user_id: row.user_id,
    template_id: row.template_id,
    templateId: row.template_id,
    templateTitle: row.templateTitle || 'Biểu mẫu CGCN',
    templateCode: row.templateCode || 'Mẫu CGCN',
    department_name: row.department_name,
    status: row.status,
    form_data: formData,
    formData: formData,
    docx_file_url: row.docx_file_url,
    precheck_pdf_url: row.precheck_pdf_url,
    faculty_signed_pdf_url: row.faculty_signed_pdf_url,
    evidence_files: evidenceFiles,
    evidenceFiles: evidenceFiles,
    final_pdf_url: row.final_pdf_url,
    decision_number: row.decision_number,
    decision_date: row.decision_date,
    has_financial_implication: Boolean(row.has_financial_implication),
    khcn_signed: Boolean(row.khcn_signed),
    khtc_signed: Boolean(row.khtc_signed),
    bgh_signed: Boolean(row.bgh_signed),
    review_notes: row.review_notes,
    drive_folder_url: row.drive_folder_url,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    createdBy: {
      id: row.user_id,
      name: row.creator_name || 'Cán bộ',
      email: row.creator_email || 'canbo@ctump.edu.vn',
      role: 'USER',
      department: row.creator_department || row.department_name || 'Đơn vị',
      title: row.creator_title || 'Giảng viên',
    },
    assignedManager: {
      name: 'Quản trị viên KH&CN',
      email: 'admin@ctump.edu.vn',
      department: 'Phòng Khoa học Công nghệ & HTQT',
    },
  };
}
