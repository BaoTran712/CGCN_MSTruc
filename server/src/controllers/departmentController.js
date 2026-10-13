import { departmentService } from '../services/departmentService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const departmentController = {
  // GET /api/departments
  async getAll(req, res) {
    try {
      const depts = await departmentService.getAll();
      return ApiResponse.success(depts, 'Lấy danh sách đơn vị thành công').send(res);
    } catch (err) {
      console.error('[departmentController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/departments/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const dept = await departmentService.getById(id);
      if (!dept) {
        return ApiResponse.error('Không tìm thấy đơn vị', 404).send(res);
      }
      return ApiResponse.success(dept, 'Lấy thông tin đơn vị thành công').send(res);
    } catch (err) {
      console.error('[departmentController.getById]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/departments
  async save(req, res) {
    try {
      const saved = await departmentService.save(req.body);
      return ApiResponse.success(saved, 'Lưu thông tin đơn vị thành công').send(res);
    } catch (err) {
      console.error('[departmentController.save]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
