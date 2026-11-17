import path from 'node:path';
import fs from 'node:fs';
import { query } from '../utils/db.js';
import { resolveUploadAbsolutePath } from '../utils/cleanupGarbageData.js';

const fileColumns = ['generated_docx_path','generated_pdf_path','docx_file_url','to_trinh_docx_url','ke_hoach_docx_url','approved_pdf_path','precheck_pdf_url','faculty_signed_pdf_url','final_signed_pdf_path','final_pdf_url'];
export async function canAccessUpload(user, url) {
  if (!user || typeof url !== 'string' || !/^\/uploads\/(docx|pdf|signed|evidence)\/[^/\\]+$/.test(url)) return false;
  if (user.role === 'ADMIN') return true;
  const [row] = await query(
    'SELECT d.* FROM dossiers d WHERE (d.user_id=? OR LOWER(d.applicant_email)=LOWER(?)) AND (' +
    fileColumns.map(column => 'd.' + column + '=?').join(' OR ') +
    " OR JSON_SEARCH(d.evidence_files,'one',?,NULL,'$[*].url') IS NOT NULL" +
    " OR JSON_SEARCH(d.department_signed_files,'one',?,NULL,'$[*].url') IS NOT NULL" +
    ' OR EXISTS(SELECT 1 FROM attachments a WHERE a.dossier_id=d.id AND a.file_url=?)' +
    ' OR EXISTS(SELECT 1 FROM dossier_versions v WHERE v.dossier_id=d.id AND (v.generated_docx_path=? OR v.generated_pdf_path=?))) LIMIT 1',
    [user.id,user.email,...fileColumns.map(() => url),url,url,url,url,url]
  );
  if (row) return true;
  const owned = await query('SELECT code FROM dossiers WHERE user_id=? OR LOWER(applicant_email)=LOWER(?)',[user.id,user.email]);
  const filename=path.posix.basename(url);
  return owned.some(dossier => {
    const code=String(dossier.code);
    if(!/^[A-Za-z0-9_-]+$/.test(code))return false;
    return new RegExp('^'+code+'(?:-(?:1a|2a|signed))?-v[0-9]+\\.(pdf|docx)$').test(filename);
  });
}
export async function requireFileAccess(req,res,next) {
  try {
    const url='/uploads'+decodeURIComponent(req.path);
    if (!(await canAccessUpload(req.user,url))) return res.status(403).json({success:false,message:'Bạn không có quyền truy cập tệp này.'});
    const file=resolveUploadAbsolutePath(url);
    if(!file || !fs.existsSync(file) || !fs.statSync(file).isFile())return res.status(404).json({success:false,message:'Không tìm thấy tệp trên máy chủ. Cần phục hồi đúng file gốc từ bản sao lưu hoặc tải lại file.'});
    next();
  } catch(error){
    if(error instanceof URIError)return res.status(400).json({success:false,message:'Đường dẫn tệp không hợp lệ.'});
    next(error);
  }
}
