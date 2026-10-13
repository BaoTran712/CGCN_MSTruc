import { auditService } from '../services/auditService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const auditController = {
  // GET /api/audit-logs
  async getAll(req, res) {
    try {
      const { dossierId } = req.query;
      const logs = await auditService.getAll(dossierId);
      return ApiResponse.success(logs, 'Lấy danh sách nhật ký xử lý thành công').send(res);
    } catch (err) {
      console.error('[auditController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/audit-logs
  async create(req, res) {
    try {
      const created = await auditService.create(req.body);
      return ApiResponse.success(created, 'Ghi nhật ký thành công', 201).send(res);
    } catch (err) {
      console.error('[auditController.create]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
