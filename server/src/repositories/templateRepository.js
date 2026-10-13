import { query } from '../utils/db.js';
import { TemplateModel } from '../models/templateModel.js';

export const templateRepository = {
  // Lấy tất cả biểu mẫu đang hoạt động
  async findAll() {
    const rows = await query(`
      SELECT * FROM document_templates 
      WHERE is_active = 1
      ORDER BY code ASC
    `);

    return rows.map((r) => TemplateModel.fromRow(r).toObject());
  },

  // Lấy biểu mẫu theo ID hoặc Mã
  async findById(id) {
    const rows = await query(`
      SELECT * FROM document_templates 
      WHERE id = ? OR code = ?
      LIMIT 1
    `, [id, id]);

    if (!rows || rows.length === 0) return null;
    return TemplateModel.fromRow(rows[0]).toObject();
  },

  // Lưu hoặc cập nhật biểu mẫu
  async save(tmpl) {
    const id = tmpl.id || `tmpl_${Date.now()}`;
    const fieldsConfig = typeof tmpl.fields === 'object' ? JSON.stringify(tmpl.fields) : (tmpl.fields_config || null);
    await query(`
      INSERT INTO document_templates (id, code, title, category, description, version, file_name, fields_config, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        description = VALUES(description),
        version = VALUES(version),
        file_name = VALUES(file_name),
        fields_config = VALUES(fields_config),
        is_active = VALUES(is_active)
    `, [
      id,
      tmpl.code || id,
      tmpl.title || 'Biểu mẫu',
      tmpl.category || 'Khoa học Công nghệ',
      tmpl.description || '',
      tmpl.version || '1.0',
      tmpl.fileName || tmpl.file_name || 'template.docx',
      fieldsConfig,
      tmpl.active !== undefined ? (tmpl.active ? 1 : 0) : 1,
    ]);

    return this.findById(id);
  },
};
