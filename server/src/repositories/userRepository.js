import { query, execute } from '../utils/db.js';
import { UserModel } from '../models/userModel.js';

export const userRepository = {
  // Lấy tất cả người dùng
  async findAll() {
    const rows = await query(`
      SELECT u.id, u.name, u.email, u.role, u.title, u.department, u.phone, u.avatar,
             u.created_at, u.updated_at
      FROM users u
      ORDER BY u.role DESC, u.name ASC
    `);

    return rows.map((r) => UserModel.fromRow(r).toObject());
  },

  // Tìm người dùng theo Email
  async findByEmail(email) {
    const rows = await query(`
      SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1
    `, [email]);

    if (!rows || rows.length === 0) return null;
    return UserModel.fromRow(rows[0]).toObject();
  },

  // Tìm theo ID
  async findById(id) {
    const rows = await query(`
      SELECT * FROM users WHERE id = ? LIMIT 1
    `, [id]);

    if (!rows || rows.length === 0) return null;
    return UserModel.fromRow(rows[0]).toObject();
  },

  // Tạo người dùng mới
  async create(user) {
    await execute(`
      INSERT INTO users (id, email, name, role, title, department, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id,
      user.email,
      user.name,
      user.role || 'USER',
      user.title || 'Cán bộ / Giảng viên',
      user.department || 'Trường Đại học Y Dược Cần Thơ',
      user.phone || '',
    ]);

    return this.findById(user.id);
  },

  // Lưu hoặc cập nhật người dùng
  async save(user) {
    const id = user.id || `usr-${Date.now()}`;
    await execute(`
      INSERT INTO users (id, email, name, role, title, department, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        role = VALUES(role),
        title = VALUES(title),
        department = VALUES(department),
        phone = VALUES(phone),
        avatar = VALUES(avatar)
    `, [
      id,
      user.email,
      user.name,
      user.role || 'USER',
      user.title || 'Cán bộ / Giảng viên',
      user.department || 'Trường Đại học Y Dược Cần Thơ',
      user.phone || '',
      user.avatar || user.avatarUrl || '',
    ]);

    return this.findById(id);
  },
};
