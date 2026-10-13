import { emailService } from '../services/emailService.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export const emailController = {
  // GET /api/email-logs
  async getAll(req, res) {
    try {
      const { dossierId } = req.query;
      const logs = await emailService.getAll(dossierId);
      return ApiResponse.success(logs, 'Lấy danh sách thông báo email thành công').send(res);
    } catch (err) {
      console.error('[emailController.getAll]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/email-logs
  async sendEmail(req, res) {
    try {
      const sent = await emailService.sendEmail(req.body);
      return ApiResponse.success(sent, 'Gửi thông báo email thành công', 201).send(res);
    } catch (err) {
      console.error('[emailController.sendEmail]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
