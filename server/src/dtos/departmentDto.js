/**
 * DTOs cho module Department
 */

export class SaveDepartmentRequestDto {
  constructor({ id, code, name, managerName }) {
    this.id = id;
    this.code = (code || '').trim();
    this.name = (name || '').trim();
    this.managerName = (managerName || '').trim();
  }

  validate() {
    if (!this.name) throw new Error('Tên đơn vị/khoa không được để trống');
  }
}

export class DepartmentResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return {
      id: model.id,
      code: model.code,
      name: model.name,
      managerName: model.managerName,
    };
  }
}
