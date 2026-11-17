import { userService } from '../services/userService.js';
import { ApiResponse } from '../dtos/apiResponse.js';
import { generateToken } from '../middlewares/authMiddleware.js';

export const userController = {
  // GET /api/users
  async getAll(req, res) {
    try {
      const users = req.user.role === 'ADMIN' ? await userService.getAll() : [req.user];
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
      if(req.user.role !== 'ADMIN' && id !== req.user.id)return ApiResponse.error('Bạn không có quyền truy cập tài khoản này.',403).send(res);
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
      const { email, password, credential } = req.body;
      const user = await userService.login(email, { password, credential });
      const token = await generateToken(user);
      return ApiResponse.success({ ...user, token }, 'Đăng nhập thành công').send(res);
    } catch (err) {
      console.error('[userController.login]', err);
      const unavailable=['ECONNREFUSED','ETIMEDOUT','ECONNRESET','PROTOCOL_CONNECTION_LOST'].includes(err.code);
      return ApiResponse.error(err.message, unavailable?503:err.code?.startsWith('ER_')?500:401).send(res);
    }
  },
};
