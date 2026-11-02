import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Application,
  DocumentTemplate,
  GoogleSheetRow,
  User,
} from '../types';
import * as api from '../services/api';

interface DossierContextValue {
  templates: DocumentTemplate[];
  dossiers: Application[];
  sheetRows: GoogleSheetRow[];
  users: User[];
  isLoading: boolean;
  pendingCount: number;
  myDossierCount: number;
  reloadAll: () => Promise<void>;
  saveDraft: (draft: Application, user: User) => Promise<Application>;
  submitDossier: (dossier: Application, user: User) => Promise<Application>;
  approveDossier: (dossierId: string, comment: string | undefined, user: User) => Promise<Application>;
  returnDossier: (dossierId: string, reason: string, user: User) => Promise<Application>;
  saveManagerEdit: (
    dossierId: string,
    updatedFormData: Record<string, any>,
    changeSummary: string,
    user: User
  ) => Promise<Application>;
  uploadUserSignature: (dossierId: string, driveFileId: string, user: User) => Promise<Application>;
  receiveSecretaryIntake: (dossierId: string, user: User) => Promise<Application>;
  completeBySecretary: (dossierId: string, finalDriveFileId: string, user: User) => Promise<Application>;
  // Quy trình Automation 8 bước (quy_trinh.md)
  adminPrecheck: (id: string, isValid: boolean, reviewNotes?: string, adminUser?: User) => Promise<Application>;
  uploadFacultySignature: (
    id: string,
    facultySignedPdfUrl?: string,
    evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
    user?: User
  ) => Promise<Application>;
  updateSchoolSigning: (
    id: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean },
    adminUser?: User
  ) => Promise<Application>;
  completeDossier: (
    id: string,
    decisionNumber?: string,
    decisionDate?: string,
    finalPdfUrl?: string,
    adminUser?: User
  ) => Promise<Application>;
  addTemplate: (tmpl: DocumentTemplate) => Promise<DocumentTemplate>;
  updateTemplate: (tmpl: DocumentTemplate) => Promise<DocumentTemplate>;
  refreshSheetRows: () => Promise<GoogleSheetRow[]>;
}

const DossierContext = createContext<DossierContextValue | undefined>(undefined);

