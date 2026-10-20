import React, { useState, useEffect } from 'react';
import {
  ActiveNavTab,
  Application,
  DocumentTemplate,
} from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isAdminUser } from './constants';
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
  DossierDetailView,
  ProcessingHistoryView,
  SettingsView,
  LoginPage,
  UsersView,
} from './pages';

function AppContent() {
  const { currentUser, login, logout } = useAuth();
  const { showToast } = useToast();
  const {
    templates,
    dossiers,
    sheetRows,
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
    adminPrecheck,
    uploadFacultySignature,
    updateSchoolSigning,
    completeDossier,
    refreshSheetRows,
  } = useDossiers();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedDossier, setSelectedDossier] = useState<Application | null>(null);
  const [editingDossier, setEditingDossier] = useState<Application | null>(null);
  const [templateForCreation, setTemplateForCreation] = useState<DocumentTemplate | null>(null);
  const [templateDetailModal, setTemplateDetailModal] = useState<DocumentTemplate | null>(null);

  const isAdmin = isAdminUser(currentUser);

  // Chặn người dùng truy cập các tab không phù hợp với vai trò
  useEffect(() => {
    if (!currentUser) return;
    // User không được truy cập tab Admin
    if (!isAdmin && ['pending_approval', 'secretary_queue', 'history_sheets', 'users'].includes(activeTab)) {
      setActiveTab('my_dossiers');
    }
    // Admin không nên truy cập tab tạo hồ sơ / hồ sơ của tôi
    if (isAdmin && ['create_dossier', 'my_dossiers'].includes(activeTab)) {
      setActiveTab('pending_approval');
    }
  }, [currentUser, isAdmin, activeTab]);

  // If user is not authenticated, show Login page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          login(user);
          const isUserAdmin = isAdminUser(user);
          if (isUserAdmin) {
            setActiveTab('pending_approval');
          } else {
            setActiveTab('my_dossiers');
          }
          showToast(`Đăng nhập thành công: ${user.name}!`);
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
      if (
        selectedDossier &&
        (selectedDossier.id === returned.id ||
          selectedDossier.code === returned.code ||
          selectedDossier.id === dossierId ||
          selectedDossier.code === dossierId)
      ) {
        setSelectedDossier(returned);
      }
      showToast(`Đã trả lại hồ sơ ${returned.code} (Yêu cầu chỉnh sửa bổ sung).`);
    } catch (err: any) {
      console.error('Error returning application:', err);
      showToast(err.message || 'Lỗi khi trả lại hồ sơ', 'error');
      throw err;
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

  const handleSignOut = () => {
    logout();
    showToast('Đã đăng xuất khỏi hệ thống.', 'info');
  };

  // ----------------------------------------------------
  // AUTOMATION WORKFLOW HANDLERS (quy_trinh.md)
  // ----------------------------------------------------
  const handleAdminPrecheck = async (dossierId: string, isValid: boolean, reviewNotes?: string) => {
    try {
      const updated = await adminPrecheck(dossierId, isValid, reviewNotes, currentUser);
      if (
        selectedDossier &&
        (selectedDossier.id === updated.id ||
          selectedDossier.code === updated.code ||
          selectedDossier.id === dossierId ||
          selectedDossier.code === dossierId)
      ) {
        setSelectedDossier(updated);
      }
      if (isValid) {
        showToast(`Đã duyệt hợp lệ thể thức hồ sơ ${updated.code} và xuất file PDF chuẩn.`);
      } else {
        showToast(`Đã trả lại hồ sơ ${updated.code} (Yêu cầu chỉnh sửa bổ sung).`);
      }
    } catch (err: any) {
      console.error('Error in admin precheck:', err);
      showToast(err.message || 'Lỗi khi xử lý tiền kiểm hồ sơ', 'error');
      throw err;
    }
  };

  const handleUploadFacultySignature = async (
    dossierId: string,
    pdfUrl: string,
    evidenceFiles: Array<{ name: string; url: string; size?: string }>
  ) => {
    try {
      const updated = await uploadFacultySignature(dossierId, pdfUrl, evidenceFiles, currentUser);
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã nộp bản ký số cấp Khoa cho hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error in faculty signature upload:', err);
    }
  };

  const handleUpdateSchoolSigning = async (
    dossierId: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean }
  ) => {
    try {
      const updated = await updateSchoolSigning(dossierId, flags, currentUser);
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã cập nhật tiến độ ký số cấp Trường cho hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error updating school signing:', err);
    }
  };

  const handleCompleteDossier = async (
    dossierId: string,
    decisionNumber: string,
    decisionDate: string,
    finalPdfUrl: string
  ) => {
    try {
      const updated = await completeDossier(dossierId, decisionNumber, decisionDate, finalPdfUrl, currentUser);
      if (selectedDossier?.id === updated.id) {
        setSelectedDossier(updated);
      }
      showToast(`Đã ban hành Quyết định ${decisionNumber} và lưu trữ Google Drive cho hồ sơ ${updated.code}!`);
    } catch (err) {
      console.error('Error completing dossier:', err);
    }
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
      onSignOut={handleSignOut}
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
          onAdminPrecheck={handleAdminPrecheck}
          onUploadFacultySignature={handleUploadFacultySignature}
          onUpdateSchoolSigning={handleUpdateSchoolSigning}
          onCompleteDossier={handleCompleteDossier}
          onApproveDossier={handleApproveDossier}
          onReturnDossier={handleReturnDossier}
          onSaveManagerEdit={handleSaveManagerEdit}
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

          {activeTab === 'pending_approval' && isAdmin && (
            <ReviewQueueView
              dossiers={dossiers}
              currentUser={currentUser}
              onInspectDossier={(d) => setSelectedDossier(d)}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'secretary_queue' && isAdmin && (
            <SecretaryView
              dossiers={dossiers}
              currentUser={currentUser}
              onInspectDossier={(d) => setSelectedDossier(d)}
              onReceiveIntake={handleReceiveSecretaryIntake}
              onCompleteWithFinalDoc={handleCompleteBySecretary}
            />
          )}


          {activeTab === 'history_sheets' && isAdmin && (
            <ProcessingHistoryView
              sheetRows={sheetRows}
              dossiers={dossiers}
              onRefreshSync={async () => {
                await refreshSheetRows();
                showToast('Đã làm mới dữ liệu từ API Google Sheets!');
              }}
            />
          )}

          {activeTab === 'users' && isAdmin && (
            <UsersView
              currentUser={currentUser}
              onNavigate={setActiveTab}
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
