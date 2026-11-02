import { userRepository } from '../repositories/userRepository.js';

export const userService = {
  // Lấy tất cả người dùng
  async getAll() {
    return userRepository.findAll();
  },

  // Lấy người dùng theo ID
  async getById(id) {
    return userRepository.findById(id);
  },

  // Tìm người dùng theo Email
  async getByEmail(email) {
    return userRepository.findByEmail(email);
  },

  // Lưu hoặc cập nhật thông tin người dùng
  async save(user) {
    return userRepository.save(user);
  },

  // Xử lý đăng nhập
  async login(email, extraData = {}) {
    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ email');
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin =
      cleanEmail === 'toanhkhai12345@gmail.com' || cleanEmail === 'admin@ctump.edu.vn';

    const found = await userRepository.findByEmail(cleanEmail);
    if (found) {
      const correctRole = isAdmin ? 'ADMIN' : found.role || 'USER';
      let needsSave = false;
      if (found.role !== correctRole) {
        found.role = correctRole;
        needsSave = true;
      }
      if (extraData.name && (!found.full_name || found.full_name === 'Người dùng Thử nghiệm')) {
        found.full_name = extraData.name;
        needsSave = true;
      }
      if (needsSave) {
        await userRepository.save(found);
      }
      return found;
    }

    // Tự động tạo tài khoản khi đăng nhập lần đầu
    const username = cleanEmail.split('@')[0];
    const newUser = {
      id: `usr-${username}-${Date.now().toString().slice(-4)}`,
      staff_code: `CB-${Date.now().toString().slice(-4)}`,
      full_name:
        extraData.name ||
        (isAdmin
          ? 'Quản trị viên Hệ thống'
          : username
              .split(/[._-]/)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ') || 'Người dùng Google'),
      email: cleanEmail,
      role: isAdmin ? 'ADMIN' : 'USER',
      department_id: 1,
      phone: '',
    };

    return userRepository.create(newUser);
  },
};
