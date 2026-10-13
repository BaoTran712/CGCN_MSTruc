import {
  DossierStatus,
  UserRole,
  AuditAction,
  AuditLog,
  Application,
  DossierVersion,
  Notification,
  User,
} from '../types';

/**
 * Server-Owned Workflow State Machine & Audit Trail Engine
 * Strictly enforces allowed transitions and immutable audit logs per REQUIREMENTS.md
 */

// Normalize all legacy and uppercase statuses to standard DossierStatus
export function normalizeStatus(status: string): DossierStatus {
  if (!status) return 'NEW';
  const upper = status.toUpperCase();
  if (upper === 'NEW' || upper === 'SUBMITTED' || upper === 'UNDER_REVIEW' || upper === 'RESUBMITTED') return 'NEW';
  if (upper === 'NEEDS_REVISION' || upper === 'RETURNED' || upper === 'CHANGES_REQUESTED') return 'NEEDS_REVISION';
  if (upper === 'PRECHECK_PASSED' || upper === 'APPROVED') return 'PRECHECK_PASSED';
  if (upper === 'FACULTY_SIGNED' || upper === 'USER_SIGNED' || upper === 'FOR_SIGNATURE') return 'FACULTY_SIGNED';
  if (upper === 'SCHOOL_SIGNING' || upper === 'SECRETARY_RECEIVED') return 'SCHOOL_SIGNING';
  if (upper === 'COMPLETED') return 'COMPLETED';
  if (upper === 'DRAFT') return 'DRAFT';
  if (upper === 'CANCELLED') return 'CANCELLED';
  return 'NEW';
}

/**
 * State Transition Guard Matrix theo đặc tả quy_trinh.md
 */
const ALLOWED_TRANSITIONS: Record<string, { target: DossierStatus; allowedRoles: UserRole[] }[]> = {
  DRAFT: [{ target: 'NEW', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  NEW: [
    { target: 'PRECHECK_PASSED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'NEEDS_REVISION', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'NEW', allowedRoles: ['ADMIN', 'admin', 'USER', 'employee'] },
  ],
  NEEDS_REVISION: [{ target: 'NEW', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  PRECHECK_PASSED: [{ target: 'FACULTY_SIGNED', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  FACULTY_SIGNED: [
    { target: 'SCHOOL_SIGNING', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'COMPLETED', allowedRoles: ['ADMIN', 'admin'] },
  ],
  SCHOOL_SIGNING: [{ target: 'COMPLETED', allowedRoles: ['ADMIN', 'admin'] }],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  fromStatus: string,
  toStatus: DossierStatus,
  role: UserRole
): boolean {
  const current = normalizeStatus(fromStatus);
  const rules = ALLOWED_TRANSITIONS[current] || [];
  return rules.some(
    (rule) =>
      rule.target === toStatus &&
      (rule.allowedRoles.includes(role) || role === 'ADMIN' || role === 'admin')
  );
}

export function createAuditLog(
  dossierId: string,
  actor: User,
  action: AuditAction,
  fromStatus?: DossierStatus,
  toStatus?: DossierStatus,
  metadata?: Record<string, any>
): AuditLog {
  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    dossierId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    fromStatus,
    toStatus,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function createNotification(
  userId: string,
  dossierId: string,
  dossierCode: string,
  title: string,
  message: string,
  type: 'INFO' | 'ACTION_REQUIRED' | 'SUCCESS' | 'WARNING'
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    dossierId,
    dossierCode,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}
