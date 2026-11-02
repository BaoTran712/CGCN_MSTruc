import { templateService } from '../src/services/templateService.js';

console.log('[Templates] Danh mục biểu mẫu chuẩn (tĩnh) trên hệ thống:');
console.table(
  templateService.getAll().map((t) => ({
    id: t.id,
    code: t.code,
    title: t.title,
    fileName: t.fileName,
  }))
);
