import {
  DossierStatus,
  UserRole,
  AuditAction,
  AuditLog,
  Notification,
  User,
} from '../types';

/**
 * Server-Owned Workflow State Machine & Audit Trail Engine
 * Hỗ trợ đầy đủ 6 trạng thái True Flow + False Flow:
 * 1. SUBMITTED (Đã gửi / Chờ duyệt)
 * 2. RETURNED_FOR_REVISION (Trả về sửa lỗi - Luồng False)
 * 3. VALIDATED (Hồ sơ đã được duyệt / Đã hợp lệ)
 * 4. PENDING_SIGNED_REVIEW (Chờ duyệt - Sau khi upload bản ký phòng ban)
 * 5. WAITING_RECTOR_SIGNATURE (Chờ ký Hiệu trưởng)
 * 6. SIGNED_ARCHIVED (Đã ký và lưu trữ)
 */

export function normalizeStatus(status: string): DossierStatus {
  if (!status) return 'SUBMITTED';
  const upper = status.toUpperCase();

  if (upper === 'SUBMITTED' || upper === 'NEW' || upper === 'UNDER_REVIEW' || upper === 'RESUBMITTED') {
    return 'SUBMITTED';
  }
  if (
    upper === 'RETURNED_FOR_REVISION' ||
    upper === 'NEEDS_REVISION' ||
    upper === 'RETURNED' ||
    upper === 'CHANGES_REQUESTED'
  ) {
    return 'RETURNED_FOR_REVISION';
  }
  if (upper === 'VALIDATED' || upper === 'PRECHECK_PASSED' || upper === 'APPROVED') {
    return 'VALIDATED';
  }
  if (
    upper === 'PENDING_SIGNED_REVIEW' ||
    upper === 'WAITING_FOR_SUBMISSION' ||
    upper === 'FACULTY_SIGNED' ||
    upper === 'USER_SIGNED' ||
    upper === 'FOR_SIGNATURE'
  ) {
    return 'PENDING_SIGNED_REVIEW';
  }
  if (
    upper === 'WAITING_RECTOR_SIGNATURE' ||
    upper === 'SCHOOL_SIGNING' ||
    upper === 'SECRETARY_RECEIVED'
  ) {
    return 'WAITING_RECTOR_SIGNATURE';
  }
  if (upper === 'SIGNED_ARCHIVED' || upper === 'SIGNED' || upper === 'COMPLETED') {
    return 'SIGNED_ARCHIVED';
  }
  if (upper === 'DRAFT') return 'DRAFT';
  if (upper === 'CANCELLED') return 'CANCELLED';

  return 'SUBMITTED';
}

const ALLOWED_TRANSITIONS: Record<string, { target: DossierStatus; allowedRoles: UserRole[] }[]> = {
  DRAFT: [{ target: 'SUBMITTED', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] }],
  SUBMITTED: [
    { target: 'VALIDATED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'RETURNED_FOR_REVISION', allowedRoles: ['ADMIN', 'admin'] },
  ],
  RETURNED_FOR_REVISION: [
    { target: 'SUBMITTED', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] },
  ],
  VALIDATED: [
    { target: 'PENDING_SIGNED_REVIEW', allowedRoles: ['USER', 'ADMIN', 'employee', 'admin'] },
    { target: 'RETURNED_FOR_REVISION', allowedRoles: ['ADMIN', 'admin'] },
  ],
  PENDING_SIGNED_REVIEW: [
    { target: 'WAITING_RECTOR_SIGNATURE', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'SIGNED_ARCHIVED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'VALIDATED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'RETURNED_FOR_REVISION', allowedRoles: ['ADMIN', 'admin'] },
  ],
  WAITING_RECTOR_SIGNATURE: [
    { target: 'SIGNED_ARCHIVED', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'PENDING_SIGNED_REVIEW', allowedRoles: ['ADMIN', 'admin'] },
    { target: 'RETURNED_FOR_REVISION', allowedRoles: ['ADMIN', 'admin'] },
  ],
  SIGNED_ARCHIVED: [],
  CANCELLED: [],
};

export function canTransition(
  fromStatus: string,
  toStatus: DossierStatus,
  role: UserRole
): boolean {
  const current = normalizeStatus(fromStatus);
  const target = normalizeStatus(toStatus);
  const rules = ALLOWED_TRANSITIONS[current] || [];
  return rules.some(
    (rule) =>
      (rule.target === target || normalizeStatus(rule.target) === target) &&
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

/**
 * Trả về chỉ số mốc trên Thanh tiến trình 5 bước (1 -> 5)
 * 1: Đã gửi / Trả về sửa lỗi
 * 2: Hồ sơ đã được duyệt (VALIDATED)
 * 3: Chờ duyệt bản ký phòng ban (PENDING_SIGNED_REVIEW)
 * 4: Chờ ký Hiệu trưởng (WAITING_RECTOR_SIGNATURE)
 * 5: Đã ký và lưu trữ (SIGNED_ARCHIVED)
 */
export function getStatusStepIndex(status: string): number {
  const norm = normalizeStatus(status);
  switch (norm) {
    case 'SUBMITTED':
    case 'RETURNED_FOR_REVISION':
      return 1;
    case 'VALIDATED':
      return 2;
    case 'PENDING_SIGNED_REVIEW':
      return 3;
    case 'WAITING_RECTOR_SIGNATURE':
      return 4;
    case 'SIGNED_ARCHIVED':
      return 5;
    default:
      return 1;
  }
}
