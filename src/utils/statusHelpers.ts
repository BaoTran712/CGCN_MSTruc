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
    badgeClass: 'text-slate-700 bg-slate-100 border border-slate-200',
    dotClass: 'bg-slate-400',
    stepIndex: 1,
    description: 'Hồ sơ đang được soạn thảo, chưa gửi duyệt.',
  },
  SUBMITTED: {
    label: 'Chờ duyệt',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200 font-medium',
    dotClass: 'bg-amber-500',
    stepIndex: 2,
    description: 'Hồ sơ đã gửi trực tuyến, đang chờ thẩm định.',
  },
  RETURNED: {
    label: 'Cần sửa đổi',
    badgeClass: 'text-rose-800 bg-rose-50 border border-rose-200 font-medium',
    dotClass: 'bg-rose-500',
    stepIndex: 2,
    description: 'Hồ sơ bị trả lại kèm theo lý do yêu cầu sửa đổi.',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'text-blue-800 bg-blue-50 border border-blue-200 font-medium',
    dotClass: 'bg-blue-600',
    stepIndex: 3,
    description: 'Đã được phê duyệt hợp lệ theo thẩm quyền.',
  },
  USER_SIGNED: {
    label: 'Đã ký tay / ký số',
    badgeClass: 'text-sky-800 bg-sky-50 border border-sky-200 font-medium',
    dotClass: 'bg-sky-600',
    stepIndex: 4,
    description: 'Người nộp đã tải bản ký tay/ký số ngoài.',
  },
  SECRETARY_RECEIVED: {
    label: 'Văn thư tiếp nhận',
    badgeClass: 'text-slate-800 bg-slate-100 border border-slate-200 font-medium',
    dotClass: 'bg-slate-600',
    stepIndex: 5,
    description: 'Bộ phận Văn thư đã tiếp nhận bản giấy gốc.',
  },
  COMPLETED: {
    label: 'Đã hoàn tất',
    badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-200 font-medium',
    dotClass: 'bg-emerald-600',
    stepIndex: 6,
    description: 'Hồ sơ đã đóng dấu chính thức và lưu trữ tự động trên Google Drive.',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'text-slate-500 bg-slate-100 border border-slate-200',
    dotClass: 'bg-slate-400',
    stepIndex: 0,
    description: 'Hồ sơ đã bị hủy bỏ.',
  },
};

export function getStatusMeta(status: string): StatusMeta {
  const normalized = normalizeStatus(status);
  return STATUS_MAP[normalized] || STATUS_MAP.DRAFT;
}
