import { WordTemplate } from '../types';
import { CGCN_1A_TEMPLATE } from './templates/cgcn-1a.template';
import { CGCN_2A_TEMPLATE } from './templates/cgcn-2a.template';

/**
 * Danh mục Biểu mẫu Chuyển giao Công nghệ (CGCN) chuẩn của Trường ĐH Y Dược Cần Thơ.
 * Toàn bộ biểu mẫu dựa trên các văn bản Word gốc tại docs/templates/
 */
export const INITIAL_TEMPLATES: WordTemplate[] = [
  CGCN_1A_TEMPLATE,
  CGCN_2A_TEMPLATE,
];

export { CGCN_1A_TEMPLATE, CGCN_2A_TEMPLATE };
