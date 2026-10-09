import {
  DocumentTemplate,
  Application,
  GoogleSheetRow,
  ApplicationHistory,
  GeneratedDocument,
  Department,
  User,
  Notification,
  AuditLog,
  DossierVersion,
  DossierStatus,
} from '../types';
import {
  INITIAL_TEMPLATES,
  INITIAL_DOSSIERS,
  INITIAL_GOOGLE_SHEETS_DATA,
  MOCK_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_NOTIFICATIONS,
} from './mockData';
import { createAuditLog, createNotification, normalizeStatus } from './workflowEngine';

/**
 * Stateful In-Memory & LocalStorage Mock Repository
 * Fully compliant with REQUIREMENTS.md Architecture
 */
class MockBackendRepository {
  private templates: DocumentTemplate[];
  private applications: Application[];
  private sheetRows: GoogleSheetRow[];
  private departments: Department[];
  private users: User[];
  private notifications: Notification[];
  private auditLogs: AuditLog[];

  constructor() {
    this.templates = [...INITIAL_TEMPLATES];
    this.applications = [...INITIAL_DOSSIERS];
    this.sheetRows = [...INITIAL_GOOGLE_SHEETS_DATA];
    this.departments = [...INITIAL_DEPARTMENTS];
    this.users = Object.values(MOCK_USERS);
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.auditLogs = [];

    // Initialize baseline audit logs from initial dossiers
    this.applications.forEach((app) => {
      if (!app.auditLogs) {
        app.auditLogs = [
          createAuditLog(app.id, app.createdBy, 'CREATE', undefined, app.status, {
            summary: 'Khởi tạo hồ sơ',
          }),
        ];
      }
      if (!app.versions) {
        app.versions = [
          {
            id: `ver-1-${app.id}`,
            dossierId: app.id,
            versionNumber: 1,
            formData: { ...app.formData },
            editedById: app.createdBy.id,
            editedByName: app.createdBy.name,
            changeSummary: 'Phiên bản đầu tiên do người tạo lập.',
            createdAt: app.createdAt,
          },
        ];
      }
    });
  }

  // ----------------------------------
  // 1. TEMPLATES
  // ----------------------------------
  public getTemplates(): DocumentTemplate[] {
    return [...this.templates];
  }

  public getTemplateById(id: string): DocumentTemplate | null {
    return this.templates.find((t) => t.id === id || t.code === id) || null;
  }

  public addTemplate(template: DocumentTemplate): DocumentTemplate {
    this.templates = [template, ...this.templates];
    return template;
  }

  public updateTemplate(template: DocumentTemplate): DocumentTemplate {
    this.templates = this.templates.map((t) => (t.id === template.id ? template : t));
    return template;
  }

  // ----------------------------------
  // 2. DEPARTMENTS & USERS
  // ----------------------------------
  public getDepartments(): Department[] {
    return [...this.departments];
  }

