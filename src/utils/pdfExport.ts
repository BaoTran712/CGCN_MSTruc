import { saveAs } from 'file-saver';
import { Dossier, WordTemplate } from '../types';
import { API_BASE_URL } from '../config/api.config';
import { isMau2aTemplateOrDossier } from './templateUtils';

/**
 * Tải xuống trực tiếp file PDF phiên bản mới nhất được sinh đồng bộ từ dữ liệu Web Form trên Backend.
 * Tuyệt đối không dùng HTML/CSS conversion hay tải nhầm thành file .docx.
 */
export async function generateAndDownloadPdf(
  dossier: Dossier,
  template?: WordTemplate,
  customFileName?: string
): Promise<void> {
  const safeCode = (dossier.code || 'CGCN-2026').replace(/[^a-zA-Z0-9_-]/g, '_');
  const ver = dossier.current_version || dossier.currentVersion || 1;
  const fileName = customFileName || `${safeCode}_v${ver}.pdf`;

  const isMau2a = isMau2aTemplateOrDossier(dossier, template);

  const effectiveTitle = isMau2a
    ? (dossier.formData?.product_name
        ? `Kế hoạch tổ chức chuyển giao công nghệ: “${dossier.formData.product_name}”`
        : 'Kế hoạch tổ chức chuyển giao công nghệ trong trường')
    : (dossier.title || template?.title || 'Tờ trình về việc chuyển giao tri thức từ kết quả đề tài nghiên cứu');

  const effectiveCode = isMau2a ? 'Mẫu 2a-KH.CGCN' : 'Mẫu 1a-TT.CGCN';

  try {
    // 1. Gọi Backend API lấy bản PDF chuẩn khớp 100% với dữ liệu formData mới nhất
    const response = await fetch(`${API_BASE_URL}/applications/${encodeURIComponent(dossier.id)}/export-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: dossier.code,
        version: ver,
        formData: dossier.formData || dossier.form_data || {},
        templateTitle: effectiveTitle,
        templateCode: effectiveCode,
        templateId: isMau2a ? 'tmpl-cgcn-2a' : 'tmpl-cgcn-1a',
      }),
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
        const blob = await response.blob();
        saveAs(new Blob([blob], { type: 'application/pdf' }), fileName);
        return;
      }
    }
  } catch (err) {
    console.warn('[pdfExport] Lỗi khi gọi POST export-pdf, thử tải từ đường dẫn file đã lưu:', err);
  }

  // 2. Tải trực tiếp từ đường dẫn file PDF đã sinh trên server (generated_pdf_path / approved_pdf_path / final_signed_pdf_path)
  const existingUrl =
    dossier.final_signed_pdf_path ||
    dossier.final_pdf_url ||
    dossier.approved_pdf_path ||
    dossier.generated_pdf_path ||
    dossier.precheck_pdf_url;

  if (existingUrl && existingUrl.endsWith('.pdf')) {
    const fullUrl = existingUrl.startsWith('http')
      ? existingUrl
      : `${API_BASE_URL.replace(/\/api$/, '')}${existingUrl}`;
    const res = await fetch(fullUrl);
    if (res.ok) {
      const blob = await res.blob();
      saveAs(new Blob([blob], { type: 'application/pdf' }), fileName);
      return;
    }
  }

  throw new Error('Không thể tải file PDF. Vui lòng đảm bảo máy chủ Backend đang hoạt động.');
}
