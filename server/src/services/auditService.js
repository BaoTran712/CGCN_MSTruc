import { auditRepository } from '../repositories/auditRepository.js';

export const auditService = {
  // Lấy danh sách nhật ký Audit Trail (toàn bộ hoặc theo dossierId)
  async getAll(dossierId = null) {
    if (dossierId) {
      return auditRepository.findByDossierId(dossierId);
    }
    return auditRepository.findAll();
  },

  // Ghi nhật ký xử lý mới
  async create(log) {
    return auditRepository.create(log);
  },
};
