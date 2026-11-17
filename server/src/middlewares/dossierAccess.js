import { dossierRepository } from '../repositories/dossierRepository.js';
import { ApiResponse } from '../dtos/apiResponse.js';

export function ownsDossier(user, dossier) {
  return String(dossier.user_id || dossier.createdBy?.id) === String(user.id) ||
    String(dossier.applicant_email || dossier.createdBy?.email || '').toLowerCase() === String(user.email).toLowerCase();
}
export async function requireDossierAccess(req, res, next, id) {
  try {
    const dossier = await dossierRepository.findById(id);
    if (!dossier) return ApiResponse.error('Không tìm thấy hồ sơ.', 404).send(res);
    if (req.user.role !== 'ADMIN' && !ownsDossier(req.user, dossier)) return ApiResponse.error('Bạn không có quyền truy cập hồ sơ này.', 403).send(res);
    req.dossier = dossier;
    req.params.id = dossier.id;
    next();
  } catch (error) { next(error); }
}
