import { templateService } from '../services/templateService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const templateController = {
  // GET /api/templates
  async getAll(req, res) {
    try {
      const templates = await templateService.getAll();
      return ApiResponse.success(templates, 'Lấy danh sách biểu mẫu thành công').send(res);
    } catch (err) {
      console.error('[templateController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/templates/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const found = await templateService.getById(id);
      if (!found) {
        return ApiResponse.error('Không tìm thấy biểu mẫu', 404).send(res);
      }
      return ApiResponse.success(found, 'Lấy chi tiết biểu mẫu thành công').send(res);
    } catch (err) {
      console.error('[templateController.getById]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/templates
  async save(req, res) {
    try {
      const saved = await templateService.save(req.body);
      return ApiResponse.success(saved, 'Lưu cấu hình biểu mẫu thành công').send(res);
    } catch (err) {
      console.error('[templateController.save]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