  public saveDepartment(dept: Department): Department {
    const exists = this.departments.some((d) => d.id === dept.id);
    if (exists) {
      this.departments = this.departments.map((d) => (d.id === dept.id ? dept : d));
    } else {
      this.departments.push(dept);
    }
    return dept;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public saveUser(user: User): User {
    const exists = this.users.some((u) => u.id === user.id);
    if (exists) {
      this.users = this.users.map((u) => (u.id === user.id ? user : u));
    } else {
      this.users.push(user);
    }
    return user;
  }

  // ----------------------------------
  // 3. NOTIFICATIONS
  // ----------------------------------
  public getNotifications(userId: string): Notification[] {
    return this.notifications.filter((n) => n.userId === userId || userId === 'usr-003');
  }

  public markNotificationAsRead(notificationId: string): void {
    this.notifications = this.notifications.map((n) =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
  }

  // ----------------------------------
  // 4. DOSSIERS & WORKFLOW ACTIONS
  // ----------------------------------
  public getApplications(): Application[] {
    return [...this.applications];
  }

  public getMyApplications(userId?: string): Application[] {
    const currentUserId = userId || MOCK_USERS.employee.id;
    return this.applications.filter(
      (a) => a.createdBy.id === currentUserId || a.createdBy.name === MOCK_USERS.employee.name
    );
  }

  public getPendingApplications(): Application[] {
    return this.applications.filter((a) =>
      ['SUBMITTED', 'submitted', 'under_review', 'resubmitted'].includes(a.status)
    );
  }

  public getSecretaryQueueApplications(): Application[] {
    return this.applications.filter((a) =>
      ['USER_SIGNED', 'SECRETARY_RECEIVED', 'for_signature'].includes(a.status)
    );
  }

  public getApplicationById(id: string): Application | null {
    return this.applications.find((a) => a.id === id || a.code === id) || null;
  }

  public createApplication(app: Partial<Application>, creator: User = MOCK_USERS.employee): Application {
    const template = this.getTemplateById(app.templateId || '') || this.templates[0];
    const code = app.code || `CGCN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');

    const newApp: Application = {
      id: app.id || `hs-${Date.now()}`,
      code,
      templateId: template.id,
      templateTitle: template.title,
      templateCode: template.code,
      createdBy: creator,
      assignedManager: app.assignedManager || {
        name: template.manager,
        email: 'mai.tt@ctump.edu.vn',
        department: 'Phòng Hành chính - Tổng hợp',
      },
      createdAt: nowStr,
      submittedAt: app.status === 'SUBMITTED' || app.status === 'submitted' ? nowStr : undefined,
      status: (app.status as DossierStatus) || 'DRAFT',
      formData: app.formData || {},
      docxFileName: `${code}_${template.code.replace(/[^a-zA-Z0-9]/g, '_')}_${(app.formData?.full_name || 'BieuMau').replace(/\s+/g, '')}.docx`,
      generatedDriveFileId: `drive_gen_${code}`,
      versions: [
        {
          id: `ver-1-${Date.now()}`,
          dossierId: app.id || `hs-${Date.now()}`,
          versionNumber: 1,
          formData: { ...(app.formData || {}) },
          editedById: creator.id,
          editedByName: creator.name,
          changeSummary: 'Khởi tạo bản nháp hồ sơ',
          createdAt: nowStr,
        },
      ],
      auditLogs: [
        createAuditLog(app.id || `hs-${Date.now()}`, creator, 'CREATE', undefined, (app.status as DossierStatus) || 'DRAFT', {
          summary: 'Khởi tạo hồ sơ mới',
        }),
      ],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          title: app.status === 'SUBMITTED' ? 'Hoàn thành và gửi hồ sơ trực tuyến' : 'Tạo hồ sơ và lưu bản nháp',
          actor: creator.name,
          role: creator.title,
          timestamp: nowReadable,
          status: (app.status as DossierStatus) || 'DRAFT',
        },
      ],
    };

    this.applications = [newApp, ...this.applications];
    return newApp;
  }

  public saveDraft(id: string, updates: Partial<Application>, actor: User = MOCK_USERS.employee): Application {
    const existing = this.getApplicationById(id);
    const nowReadable = new Date().toLocaleString('vi-VN');

    if (!existing) {
      return this.createApplication({ ...updates, id, status: 'DRAFT' }, actor);
    }

    const updated: Application = {
      ...existing,
      ...updates,
      status: 'DRAFT',
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Cập nhật bản nháp hồ sơ',
          actor: actor.name,
          role: actor.title,
          timestamp: nowReadable,
          status: 'DRAFT',
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  public submitApplication(id: string, updates?: Partial<Application>, actor: User = MOCK_USERS.employee): Application {
    const existing = this.getApplicationById(id);
    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');

    if (!existing) {
      return this.createApplication({ ...updates, id, status: 'SUBMITTED' }, actor);
    }

    const fromStatus = existing.status;
    const isResubmit = fromStatus === 'RETURNED' || fromStatus === 'changes_requested';

    const auditLog = createAuditLog(id, actor, 'SUBMIT', fromStatus, 'SUBMITTED', {
      summary: isResubmit ? 'Người dùng cập nhật & nộp lại hồ sơ' : 'Người dùng gửi hồ sơ duyệt',
    });

    const notifManager = createNotification(
      'usr-002', // Manager ID
      id,
      existing.code,
      'Hồ sơ mới cần duyệt',
      `Hồ sơ ${existing.code} vừa được gửi bởi ${actor.name}. Vui lòng kiểm tra và thẩm định.`,
      'ACTION_REQUIRED'
    );

    this.notifications.push(notifManager);

    const updated: Application = {
      ...existing,
      ...(updates || {}),
      status: 'SUBMITTED',
      submittedAt: nowStr,
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: isResubmit ? 'Chỉnh sửa và gửi lại hồ sơ cho Trưởng phòng' : 'Nộp hồ sơ trực tuyến',
          actor: actor.name,
          role: actor.title,
          timestamp: nowReadable,
          status: 'SUBMITTED',
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  public approveApplication(id: string, note?: string, manager: User = MOCK_USERS.manager): Application {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');
    const fromStatus = existing.status;

    const auditLog = createAuditLog(id, manager, 'APPROVE', fromStatus, 'APPROVED', {
      note: note || 'Phê duyệt đạt yêu cầu.',
    });

    const notifUser = createNotification(
      existing.createdBy.id,
      id,
      existing.code,
      'Hồ sơ đã được phê duyệt',
      `Hồ sơ ${existing.code} đã được Trưởng phòng ${manager.name} phê duyệt. Vui lòng tải bản ký tay/ký số lên hệ thống.`,
      'ACTION_REQUIRED'
    );

    this.notifications.push(notifUser);

    const updated: Application = {
      ...existing,
      status: 'APPROVED',
      approvedAt: nowStr,
      reviewNotes: note,
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Trưởng phòng phê duyệt hồ sơ',
          actor: manager.name,
          role: manager.title,
          timestamp: nowReadable,
          status: 'APPROVED',
          comment: note || 'Hồ sơ đạt yêu cầu thẩm định.',
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  public returnApplication(id: string, returnReason: string, manager: User = MOCK_USERS.manager): Application {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowReadable = new Date().toLocaleString('vi-VN');
    const fromStatus = existing.status;

    const auditLog = createAuditLog(id, manager, 'RETURN', fromStatus, 'RETURNED', {
      reason: returnReason,
    });

    const notifUser = createNotification(
      existing.createdBy.id,
      id,
      existing.code,
      'Hồ sơ bị trả lại',
      `Hồ sơ ${existing.code} bị trả lại với lý do: "${returnReason}". Vui lòng cập nhật và nộp lại.`,
      'WARNING'
    );

    this.notifications.push(notifUser);

    const updated: Application = {
      ...existing,
      status: 'RETURNED',
      returnReason,
      reviewNotes: returnReason,
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Trưởng phòng trả lại hồ sơ (Yêu cầu chỉnh sửa)',
          actor: manager.name,
          role: manager.title,
          timestamp: nowReadable,
          status: 'RETURNED',
          comment: returnReason,
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  // Manager Edit-in-Place: Updates form data directly during review, creates a new DossierVersion & AuditLog
  public updateDossierDataByManager(
    id: string,
    newFormData: Record<string, any>,
    changeSummary: string,
    manager: User = MOCK_USERS.manager
  ): Application {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');
    const currentVersions = existing.versions || [];
    const nextVersionNum = currentVersions.length + 1;

    const versionSnapshot: DossierVersion = {
      id: `ver-${nextVersionNum}-${Date.now()}`,
      dossierId: id,
      versionNumber: nextVersionNum,
      formData: { ...newFormData },
      editedById: manager.id,
      editedByName: manager.name,
      changeSummary,
      createdAt: nowStr,
    };

    const auditLog = createAuditLog(id, manager, 'UPDATE_DATA', existing.status, existing.status, {
      versionNumber: nextVersionNum,
      changeSummary,
    });

    const updated: Application = {
      ...existing,
      formData: { ...newFormData },
      versions: [...currentVersions, versionSnapshot],
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: `Trưởng phòng điều chỉnh dữ liệu hồ sơ (Phiên bản v${nextVersionNum})`,
          actor: manager.name,
          role: manager.title,
          timestamp: nowReadable,
          status: existing.status,
          comment: changeSummary,
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  // User uploads physical/external signed document file -> transition APPROVED to USER_SIGNED
  public uploadUserSignature(
    id: string,
    driveFileId: string,
    actor: User = MOCK_USERS.employee
  ): Application {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');
    const fromStatus = existing.status;

    const auditLog = createAuditLog(id, actor, 'UPLOAD_USER_SIGNATURE', fromStatus, 'USER_SIGNED', {
      userSignedDriveFileId: driveFileId,
    });

    const notifSecretary = createNotification(
      'usr-005', // Secretary ID
      id,
      existing.code,
      'Hồ sơ chờ tiếp nhận văn thư',
      `Hồ sơ ${existing.code} đã được người nộp ký và tải file ký. Vui lòng tiếp nhận bản giấy.`,
      'INFO'
    );

    this.notifications.push(notifSecretary);

    const updated: Application = {
      ...existing,
      status: 'USER_SIGNED',
      signedAt: nowStr,
      userSignedDriveFileId: driveFileId,
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Tải lên văn bản đã ký tay / ký số ngoài',
          actor: actor.name,
          role: actor.title,
          timestamp: nowReadable,
          status: 'USER_SIGNED',
          description: `Đã lưu tập tin chữ ký lên Google Drive ID: ${driveFileId}`,
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  // Secretary receives physical dossier -> transition USER_SIGNED to SECRETARY_RECEIVED
  public receiveSecretaryDossier(
    id: string,
    secretary: User = MOCK_USERS.secretary
  ): Application {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowReadable = new Date().toLocaleString('vi-VN');
    const fromStatus = existing.status;

    const auditLog = createAuditLog(id, secretary, 'RECEIVE_SECRETARY', fromStatus, 'SECRETARY_RECEIVED', {
      summary: 'Văn thư đã đối chiếu và tiếp nhận hồ sơ giấy',
    });

    const notifUser = createNotification(
      existing.createdBy.id,
      id,
      existing.code,
      'Văn thư đã tiếp nhận hồ sơ',
      `Văn thư đã tiếp nhận thành công bản giấy hồ sơ ${existing.code} và đang trình Lãnh đạo ký duyệt chính thức.`,
      'INFO'
    );

    this.notifications.push(notifUser);

    const updated: Application = {
      ...existing,
      status: 'SECRETARY_RECEIVED',
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Bộ phận Văn thư tiếp nhận hồ sơ giấy gốc',
          actor: secretary.name,
          role: secretary.title,
          timestamp: nowReadable,
          status: 'SECRETARY_RECEIVED',
          description: 'Hồ sơ hợp lệ, đã đưa vào danh mục trình Lãnh đạo đóng dấu.',
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));
    return updated;
  }

  // Secretary uploads final signed document & completes dossier -> transition SECRETARY_RECEIVED to COMPLETED
  public completeDossierBySecretary(
    id: string,
    finalDriveFileId: string,
    secretary: User = MOCK_USERS.secretary
  ): { application: Application; sheetSyncResult: GoogleSheetRow } {
    const existing = this.getApplicationById(id);
    if (!existing) throw new Error(`Application ${id} not found`);

    const nowStr = new Date().toISOString();
    const nowReadable = new Date().toLocaleString('vi-VN');
    const todayDate = nowStr.slice(0, 10);
    const fromStatus = existing.status;

    const auditLog = createAuditLog(id, secretary, 'COMPLETE', fromStatus, 'COMPLETED', {
      finalSignedDriveFileId: finalDriveFileId,
      archivedToDriveFolder: 'Google Drive Storage/2026/Archived_Signed',
    });

    const notifUser = createNotification(
      existing.createdBy.id,
      id,
      existing.code,
      'Hồ sơ đã hoàn thành & lưu trữ',
      `Hồ sơ ${existing.code} đã hoàn tất đóng dấu Lãnh đạo và được lưu trữ an toàn tại Google Drive.`,
      'SUCCESS'
    );

    this.notifications.push(notifUser);

    const updated: Application = {
      ...existing,
      status: 'COMPLETED',
      completedAt: nowStr,
      finalSignedDriveFileId: finalDriveFileId,
      syncedToSheets: true,
      syncedAt: nowStr,
      auditLogs: [...(existing.auditLogs || []), auditLog],
      timeline: [
        ...existing.timeline,
        {
          id: `tl-${Date.now()}`,
          title: 'Hoàn tất đóng dấu & Lưu trữ văn bản Google Drive',
          actor: secretary.name,
          role: secretary.title,
          timestamp: nowReadable,
          status: 'COMPLETED',
          description: `Đã upload bản văn bản có đóng dấu BGH (Drive ID: ${finalDriveFileId}) và hoàn tất lưu trữ.`,
        },
      ],
    };

    this.applications = this.applications.map((a) => (a.id === id ? updated : a));

    // Append to Google Sheet
    const sheetRow: GoogleSheetRow = {
      dossierCode: updated.code,
      templateTitle: updated.templateTitle,
      creatorName: updated.createdBy.name,
      department: updated.createdBy.department,
      createdAt: updated.createdAt ? updated.createdAt.slice(0, 10) : todayDate,
      submittedAt: updated.submittedAt ? updated.submittedAt.slice(0, 10) : todayDate,
      approvedAt: todayDate,
      status: 'Hoàn thành',
      reviewerName: secretary.name,
      updatedAt: `${todayDate} ${new Date().toLocaleTimeString('vi-VN')}`,
      syncStatus: 'Đã đồng bộ',
    };

    this.sheetRows = [sheetRow, ...this.sheetRows.filter((r) => r.dossierCode !== updated.code)];

    return { application: updated, sheetSyncResult: sheetRow };
  }

  public generateDocument(id: string, format = 'docx'): GeneratedDocument {
    const app = this.getApplicationById(id);
    if (!app) throw new Error(`Application ${id} not found`);

    const genDoc: GeneratedDocument = {
      applicationId: app.id,
      fileName: app.docxFileName || `${app.code}.${format}`,
      fileSize: '52.4 KB',
      mimeType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      generatedAt: new Date().toISOString(),
      version: app.versions?.length || 1,
      isSigned: ['APPROVED', 'approved', 'USER_SIGNED', 'SECRETARY_RECEIVED', 'COMPLETED', 'completed'].includes(app.status),
      driveFileId: app.generatedDriveFileId || `drive_${app.code}`,
    };

    app.generatedDocument = genDoc;
    return genDoc;
  }

  public getHistory(id: string): ApplicationHistory[] {
    const app = this.getApplicationById(id);
    return app ? app.timeline : [];
  }

  public getSheetRows(): GoogleSheetRow[] {
    return [...this.sheetRows];
  }

  public syncSheetRow(row: GoogleSheetRow): GoogleSheetRow {
    this.sheetRows = [row, ...this.sheetRows.filter((r) => r.dossierCode !== row.dossierCode)];
    return row;
  }
}

export const mockBackend = new MockBackendRepository();
