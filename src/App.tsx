import React, { useState, useEffect } from 'react';
import {
  ActiveNavTab,
  Application,
  DocumentTemplate,
} from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { isAdminUser } from './constants';
import { getEffectiveTemplate } from './utils/templateUtils';
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
  DossierDetailView,
  LoginPage,
} from './pages';

function AppContent() {
  const { currentUser, login, logout } = useAuth();
  const { showToast } = useToast();
  const {
    templates,
    dossiers,
    isLoading,
    pendingCount,
    myDossierCount,
    saveDraft,
    submitDossier,
    resubmitDossier,
    approveDossier,
    returnDossier,
    adminPrecheck,
    uploadFacultySignature,
    updateSchoolSigning,
    completeDossier,
    updateDossier,
  } = useDossiers();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [selectedDossier, setSelectedDossier] = useState<Application | null>(null);
  const [editingDossier, setEditingDossier] = useState<Application | null>(null);
  const [templateForCreation, setTemplateForCreation] = useState<DocumentTemplate | null>(null);
  const [templateDetailModal, setTemplateDetailModal] = useState<DocumentTemplate | null>(null);

  const isAdmin = isAdminUser(currentUser);

  useEffect(() => {
    if (!currentUser) return;
    if (!isAdmin && activeTab === 'pending_approval') {
      setActiveTab('my_dossiers');
    }
  }, [currentUser, isAdmin, activeTab]);

  useEffect(() => {
    if (!selectedDossier) return;
    const latest = dossiers.find(
      (d) => d.id === selectedDossier.id || d.code === selectedDossier.code
    );
    if (latest && latest !== selectedDossier) {
      setSelectedDossier(latest);
    }
  }, [dossiers, selectedDossier]);

  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          login(user);
          const isUserAdmin = isAdminUser(user);
          setActiveTab(isUserAdmin ? 'pending_approval' : 'my_dossiers');
          showToast(`Đăng nhập thành công: ${user.name}!`);
        }}
      />
    );
  }

  const handleCreateWithTemplate = (tmpl: DocumentTemplate) => {
    setTemplateForCreation(tmpl);
    setEditingDossier(null);
    setSelectedDossier(null);
    setActiveTab('create_dossier');
  };

  const handleEditDraft = (dossier: Application) => {
    const tmpl = getEffectiveTemplate(dossier);
    setTemplateForCreation(tmpl);
    setEditingDossier(dossier);
    setSelectedDossier(null);
    setActiveTab('create_dossier');
  };

  const handleSaveDraft = async (draftDossier: Application) => {
    const saved = await saveDraft(draftDossier, currentUser);
    showToast(`Đã lưu hồ sơ ${saved.code}!`);
    return saved;
  };

  // BƯỚC 1 & BƯỚC 2B: Nộp đơn & Chuyển hướng ngay sang màn hình "Chi tiết đơn đã gửi"
  const handleSubmitDossier = async (submittedDossier: Application) => {
    const submitted = await submitDossier(submittedDossier, currentUser);
    setEditingDossier(null);
    setTemplateForCreation(null);
    setSelectedDossier(submitted);
    setActiveTab('my_dossiers');
    const ver = submitted.current_version || submitted.currentVersion || 1;
    showToast(
      `Đã nộp hồ sơ ${submitted.code} (Phiên bản v${ver}) thành công! Đang chờ Admin xét duyệt.`
    );
  };

  // BƯỚC 2B [LUỒNG FALSE]: Chỉnh sửa trực tiếp trên trang Chi tiết đơn & Nộp lại
  const handleResubmitDossier = async (dossierId: string, updatedFormData: Record<string, any>, fullPayload?: Partial<Application>) => {
    const updated = await resubmitDossier(dossierId, updatedFormData, currentUser, fullPayload);
    setSelectedDossier(updated);
    const ver = updated.current_version || updated.currentVersion || 2;
    showToast(
      `Đã nộp lại hồ sơ ${updated.code} (Phiên bản v${ver})! Đang chờ Admin kiểm tra và duyệt.`
    );
    return updated;
  };

  const handleApproveDossier = async (dossierId: string, comment?: string) => {
    const approved = await approveDossier(dossierId, comment, currentUser);
    if (selectedDossier?.id === approved.id) {
      setSelectedDossier(approved);
    }
    showToast(`Đã duyệt hợp lệ hồ sơ ${approved.code} và gửi Email kèm file PDF chuẩn!`);
  };

  const handleReturnDossier = async (dossierId: string, reason: string) => {
    const returned = await returnDossier(dossierId, reason, currentUser);
    if (selectedDossier?.id === returned.id) {
      setSelectedDossier(returned);
    }
    showToast(`Đã trả về sửa lỗi hồ sơ ${returned.code} kèm gợi ý chỗ sai cần sửa chữa.`);
  };

  const handleSignOut = () => {
    logout();
    setSelectedDossier(null);
    setEditingDossier(null);
    setTemplateForCreation(null);
    setActiveTab('dashboard');
    showToast('Đã đăng xuất khỏi hệ thống.');
  };

  const handleAdminPrecheck = async (dossierId: string, isValid: boolean, reviewNotes?: string, targetForm?: '1a' | '2a' | 'both') => {
    try {
      const updated = await adminPrecheck(dossierId, isValid, reviewNotes, currentUser, targetForm);
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
        const ver = updated.current_version || updated.currentVersion || 1;
        showToast(`Đã duyệt hợp lệ hồ sơ ${updated.code} (v${ver}) và gửi Gmail SMTP kèm file PDF chuẩn.`);
      } else {
        showToast(`Đã trả về sửa lỗi hồ sơ ${updated.code} kèm gợi ý sửa chữa.`);
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xử lý xét duyệt hồ sơ', 'error');
      throw err;
    }
  };

  const handleUploadFacultySignature = async (
    dossierId: string,
    pdfUrl: string,
    evidenceFiles: Array<{ name: string; url: string; size?: string }>
  ) => {
    const updated = await uploadFacultySignature(dossierId, pdfUrl, evidenceFiles, currentUser);
    if (selectedDossier?.id === updated.id) {
      setSelectedDossier(updated);
    }
    showToast(`Đã tải lên bản ký phòng ban cho hồ sơ ${updated.code} (Trạng thái: Chờ duyệt)!`);
  };

  const handleUpdateSchoolSigning = async (
    dossierId: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean; note?: string }
  ) => {
    const updated = await updateSchoolSigning(dossierId, flags, currentUser);
    if (selectedDossier?.id === updated.id) {
      setSelectedDossier(updated);
    }
    showToast(`Đã chuyển hồ sơ ${updated.code} sang trạng thái "Chờ ký Hiệu trưởng"!`);
  };

  const handleCompleteDossier = async (
    dossierId: string,
    decisionNumber: string,
    decisionDate: string,
    finalPdfUrl: string
  ) => {
    const updated = await completeDossier(dossierId, decisionNumber, decisionDate, finalPdfUrl, currentUser);
    if (selectedDossier?.id === updated.id) {
      setSelectedDossier(updated);
    }
    showToast(`Đã xác nhận "Đã ký và lưu trữ" cho hồ sơ ${updated.code} và gửi Gmail kèm PDF đã ký!`);
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
      dossiers={dossiers}
      onSelectDossier={(d) => {
        setEditingDossier(null);
        setSelectedDossier(d);
      }}
      onSignOut={handleSignOut}
    >
      {isLoading ? (
        <LoadingSpinner />
      ) : selectedDossier ? (
        <DossierDetailView
          dossier={selectedDossier}
          template={getEffectiveTemplate(selectedDossier)}
          currentUser={currentUser}
          onBack={() => setSelectedDossier(null)}
          onEditDossier={(d) => handleEditDraft(d)}
          onResubmitDossier={handleResubmitDossier}
          onAdminPrecheck={handleAdminPrecheck}
          onUploadFacultySignature={handleUploadFacultySignature}
          onUpdateSchoolSigning={handleUpdateSchoolSigning}
          onCompleteDossier={handleCompleteDossier}
          onUpdateDossier={updateDossier}
          onApproveDossier={handleApproveDossier}
          onReturnDossier={handleReturnDossier}
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
        </>
      )}

      {templateDetailModal && (
        <TemplateDetailModal
          isOpen={true}
          template={templateDetailModal}
          onClose={() => setTemplateDetailModal(null)}
          onUseTemplate={(tmpl) => {
            setTemplateDetailModal(null);
            handleCreateWithTemplate(tmpl);
          }}
        />
      )}
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
