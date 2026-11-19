import type { Application } from '../types';

export function signedUploadEvents(dossier: Application) {
  return (dossier.timeline_logs || dossier.timelineLogs || []).filter(event=>event.type==='SIGNED_UPLOAD_RETURNED'||event.type==='SIGNED_UPLOAD_SUBMITTED');
}
export function signedUploadReturn(dossier: Application) {
  const latest=signedUploadEvents(dossier).at(-1);
  return dossier.status==='VALIDATED'&&latest?.type==='SIGNED_UPLOAD_RETURNED'?latest:undefined;
}
export function currentSignedPacket(dossier: Application) {
  const files=dossier.department_signed_files||dossier.departmentSignedFiles||[];
  return {signed1a:files.find(file=>file.form==='1a'),signed2a:files.find(file=>file.form==='2a'),evidence:(dossier.evidence_files||dossier.evidenceFiles||[]).filter(file=>file.type==='EVIDENCE')};
}
