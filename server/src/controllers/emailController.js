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
      return ApiResponse.success(sent, sent?.status === 'SENT' ? 'Máy chủ SMTP đã chấp nhận email.' : 'Đã xếp hàng thông báo email; chưa xác nhận gửi thành công.', sent?.status === 'SENT' ? 201 : 202).send(res);
    } catch (err) {
      console.error('[emailController.sendEmail]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },

  // GET /api/email-logs/verify-smtp
  async verifySmtp(req, res) {
    try {
      const result = await emailService.verifyConnection();
      return res.status(result.success ? 200 : 503).json({success:result.success,message:result.message,data:result});
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
        subject: '[CTUMP DocuGov] Kiểm tra gửi email qua SMTP',
        content: 'Đây là thư kiểm tra cấu hình gửi email của hệ thống CTUMP DocuGov.',
        stepName: 'Kiểm thử kết nối SMTP',
      });

      return ApiResponse.success(result,result?.status === 'SENT' ? 'Máy chủ SMTP đã chấp nhận email kiểm tra.' : 'Email kiểm tra đang chờ gửi.',result?.status === 'SENT' ? 200 : 202).send(res);
    } catch (err) {
      console.error('[emailController.testSend]', err);
      return ApiResponse.error(err.message, 500).send(res);
    }
  },
};
