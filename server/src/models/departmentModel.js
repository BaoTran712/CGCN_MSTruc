/**
 * Model Entity đại diện cho bảng departments trong MySQL
 */
export class DepartmentModel {
  constructor({ id, code, name, managerName = '', createdAt = null }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.managerName = managerName;
    this.createdAt = createdAt;
  }

  static fromRow(row) {
    if (!row) return null;
    return new DepartmentModel({
      id: row.id,
      code: row.code,
      name: row.name,
      managerName: row.manager_name || '',
      createdAt: row.created_at,
    });
  }

  toObject() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      managerName: this.managerName,
    };
  }
}
