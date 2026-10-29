import { query, execute, isDbConnected } from '../utils/db.js';
import { UserModel } from '../models/userModel.js';
import { mockStore } from '../utils/mockStore.js';

export const userRepository = {
  // Lấy tất cả người dùng
  async findAll() {
    if (!isDbConnected()) {
      return mockStore.users.map((u) => UserModel.fromRow(u).toObject());
    }

    try {
      const rows = await query(`
        SELECT u.id, u.email, u.name, u.role, u.title, u.department, u.phone, u.avatar,
               u.created_at, u.updated_at
        FROM users u
        ORDER BY u.role DESC, u.name ASC
      `);

      if (!rows || rows.length === 0) {
        return mockStore.users.map((u) => UserModel.fromRow(u).toObject());
      }
      return rows.map((r) => UserModel.fromRow(r).toObject());
    } catch {
      return mockStore.users.map((u) => UserModel.fromRow(u).toObject());
    }
  },

  // Tìm người dùng theo Email
  async findByEmail(email) {
    if (!isDbConnected()) {
      const match = mockStore.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      );
      return match ? UserModel.fromRow(match).toObject() : null;
    }

    try {
      const rows = await query(`
        SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1
      `, [email]);

      if (!rows || rows.length === 0) {
        const match = mockStore.users.find(
          (u) => u.email.toLowerCase() === String(email).toLowerCase()
        );
        return match ? UserModel.fromRow(match).toObject() : null;
      }
      return UserModel.fromRow(rows[0]).toObject();
    } catch {
      const match = mockStore.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase()
      );
      return match ? UserModel.fromRow(match).toObject() : null;
    }
  },

  // Tìm theo ID
  async findById(id) {
    if (!isDbConnected()) {
      const match = mockStore.users.find((u) => u.id === id);
      return match ? UserModel.fromRow(match).toObject() : null;
    }

    try {
      const rows = await query(`
        SELECT * FROM users WHERE id = ? LIMIT 1
      `, [id]);

      if (!rows || rows.length === 0) {
        const match = mockStore.users.find((u) => u.id === id);
        return match ? UserModel.fromRow(match).toObject() : null;
      }
      return UserModel.fromRow(rows[0]).toObject();
    } catch {
      const match = mockStore.users.find((u) => u.id === id);
      return match ? UserModel.fromRow(match).toObject() : null;
    }
  },

  // Tạo người dùng mới
  async create(user) {
    if (!isDbConnected()) {
      const newUser = {
        ...user,
        id: user.id || `usr-${Date.now()}`,
        role: user.role || 'USER',
        title: user.title || 'Cán bộ / Giảng viên',
        department: user.department || 'Trường Đại học Y Dược Cần Thơ',
      };
      mockStore.users.push(newUser);
      return UserModel.fromRow(newUser).toObject();
    }

    try {
      await execute(`
        INSERT INTO users (id, email, name, role, title, department, phone, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id,
        user.email,
        user.name,
        user.role || 'USER',
        user.title || 'Cán bộ / Giảng viên',
        user.department || 'Trường Đại học Y Dược Cần Thơ',
        user.phone || '',
        user.avatar || '',
      ]);
      return this.findById(user.id);
    } catch {
      mockStore.users.push(user);
      return UserModel.fromRow(user).toObject();
    }
  },

  // Lưu hoặc cập nhật người dùng
  async save(user) {
    const id = user.id || `usr-${Date.now()}`;
    if (!isDbConnected()) {
      const idx = mockStore.users.findIndex((u) => u.id === id || u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        mockStore.users[idx] = { ...mockStore.users[idx], ...user };
        return UserModel.fromRow(mockStore.users[idx]).toObject();
      }
      mockStore.users.push({ ...user, id });
      return UserModel.fromRow({ ...user, id }).toObject();
    }

    try {
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
    } catch {
      const idx = mockStore.users.findIndex((u) => u.id === id || u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        mockStore.users[idx] = { ...mockStore.users[idx], ...user };
        return UserModel.fromRow(mockStore.users[idx]).toObject();
      }
      mockStore.users.push({ ...user, id });
      return UserModel.fromRow({ ...user, id }).toObject();
    }
  },
};
