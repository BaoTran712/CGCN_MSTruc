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
  // 6 TRẠNG THÁI CỐT LÕI (TRUE FLOW + FALSE FLOW)
  SUBMITTED: {
    label: 'Đã gửi / Chờ duyệt',
    badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-blue-600 animate-pulse',
    stepIndex: 1,
    description: 'Thầy/Cô đã nộp (hoặc nộp lại) hồ sơ qua Web Form, đang chờ Cô Admin kiểm tra và duyệt.',
  },
  RETURNED_FOR_REVISION: {
    label: 'Trả về sửa lỗi',
    badgeClass: 'text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-rose-600 animate-pulse',
    stepIndex: 1,
    description: 'Cô Admin đã trả về hồ sơ kèm gợi ý chỗ sai cần sửa chữa. Thầy/Cô chỉnh sửa lại form và nhấn Nộp lại.',
  },
  VALIDATED: {
    label: 'Đã hợp lệ',
    badgeClass: 'text-sky-700 bg-sky-50 border border-sky-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-sky-600',
    stepIndex: 2,
    description: 'Hồ sơ đã được duyệt hợp lệ. Thầy/Cô tải file PDF chuẩn đi trình ký phòng ban và upload lại bản đã ký.',
  },
  PENDING_SIGNED_REVIEW: {
    label: 'Chờ duyệt',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-amber-600',
    stepIndex: 3,
    description: 'Thầy/Cô đã tải lên bản PDF có chữ ký phòng ban và minh chứng, đang chờ Admin kiểm tra.',
  },
  WAITING_RECTOR_SIGNATURE: {
    label: 'Chờ ký Hiệu trưởng',
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-purple-600',
    stepIndex: 4,
    description: 'Admin đã kiểm tra bản ký phòng ban và chuyển hồ sơ sang trình Hiệu trưởng ký duyệt.',
  },
  SIGNED_ARCHIVED: {
    label: 'Đã ký và lưu trữ',
    badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-emerald-600',
    stepIndex: 5,
    description: 'Hiệu trưởng đã ký duyệt chính thức. Hồ sơ đã được khóa lưu trữ và gửi file PDF hoàn tất.',
  },

  // Aliases tương thích ngược
  NEW: {
    label: 'Đã gửi / Chờ duyệt',
    badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-blue-600',
    stepIndex: 1,
    description: 'Đã gửi / Chờ duyệt.',
  },
  NEEDS_REVISION: {
    label: 'Trả về sửa lỗi',
    badgeClass: 'text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-rose-600',
    stepIndex: 1,
    description: 'Trả về sửa lỗi theo gợi ý của Admin.',
  },
  PRECHECK_PASSED: {
    label: 'Đã hợp lệ',
    badgeClass: 'text-sky-700 bg-sky-50 border border-sky-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-sky-600',
    stepIndex: 2,
    description: 'Hồ sơ đã được duyệt hợp lệ.',
  },
  WAITING_FOR_SUBMISSION: {
    label: 'Chờ duyệt',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-amber-600',
    stepIndex: 3,
    description: 'Đã upload bản ký phòng ban, chờ Admin duyệt.',
  },
  FACULTY_SIGNED: {
    label: 'Chờ duyệt',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-amber-600',
    stepIndex: 3,
    description: 'Đã upload bản ký phòng ban.',
  },
  SCHOOL_SIGNING: {
    label: 'Chờ ký Hiệu trưởng',
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-purple-600',
    stepIndex: 4,
    description: 'Đang chờ ký Hiệu trưởng.',
  },
  SIGNED: {
    label: 'Đã ký và lưu trữ',
    badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-emerald-600',
    stepIndex: 5,
    description: 'Đã ký và lưu trữ.',
  },
  COMPLETED: {
    label: 'Đã ký và lưu trữ',
    badgeClass: 'text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-emerald-600',
    stepIndex: 5,
    description: 'Đã ký và lưu trữ.',
  },
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    dotClass: 'bg-gray-400',
    stepIndex: 1,
    description: 'Hồ sơ đang soạn thảo.',
  },
};

export function getStatusMeta(status: DossierStatus | string): StatusMeta {
  if (!status) return STATUS_MAP.SUBMITTED;
  const upper = status.toUpperCase();
  if (STATUS_MAP[upper]) return STATUS_MAP[upper];
  const norm = normalizeStatus(status);
  return STATUS_MAP[norm] || STATUS_MAP.SUBMITTED;
}
