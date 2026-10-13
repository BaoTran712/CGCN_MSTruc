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

  // Xử lý đăng nhập SSO @ctump.edu.vn
  async login(email) {
    if (!email || !email.endsWith('@ctump.edu.vn')) {
      throw new Error('Hệ thống chỉ chấp nhận email trường @ctump.edu.vn');
    }

    const found = await userRepository.findByEmail(email);
    if (found) {
      return found;
    }

    // Tự động tạo tài khoản khi cán bộ đăng nhập lần đầu
    const username = email.replace('@ctump.edu.vn', '');
    const newUser = {
      id: `usr-${username}-${Date.now().toString().slice(-4)}`,
      name:
        username
          .split(/[._-]/)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ') || 'Cán bộ Trường ĐH Y Dược Cần Thơ',
      email,
      role: email === 'admin@ctump.edu.vn' ? 'ADMIN' : 'USER',
      title: email === 'admin@ctump.edu.vn' ? 'Chuyên viên Phòng KH&CN' : 'Cán bộ / Giảng viên',
      department: 'Trường Đại học Y Dược Cần Thơ',
    };

    return userRepository.create(newUser);
  },
};
