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
  NEW: {
    label: 'Chờ Admin duyệt (Tiền kiểm)',
    badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-blue-600',
    stepIndex: 1,
    description: 'Thầy/Cô đã nộp hồ sơ thành công, đang chờ Quản trị viên Phòng KH&CN tiền kiểm phê duyệt.',
  },
  NEEDS_REVISION: {
    label: 'Admin yêu cầu sửa đổi',
    badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-rose-600',
    stepIndex: 2,
    description: 'Admin đã gửi yêu cầu chỉnh sửa kèm lý do. Thầy/Cô cần mở lại biểu mẫu để cập nhật và nộp lại.',
  },
  PRECHECK_PASSED: {
    label: 'Admin đã duyệt hợp lệ',
    badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-indigo-600',
    stepIndex: 3,
    description: 'Admin đã phê duyệt thể thức. Thầy/Cô tải file PDF chuẩn để xin chữ ký Trưởng Khoa.',
  },
  FACULTY_SIGNED: {
    label: 'Đã ký cấp Khoa & Nộp minh chứng',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-amber-600',
    stepIndex: 4,
    description: 'Cán bộ đã hoàn tất ký số cấp Khoa và tải lên file PDF đã ký kèm minh chứng liên quan.',
  },
  SCHOOL_SIGNING: {
    label: 'Đang trình ký cấp Trường',
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-purple-600',
    stepIndex: 4,
    description: 'Admin đang điều phối luồng ký số nội bộ: Trưởng phòng KH&CN -> Phòng KHTC -> Hiệu trưởng.',
  },
  COMPLETED: {
    label: 'Đã ban hành QĐ & Hoàn tất',
    badgeClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-emerald-600',
    stepIndex: 5,
    description: 'Hiệu trưởng đã ký duyệt và ban hành Quyết định CGCN chính thức. Đã lưu trữ Google Drive.',
  },
  // Legacy aliases
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-gray-400',
    stepIndex: 1,
    description: 'Hồ sơ đang soạn thảo.',
  },
  SUBMITTED: {
    label: 'Mới nộp (Chờ tiền kiểm)',
    badgeClass: 'text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-blue-600',
    stepIndex: 1,
    description: 'Hồ sơ đang chờ tiền kiểm.',
  },
  RETURNED: {
    label: 'Yêu cầu bổ sung',
    badgeClass: 'text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-rose-600',
    stepIndex: 2,
    description: 'Hồ sơ cần sửa đổi theo nhận xét.',
  },
  APPROVED: {
    label: 'Đã duyệt thể thức',
    badgeClass: 'text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-indigo-600',
    stepIndex: 3,
    description: 'Đã duyệt hợp lệ thể thức.',
  },
  USER_SIGNED: {
    label: 'Đã ký cấp Khoa',
    badgeClass: 'text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-amber-600',
    stepIndex: 4,
    description: 'Đã ký số cấp Khoa.',
  },
  SECRETARY_RECEIVED: {
    label: 'Đang trình ký cấp Trường',
    badgeClass: 'text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-purple-600',
    stepIndex: 4,
    description: 'Đang trình ký cấp Trường.',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'text-gray-500 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded text-xs font-semibold',
    dotClass: 'bg-gray-400',
    stepIndex: 0,
    description: 'Hồ sơ đã bị hủy bỏ.',
  },
};

export function getStatusMeta(status: string): StatusMeta {
  const normalized = normalizeStatus(status);
  return STATUS_MAP[normalized] || STATUS_MAP.DRAFT;
}
