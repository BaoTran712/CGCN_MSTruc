// The same transitions already declared in src/services/workflowEngine.ts.
export const transitions = {
  DRAFT: {SUBMITTED:['USER','ADMIN']},
  SUBMITTED: {VALIDATED:['ADMIN'],RETURNED_FOR_REVISION:['ADMIN']},
  RETURNED_FOR_REVISION: {SUBMITTED:['USER','ADMIN']},
  VALIDATED: {PENDING_SIGNED_REVIEW:['USER','ADMIN'],RETURNED_FOR_REVISION:['ADMIN']},
  PENDING_SIGNED_REVIEW: {WAITING_RECTOR_SIGNATURE:['ADMIN'],SIGNED_ARCHIVED:['ADMIN'],VALIDATED:['ADMIN'],RETURNED_FOR_REVISION:['ADMIN']},
  WAITING_RECTOR_SIGNATURE: {SIGNED_ARCHIVED:['ADMIN'],PENDING_SIGNED_REVIEW:['ADMIN'],RETURNED_FOR_REVISION:['ADMIN']},
  SIGNED_ARCHIVED: {},CANCELLED: {},
};
export function assertWorkflowTransition(from,to,role) {
  const valid=transitions[from]?.[to]?.includes(String(role).toUpperCase());
  if (!valid) {
    const error=new Error('Thao tác không phù hợp với trạng thái hiện tại của hồ sơ.');
    error.statusCode=409;
    throw error;
  }
}
