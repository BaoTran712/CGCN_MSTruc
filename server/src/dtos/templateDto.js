/**
 * DTOs cho module Template
 */

export class SaveTemplateRequestDto {
  constructor({ id, code, title, category, description, version, fileName, fields, active }) {
    this.id = id;
    this.code = (code || '').trim();
    this.title = (title || '').trim();
    this.category = category || 'Khoa học Công nghệ';
    this.description = description || '';
    this.version = version || '1.0';
    this.fileName = fileName || 'template.docx';
    this.fields = Array.isArray(fields) ? fields : [];
    this.active = active !== undefined ? Boolean(active) : true;
  }

  validate() {
    if (!this.title) throw new Error('Tiêu đề biểu mẫu không được để trống');
  }
}

export class TemplateResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return {
      id: model.id,
      code: model.code,
      title: model.title,
      category: model.category,
      description: model.description,
      version: model.version,
      fileName: model.fileName,
      fields: model.fields,
      active: model.active,
    };
  }
}