export const DossierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [dossiers, setDossiers] = useState<Application[]>([]);
  const [sheetRows, setSheetRows] = useState<GoogleSheetRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedTemplates, loadedApps, loadedSheetRows, loadedUsers] = await Promise.all([
        api.getTemplates(),
        api.getAllApplications(),
        api.getAllSheetRows(),
        api.getUsers(),
      ]);
      setTemplates(Array.isArray(loadedTemplates) ? loadedTemplates : []);
      setDossiers(Array.isArray(loadedApps) ? loadedApps : []);
      setSheetRows(Array.isArray(loadedSheetRows) ? loadedSheetRows : []);
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
    } catch (err) {
      console.error('Failed to load initial data via API:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const saveDraft = useCallback(async (draftDossier: Application, user: User): Promise<Application> => {
    const saved = await api.saveApplicationDraft(draftDossier.id, draftDossier, user);
    setDossiers((prev) => {
      const exists = prev.some((d) => d.id === saved.id);
      if (exists) return prev.map((d) => (d.id === saved.id ? saved : d));
      return [saved, ...prev];
    });
    return saved;
  }, []);

  const submitDossier = useCallback(async (submittedDossier: Application, user: User): Promise<Application> => {
    const submitted = await api.submitApplication(submittedDossier.id, submittedDossier, user);
    setDossiers((prev) => {
      const exists = prev.some((d) => d.id === submitted.id);
      if (exists) return prev.map((d) => (d.id === submitted.id ? submitted : d));
      return [submitted, ...prev];
    });
    return submitted;
  }, []);

  const approveDossier = useCallback(
    async (dossierId: string, comment: string | undefined, user: User): Promise<Application> => {
      const approved = await api.approveApplication(dossierId, comment, user);
      setDossiers((prev) => prev.map((d) => (d.id === approved.id ? approved : d)));
      return approved;
    },
    []
  );

  const returnDossier = useCallback(
    async (dossierId: string, reason: string, user: User): Promise<Application> => {
      const returned = await api.returnApplication(dossierId, reason, user);
      setDossiers((prev) => {
        const found = prev.some(
          (d) => d.id === returned.id || d.code === returned.code || d.id === dossierId || d.code === dossierId
        );
        if (found) {
          return prev.map((d) =>
            d.id === returned.id || d.code === returned.code || d.id === dossierId || d.code === dossierId
              ? returned
              : d
          );
        }
        return [returned, ...prev];
      });
      return returned;
    },
    []
  );

  const saveManagerEdit = useCallback(
    async (
      dossierId: string,
      updatedFormData: Record<string, any>,
      changeSummary: string,
      user: User
    ): Promise<Application> => {
      const updated = await api.updateDossierDataByManager(
        dossierId,
        updatedFormData,
        changeSummary,
        user
      );
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const uploadUserSignature = useCallback(
    async (dossierId: string, driveFileId: string, user: User): Promise<Application> => {
      const updated = await api.uploadUserSignature(dossierId, driveFileId, user);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const receiveSecretaryIntake = useCallback(
    async (dossierId: string, user: User): Promise<Application> => {
      const updated = await api.receiveSecretaryDossier(dossierId, user);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const completeBySecretary = useCallback(
    async (dossierId: string, finalDriveFileId: string, user: User): Promise<Application> => {
      const res = await api.completeDossierBySecretary(dossierId, finalDriveFileId, user);
      const completed = res.application;
      setDossiers((prev) => prev.map((d) => (d.id === completed.id ? completed : d)));
      return completed;
    },
    []
  );


  const addTemplate = useCallback(async (newTmpl: DocumentTemplate): Promise<DocumentTemplate> => {
    const saved = await api.saveTemplate(newTmpl, true);
    setTemplates((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updateTemplate = useCallback(async (updatedTmpl: DocumentTemplate): Promise<DocumentTemplate> => {
    const saved = await api.saveTemplate(updatedTmpl, false);
    setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    return saved;
  }, []);

  const refreshSheetRows = useCallback(async (): Promise<GoogleSheetRow[]> => {
    const rows = await api.getAllSheetRows();
    setSheetRows(rows);
    return rows;
  }, []);

  const adminPrecheck = useCallback(
    async (id: string, isValid: boolean, reviewNotes?: string, adminUser?: User): Promise<Application> => {
      const updated = await api.adminPrecheck(id, isValid, reviewNotes, adminUser);
      setDossiers((prev) => {
        const found = prev.some(
          (d) => d.id === updated.id || d.code === updated.code || d.id === id || d.code === id
        );
        if (found) {
          return prev.map((d) =>
            d.id === updated.id || d.code === updated.code || d.id === id || d.code === id
              ? updated
              : d
          );
        }
        return [updated, ...prev];
      });
      return updated;
    },
    []
  );

  const uploadFacultySignature = useCallback(
    async (
      id: string,
      facultySignedPdfUrl?: string,
      evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
      user?: User
    ): Promise<Application> => {
      const updated = await api.uploadFacultySignature(id, facultySignedPdfUrl, evidenceFiles, user);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const updateSchoolSigning = useCallback(
    async (
      id: string,
      flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean },
      adminUser?: User
    ): Promise<Application> => {
      const updated = await api.updateSchoolSigning(id, flags, adminUser);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const completeDossier = useCallback(
    async (
      id: string,
      decisionNumber?: string,
      decisionDate?: string,
      finalPdfUrl?: string,
      adminUser?: User
    ): Promise<Application> => {
      const updated = await api.completeDossier(id, decisionNumber, decisionDate, finalPdfUrl, adminUser);
      setDossiers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      return updated;
    },
    []
  );

  const pendingCount = useMemo(
    () =>
      dossiers.filter((d) =>
        ['NEW', 'NEEDS_REVISION', 'RESUBMITTED', 'FACULTY_SIGNED', 'SCHOOL_SIGNING'].includes(d.status)
      ).length,
    [dossiers]
  );

  const myDossierCount = dossiers.length;

  const value = useMemo(
    () => ({
      templates,
      dossiers,
      sheetRows,
      users,
      isLoading,
      pendingCount,
      myDossierCount,
      reloadAll,
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
      addTemplate,
      updateTemplate,
      refreshSheetRows,
    }),
    [
      templates,
      dossiers,
      sheetRows,
      users,
      isLoading,
      pendingCount,
      myDossierCount,
      reloadAll,
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
      addTemplate,
      updateTemplate,
      refreshSheetRows,
    ]
  );

  return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>;
};

export function useDossiers(): DossierContextValue {
  const context = useContext(DossierContext);
  if (!context) {
    throw new Error('useDossiers must be used within a DossierProvider');
  }
  return context;
}
