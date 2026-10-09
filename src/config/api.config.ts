/**
 * Centralized API & Webhook Configuration for n8n Backend
 *
 * All external n8n workflows and Carbone document generation webhooks
 * connect through this configuration.
 */

// TODO: Replace this with your actual n8n webhook instance URL (e.g., "https://n8n.your-agency.gov.vn/webhook")
export const API_BASE_URL: string = "YOUR_N8N_WEBHOOK_BASE_URL";

/**
 * Endpoint definitions for the 15 standard n8n workflow routes.
 * You can customize these paths to match your specific n8n webhook nodes or router paths.
 */
export const API_ENDPOINTS = {
  // 1. Get document templates (GET)
  // TODO: Configure n8n Webhook node for listing templates: [GET] /api/templates
  GET_TEMPLATES: `${API_BASE_URL}/api/templates`,

  // 2. Get template details (GET)
  // TODO: Configure n8n Webhook node for template detail: [GET] /api/templates/:id
  GET_TEMPLATE_DETAIL: (id: string) => `${API_BASE_URL}/api/templates/${id}`,

  // 3. Create a new application (POST)
  // TODO: Configure n8n Webhook node for creating application: [POST] /api/applications
  CREATE_APPLICATION: `${API_BASE_URL}/api/applications`,

  // 4. Save application draft (PUT)
  // TODO: Configure n8n Webhook node for updating draft: [PUT] /api/applications/:id
  SAVE_DRAFT: (id: string) => `${API_BASE_URL}/api/applications/${id}`,

  // 5. Submit application (POST)
  // TODO: Configure n8n Webhook node for application submission: [POST] /api/applications/:id/submit
  SUBMIT_APPLICATION: (id: string) => `${API_BASE_URL}/api/applications/${id}/submit`,

  // 6. Get user's applications (GET)
  // TODO: Configure n8n Webhook node for my applications list: [GET] /api/applications/my
  GET_MY_APPLICATIONS: `${API_BASE_URL}/api/applications/my`,

  // 7. Get applications waiting for manager approval (GET)
  // TODO: Configure n8n Webhook node for pending manager review: [GET] /api/applications/pending
  GET_PENDING_APPLICATIONS: `${API_BASE_URL}/api/applications/pending`,

  // 8. Get application details (GET)
  // TODO: Configure n8n Webhook node for application detail: [GET] /api/applications/:id
  GET_APPLICATION_DETAIL: (id: string) => `${API_BASE_URL}/api/applications/${id}`,

  // 9. Request application revision (POST)
  // TODO: Configure n8n Webhook node for revision request: [POST] /api/applications/:id/request-revision
  REQUEST_REVISION: (id: string) => `${API_BASE_URL}/api/applications/${id}/request-revision`,

  // 10. Approve application (POST)
  // TODO: Configure n8n Webhook node for approval: [POST] /api/applications/:id/approve
  APPROVE_APPLICATION: (id: string) => `${API_BASE_URL}/api/applications/${id}/approve`,

  // 11. Move application to signing (POST)
  // TODO: Configure n8n Webhook node for moving to signing: [POST] /api/applications/:id/signing
  MOVE_TO_SIGNING: (id: string) => `${API_BASE_URL}/api/applications/${id}/signing`,

  // 12. Generate document (POST)
  // TODO: Configure n8n Webhook node triggering Carbone rendering: [POST] /api/applications/:id/generate-document
  GENERATE_DOCUMENT: (id: string) => `${API_BASE_URL}/api/applications/${id}/generate-document`,

  // 13. Get generated document (GET)
  // TODO: Configure n8n Webhook node for retrieving generated docx/pdf: [GET] /api/applications/:id/document
  GET_DOCUMENT: (id: string) => `${API_BASE_URL}/api/applications/${id}/document`,

  // 14. Get processing history (GET)
  // TODO: Configure n8n Webhook node for timeline history: [GET] /api/applications/:id/history
  GET_HISTORY: (id: string) => `${API_BASE_URL}/api/applications/${id}/history`,

  // 15. Send application data to Google Sheets (POST)
  // TODO: Configure n8n Webhook node triggering Google Sheets node append: [POST] /api/applications/:id/sync-sheet
  SYNC_GOOGLE_SHEET: (id: string) => `${API_BASE_URL}/api/applications/${id}/sync-sheet`,
};

/**
 * Timeout configuration (milliseconds) for n8n webhook calls before falling back to mock
 */
export const API_TIMEOUT_MS = 3000;

/**
 * Check whether we are currently operating in mock fallback mode
 */
export const isMockMode = (): boolean => {
  return (
    !API_BASE_URL ||
    API_BASE_URL === "YOUR_N8N_WEBHOOK_BASE_URL" ||
    API_BASE_URL.includes("YOUR_N8N_")
  );
};
