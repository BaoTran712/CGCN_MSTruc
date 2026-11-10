import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Application,
  DocumentTemplate,
  User,
} from '../types';
import * as api from '../services/api';
import { normalizeStatus } from '../services/workflowEngine';

interface DossierContextValue {
  templates: DocumentTemplate[];
  dossiers: Application[];
  users: User[];
  isLoading: boolean;
  pendingCount: number;
  myDossierCount: number;
  reloadAll: () => Promise<void>;
  saveDraft: (draft: Application, user: User) => Promise<Application>;
  submitDossier: (dossier: Application, user: User) => Promise<Application>;
  resubmitDossier: (dossierId: string, updatedFormData: Record<string, any>, user: User, fullPayload?: Partial<Application>) => Promise<Application>;
  approveDossier: (dossierId: string, comment: string | undefined, user: User) => Promise<Application>;
  returnDossier: (dossierId: string, reason: string, user: User) => Promise<Application>;
  adminPrecheck: (id: string, isValid: boolean, reviewNotes?: string, adminUser?: User, targetForm?: '1a' | '2a' | 'both') => Promise<Application>;
  uploadFacultySignature: (
    id: string,
    facultySignedPdfUrl?: string,
    evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
    user?: User
  ) => Promise<Application>;
  updateSchoolSigning: (
    id: string,
    flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean; note?: string },
    adminUser?: User
  ) => Promise<Application>;
  updateDossier: (id: string, partial: Partial<Application>) => Promise<Application>;
  completeDossier: (
    id: string,
    decisionNumber?: string,
    decisionDate?: string,
    finalPdfUrl?: string,
    adminUser?: User
  ) => Promise<Application>;
}

const DossierContext = createContext<DossierContextValue | undefined>(undefined);

export const DossierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [dossiers, setDossiers] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reloadAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const [loadedTemplates, loadedApps, loadedUsers] = await Promise.all([
        api.getTemplates(),
        api.getAllApplications(),
        api.getUsers(),
      ]);
      setTemplates(Array.isArray(loadedTemplates) ? loadedTemplates : []);
      setDossiers(Array.isArray(loadedApps) ? loadedApps : []);
      setUsers(Array.isArray(loadedUsers) ? loadedUsers : []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadAll();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        api.getAllApplications().then((loadedApps) => {
          if (Array.isArray(loadedApps) && loadedApps.length > 0) {
            setDossiers(loadedApps);
          }
        }).catch(() => {});
      }
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [reloadAll]);

  const upsertInState = useCallback((updated: Application, fallbackId?: string) => {
    setDossiers((prev) => {
      const filtered = prev.filter(
        (d) =>
          d.id !== updated.id &&
          d.code !== updated.code &&
          (!fallbackId || (d.id !== fallbackId && d.code !== fallbackId))
      );
      return [updated, ...filtered];
    });
  }, []);

  const saveDraft = useCallback(
    async (draftDossier: Application, user: User): Promise<Application> => {
      const saved = await api.saveApplicationDraft(draftDossier.id, draftDossier, user);
      upsertInState(saved, draftDossier.id);
      return saved;
    },
    [upsertInState]
  );

  const submitDossier = useCallback(
    async (submittedDossier: Application, user: User): Promise<Application> => {
      const submitted = await api.submitApplication(submittedDossier.id, submittedDossier, user);
      upsertInState(submitted, submittedDossier.id);
      return submitted;
    },
    [upsertInState]
  );

  const resubmitDossier = useCallback(
    async (dossierId: string, updatedFormData: Record<string, any>, user: User, fullPayload?: Partial<Application>): Promise<Application> => {
      const resubmitted = await api.resubmitApplication(dossierId, updatedFormData, user, fullPayload);
      upsertInState(resubmitted, dossierId);
      return resubmitted;
    },
    [upsertInState]
  );

  const approveDossier = useCallback(
    async (dossierId: string, comment: string | undefined, user: User): Promise<Application> => {
      const approved = await api.approveApplication(dossierId, comment, user);
      upsertInState(approved, dossierId);
      return approved;
    },
    [upsertInState]
  );

  const returnDossier = useCallback(
    async (dossierId: string, reason: string, user: User): Promise<Application> => {
      const returned = await api.returnApplication(dossierId, reason, user);
      upsertInState(returned, dossierId);
      return returned;
    },
    [upsertInState]
  );

  const adminPrecheck = useCallback(
    async (id: string, isValid: boolean, reviewNotes?: string, adminUser?: User, targetForm?: '1a' | '2a' | 'both'): Promise<Application> => {
      const updated = await api.adminPrecheck(id, isValid, reviewNotes, adminUser, targetForm);
      upsertInState(updated, id);
      return updated;
    },
    [upsertInState]
  );

  const uploadFacultySignature = useCallback(
    async (
      id: string,
      facultySignedPdfUrl?: string,
      evidenceFiles?: Array<{ name: string; url: string; size?: string }>,
      user?: User
    ): Promise<Application> => {
      const updated = await api.uploadFacultySignature(id, facultySignedPdfUrl, evidenceFiles, user);
      upsertInState(updated, id);
      return updated;
    },
    [upsertInState]
  );

  const updateSchoolSigning = useCallback(
    async (
      id: string,
      flags: { khcnSigned?: boolean; khtcSigned?: boolean; bghSigned?: boolean; note?: string },
      adminUser?: User
    ): Promise<Application> => {
      const updated = await api.updateSchoolSigning(id, flags, adminUser);
      upsertInState(updated, id);
      return updated;
    },
    [upsertInState]
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
      upsertInState(updated, id);
      return updated;
    },
    [upsertInState]
  );

  const updateDossier = useCallback(
    async (id: string, partial: Partial<Application>): Promise<Application> => {
      const updated = await api.updateDossierFields(id, partial);
      upsertInState(updated, id);
      return updated;
    },
    [upsertInState]
  );

  const pendingCount = useMemo(
    () =>
      dossiers.filter((d) => {
        const st = normalizeStatus(d.status);
        return (
          st === 'SUBMITTED' ||
          st === 'PENDING_SIGNED_REVIEW' ||
          st === 'WAITING_RECTOR_SIGNATURE'
        );
      }).length,
    [dossiers]
  );

  const myDossierCount = dossiers.length;

  const value = useMemo(
    () => ({
      templates,
      dossiers,
      users,
      isLoading,
      pendingCount,
      myDossierCount,
      reloadAll,
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
    }),
    [
      templates,
      dossiers,
      users,
      isLoading,
      pendingCount,
      myDossierCount,
      reloadAll,
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
    ]
  );

  return <DossierContext.Provider value={value}>{children}</DossierContext.Provider>;
};

export function useDossiers(): DossierContextValue {
  const ctx = useContext(DossierContext);
  if (!ctx) {
    throw new Error('useDossiers must be used within a DossierProvider');
  }
  return ctx;
}
