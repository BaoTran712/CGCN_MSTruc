import { randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '../repositories/userRepository.js';
import { query } from '../utils/db.js';
import { verifyPassword } from '../utils/passwords.js';
import { config } from '../utils/config.js';

const google = new OAuth2Client(config.googleClientId);
export const userService = {
  getAll: () => userRepository.findAll(),
  getById: id => userRepository.findById(id),
  getByEmail: email => userRepository.findByEmail(email),
  save: user => userRepository.save(user),
  async login(email, credentials = {}) {
    let cleanEmail = String(email || '').trim().toLowerCase();
    let profile;
    if (credentials.credential) {
      if (!config.googleClientId) throw new Error('Chưa cấu hình Google Client ID trên máy chủ.');
      const ticket = await google.verifyIdToken({ idToken: credentials.credential, audience: config.googleClientId });
      const payload = ticket.getPayload();
      if (!payload?.email || payload.email_verified !== true) throw new Error('Tài khoản Google chưa xác minh email.');
      cleanEmail = payload.email.toLowerCase();
      profile = { name: payload.name, avatar: payload.picture };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Địa chỉ email không hợp lệ.');
    let user = await userRepository.findByEmail(cleanEmail);
    if (!profile) {
      const [record] = await query('SELECT c.password_hash,u.is_active FROM users u LEFT JOIN auth_credentials c ON c.user_id=u.id WHERE LOWER(u.email)=?', [cleanEmail]);
      if (!record || !record.is_active || !(await verifyPassword(credentials.password, record.password_hash))) throw new Error('Email hoặc mật khẩu không đúng. Tài khoản chưa có mật khẩu có thể đăng nhập Google hoặc liên hệ quản trị viên.');
    } else if (!user) {
      const isAdmin = config.adminEmails.includes(cleanEmail);
      try {
        user = await userRepository.create({
          id: 'usr-' + randomUUID(), email: cleanEmail, name: profile.name || cleanEmail.split('@')[0],
          avatar: profile.avatar || '', role: isAdmin ? 'ADMIN' : 'USER',
          title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
          department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Trường Đại học Y Dược Cần Thơ',
        });
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error;
        user = await userRepository.findByEmail(cleanEmail);
      }
    }
    const [state] = await query('SELECT is_active FROM users WHERE id=?', [user.id]);
    if (!state?.is_active) throw new Error('Tài khoản đã bị vô hiệu hóa.');
    // Existing database roles are authoritative, including roles assigned by an administrator.
    return user;
  },
};
