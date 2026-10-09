import React, { useState, useEffect } from 'react';
import {
  ActiveNavTab,
  Application,
  DocumentTemplate,
  User,
  UserRole,
  GoogleSheetRow,
  Department,
} from './types';
import * as api from './services/api';
import { MOCK_USERS } from './services/mockData';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardView } from './pages/DashboardView';
import { TemplatesView } from './pages/TemplatesView';
import { CreateDossierView } from './pages/CreateDossierView';
import { MyDossiersView } from './pages/MyDossiersView';
import { ReviewQueueView } from './pages/ReviewQueueView';
import { SecretaryView } from './pages/SecretaryView';
import { DepartmentsView } from './pages/DepartmentsView';
import { DossierDetailView } from './pages/DossierDetailView';
import { ProcessingHistoryView } from './pages/ProcessingHistoryView';
import { TemplateManagementView } from './pages/TemplateManagementView';
import { UsersView } from './pages/UsersView';
import { SettingsView } from './pages/SettingsView';
import { TemplateDetailModal } from './components/modals/TemplateDetailModal';
import { Menu, CheckCircle2 } from 'lucide-react';

const DEFAULT_DEV_USER: User = {
  id: 'dev_admin',
  name: 'Cán bộ Quản trị & Nghiệp vụ',
  email: 'admin@ctump.edu.vn',
  role: 'ADMIN',
  department: 'Trường Đại học Y Dược Cần Thơ',
  departmentId: 'bgh',
  phone: '0292.3831.531',
  jobTitle: 'Quản trị viên hệ thống (Toàn quyền)',
};

