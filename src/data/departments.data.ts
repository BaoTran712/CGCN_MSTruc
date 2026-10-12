import { Department } from '../types';

/**
 * Danh sách Khoa & Phòng ban chuẩn của Trường ĐH Y Dược Cần Thơ.
 * Trạng thái khởi tạo: Hệ thống mới hoàn toàn (chưa phân công nhân sự cụ thể).
 */
export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-00',
    code: 'BGH',
    name: 'Ban Giám Hiệu - Trường ĐH Y Dược Cần Thơ',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-01',
    code: 'PKHCN',
    name: 'Phòng Khoa học Công nghệ & Hợp tác Quốc tế',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-02',
    code: 'PHCTH',
    name: 'Phòng Hành chính - Tổng hợp',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-03',
    code: 'PKHTC',
    name: 'Phòng Kế hoạch - Tài chính',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-04',
    code: 'KCNTT',
    name: 'Khoa Công nghệ Thông tin',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-05',
    code: 'KY',
    name: 'Khoa Y',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-06',
    code: 'KDUOC',
    name: 'Khoa Dược',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'dept-07',
    code: 'BVTRUONG',
    name: 'Bệnh viện Trường ĐH Y Dược Cần Thơ',
    managerName: 'Chưa phân công',
    secretaryName: 'Chưa phân công',
    createdAt: '2026-01-01T00:00:00Z',
  },
];
