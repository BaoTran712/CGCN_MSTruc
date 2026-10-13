import { userService } from '../services/userService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const userController = {
  // GET /api/users
  async getAll(req, res) {
    try {
      const users = await userService.getAll();
      return ApiResponse.success(users, 'Lấy danh sách người dùng thành công').send(res);
    } catch (err) {
      console.error('[userController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/users/:id
  async getById(req, res) {
    try {
      const { id } = req.params;
      const user = await userService.getById(id);
      if (!user) {
        return ApiResponse.error('Không tìm thấy người dùng', 404).send(res);
      }
      return ApiResponse.success(user, 'Lấy thông tin người dùng thành công').send(res);
    } catch (err) {
      console.error('[userController.getById]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/users
  async save(req, res) {
    try {
      const saved = await userService.save(req.body);
      return ApiResponse.success(saved, 'Lưu thông tin người dùng thành công').send(res);
    } catch (err) {
      console.error('[userController.save]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/users/login (hoặc /api/auth/login)
  async login(req, res) {
    try {
      const { email } = req.body;
      const user = await userService.login(email);
      return ApiResponse.success(user, 'Đăng nhập thành công').send(res);
    } catch (err) {
      console.error('[userController.login]', err);
      return ApiResponse.error(err.message, 400).send(res);
    }
  },
};
