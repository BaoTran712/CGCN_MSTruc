import { DocumentTemplate, Application } from '../types';
import { OFFICIAL_TEMPLATES } from '../constants/templates';

/**
 * Kiểm tra xem hồ sơ hoặc biểu mẫu có phải là Mẫu 2a (Kế hoạch CGCN) hay không.
 * Phân biệt tuyệt đối giữa Mẫu 1a (Tờ trình) và Mẫu 2a (Kế hoạch).
 */
export function isMau2aTemplateOrDossier(
  dossierOrPayload?: Partial<Application> | Record<string, any> | null,
  template?: Partial<DocumentTemplate> | null
): boolean {
  // 1. Kiểm tra trực tiếp template được truyền vào
  if (template) {
    const tId = String(template.id || '').toLowerCase();
    const tCode = String(template.code || '').toLowerCase();
    const tFile = String(template.fileName || '').toLowerCase();
    if (tId === 'tmpl-cgcn-2a' || tCode.includes('2a') || tFile.includes('2a')) return true;
    if (tId === 'tmpl-cgcn-1a' || tCode.includes('1a') || tFile.includes('1a')) return false;
  }

  // 2. Kiểm tra templateId / templateCode trong hồ sơ
  const dTemplateId = String(
    dossierOrPayload?.templateId || (dossierOrPayload as any)?.template_id || ''
  ).toLowerCase();
  const dTemplateCode = String(
    dossierOrPayload?.templateCode || (dossierOrPayload as any)?.template_code || ''
  ).toLowerCase();

  if (dTemplateId === 'tmpl-cgcn-2a' || dTemplateCode.includes('2a')) return true;
  if (dTemplateId === 'tmpl-cgcn-1a' || dTemplateCode.includes('1a')) return false;

  // 3. Kiểm tra các trường dữ liệu đặc thù của Mẫu 2a vs Mẫu 1a trong formData
  const form =
    (dossierOrPayload as any)?.formData ||
    (dossierOrPayload as any)?.form_data ||
    {};

  if (form.plan_code && !form.proposal_number) return true;
  if (form.proposal_number && !form.plan_code) return false;
  if (form.product_name && !form.receiver_needs) return true;
  if (form.receiver_needs && !form.product_name) return false;

  // 4. Kiểm tra tiêu đề hồ sơ
  const title = String(
    dossierOrPayload?.templateTitle ||
      (dossierOrPayload as any)?.template_title ||
      dossierOrPayload?.title ||
      ''
  ).toLowerCase();

  if (title.includes('kế hoạch') || title.includes('ke hoach') || title.includes('2a-kh')) return true;
  if (title.includes('tờ trình') || title.includes('to trinh') || title.includes('1a-tt')) return false;

  return false;
}

/**
 * Lấy DocumentTemplate chuẩn từ danh mục chính thức tương ứng với hồ sơ.
 */
export function getEffectiveTemplate(
  dossierOrPayload?: Partial<Application> | Record<string, any> | null,
  passedTemplate?: Partial<DocumentTemplate> | null
): DocumentTemplate {
  const is2a = isMau2aTemplateOrDossier(dossierOrPayload, passedTemplate);

  if (passedTemplate && passedTemplate.id) {
    if (is2a && (passedTemplate.id === 'tmpl-cgcn-2a' || String(passedTemplate.code || '').includes('2a'))) {
      const official = OFFICIAL_TEMPLATES.find((t) => t.id === 'tmpl-cgcn-2a');
      return { ...official, ...passedTemplate } as DocumentTemplate;
    }
    if (!is2a && (passedTemplate.id === 'tmpl-cgcn-1a' || String(passedTemplate.code || '').includes('1a'))) {
      const official = OFFICIAL_TEMPLATES.find((t) => t.id === 'tmpl-cgcn-1a');
      return { ...official, ...passedTemplate } as DocumentTemplate;
    }
  }

  const targetId = is2a ? 'tmpl-cgcn-2a' : 'tmpl-cgcn-1a';
  return OFFICIAL_TEMPLATES.find((t) => t.id === targetId) || OFFICIAL_TEMPLATES[0];
}

