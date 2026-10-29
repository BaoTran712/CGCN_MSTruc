import { query, isDbConnected } from '../utils/db.js';
import { TemplateModel } from '../models/templateModel.js';
import { mockStore } from '../utils/mockStore.js';

export const templateRepository = {
  // Lấy tất cả biểu mẫu đang hoạt động
  async findAll() {
    if (!isDbConnected()) {
      return mockStore.templates.map((t) => TemplateModel.fromRow(t).toObject());
    }

    try {
      const rows = await query(`
        SELECT * FROM document_templates 
        WHERE is_active = 1
        ORDER BY code ASC
      `);

      if (!rows || rows.length === 0) {
        return mockStore.templates.map((t) => TemplateModel.fromRow(t).toObject());
      }
      return rows.map((r) => TemplateModel.fromRow(r).toObject());
    } catch {
      return mockStore.templates.map((t) => TemplateModel.fromRow(t).toObject());
    }
  },

  // Lấy biểu mẫu theo ID hoặc Mã
  async findById(id) {
    if (!isDbConnected()) {
      const match = mockStore.templates.find((t) => t.id === id || t.code === id);
      return match ? TemplateModel.fromRow(match).toObject() : null;
    }

    try {
      const rows = await query(`
        SELECT * FROM document_templates 
        WHERE id = ? OR code = ?
        LIMIT 1
      `, [id, id]);

      if (!rows || rows.length === 0) {
        const match = mockStore.templates.find((t) => t.id === id || t.code === id);
        return match ? TemplateModel.fromRow(match).toObject() : null;
      }
      return TemplateModel.fromRow(rows[0]).toObject();
    } catch {
      const match = mockStore.templates.find((t) => t.id === id || t.code === id);
      return match ? TemplateModel.fromRow(match).toObject() : null;
    }
  },

  // Lưu hoặc cập nhật biểu mẫu
  async save(tmpl) {
    const id = tmpl.id || `tmpl_${Date.now()}`;
    if (!isDbConnected()) {
      const idx = mockStore.templates.findIndex((t) => t.id === id || t.code === tmpl.code);
      if (idx !== -1) {
        mockStore.templates[idx] = { ...mockStore.templates[idx], ...tmpl };
        return TemplateModel.fromRow(mockStore.templates[idx]).toObject();
      }
      mockStore.templates.push({ ...tmpl, id });
      return TemplateModel.fromRow({ ...tmpl, id }).toObject();
    }

    const fieldsConfig = typeof tmpl.fields === 'object' ? JSON.stringify(tmpl.fields) : (tmpl.fields_config || null);
    try {
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
    } catch {
      const idx = mockStore.templates.findIndex((t) => t.id === id || t.code === tmpl.code);
      if (idx !== -1) {
        mockStore.templates[idx] = { ...mockStore.templates[idx], ...tmpl };
        return TemplateModel.fromRow(mockStore.templates[idx]).toObject();
      }
      mockStore.templates.push({ ...tmpl, id });
      return TemplateModel.fromRow({ ...tmpl, id }).toObject();
    }
  },
};
