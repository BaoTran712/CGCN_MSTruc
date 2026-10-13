/**
 * DTOs cho module User / Auth
 */

// Request DTO khi Client gửi yêu cầu đăng nhập SSO
export class LoginRequestDto {
  constructor({ email }) {
    this.email = (email || '').trim().toLowerCase();
  }

  validate() {
    if (!this.email) {
      throw new Error('Vui lòng nhập địa chỉ email @ctump.edu.vn');
    }
    if (!this.email.endsWith('@ctump.edu.vn')) {
      throw new Error('Hệ thống chỉ chấp nhận tài khoản email nội bộ @ctump.edu.vn');
    }
  }
}

// Request DTO khi Client lưu/cập nhật thông tin cán bộ
export class SaveUserRequestDto {
  constructor({ id, email, name, role, title, department, phone, avatar }) {
    this.id = id;
    this.email = (email || '').trim().toLowerCase();
    this.name = (name || '').trim();
    this.role = role || 'USER';
    this.title = title || 'Cán bộ / Giảng viên';
    this.department = department || 'Trường Đại học Y Dược Cần Thơ';
    this.phone = phone || '';
    this.avatar = avatar || '';
  }

  validate() {
    if (!this.email) throw new Error('Email không được để trống');
    if (!this.name) throw new Error('Họ và tên không được để trống');
  }
}

// Response DTO trả về cho Client
export class UserResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return {
      id: model.id,
      email: model.email,
      name: model.name,
      role: model.role,
      title: model.title,
      department: model.department,
      phone: model.phone,
      avatar: model.avatar,
    };
  }
}
