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

  // GET /api/email-logs/verify-smtp
  async verifySmtp(req, res) {
    try {
      const result = await emailService.verifyConnection();
      return ApiResponse.success(result, result.message).send(res);
    } catch (err) {
      console.error('[emailController.verifySmtp]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // POST /api/email-logs/test
  async testSend(req, res) {
    try {
      const { email } = req.body;
      const targetEmail = email || req.query.email;
      if (!targetEmail) {
        return ApiResponse.error('Vui lòng cung cấp địa chỉ email nhận test (ví dụ: { "email": "ten@gmail.com" })', 400).send(res);
      }

      const result = await emailService.sendEmail({
        recipientEmail: targetEmail,
        recipientName: 'Quý Thầy/Cô (Kiểm thử hệ thống)',
        subject: '[CTUMP DocuGov] Thử nghiệm gửi email tự động qua SMTP thành công',
        content: `Chúc mừng! Hệ thống CTUMP DocuGov đã kết nối thành công đến máy chủ SMTP và gửi email tự động tới hộp thư của Thầy/Cô.\n\nMọi thông báo duyệt hồ sơ, yêu cầu chỉnh sửa và ban hành quyết định sẽ được tự động gửi đến địa chỉ này.`,
        stepName: 'Kiểm thử kết nối SMTP',
      });

      return ApiResponse.success(result, `Đã gửi email thử nghiệm tới ${targetEmail}`).send(res);
    } catch (err) {
      console.error('[emailController.testSend]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
