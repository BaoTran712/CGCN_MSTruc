/**
 * Model Entity đại diện cho bảng users trong MySQL
 */
export class UserModel {
  constructor({
    id,
    staff_code = null,
    email,
    full_name,
    department_id = 1,
    department_name = 'Khoa Y',
    department_code = 'KY',
    role = 'USER',
    phone = '',
    created_at = null,
    updated_at = null,
  }) {
    this.id = id;
    this.staff_code = staff_code;
    this.email = email;
    this.full_name = full_name;
    this.name = full_name;
    this.department_id = department_id;
    this.department_name = department_name;
    this.department = department_name;
    this.department_code = department_code;
    this.role = role;
    this.phone = phone;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  static fromRow(row) {
    if (!row) return null;
    return new UserModel({
      id: row.id,
      staff_code: row.staff_code || null,
      email: row.email,
      full_name: row.full_name || row.name,
      department_id: row.department_id,
      department_name: row.department_name || row.department || 'Khoa Y',
      department_code: row.department_code || 'KY',
      role: row.role,
      phone: row.phone,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }

  toObject() {
    return {
      id: this.id,
      staff_code: this.staff_code,
      email: this.email,
      full_name: this.full_name,
      name: this.full_name,
      department_id: this.department_id,
      department_name: this.department_name,
      department: this.department_name,
      department_code: this.department_code,
      role: this.role,
      phone: this.phone,
    };
  }
}
