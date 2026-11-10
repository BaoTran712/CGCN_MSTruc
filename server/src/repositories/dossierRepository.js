import { query, execute, isDbConnected } from '../utils/db.js';
import { mockStore } from '../utils/mockStore.js';
import { sanitizeFormPayload } from '../utils/sanitizer.js';

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
      const formatted = rows.map(formatDossierRow);
      const uniqueMap = new Map();
      for (const item of formatted) {
        if (!item || !item.id) continue;
        const key = item.code || item.id;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      }
      return Array.from(uniqueMap.values());
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
        `SELECT MAX(CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED)) as max_num FROM dossiers WHERE code LIKE ?`,
        [`CGCN-${year}-%`]
      );
      const count = (Number(rows[0]?.max_num) || 0) + 1;
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
    const applicantEmail =
      dossier.applicant_email ||
      dossier.applicantEmail ||
      dossier.createdBy?.email ||
      'canbo@ctump.edu.vn';
    const currentVersion = Number(dossier.current_version || dossier.currentVersion || 1);
    const sanitizedFormData = sanitizeFormPayload(dossier.form_data || dossier.formData || {});

    const initialTimeline = dossier.timeline_logs || [
      {
        step: 1,
        status: dossier.status || 'SUBMITTED',
        title: 'Đã gửi đơn (Phiên bản v1)',
        timestamp: new Date().toISOString(),
      },
    ];

    const generatedDocxPath = dossier.generated_docx_path || dossier.docx_file_url || null;
    const generatedPdfPath = dossier.generated_pdf_path || null;

    if (!isDbConnected()) {
      const is2a =
        String(dossier.template_id || dossier.templateId || '').includes('2a') ||
        String(dossier.templateCode || '').includes('2a') ||
        Boolean(sanitizedFormData.plan_code || sanitizedFormData.product_name);

      const effectiveTmplId = is2a ? 'tmpl-cgcn-2a' : (dossier.template_id || dossier.templateId || 'tmpl-cgcn-1a');
      const effectiveTmplCode = is2a ? 'Mẫu 2a-KH.CGCN' : (dossier.templateCode || 'Mẫu 1a-TT.CGCN');
      const effectiveTmplTitle = is2a
        ? 'Kế hoạch tổ chức chuyển giao công nghệ trong trường'
        : (dossier.templateTitle || 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

      const createdItem = {
        ...dossier,
        id: dossier.id || `dos-${Date.now()}`,
        code: dossier.code,
        template_id: effectiveTmplId,
        templateId: effectiveTmplId,
        templateCode: effectiveTmplCode,
        templateTitle: effectiveTmplTitle,
        status: dossier.status || 'SUBMITTED',
        current_version: currentVersion,
        currentVersion,
        applicant_email: applicantEmail,
        applicantEmail,
        formData: sanitizedFormData,
        form_data: sanitizedFormData,
        generated_docx_path: generatedDocxPath,
        generatedDocxPath,
        docx_file_url: generatedDocxPath,
        generated_pdf_path: generatedPdfPath,
        generatedPdfPath,
        approved_pdf_path: dossier.approved_pdf_path || null,
        approvedPdfPath: dossier.approved_pdf_path || null,
        department_signed_files: dossier.department_signed_files || [],
        departmentSignedFiles: dossier.department_signed_files || [],
        resubmitted_signed_files: dossier.resubmitted_signed_files || [],
        resubmittedSignedFiles: dossier.resubmitted_signed_files || [],
        final_signed_pdf_path: dossier.final_signed_pdf_path || null,
        finalSignedPdfPath: dossier.final_signed_pdf_path || null,
        revision_note: dossier.revision_note || null,
        revisionNote: dossier.revision_note || null,
        review_notes: dossier.review_notes || dossier.revision_note || null,
        timeline_logs: initialTimeline,
        timelineLogs: initialTimeline,
        timeline: initialTimeline.map((tl, idx) => ({
          id: `tl-${idx + 1}`,
          title: tl.title,
          actor: dossier.createdBy?.name || 'Cán bộ / Giảng viên',
          role: 'USER',
          status: tl.status,
          timestamp: tl.timestamp,
          description: tl.note || '',
        })),
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        submitted_at: dossier.submitted_at || new Date().toISOString(),
        submittedAt: dossier.submitted_at || new Date().toISOString(),
        createdBy: {
          id: dossier.user_id || 'usr_canbo',
          name: dossier.createdBy?.name || sanitizedFormData.full_name || 'Cán bộ / Giảng viên',
          email: applicantEmail,
          role: 'USER',
          department: dossier.department_name || sanitizedFormData.department || 'Khoa Y',
        },
      };
      mockStore.dossiers.unshift(createdItem);
      return createdItem;
    }

    const formDataJson = JSON.stringify(sanitizedFormData);
    const deptSignedJson = dossier.department_signed_files
      ? JSON.stringify(dossier.department_signed_files)
      : null;
    const timelineJson = JSON.stringify(initialTimeline);

    try {
      // 1. Đảm bảo user_id tồn tại trong bảng users để thỏa mãn ràng buộc khóa ngoại fk_dossier_user
      let finalUserId = dossier.user_id || 'usr-canbo';
      try {
        const userCheck = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [finalUserId]);
        if (!userCheck || userCheck.length === 0) {
          const emailToCheck = applicantEmail || dossier.createdBy?.email;
          const emailMatch = emailToCheck
            ? await query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [emailToCheck])
            : [];

          if (emailMatch && emailMatch.length > 0) {
            finalUserId = emailMatch[0].id;
          } else {
            const userName = dossier.createdBy?.name || sanitizedFormData.full_name || 'Cán bộ';
            const userDept = dossier.department_name || dossier.createdBy?.department || 'Khoa Y';
            const userTitle = dossier.createdBy?.title || 'Giảng viên';
            const userRole = (dossier.createdBy?.role || 'USER').toUpperCase();
            await execute(
              `INSERT INTO users (id, email, name, role, title, department)
               VALUES (?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE name = VALUES(name), department = VALUES(department)`,
              [
                finalUserId,
                emailToCheck || `${finalUserId}@ctump.edu.vn`,
                userName,
                userRole,
                userTitle,
                userDept,
              ]
            );
          }
        }
      } catch (uErr) {
        console.warn(
          '[dossierRepository] Tự động tạo user thất bại, chuyển sang usr-canbo dự phòng:',
          uErr.message
        );
        finalUserId = 'usr-canbo';
      }
      dossier.user_id = finalUserId;

      // 2. Đảm bảo template_id hợp lệ với ràng buộc khóa ngoại fk_dossier_tmpl
      let finalTemplateId = dossier.template_id || 'tmpl-cgcn-1a';
      try {
        const tmplCheck = await query(
          'SELECT id FROM document_templates WHERE id = ? LIMIT 1',
          [finalTemplateId]
        );
        if (!tmplCheck || tmplCheck.length === 0) {
          finalTemplateId = String(finalTemplateId).includes('2a')
            ? 'tmpl-cgcn-2a'
            : 'tmpl-cgcn-1a';
        }
      } catch {
        finalTemplateId = 'tmpl-cgcn-1a';
      }
      dossier.template_id = finalTemplateId;

      const formData1aObj = dossier.form_data_1a || dossier.formData1a || null;
      const formData2aObj = dossier.form_data_2a || dossier.formData2a || null;
      const sigConfigObj = dossier.signature_config || dossier.signatureConfig || null;

      await execute(`
        INSERT INTO dossiers (
          id, code, title, user_id, template_id, department_name, status,
          current_version, applicant_email, form_data,
          ten_de_tai, truong_don_vi, status_1a, status_2a,
          rejected_target, rejection_reason_1a, rejection_reason_2a,
          form_data_1a, form_data_2a, signature_config,
          generated_docx_path, generated_pdf_path, docx_file_url,
          approved_pdf_path, precheck_pdf_url,
          department_signed_files, resubmitted_signed_files, faculty_signed_pdf_url, evidence_files,
          final_signed_pdf_path, final_pdf_url,
          revision_note, review_notes, timeline_logs,
          decision_number, decision_date,
          has_financial_implication, khcn_signed, khtc_signed, bgh_signed,
          drive_folder_url, submitted_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        dossier.id,
        dossier.code,
        dossier.title,
        dossier.user_id,
        dossier.template_id,
        dossier.department_name,
        dossier.status || 'SUBMITTED',
        currentVersion,
        applicantEmail,
        formDataJson,
        dossier.ten_de_tai || sanitizedFormData.ten_de_tai || null,
        dossier.truong_don_vi || sanitizedFormData.truong_don_vi || null,
        dossier.status_1a || 'PENDING',
        dossier.status_2a || 'PENDING',
        dossier.rejected_target || dossier.rejectedTarget || null,
        dossier.rejection_reason_1a || dossier.rejectionReason1a || null,
        dossier.rejection_reason_2a || dossier.rejectionReason2a || null,
        formData1aObj ? (typeof formData1aObj === 'string' ? formData1aObj : JSON.stringify(formData1aObj)) : null,
        formData2aObj ? (typeof formData2aObj === 'string' ? formData2aObj : JSON.stringify(formData2aObj)) : null,
        sigConfigObj ? (typeof sigConfigObj === 'string' ? sigConfigObj : JSON.stringify(sigConfigObj)) : null,
        generatedDocxPath,
        generatedPdfPath,
        generatedDocxPath,
        dossier.approved_pdf_path || null,
        dossier.precheck_pdf_url || null,
        deptSignedJson,
        deptSignedJson,
        dossier.faculty_signed_pdf_url || null,
        dossier.evidence_files ? JSON.stringify(dossier.evidence_files) : null,
        dossier.final_signed_pdf_path || null,
        dossier.final_pdf_url || null,
        dossier.revision_note || null,
        dossier.review_notes || dossier.revision_note || null,
        timelineJson,
        dossier.decision_number || null,
        dossier.decision_date || null,
        dossier.has_financial_implication ? 1 : 0,
        dossier.khcn_signed ? 1 : 0,
        dossier.khtc_signed ? 1 : 0,
        dossier.bgh_signed ? 1 : 0,
        dossier.drive_folder_url || null,
        dossier.submitted_at ?? null,
        dossier.created_at || new Date(),
      ]);
      return this.findById(dossier.id);
    } catch (dbErr) {
      console.warn('[dossierRepository.create] Fallback mockStore:', dbErr.message);
      const createdMock = {
        ...dossier,
        current_version: currentVersion,
        currentVersion,
        form_data: sanitizedFormData,
        formData: sanitizedFormData,
        generated_docx_path: generatedDocxPath,
        generatedDocxPath,
        generated_pdf_path: generatedPdfPath,
        generatedPdfPath,
        applicant_email: applicantEmail,
        applicantEmail,
        timeline_logs: initialTimeline,
        timelineLogs: initialTimeline,
      };
      mockStore.dossiers.unshift(createdMock);
      return createdMock;
    }
  },

  // Cập nhật thông tin hồ sơ
  async update(id, fields) {
    const cleanFields = { ...fields };
    if (cleanFields.form_data || cleanFields.formData) {
      const cleanedForm = sanitizeFormPayload(cleanFields.form_data || cleanFields.formData);
      cleanFields.form_data = cleanedForm;
    }

    if (!isDbConnected()) {
      const idx = mockStore.dossiers.findIndex((d) => d.id === id || d.code === id);
      if (idx !== -1) {
        const existing = mockStore.dossiers[idx];
        const nextVersion =
          cleanFields.current_version !== undefined
            ? Number(cleanFields.current_version)
            : existing.current_version || 1;
        const nextDocx =
          cleanFields.generated_docx_path ||
          cleanFields.docx_file_url ||
          existing.generated_docx_path ||
          existing.docx_file_url;
        const nextPdf =
          cleanFields.generated_pdf_path ||
          existing.generated_pdf_path;
        const nextApprovedPdf =
          cleanFields.approved_pdf_path ||
          cleanFields.precheck_pdf_url ||
          existing.approved_pdf_path;
        const nextDeptFiles =
          cleanFields.department_signed_files ||
          cleanFields.resubmitted_signed_files ||
          existing.department_signed_files ||
          [];
        const nextFinalPdf =
          cleanFields.final_signed_pdf_path ||
          cleanFields.final_pdf_url ||
          existing.final_signed_pdf_path;
        const nextRevisionNote =
          cleanFields.revision_note !== undefined
            ? cleanFields.revision_note
            : cleanFields.review_notes !== undefined
              ? cleanFields.review_notes
              : existing.revision_note;

        mockStore.dossiers[idx] = {
          ...existing,
          ...cleanFields,
          current_version: nextVersion,
          currentVersion: nextVersion,
          formData: cleanFields.form_data || existing.formData,
          form_data: cleanFields.form_data || existing.form_data,
          status: cleanFields.status || existing.status,
          generated_docx_path: nextDocx,
          generatedDocxPath: nextDocx,
          docx_file_url: nextDocx,
          generated_pdf_path: nextPdf,
          generatedPdfPath: nextPdf,
          approved_pdf_path: nextApprovedPdf,
          approvedPdfPath: nextApprovedPdf,
          precheck_pdf_url: nextApprovedPdf,
          department_signed_files: nextDeptFiles,
          departmentSignedFiles: nextDeptFiles,
          resubmitted_signed_files: nextDeptFiles,
          resubmittedSignedFiles: nextDeptFiles,
          final_signed_pdf_path: nextFinalPdf,
          finalSignedPdfPath: nextFinalPdf,
          final_pdf_url: nextFinalPdf,
          revision_note: nextRevisionNote,
          revisionNote: nextRevisionNote,
          review_notes: nextRevisionNote,
          reviewNotes: nextRevisionNote,
          timeline_logs: cleanFields.timeline_logs || existing.timeline_logs,
          timelineLogs: cleanFields.timeline_logs || existing.timelineLogs,
        };
        return { ...mockStore.dossiers[idx] };
      }
      return null;
    }

    const ALLOWED_DB_COLUMNS = new Set([
      'code',
      'title',
      'user_id',
      'template_id',
      'department_id',
      'department_name',
      'status',
      'current_version',
      'applicant_email',
      'form_data',
      'has_workshop',
      'has_financial_implication',
      'ten_de_tai',
      'truong_don_vi',
      'status_1a',
      'status_2a',
      'rejected_target',
      'rejection_reason_1a',
      'rejection_reason_2a',
      'form_data_1a',
      'form_data_2a',
      'signature_config',
      'generated_docx_path',
      'generated_pdf_path',
      'docx_file_url',
      'to_trinh_docx_url',
      'ke_hoach_docx_url',
      'approved_pdf_path',
      'precheck_pdf_url',
      'department_signed_files',
      'resubmitted_signed_files',
      'faculty_signed_pdf_url',
      'evidence_files',
      'final_signed_pdf_path',
      'final_pdf_url',
      'revision_note',
      'review_notes',
      'timeline_logs',
      'decision_number',
      'decision_date',
      'khcn_signed',
      'khcn_signed_at',
      'khtc_signed',
      'khtc_signed_at',
      'bgh_signed',
      'bgh_signed_at',
      'drive_folder_url',
      'submitted_at',
      'reviewed_at',
      'faculty_signed_at',
      'completed_at',
    ]);

    if (cleanFields.formData1a && !cleanFields.form_data_1a) {
      cleanFields.form_data_1a = cleanFields.formData1a;
    }
    if (cleanFields.formData2a && !cleanFields.form_data_2a) {
      cleanFields.form_data_2a = cleanFields.formData2a;
    }
    if (cleanFields.signatureConfig && !cleanFields.signature_config) {
      cleanFields.signature_config = cleanFields.signatureConfig;
    }
    if (cleanFields.revisionNote && !cleanFields.revision_note) {
      cleanFields.revision_note = cleanFields.revisionNote;
    }
    if (cleanFields.reviewNotes && !cleanFields.review_notes) {
      cleanFields.review_notes = cleanFields.reviewNotes;
    }
    if (cleanFields.rejectedTarget !== undefined && cleanFields.rejected_target === undefined) {
      cleanFields.rejected_target = cleanFields.rejectedTarget;
    }
    if (cleanFields.target_form !== undefined && cleanFields.rejected_target === undefined) {
      cleanFields.rejected_target = cleanFields.target_form;
    }
    if (cleanFields.rejectionReason1a !== undefined && cleanFields.rejection_reason_1a === undefined) {
      cleanFields.rejection_reason_1a = cleanFields.rejectionReason1a;
    }
    if (cleanFields.rejectionReason2a !== undefined && cleanFields.rejection_reason_2a === undefined) {
      cleanFields.rejection_reason_2a = cleanFields.rejectionReason2a;
    }

    const updates = [];
    const values = [];

    for (const [key, val] of Object.entries(cleanFields)) {
      if (key === 'id' || !ALLOWED_DB_COLUMNS.has(key)) continue;
      updates.push(`\`${key}\` = ?`);
      if (
        [
          'form_data',
          'form_data_1a',
          'form_data_2a',
          'signature_config',
          'evidence_files',
          'department_signed_files',
          'resubmitted_signed_files',
          'timeline_logs',
        ].includes(key)
      ) {
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
    } catch (err) {
      console.warn('[dossierRepository.update] Fallback mockStore:', err.message);
      const idx = mockStore.dossiers.findIndex((d) => d.id === id || d.code === id);
      if (idx !== -1) {
        mockStore.dossiers[idx] = { ...mockStore.dossiers[idx], ...cleanFields };
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

  // Lấy danh sách phiên bản lịch sử của một hồ sơ
  async findVersionsByDossierId(dossierId) {
    if (!isDbConnected()) {
      return mockStore.versions.filter((v) => v.dossier_id === dossierId || v.dossierId === dossierId);
    }

    try {
      const rows = await query(
        `SELECT * FROM dossier_versions WHERE dossier_id = ? ORDER BY version_number ASC`,
        [dossierId]
      );
      return rows.map((r) => ({
        id: r.id,
        dossierId: r.dossier_id,
        versionNumber: Number(r.version_number),
        formData: typeof r.form_data === 'string' ? JSON.parse(r.form_data) : (r.form_data || {}),
        generatedDocxPath: r.generated_docx_path,
        generatedPdfPath: r.generated_pdf_path,
        editedById: r.edited_by_id,
        editedByName: r.edited_by_name,
        changeSummary: r.change_summary,
        createdAt: r.created_at,
      }));
    } catch {
      return mockStore.versions.filter((v) => v.dossier_id === dossierId || v.dossierId === dossierId);
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
        INSERT INTO dossier_versions (
          id, dossier_id, version_number, form_data,
          generated_docx_path, generated_pdf_path,
          edited_by_id, edited_by_name, change_summary, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        versionData.id,
        versionData.dossierId,
        versionData.versionNumber,
        formDataJson,
        versionData.generatedDocxPath || null,
        versionData.generatedPdfPath || null,
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

  let formData1a = null;
  if (row.form_data_1a) {
    formData1a = typeof row.form_data_1a === 'string' ? JSON.parse(row.form_data_1a) : row.form_data_1a;
  }

  let formData2a = null;
  if (row.form_data_2a) {
    formData2a = typeof row.form_data_2a === 'string' ? JSON.parse(row.form_data_2a) : row.form_data_2a;
  }

  let signatureConfig = null;
  if (row.signature_config) {
    signatureConfig = typeof row.signature_config === 'string' ? JSON.parse(row.signature_config) : row.signature_config;
  }

  let evidenceFiles = [];
  if (row.evidence_files) {
    evidenceFiles = typeof row.evidence_files === 'string' ? JSON.parse(row.evidence_files) : row.evidence_files;
  }

  let deptSignedFiles = [];
  if (row.department_signed_files) {
    deptSignedFiles =
      typeof row.department_signed_files === 'string'
        ? JSON.parse(row.department_signed_files)
        : row.department_signed_files;
  } else if (row.resubmitted_signed_files) {
    deptSignedFiles =
      typeof row.resubmitted_signed_files === 'string'
        ? JSON.parse(row.resubmitted_signed_files)
        : row.resubmitted_signed_files;
  }

  let timelineLogs = [];
  if (row.timeline_logs) {
    timelineLogs = typeof row.timeline_logs === 'string' ? JSON.parse(row.timeline_logs) : row.timeline_logs;
  }

  const applicantEmail = row.applicant_email || row.creator_email || 'canbo@ctump.edu.vn';
  const currentVersion = Number(row.current_version || 1);
  const generatedDocxPath = row.generated_docx_path || row.docx_file_url || null;
  const generatedPdfPath = row.generated_pdf_path || row.approved_pdf_path || row.precheck_pdf_url || null;
  const approvedPdfPath = row.approved_pdf_path || row.precheck_pdf_url || generatedPdfPath;
  const finalSignedPdfPath = row.final_signed_pdf_path || row.final_pdf_url || null;
  const revisionNote = row.revision_note || row.review_notes || null;

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
    current_version: currentVersion,
    currentVersion,
    applicant_email: applicantEmail,
    applicantEmail,
    form_data: formData,
    formData: formData,
    form_data_1a: formData1a,
    formData1a: formData1a,
    form_data_2a: formData2a,
    formData2a: formData2a,
    signature_config: signatureConfig,
    signatureConfig: signatureConfig,
    status_1a: row.status_1a || 'PENDING',
    status_2a: row.status_2a || 'PENDING',
    rejected_target: row.rejected_target || null,
    rejectedTarget: row.rejected_target || null,
    target_form: row.rejected_target || null,
    rejection_reason_1a: row.rejection_reason_1a || (row.status_1a === 'RETURNED' ? revisionNote : null),
    rejectionReason1a: row.rejection_reason_1a || (row.status_1a === 'RETURNED' ? revisionNote : null),
    rejection_reason_2a: row.rejection_reason_2a || (row.status_2a === 'RETURNED' ? revisionNote : null),
    rejectionReason2a: row.rejection_reason_2a || (row.status_2a === 'RETURNED' ? revisionNote : null),
    ten_de_tai: row.ten_de_tai || formData.ten_de_tai || null,
    truong_don_vi: row.truong_don_vi || formData.truong_don_vi || null,
    generated_docx_path: generatedDocxPath,
    generatedDocxPath,
    docx_file_url: generatedDocxPath,
    generated_pdf_path: generatedPdfPath,
    generatedPdfPath,
    approved_pdf_path: approvedPdfPath,
    approvedPdfPath,
    precheck_pdf_url: approvedPdfPath,
    department_signed_files: deptSignedFiles,
    departmentSignedFiles: deptSignedFiles,
    resubmitted_signed_files: deptSignedFiles,
    resubmittedSignedFiles: deptSignedFiles,
    faculty_signed_pdf_url: row.faculty_signed_pdf_url,
    evidence_files: evidenceFiles,
    evidenceFiles: evidenceFiles,
    final_signed_pdf_path: finalSignedPdfPath,
    finalSignedPdfPath,
    final_pdf_url: finalSignedPdfPath,
    revision_note: revisionNote,
    revisionNote,
    review_notes: revisionNote,
    reviewNotes: revisionNote,
    timeline_logs: timelineLogs,
    timelineLogs,
    decision_number: row.decision_number,
    decision_date: row.decision_date,
    has_financial_implication: Boolean(row.has_financial_implication),
    khcn_signed: Boolean(row.khcn_signed),
    khtc_signed: Boolean(row.khtc_signed),
    bgh_signed: Boolean(row.bgh_signed),
    drive_folder_url: row.drive_folder_url,
    submitted_at: row.submitted_at
      ? new Date(row.submitted_at).toISOString()
      : row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    reviewed_at: row.reviewed_at,
    completed_at: row.completed_at,
    created_at: row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    submittedAt: row.submitted_at
      ? new Date(row.submitted_at).toISOString()
      : row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    createdBy: {
      id: row.user_id,
      name: row.creator_name || formData.full_name || 'Cán bộ',
      email: applicantEmail,
      role: 'USER',
      department: row.creator_department || row.department_name || 'Đơn vị',
      title: row.creator_title || 'Giảng viên',
    },
    assignedManager: {
      name: 'Bảo Trân (Phòng KH&CN)',
      email: 'tranthibaotran.2k@gmail.com',
      department: 'Phòng Khoa học Công nghệ & HTQT',
    },
  };
}
