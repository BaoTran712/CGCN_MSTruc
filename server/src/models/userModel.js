/**
 * Model Entity đại diện cho bảng users trong MySQL
 */
export class UserModel {
  constructor({
    id,
    email,
    name,
    role = 'USER',
    title = 'Cán bộ / Giảng viên',
    department = 'Trường Đại học Y Dược Cần Thơ',
    departmentId = null,
    phone = '',
    avatar = '',
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.role = role;
    this.title = title;
    this.department = department;
    this.departmentId = departmentId;
    this.phone = phone;
    this.avatar = avatar;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Ánh xạ từ dòng dữ liệu thô (raw row snake_case) của MySQL
   */
  static fromRow(row) {
    if (!row) return null;
    return new UserModel({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      title: row.title,
      department: row.department,
      departmentId: row.department_id,
      phone: row.phone,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Chuyển thành Object chuẩn trả về cho Client
   */
  toObject() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      title: this.title,
      department: this.department,
      departmentId: this.departmentId,
      phone: this.phone,
      avatar: this.avatar,
    };
  }
}
