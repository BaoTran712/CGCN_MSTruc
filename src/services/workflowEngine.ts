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
  const upper = status.toUpperCase();
  if (upper === 'DRAFT' || upper === 'DRAFT') return 'DRAFT';
  if (upper === 'SUBMITTED' || upper === 'UNDER_REVIEW' || upper === 'RESUBMITTED') return 'SUBMITTED';
  if (upper === 'RETURNED' || upper === 'CHANGES_REQUESTED') return 'RETURNED';
  if (upper === 'APPROVED') return 'APPROVED';
  if (upper === 'USER_SIGNED' || upper === 'FOR_SIGNATURE') return 'USER_SIGNED';
  if (upper === 'SECRETARY_RECEIVED') return 'SECRETARY_RECEIVED';
  if (upper === 'COMPLETED') return 'COMPLETED';
  if (upper === 'CANCELLED') return 'CANCELLED';
  return 'DRAFT';
}

/**
 * State Transition Guard Matrix
 */
const ALLOWED_TRANSITIONS: Record<string, { target: DossierStatus; allowedRoles: UserRole[] }[]> = {
  DRAFT: [{ target: 'SUBMITTED', allowedRoles: ['USER', 'employee', 'ADMIN', 'admin'] }],
  SUBMITTED: [
    { target: 'APPROVED', allowedRoles: ['MANAGER', 'manager', 'ADMIN', 'admin'] },
    { target: 'RETURNED', allowedRoles: ['MANAGER', 'manager', 'ADMIN', 'admin'] },
    { target: 'SUBMITTED', allowedRoles: ['MANAGER', 'manager', 'ADMIN', 'admin'] }, // Data edit by manager
  ],
  RETURNED: [{ target: 'SUBMITTED', allowedRoles: ['USER', 'employee', 'ADMIN', 'admin'] }],
  APPROVED: [{ target: 'USER_SIGNED', allowedRoles: ['USER', 'employee', 'ADMIN', 'admin'] }],
  USER_SIGNED: [{ target: 'SECRETARY_RECEIVED', allowedRoles: ['SECRETARY', 'secretary', 'ADMIN', 'admin'] }],
  SECRETARY_RECEIVED: [{ target: 'COMPLETED', allowedRoles: ['SECRETARY', 'secretary', 'ADMIN', 'admin'] }],
  COMPLETED: [], // Terminal
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
