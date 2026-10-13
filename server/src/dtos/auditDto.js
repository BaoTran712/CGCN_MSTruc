/**
 * DTOs cho module Audit
 */

export class AuditResponseDto {
  static fromModel(model) {
    if (!model) return null;
    return model.toObject ? model.toObject() : model;
  }
}
