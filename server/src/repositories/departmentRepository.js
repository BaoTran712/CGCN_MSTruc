import { query } from '../utils/db.js';
import { DepartmentModel } from '../models/departmentModel.js';

export const departmentRepository = {
  // Lấy tất cả đơn vị
  async findAll() {
    const rows = await query(`
      SELECT * FROM departments ORDER BY code ASC
    `);

    return rows.map((r) => DepartmentModel.fromRow(r).toObject());
  },

  // Lấy theo ID
  async findById(id) {
    const rows = await query(`
      SELECT * FROM departments WHERE id = ? OR code = ? LIMIT 1
    `, [id, id]);

    if (!rows || rows.length === 0) return null;
    return DepartmentModel.fromRow(rows[0]).toObject();
  },

  // Lưu hoặc cập nhật đơn vị
  async save(dept) {
    const id = dept.id || `dept_${Date.now()}`;
    await query(`
      INSERT INTO departments (id, code, name, manager_name)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        name = VALUES(name),
        manager_name = VALUES(manager_name)
    `, [id, dept.code || id, dept.name, dept.managerName || dept.manager_name || '']);

    return this.findById(id);
  },
};
