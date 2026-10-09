import { DossierStatus } from '../types';
import { normalizeStatus } from '../services/workflowEngine';

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
  stepIndex: number;
  description: string;
}

export const STATUS_MAP: Record<string, StatusMeta> = {
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
    stepIndex: 1,
    description: 'Hồ sơ đang được soạn thảo, chưa gửi duyệt.',
  },
  SUBMITTED: {
    label: 'Chờ duyệt',
    badgeClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
    stepIndex: 2,
    description: 'Hồ sơ đã gửi trực tuyến, đang chờ thẩm định.',
  },
  RETURNED: {
    label: 'Cần sửa đổi',
    badgeClass: 'text-rose-700',
    dotClass: 'bg-rose-500',
    stepIndex: 2,
    description: 'Hồ sơ bị trả lại kèm theo lý do yêu cầu sửa đổi.',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'text-blue-700',
    dotClass: 'bg-blue-600',
    stepIndex: 3,
    description: 'Đã được phê duyệt hợp lệ theo thẩm quyền.',
  },
  USER_SIGNED: {
    label: 'Đã ký tay / ký số',
    badgeClass: 'text-sky-700',
    dotClass: 'bg-sky-600',
    stepIndex: 4,
    description: 'Người nộp đã tải bản ký tay/ký số ngoài.',
  },
  SECRETARY_RECEIVED: {
    label: 'Văn thư tiếp nhận',
    badgeClass: 'text-gray-700',
    dotClass: 'bg-gray-600',
    stepIndex: 5,
    description: 'Bộ phận Văn thư đã tiếp nhận bản giấy gốc.',
  },
  COMPLETED: {
    label: 'Đã hoàn tất',
    badgeClass: 'text-emerald-700',
    dotClass: 'bg-emerald-600',
    stepIndex: 6,
    description: 'Hồ sơ đã đóng dấu chính thức và lưu trữ tự động trên Google Drive.',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'text-gray-500',
    dotClass: 'bg-gray-400',
    stepIndex: 0,
    description: 'Hồ sơ đã bị hủy bỏ.',
  },
};

export function getStatusMeta(status: string): StatusMeta {
  const normalized = normalizeStatus(status);
  return STATUS_MAP[normalized] || STATUS_MAP.DRAFT;
}
