import React, { useState } from 'react';
import {
  ActiveNavTab,
  Application,
  DocumentTemplate,
  Department,
  UserRole,
} from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { DossierProvider, useDossiers } from './contexts/DossierContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { TemplateDetailModal } from './components/modals/TemplateDetailModal';
import {
  DashboardView,
  TemplatesView,
  CreateDossierView,
  MyDossiersView,
  ReviewQueueView,
  SecretaryView,
  DepartmentsView,
  DossierDetailView,
  ProcessingHistoryView,
  TemplateManagementView,
  UsersView,
  SettingsView,
  LoginPage,
} from './pages';

function AppContent() {
  const { currentUser, login, logout, resetDevUser, switchRole } = useAuth();
  const { showToast } = useToast();
  const {
    templates,
    dossiers,
    sheetRows,
    departments,
    users,
    isLoading,
    pendingCount,
    myDossierCount,
    saveDraft,
    submitDossier,
    approveDossier,
    returnDossier,
    saveManagerEdit,
    uploadUserSignature,
    receiveSecretaryIntake,
    completeBySecretary,
    saveDepartment,
    addTemplate,
    updateTemplate,
    refreshSheetRows,
  } = useDossiers();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedDossier, setSelectedDossier] = useState<Application | null>(null);
  const [editingDossier, setEditingDossier] = useState<Application | null>(null);
  const [templateForCreation, setTemplateForCreation] = useState<DocumentTemplate | null>(null);
  const [templateDetailModal, setTemplateDetailModal] = useState<DocumentTemplate | null>(null);

  // If user is not authenticated, show Login page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          login(user);
          if (user.role === 'ADMIN' || user.role === 'admin') {
            setActiveTab('pending_approval');
          } else {
            setActiveTab('my_dossiers');
          }
          showToast(`Đăng nhập thành công: ${user.name} (${user.email})!`);
        }}
      />
    );
  }

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
    try {
      const saved = await saveDraft(draftDossier, currentUser);
      showToast(`Đã lưu bản nháp hồ sơ ${saved.code}!`);
    } catch (err) {
      console.error('Error saving draft:', err);
    }
  };

  const handleSubmitDossier = async (submittedDossier: Application) => {
    try {
      const submitted = await submitDossier(submittedDossier, currentUser);
      setEditingDossier(null);
      setTemplateForCreation(null);
      setActiveTab('my_dossiers');
      showToast(`Đã gửi nộp hồ sơ ${submitted.code} lên hệ thống phê duyệt!`);
    } catch (err) {
      console.error('Error submitting application:', err);
    }
  };

  const handleApproveDossier = async (dossierId: string, comment?: string) => {
    try {
      const approved = await approveDossier(dossierId, comment, currentUser);
      if (selectedDossier?.id === approved.id) {
        setSelectedDossier(approved);
      }
      showToast(`Đã phê duyệt hồ sơ ${approved.code}!`);
    } catch (err) {
      console.error('Error approving application:', err);
    }
  };

  const handleReturnDossier = async (dossierId: string, reason: string) => {
    try {
      const returned = await returnDossier(dossierId, reason, currentUser);
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
    try {
      const updated = await saveManagerEdit(
        dossierId,
        updatedFormData,
        changeSummary,
        currentUser
      );
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã cập nhật dữ liệu hồ sơ ${updated.code} và ghi vết phiên bản.`);
    } catch (err) {
      console.error('Error saving manager edit:', err);
    }
  };

  const handleUploadUserSignature = async (dossierId: string, driveFileId: string) => {
    try {
      const updated = await uploadUserSignature(dossierId, driveFileId, currentUser);
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã tải lên văn bản ký tay/ký số cho hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error uploading user signature:', err);
    }
  };

  const handleReceiveSecretaryIntake = async (dossierId: string) => {
    try {
      const updated = await receiveSecretaryIntake(dossierId, currentUser);
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã tiếp nhận hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error receiving secretary intake:', err);
    }
  };

  const handleCompleteBySecretary = async (dossierId: string, finalDriveFileId: string) => {
    try {
      const completed = await completeBySecretary(dossierId, finalDriveFileId, currentUser);
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
      const saved = await saveDepartment(dept);
      showToast(`Đã lưu thông tin phòng ban: ${saved.name}!`);
    } catch (err) {
      console.error('Error saving department:', err);
    }
  };

  const handleSwitchUserRole = (targetRole: UserRole) => {
    const updatedUser = switchRole(targetRole);
    const roleKey = String(targetRole).toUpperCase();
    if (roleKey === 'ADMIN') {
      setActiveTab('pending_approval');
      showToast(`Đã chuyển tài khoản: ${updatedUser.name} (Admin duy nhất - ${updatedUser.email})`, 'info');
    } else {
      setActiveTab('my_dossiers');
      showToast(`Đã chuyển tài khoản: ${updatedUser.name} (Cán bộ trường - ${updatedUser.email})`, 'info');
    }
  };

  const handleResetDevSession = () => {
    resetDevUser();
    showToast('Đã làm mới phiên làm việc kiểm thử.', 'info');
  };

  const handleSignOut = () => {
    logout();
    showToast('Đã đăng xuất khỏi hệ thống.', 'info');
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onNavigate={(tab) => {
        setSelectedDossier(null);
        setEditingDossier(null);
        setActiveTab(tab);
      }}
      currentUser={currentUser}
      pendingCount={pendingCount}
      myDossierCount={myDossierCount}
      onLogout={handleResetDevSession}
      onSignOut={handleSignOut}
      onSwitchUserRole={handleSwitchUserRole}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : selectedDossier ? (
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
              onNavigate={setActiveTab}
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
                await refreshSheetRows();
                showToast('Đã làm mới dữ liệu từ API Google Sheets!');
              }}
            />
          )}

          {activeTab === 'template_management' && (
            <TemplateManagementView
              templates={templates}
              onAddTemplate={async (newTmpl) => {
                const saved = await addTemplate(newTmpl);
                showToast(`Đã thêm biểu mẫu mới: ${saved.title}!`);
              }}
              onUpdateTemplate={async (updatedTmpl) => {
                const saved = await updateTemplate(updatedTmpl);
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

      {/* Template Detail Modal */}
      <TemplateDetailModal
        template={templateDetailModal}
        isOpen={!!templateDetailModal}
        onClose={() => setTemplateDetailModal(null)}
        onUseTemplate={(tmpl) => handleCreateWithTemplate(tmpl)}
      />
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DossierProvider>
          <AppContent />
        </DossierProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