export default function App() {
  // Toàn quyền test: Khởi tạo người dùng kiểm thử mặc định, không yêu cầu đăng nhập
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('ctump_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_DEV_USER;
    } catch {
      return DEFAULT_DEV_USER;
    }
  });

  // Mặc định vào Tổng quan hệ thống
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // System State - Loaded via API Service Layer
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [dossiers, setDossiers] = useState<Application[]>([]);
  const [sheetRows, setSheetRows] = useState<GoogleSheetRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selection state
  const [selectedDossier, setSelectedDossier] = useState<Application | null>(null);
  const [editingDossier, setEditingDossier] = useState<Application | null>(null);
  const [templateForCreation, setTemplateForCreation] = useState<DocumentTemplate | null>(null);
  const [templateDetailModal, setTemplateDetailModal] = useState<DocumentTemplate | null>(null);

  // Toast feedback notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Initial load via API Service
  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoading(true);
        const [loadedTemplates, loadedApps, loadedSheetRows, loadedDepts, loadedUsers] = await Promise.all([
          api.getTemplates(),
          api.getAllApplications(),
          api.getAllSheetRows(),
          api.getDepartments(),
          api.getUsers(),
        ]);
        setTemplates(loadedTemplates);
        setDossiers(loadedApps);
        setSheetRows(loadedSheetRows);
        setDepartments(loadedDepts);
        setUsers(loadedUsers);
      } catch (err) {
        console.error('Failed to load initial data via API:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Xử lý đăng nhập / đăng xuất
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ctump_auth_user', JSON.stringify(user));
    if (user.role === 'ADMIN' || user.role === 'admin') {
      setActiveTab('pending_approval');
    } else {
      setActiveTab('my_dossiers');
    }
    showToast(`Đăng nhập thành công: ${user.name} (${user.email})!`);
  };

  const handleLogout = () => {
    localStorage.removeItem('ctump_auth_user');
    setCurrentUser(DEFAULT_DEV_USER);
    showToast('Đã làm mới phiên làm việc kiểm thử.', 'info');
  };

  // Chuyển đổi nhanh 2 role (Cán bộ trường <-> Admin duy nhất)
  const handleSwitchUserRole = (targetRole: UserRole) => {
    const roleKey = String(targetRole).toUpperCase();
    if (roleKey === 'ADMIN') {
      setCurrentUser(MOCK_USERS.admin);
      localStorage.setItem('ctump_auth_user', JSON.stringify(MOCK_USERS.admin));
      setActiveTab('pending_approval');
      showToast('Đã chuyển tài khoản: TS. Lê Hoàng Quân (Admin duy nhất - admin@ctump.edu.vn)', 'info');
    } else {
      const user = MOCK_USERS.can_bo || MOCK_USERS.employee;
      setCurrentUser(user);
      localStorage.setItem('ctump_auth_user', JSON.stringify(user));
      setActiveTab('my_dossiers');
      showToast('Đã chuyển tài khoản: ThS. Nguyễn Văn Nam (Cán bộ trường - nvnam@ctump.edu.vn)', 'info');
    }
  };

  // Navigation and creation handlers
  const handleCreateWithTemplate = (tmpl: DocumentTemplate) => {
    setTemplateForCreation(tmpl);
    setEditingDossier(null);
    setSelectedDossier(null);
    setActiveTab('create_dossier');
  };

  const handleEditDraft = (dossier: Application) => {
    const tmpl = templates.find((t) => t.id === dossier.templateId) || templates[0];
    setTemplateForCreation(tmpl);
    setEditingDossier(dossier);
    setSelectedDossier(null);
    setActiveTab('create_dossier');
  };

  const handleSaveDraft = async (draftDossier: Application) => {
    if (!currentUser) return;
    try {
      const saved = await api.saveApplicationDraft(draftDossier.id, draftDossier, currentUser);
      setDossiers((prev) => {
        const exists = prev.some((d) => d.id === saved.id);
        if (exists) return prev.map((d) => (d.id === saved.id ? saved : d));
        return [saved, ...prev];
      });
      showToast(`Đã lưu bản nháp hồ sơ ${saved.code}!`);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  const handleSubmitDossier = async (submittedDossier: Application) => {
    if (!currentUser) return;
    try {
      const submitted = await api.submitApplication(submittedDossier.id, submittedDossier, currentUser);
      setDossiers((prev) => {
        const exists = prev.some((d) => d.id === submitted.id);
        if (exists) return prev.map((d) => (d.id === submitted.id ? submitted : d));
        return [submitted, ...prev];
      });
      setEditingDossier(null);
      setTemplateForCreation(null);
      setActiveTab('my_dossiers');
      showToast(`Đã gửi nộp hồ sơ ${submitted.code} lên hệ thống phê duyệt!`);
    } catch (err) {
      console.error('Error submitting application:', err);
    }
  };

  const handleApproveDossier = async (dossierId: string, comment?: string) => {
    if (!currentUser) return;
    try {
      const approved = await api.approveApplication(dossierId, comment, currentUser);
      setDossiers((prev) => prev.map((d) => (d.id === approved.id ? approved : d)));
      if (selectedDossier?.id === approved.id) {
        setSelectedDossier(approved);
      }
      showToast(`Đã phê duyệt hồ sơ ${approved.code}!`);
    } catch (err) {
      console.error('Error approving application:', err);
    }
  };

  const handleReturnDossier = async (dossierId: string, reason: string) => {
    if (!currentUser) return;
    try {
      const returned = await api.returnApplication(dossierId, reason, currentUser);
      setDossiers((prev) => prev.map((d) => (d.id === returned.id ? returned : d)));
      if (selectedDossier?.id === returned.id) {
        setSelectedDossier(returned);
      }
      showToast(`Đã trả lại hồ sơ ${returned.code} kèm lý do.`);
    } catch (err) {
      console.error('Error returning application:', err);
    }
  };

  const handleSaveManagerEdit = async (
    dossierId: string,
    updatedFormData: Record<string, any>,
    changeSummary: string
  ) => {
    if (!currentUser) return;
    try {
      const updated = await api.updateDossierDataByManager(
        dossierId,
        updatedFormData,
        changeSummary,
        currentUser
      );
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã cập nhật dữ liệu hồ sơ ${updated.code} và ghi vết phiên bản.`);
    } catch (err) {
      console.error('Error saving manager edit:', err);
    }
  };

  const handleUploadUserSignature = async (dossierId: string, driveFileId: string) => {
    if (!currentUser) return;
    try {
      const updated = await api.uploadUserSignature(dossierId, driveFileId, currentUser);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã tải lên văn bản ký tay/ký số cho hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error uploading user signature:', err);
    }
  };

  const handleReceiveSecretaryIntake = async (dossierId: string) => {
    if (!currentUser) return;
    try {
      const updated = await api.receiveSecretaryDossier(dossierId, currentUser);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã tiếp nhận hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error receiving secretary intake:', err);
    }
  };

  const handleCompleteBySecretary = async (dossierId: string, finalDriveFileId: string) => {
    if (!currentUser) return;
    try {
      const res = await api.completeDossierBySecretary(dossierId, finalDriveFileId, currentUser);
      const completed = res.application;
      setDossiers((prev) => prev.map((d) => (d.id === completed.id ? completed : d)));
      if (selectedDossier?.id === completed.id) {
        setSelectedDossier(completed);
      }
      showToast(`Đã hoàn tất đóng dấu và lưu trữ Google Drive cho hồ sơ ${completed.code}!`);
    } catch (err) {
      console.error('Error completing dossier:', err);
    }
  };

  const handleSaveDepartment = async (dept: Department) => {
    try {
      const saved = await api.saveDepartment(dept);
      setDepartments((prev) => {
        const exists = prev.some((d) => d.id === saved.id);
        if (exists) return prev.map((d) => (d.id === saved.id ? saved : d));
        return [...prev, saved];
      });
      showToast(`Đã lưu thông tin phòng ban: ${saved.name}!`);
    } catch (err) {
      console.error('Error saving department:', err);
    }
  };

  // Counts calculation
  const pendingCount = dossiers.filter((d) =>
    ['SUBMITTED', 'submitted', 'under_review', 'resubmitted', 'RESUBMITTED'].includes(d.status)
  ).length;

  // Hiển thị số lượng hồ sơ
  const myDossierCount = dossiers.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Responsive Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onNavigate={(tab) => {
            setSelectedDossier(null);
            setEditingDossier(null);
            setActiveTab(tab);
          }}
          currentUser={currentUser}
          pendingCount={pendingCount}
          myDossierCount={myDossierCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* Main Content Area */}
        <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
          {/* Top Header */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-3 text-slate-600 hover:text-slate-900 lg:hidden cursor-pointer"
              title="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <Header
                currentUser={currentUser}
                onSwitchUser={(role) => handleSwitchUserRole(role)}
                onNavigate={(tab) => {
                  setSelectedDossier(null);
                  setEditingDossier(null);
                  setActiveTab(tab);
                }}
                activeTab={activeTab}
                pendingCount={pendingCount}
                onLogout={handleLogout}
              />
            </div>
          </div>

          {/* Viewport Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {selectedDossier ? (
              <DossierDetailView
                dossier={selectedDossier}
                template={templates.find((t) => t.id === selectedDossier.templateId)}
                currentUser={currentUser}
                onBack={() => setSelectedDossier(null)}
                onEditDossier={(d) => handleEditDraft(d)}
                onApproveDossier={handleApproveDossier}
                onReturnDossier={handleReturnDossier}
                onSaveManagerEdit={handleSaveManagerEdit}
                onUploadUserSignature={handleUploadUserSignature}
                onReceiveSecretaryIntake={handleReceiveSecretaryIntake}
                onCompleteBySecretary={handleCompleteBySecretary}
                onNavigate={(tab) => {
                  setSelectedDossier(null);
                  setActiveTab(tab);
                }}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    dossiers={dossiers}
                    templates={templates}
                    currentUser={currentUser}
                    onNavigate={setActiveTab}
                    onSelectDossier={(d) => setSelectedDossier(d)}
                    onCreateWithTemplate={handleCreateWithTemplate}
                  />
                )}

                {activeTab === 'templates' && (
                  <TemplatesView
                    templates={templates}
                    onSelectTemplate={handleCreateWithTemplate}
                    onViewDetails={(tmpl) => setTemplateDetailModal(tmpl)}
                  />
                )}

                {activeTab === 'create_dossier' && (
                  <CreateDossierView
                    selectedTemplate={templateForCreation}
                    templates={templates}
                    currentUser={currentUser}
                    editingDossier={editingDossier}
                    onSaveDraft={handleSaveDraft}
                    onSubmitDossier={handleSubmitDossier}
                    onCancel={() => {
                      setEditingDossier(null);
                      setTemplateForCreation(null);
                      setActiveTab('my_dossiers');
                    }}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'my_dossiers' && (
                  <MyDossiersView
                    dossiers={dossiers}
                    currentUser={currentUser}
                    onSelectDossier={(d) => setSelectedDossier(d)}
                    onEditDraft={handleEditDraft}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'pending_approval' && (
                  <ReviewQueueView
                    dossiers={dossiers}
                    currentUser={currentUser}
                    onInspectDossier={(d) => setSelectedDossier(d)}
                    onNavigate={setActiveTab}
                  />
                )}

                {activeTab === 'secretary_queue' && (
                  <SecretaryView
                    dossiers={dossiers}
                    currentUser={currentUser}
                    onInspectDossier={(d) => setSelectedDossier(d)}
                    onReceiveIntake={handleReceiveSecretaryIntake}
                    onCompleteWithFinalDoc={handleCompleteBySecretary}
                  />
                )}

                {activeTab === 'departments' && (
                  <DepartmentsView
                    departments={departments}
                    users={users}
                    onSaveDepartment={handleSaveDepartment}
                  />
                )}

                {activeTab === 'history_sheets' && (
                  <ProcessingHistoryView
                    sheetRows={sheetRows}
                    dossiers={dossiers}
                    onRefreshSync={async () => {
                      const rows = await api.getAllSheetRows();
                      setSheetRows(rows);
                      showToast('Đã làm mới dữ liệu từ API Google Sheets!');
                    }}
                  />
                )}

                {activeTab === 'template_management' && (
                  <TemplateManagementView
                    templates={templates}
                    onAddTemplate={async (newTmpl) => {
                      const saved = await api.saveTemplate(newTmpl, true);
                      setTemplates((prev) => [saved, ...prev]);
                      showToast(`Đã thêm biểu mẫu mới: ${saved.title}!`);
                    }}
                    onUpdateTemplate={async (updatedTmpl) => {
                      const saved = await api.saveTemplate(updatedTmpl, false);
                      setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
                      showToast(`Đã cập nhật cấu hình biểu mẫu: ${saved.code}!`);
                    }}
                  />
                )}

                {activeTab === 'users' && (
                  <UsersView
                    currentUser={currentUser}
                    onSwitchUser={(r) => handleSwitchUserRole(r as UserRole)}
                  />
                )}

                {activeTab === 'settings' && <SettingsView />}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Template Detail Modal */}
      <TemplateDetailModal
        template={templateDetailModal}
        isOpen={!!templateDetailModal}
        onClose={() => setTemplateDetailModal(null)}
        onUseTemplate={(tmpl) => handleCreateWithTemplate(tmpl)}
      />
    </div>
  );
}
