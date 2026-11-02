import { query, execute } from '../config/database.js';

export const dossierRepository = {
  // 1. Lấy danh sách toàn bộ Khoa / Đơn vị
  async findAllDepartments() {
    return await query(
      `SELECT id, code, name, dean_title, is_active FROM departments WHERE is_active = 1 ORDER BY id ASC`
    );
  },

  // 2. Lấy chi tiết Khoa / Đơn vị theo ID
  async findDepartmentById(departmentId) {
    if (!departmentId) return null;
    const rows = await query(
      `SELECT id, code, name, dean_title, is_active FROM departments WHERE id = ? LIMIT 1`,
      [Number(departmentId)]
    );
    return rows?.[0] || null;
  },

  // 3. Sinh mã theo dõi tiếp theo: CGCN-YYYY-XXXX
  async getNextTrackingCode() {
    const year = new Date().getFullYear();
    const prefix = `CGCN-${year}-`;
    const rows = await query(
      `SELECT tracking_code FROM dossiers WHERE tracking_code LIKE ? ORDER BY tracking_code DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (rows && rows.length > 0 && rows[0].tracking_code) {
      const parts = rows[0].tracking_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(lastSeq)) {
        nextNum = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  },

  // 4. Lấy danh sách hồ sơ (hỗ trợ bộ lọc cho cả Dashboard và Xuất Excel)
  async findAll(filters = {}) {
    const conditions = [];
    const params = [];

    if (filters.fromDate) {
      conditions.push(`DATE(COALESCE(d.submitted_at, d.created_at)) >= ?`);
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      conditions.push(`DATE(COALESCE(d.submitted_at, d.created_at)) <= ?`);
      params.push(filters.toDate);
    }
    if (filters.department_id) {
      conditions.push(`d.department_id = ?`);
      params.push(Number(filters.department_id));
    }
    if (filters.status) {
      conditions.push(`d.status = ?`);
      params.push(filters.status);
    }
    if (filters.user_id) {
      conditions.push(`d.user_id = ?`);
      params.push(filters.user_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `
      SELECT
        d.*,
        u.staff_code,
        u.full_name AS creator_name,
        u.email AS creator_email,
        u.phone AS creator_phone,
        u.role AS creator_role,
        dept.code AS department_code,
        dept.name AS department_name,
        dept.dean_title AS department_dean_title
      FROM dossiers d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      ${whereClause}
      ORDER BY d.created_at DESC
      `,
      params
    );

    return rows.map(formatDossierRow);
  },

  // 5. Lấy chi tiết 1 hồ sơ theo ID hoặc tracking_code
  async findById(idOrCode) {
    const rows = await query(
      `
      SELECT
        d.*,
        u.staff_code,
        u.full_name AS creator_name,
        u.email AS creator_email,
        u.phone AS creator_phone,
        u.role AS creator_role,
        dept.code AS department_code,
        dept.name AS department_name,
        dept.dean_title AS department_dean_title
      FROM dossiers d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = ? OR d.tracking_code = ?
      LIMIT 1
      `,
      [idOrCode, idOrCode]
    );

    if (!rows || rows.length === 0) return null;
    return formatDossierRow(rows[0]);
  },

  // 6. Tạo mới bản ghi trong bảng dossiers
  async create(dossier) {
    const formDataJson =
      typeof dossier.form_data === 'string'
        ? dossier.form_data
        : JSON.stringify(dossier.form_data || {});

    await execute(
      `
      INSERT INTO dossiers (
        id, tracking_code, user_id, department_id,
        technology_name, transfer_type, transfer_target, purpose,
        has_workshop, has_budget, form_data,
        current_step, status, current_version, admin_note,
        decision_number, decision_date, drive_folder_url,
        submitted_at, reviewed_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        dossier.id,
        dossier.tracking_code,
        dossier.user_id,
        Number(dossier.department_id),
        dossier.technology_name,
        dossier.transfer_type || 'APPLICATION',
        dossier.transfer_target || null,
        dossier.purpose || null,
        dossier.has_workshop ? 1 : 0,
        dossier.has_budget ? 1 : 0,
        formDataJson,
        Number(dossier.current_step ?? 2),
        dossier.status || 'PENDING_PRECHECK',
        Number(dossier.current_version ?? 1),
        dossier.admin_note || null,
        dossier.decision_number || null,
        dossier.decision_date || null,
        dossier.drive_folder_url || null,
        dossier.submitted_at ?? new Date(),
        dossier.reviewed_at ?? null,
        dossier.completed_at ?? null,
      ]
    );

    return this.findById(dossier.id);
  },

  // 7. Cập nhật bản ghi trong bảng dossiers
  async update(idOrCode, fields) {
    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(fields)) {
      if (key === 'id') continue;
      updates.push(`\`${key}\` = ?`);
      if (key === 'form_data') {
        values.push(typeof val === 'string' ? val : JSON.stringify(val || {}));
      } else if (typeof val === 'boolean') {
        values.push(val ? 1 : 0);
      } else {
        values.push(val);
      }
    }

    if (updates.length === 0) return this.findById(idOrCode);

    values.push(idOrCode, idOrCode);
    await execute(
      `UPDATE dossiers SET ${updates.join(', ')} WHERE id = ? OR tracking_code = ?`,
      values
    );

    return this.findById(idOrCode);
  },

  // 8. Đánh dấu các file cũ của hồ sơ là is_latest = 0
  async markOldFilesNotLatest(dossierId, categories = []) {
    if (!categories || categories.length === 0) {
      await execute(`UPDATE dossier_files SET is_latest = 0 WHERE dossier_id = ?`, [dossierId]);
      return;
    }

    const placeholders = categories.map(() => '?').join(', ');
    await execute(
      `UPDATE dossier_files SET is_latest = 0 WHERE dossier_id = ? AND file_category IN (${placeholders})`,
      [dossierId, ...categories]
    );
  },

  // 9. Lưu thông tin file vào bảng dossier_files
  async addFile(fileData) {
    await execute(
      `
      INSERT INTO dossier_files (
        id, dossier_id, version, file_category,
        file_name, file_path, file_size, uploaded_by, is_latest
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fileData.id,
        fileData.dossier_id,
        Number(fileData.version ?? 1),
        fileData.file_category,
        fileData.file_name,
        fileData.file_path,
        fileData.file_size || null,
        fileData.uploaded_by || null,
        fileData.is_latest !== undefined ? (fileData.is_latest ? 1 : 0) : 1,
      ]
    );

    return this.findFileById(fileData.id);
  },

  // 10. Lấy danh sách các file mới nhất (is_latest = 1) của hồ sơ
  async findLatestFilesByDossierId(dossierId) {
    const rows = await query(
      `
      SELECT
        id, dossier_id, version, file_category,
        file_name, file_path, file_size, uploaded_by, is_latest, created_at
      FROM dossier_files
      WHERE dossier_id = ? AND is_latest = 1
      ORDER BY created_at DESC
      `,
      [dossierId]
    );

    return rows.map((row) => ({
      ...row,
      is_latest: Boolean(row.is_latest),
      download_url: `/api/dossiers/download/${row.id}`,
    }));
  },

  // 11. Tìm 1 file vật lý theo fileId để phục vụ Download
  async findFileById(fileId) {
    const rows = await query(
      `SELECT * FROM dossier_files WHERE id = ? LIMIT 1`,
      [fileId]
    );
    if (!rows || rows.length === 0) return null;
    return {
      ...rows[0],
      is_latest: Boolean(rows[0].is_latest),
      download_url: `/api/dossiers/download/${rows[0].id}`,
    };
  },

  // 12. Ghi nhật ký xử lý vào bảng audit_logs
  async createAuditLog(log) {
    const result = await execute(
      `
      INSERT INTO audit_logs (
        dossier_id, actor_id, actor_name, actor_role,
        action, from_status, to_status, comment
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        log.dossier_id || log.dossierId,
        log.actor_id || log.actorId || null,
        log.actor_name || log.actorName || 'Hệ thống',
        log.actor_role || log.actorRole || 'SYSTEM',
        log.action,
        log.from_status || log.fromStatus || null,
        log.to_status || log.toStatus || null,
        log.comment || log.notes || null,
      ]
    );

    return {
      id: result.insertId,
      dossier_id: log.dossier_id || log.dossierId,
      actor_id: log.actor_id || log.actorId || null,
      actor_name: log.actor_name || log.actorName || 'Hệ thống',
      actor_role: log.actor_role || log.actorRole || 'SYSTEM',
      action: log.action,
      from_status: log.from_status || log.fromStatus || null,
      to_status: log.to_status || log.toStatus || null,
      comment: log.comment || log.notes || null,
      created_at: new Date().toISOString(),
    };
  },

  // 13. Lấy danh sách audit_logs của 1 hồ sơ sắp xếp theo thời gian
  async findAuditLogsByDossierId(dossierId) {
    return await query(
      `
      SELECT
        id, dossier_id, actor_id, actor_name, actor_role,
        action, from_status, to_status, comment, created_at
      FROM audit_logs
      WHERE dossier_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [dossierId]
    );
  },
};

function formatDossierRow(row) {
  if (!row) return null;

  let formData = {};
  if (row.form_data) {
    try {
      formData = typeof row.form_data === 'string' ? JSON.parse(row.form_data) : row.form_data;
    } catch {
      formData = {};
    }
  }

  return {
    id: row.id,
    tracking_code: row.tracking_code,
    user_id: row.user_id,
    department_id: row.department_id,
    department_code: row.department_code || null,
    department_name: row.department_name || null,
    department_dean_title: row.department_dean_title || null,
    technology_name: row.technology_name,
    transfer_type: row.transfer_type,
    transfer_target: row.transfer_target,
    purpose: row.purpose,
    has_workshop: Boolean(row.has_workshop),
    has_budget: Boolean(row.has_budget),
    form_data: formData,
    current_step: Number(row.current_step),
    status: row.status,
    current_version: Number(row.current_version || 1),
    admin_note: row.admin_note,
    decision_number: row.decision_number,
    decision_date: row.decision_date,
    drive_folder_url: row.drive_folder_url,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator: {
      id: row.user_id,
      staff_code: row.staff_code || null,
      full_name: row.creator_name || formData.full_name || 'Cán bộ CTUMP',
      email: row.creator_email || formData.email || 'canbo@ctump.edu.vn',
      phone: row.creator_phone || formData.phone || null,
      role: row.creator_role || 'USER',
    },
  };
}

export default dossierRepository;
