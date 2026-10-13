import { query, execute } from '../config/database.js';
import { ProjectModel } from '../models/projectModel.js';
import { v4 as uuidv4 } from 'uuid';

export const projectRepository = {
  /**
   * Sinh mã hồ sơ tiếp theo theo định dạng: CGCN-YYYY-XXXX
   */
  async generateNextCode() {
    const year = new Date().getFullYear();
    const rows = await query(
      "SELECT code FROM transfer_projects WHERE code LIKE ? ORDER BY code DESC LIMIT 1",
      [`CGCN-${year}-%`]
    );

    let nextSeq = 1;
    if (rows.length > 0 && rows[0].code) {
      const match = rows[0].code.match(/CGCN-\d{4}-(\d+)/);
      if (match && match[1]) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const seqStr = String(nextSeq).padStart(4, '0');
    return `CGCN-${year}-${seqStr}`;
  },

  /**
   * Lấy danh sách toàn bộ dự án
   */
  async findAll(filter = {}) {
    let sql = `
      SELECT p.*, 
             u.name as user_name, u.email as user_email, 
             u.department as user_department, u.role as user_role, u.title as user_title
      FROM transfer_projects p
      LEFT JOIN users u ON p.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (filter.userId) {
      conditions.push('p.user_id = ?');
      params.push(filter.userId);
    }
    if (filter.status) {
      conditions.push('p.status = ?');
      params.push(filter.status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    const rows = await query(sql, params);
    return rows.map((row) => ProjectModel.fromRow(row));
  },

  /**
   * Tìm dự án theo ID hoặc Code, kèm attachments và timeline audit log
   */
  async findById(idOrCode) {
    const sql = `
      SELECT p.*, 
             u.name as user_name, u.email as user_email, 
             u.department as user_department, u.role as user_role, u.title as user_title
      FROM transfer_projects p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ? OR p.code = ?
      LIMIT 1
    `;
    const rows = await query(sql, [idOrCode, idOrCode]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const projectId = row.id;

    // Lấy attachments
    const attachments = await this.getAttachments(projectId);

    // Lấy audit logs
    const auditLogs = await this.getAuditLogs(projectId);

    return ProjectModel.fromRow(row, attachments, auditLogs);
  },

  /**
   * Tạo mới một transfer_project
   */
  async create(project) {
    const id = project.id || `proj-${uuidv4().slice(0, 8)}`;
    const code = project.code || (await this.generateNextCode());
    const formDataStr = typeof project.formData === 'string' ? project.formData : JSON.stringify(project.formData || {});

    const sql = `
      INSERT INTO transfer_projects (
        id, code, title, user_id, template_id, department_name, 
        status, form_data, docx_file_url, precheck_pdf_url,
        has_financial_implication, submitted_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    await execute(sql, [
      id,
      code,
      project.title,
      project.userId,
      project.templateId || '2a-KH.CGCN',
      project.departmentName || null,
      project.status || 'NEW',
      formDataStr,
      project.docxFileUrl || null,
      project.precheckPdfUrl || null,
      project.hasFinancialImplication ? 1 : 0,
    ]);

    return this.findById(id);
  },

  /**
   * Cập nhật các trường trong transfer_projects
   */
  async update(id, updates = {}) {
    const setClauses = [];
    const params = [];

    const fieldMap = {
      status: 'status',
      title: 'title',
      reviewNotes: 'review_notes',
      precheckPdfUrl: 'precheck_pdf_url',
      deanSignedPdfUrl: 'dean_signed_pdf_url',
      finalPdfUrl: 'final_pdf_url',
      decisionNumber: 'decision_number',
      decisionDate: 'decision_date',
      khcnSigned: 'khcn_signed',
      khtcSigned: 'khtc_signed',
      bghSigned: 'bgh_signed',
      formData: 'form_data',
      docxFileUrl: 'docx_file_url',
      reviewedAt: 'reviewed_at',
      completedAt: 'completed_at',
    };

    for (const [key, val] of Object.entries(updates)) {
      const col = fieldMap[key];
      if (col) {
        setClauses.push(`\`${col}\` = ?`);
        if (key === 'formData' && typeof val === 'object') {
          params.push(JSON.stringify(val));
        } else if (typeof val === 'boolean') {
          params.push(val ? 1 : 0);
        } else {
          params.push(val);
        }
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    params.push(id);
    const sql = `UPDATE transfer_projects SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await execute(sql, params);

    return this.findById(id);
  },

  /**
   * Lưu đính kèm vào attachments
   */
  async addAttachment(attachment) {
    const id = attachment.id || `att-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO attachments (
        id, project_id, file_name, file_path, file_url, file_type, file_size, uploaded_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await execute(sql, [
      id,
      attachment.projectId,
      attachment.fileName,
      attachment.filePath || '',
      attachment.fileUrl,
      attachment.fileType || 'evidence',
      attachment.fileSize || '',
      attachment.uploadedBy || null,
    ]);

    return { id, ...attachment };
  },

  /**
   * Lấy danh sách attachments của dự án
   */
  async getAttachments(projectId) {
    const sql = `
      SELECT id, project_id as projectId, file_name as fileName, 
             file_path as filePath, file_url as fileUrl, 
             file_type as fileType, file_size as fileSize, 
             uploaded_by as uploadedBy, created_at as createdAt
      FROM attachments
      WHERE project_id = ?
      ORDER BY created_at ASC
    `;
    return query(sql, [projectId]);
  },

  /**
   * Lưu nhật ký kiểm toán vào audit_logs
   */
  async addAuditLog(log) {
    const id = log.id || `aud-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO audit_logs (
        id, project_id, dossier_id, actor_id, actor_name, actor_role, action, from_status, to_status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await execute(sql, [
      id,
      log.projectId || null,
      log.dossierId || null,
      log.actorId || 'usr-system',
      log.actorName || 'Hệ thống CTUMP',
      log.actorRole || 'SYSTEM',
      log.action,
      log.fromStatus || null,
      log.toStatus || null,
      log.notes || '',
    ]);

    return { id, ...log };
  },

  /**
   * Lấy lịch sử timeline audit logs của dự án
   */
  async getAuditLogs(projectId) {
    const sql = `
      SELECT id, project_id as projectId, dossier_id as dossierId,
             actor_id as actorId, actor_name as actorName, actor_role as actorRole,
             action, from_status as fromStatus, to_status as toStatus,
             notes, created_at as createdAt
      FROM audit_logs
      WHERE project_id = ? OR dossier_id = ?
      ORDER BY created_at ASC
    `;
    return query(sql, [projectId, projectId]);
  },
};

export default projectRepository;
