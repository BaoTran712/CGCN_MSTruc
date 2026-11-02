import { query, execute } from '../config/database.js';
import { UserModel } from '../models/userModel.js';

export const userRepository = {
  async findAll() {
    const rows = await query(`
      SELECT
        u.*,
        dept.code AS department_code,
        dept.name AS department_name
      FROM users u
      LEFT JOIN departments dept ON u.department_id = dept.id
      ORDER BY u.role DESC, u.full_name ASC
    `);

    return rows.map((r) => UserModel.fromRow(r).toObject());
  },

  async findByEmail(email) {
    const rows = await query(
      `
      SELECT
        u.*,
        dept.code AS department_code,
        dept.name AS department_name
      FROM users u
      LEFT JOIN departments dept ON u.department_id = dept.id
      WHERE LOWER(u.email) = LOWER(?)
      LIMIT 1
      `,
      [email]
    );

    if (!rows || rows.length === 0) return null;
    return UserModel.fromRow(rows[0]).toObject();
  },

  async findById(id) {
    const rows = await query(
      `
      SELECT
        u.*,
        dept.code AS department_code,
        dept.name AS department_name
      FROM users u
      LEFT JOIN departments dept ON u.department_id = dept.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows || rows.length === 0) return null;
    return UserModel.fromRow(rows[0]).toObject();
  },

  async create(user) {
    await execute(
      `
      INSERT INTO users (id, staff_code, email, full_name, department_id, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        user.staff_code || user.staffCode || null,
        user.email,
        user.full_name || user.name || 'Cán bộ CTUMP',
        user.department_id || user.departmentId || 1,
        user.role || 'USER',
        user.phone || null,
      ]
    );

    return this.findById(user.id);
  },

  async save(user) {
    const id = user.id || `usr-${Date.now()}`;
    await execute(
      `
      INSERT INTO users (id, staff_code, email, full_name, department_id, role, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        staff_code = VALUES(staff_code),
        full_name = VALUES(full_name),
        department_id = VALUES(department_id),
        role = VALUES(role),
        phone = VALUES(phone)
      `,
      [
        id,
        user.staff_code || user.staffCode || null,
        user.email,
        user.full_name || user.name || 'Cán bộ CTUMP',
        user.department_id || user.departmentId || 1,
        user.role || 'USER',
        user.phone || null,
      ]
    );

    return this.findById(id);
  },
};
