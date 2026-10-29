import { query, execute, isDbConnected } from '../utils/db.js';
import { mockStore } from '../utils/mockStore.js';

export const dossierRepository = {
  // Lấy tất cả hồ sơ kèm thông tin người tạo và biểu mẫu
  async findAll() {
    if (!isDbConnected()) {
      return mockStore.dossiers.map((d) => ({ ...d }));
    }

    try {
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

      if (!rows || rows.length === 0) {
        return mockStore.dossiers.map((d) => ({ ...d }));
      }
      return rows.map(formatDossierRow);
    } catch {
      return mockStore.dossiers.map((d) => ({ ...d }));
    }
  },

  // Lấy hồ sơ theo ID hoặc Mã định danh
  async findById(id) {
    if (!isDbConnected()) {
      const match = mockStore.dossiers.find((d) => d.id === id || d.code === id);
      return match ? { ...match } : null;
    }

    try {
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

      if (!rows || rows.length === 0) {
        const match = mockStore.dossiers.find((d) => d.id === id || d.code === id);
        return match ? { ...match } : null;
      }
      return formatDossierRow(rows[0]);
    } catch {
      const match = mockStore.dossiers.find((d) => d.id === id || d.code === id);
      return match ? { ...match } : null;
    }
  },

  // Sinh mã định danh tiếp theo CGCN-YYYY-XXXX
  async getNextCode() {
    const year = new Date().getFullYear();
    if (!isDbConnected()) {
      const count = mockStore.dossiers.length + 1;
      const numStr = String(count).padStart(4, '0');
      return `CGCN-${year}-${numStr}`;
    }

    try {
      const rows = await query(
        `SELECT COUNT(*) as total FROM dossiers WHERE code LIKE ?`,
        [`CGCN-${year}-%`]
      );
      const count = (rows[0]?.total || 0) + 1;
      const numStr = String(count).padStart(4, '0');
      return `CGCN-${year}-${numStr}`;
    } catch {
      const count = mockStore.dossiers.length + 1;
      const numStr = String(count).padStart(4, '0');
      return `CGCN-${year}-${numStr}`;
    }
  },

  // Tạo mới hồ sơ
  async create(dossier) {
    if (!isDbConnected()) {
      const createdItem = {
        ...dossier,
        id: dossier.id || `dos-${Date.now()}`,
        code: dossier.code,
        status: dossier.status || 'NEW',
        formData: dossier.form_data || dossier.formData || {},
        form_data: dossier.form_data || dossier.formData || {},
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        submitted_at: dossier.submitted_at || new Date().toISOString(),
        submittedAt: dossier.submitted_at || new Date().toISOString(),
        createdBy: {
          id: dossier.user_id || 'usr_canbo',
          name: 'Cán bộ / Giảng viên',
          email: 'canbo@ctump.edu.vn',
          role: 'USER',
          department: dossier.department_name || 'Khoa Y',
        },
      };
      mockStore.dossiers.unshift(createdItem);
      return createdItem;
    }

    const formDataJson = typeof dossier.form_data === 'string'
      ? dossier.form_data
      : JSON.stringify(dossier.form_data || {});

    const evidenceJson = dossier.evidence_files
      ? (typeof dossier.evidence_files === 'string' ? dossier.evidence_files : JSON.stringify(dossier.evidence_files))
      : null;

    try {
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
        dossier.submitted_at ?? null,
        dossier.created_at || new Date(),
      ]);
      return this.findById(dossier.id);
    } catch {
      mockStore.dossiers.unshift(dossier);
      return dossier;
    }
  },

  // Cập nhật thông tin hồ sơ
  async update(id, fields) {
    if (!isDbConnected()) {
      const idx = mockStore.dossiers.findIndex((d) => d.id === id || d.code === id);
      if (idx !== -1) {
        mockStore.dossiers[idx] = {
          ...mockStore.dossiers[idx],
          ...fields,
          formData: fields.form_data || fields.formData || mockStore.dossiers[idx].formData,
          form_data: fields.form_data || fields.formData || mockStore.dossiers[idx].form_data,
          status: fields.status || mockStore.dossiers[idx].status,
          review_notes: fields.review_notes !== undefined ? fields.review_notes : mockStore.dossiers[idx].review_notes,
          reviewNotes: fields.review_notes !== undefined ? fields.review_notes : mockStore.dossiers[idx].reviewNotes,
          khcn_signed: fields.khcn_signed !== undefined ? fields.khcn_signed : mockStore.dossiers[idx].khcn_signed,
          bgh_signed: fields.bgh_signed !== undefined ? fields.bgh_signed : mockStore.dossiers[idx].bgh_signed,
          faculty_signed_pdf_url: fields.faculty_signed_pdf_url || mockStore.dossiers[idx].faculty_signed_pdf_url,
          final_pdf_url: fields.final_pdf_url || mockStore.dossiers[idx].final_pdf_url,
          decision_number: fields.decision_number || mockStore.dossiers[idx].decision_number,
          decision_date: fields.decision_date || mockStore.dossiers[idx].decision_date,
        };
        return { ...mockStore.dossiers[idx] };
      }
      return null;
    }

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

    values.push(id, id);
    try {
      await execute(`UPDATE dossiers SET ${updates.join(', ')} WHERE id = ? OR code = ?`, values);
      return this.findById(id);
    } catch {
      const idx = mockStore.dossiers.findIndex((d) => d.id === id || d.code === id);
      if (idx !== -1) {
        mockStore.dossiers[idx] = { ...mockStore.dossiers[idx], ...fields };
        return mockStore.dossiers[idx];
      }
      return null;
    }
  },

  // Đếm số phiên bản hiện có của một hồ sơ
  async countVersions(dossierId) {
    if (!isDbConnected()) {
      return mockStore.versions.filter((v) => v.dossier_id === dossierId || v.dossierId === dossierId).length;
    }

    try {
      const rows = await query(
        `SELECT COUNT(*) as total FROM dossier_versions WHERE dossier_id = ?`,
        [dossierId]
      );
      return Number(rows[0]?.total || 0);
    } catch {
      return mockStore.versions.filter((v) => v.dossier_id === dossierId || v.dossierId === dossierId).length;
    }
  },

  // Lưu bản ghi lịch sử phiên bản khi sửa form
  async saveVersion(versionData) {
    if (!isDbConnected()) {
      mockStore.versions.push(versionData);
      return versionData;
    }

    const formDataJson = typeof versionData.formData === 'string'
      ? versionData.formData
      : JSON.stringify(versionData.formData || {});

    try {
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
        versionData.changeSummary,
        new Date(),
      ]);
      return versionData;
    } catch {
      mockStore.versions.push(versionData);
      return versionData;
    }
  },
};

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
