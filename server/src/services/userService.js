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

  // Xử lý đăng nhập phân quyền (Admin: toanhkhai12345@gmail.com, các Gmail khác: User)
  async login(email, extraData = {}) {
    if (!email) {
      throw new Error('Vui lòng nhập địa chỉ email');
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = cleanEmail === 'toanhkhai12345@gmail.com';

    const found = await userRepository.findByEmail(cleanEmail);
    if (found) {
      // Đảm bảo đồng bộ phân quyền chính xác
      const correctRole = isAdmin ? 'ADMIN' : 'USER';
      let needsSave = false;
      if (found.role !== correctRole) {
        found.role = correctRole;
        needsSave = true;
      }
      if (extraData.name && (!found.name || found.name === 'Người dùng Thử nghiệm')) {
        found.name = extraData.name;
        needsSave = true;
      }
      if (extraData.avatar && !found.avatar) {
        found.avatar = extraData.avatar;
        needsSave = true;
      }
      if (isAdmin) {
        found.title = 'Quản trị viên Hệ thống';
        found.department = 'Phòng Khoa học Công nghệ';
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
      name:
        extraData.name ||
        (isAdmin
          ? 'Quản trị viên Hệ thống'
          : username
              .split(/[._-]/)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ') || 'Người dùng Google'),
      email: cleanEmail,
      role: isAdmin ? 'ADMIN' : 'USER',
      title: isAdmin ? 'Quản trị viên Hệ thống' : 'Cán bộ / Giảng viên',
      department: isAdmin ? 'Phòng Khoa học Công nghệ' : 'Trường Đại học Y Dược Cần Thơ',
      avatar: extraData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`,
    };

    return userRepository.create(newUser);
  },
};
