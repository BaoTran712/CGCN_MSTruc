/**
 * Model Entity đại diện cho bảng document_templates trong MySQL
 */
export class TemplateModel {
  constructor({
    id,
    code,
    title,
    category = 'Khoa học Công nghệ',
    description = '',
    version = '1.0',
    fileName = 'template.docx',
    fields = [],
    active = true,
    createdAt = null,
    updatedAt = null,
  }) {
    this.id = id;
    this.code = code;
    this.title = title;
    this.category = category;
    this.description = description;
    this.version = version;
    this.fileName = fileName;
    this.fields = fields;
    this.active = active;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    if (!row) return null;
    let fields = [];
    if (row.fields_config) {
      try {
        fields = typeof row.fields_config === 'string' ? JSON.parse(row.fields_config) : row.fields_config;
      } catch {
        fields = [];
      }
    }

    return new TemplateModel({
      id: row.id,
      code: row.code,
      title: row.title,
      category: row.category,
      description: row.description,
      version: row.version,
      fileName: row.file_name,
      fields,
      active: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toObject() {
    return {
      id: this.id,
      code: this.code,
      title: this.title,
      category: this.category,
      description: this.description,
      version: this.version,
      fileName: this.fileName,
      fields: this.fields,
      active: this.active,
    };
  }
}
