import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { query, execute } from '../utils/db.js';
import { resolveUploadAbsolutePath } from '../utils/cleanupGarbageData.js';

export const uploadError=(message,statusCode=400)=>Object.assign(new Error(message),{statusCode});
export function currentUploadFiles(dossier) {
  const files=[...(dossier.department_signed_files||[]),...(dossier.evidence_files||[])];
  if(dossier.faculty_signed_pdf_url&&!files.some(file=>file.url===dossier.faculty_signed_pdf_url))files.push({name:'Bản ký đã nộp',url:dossier.faculty_signed_pdf_url,type:'DEPARTMENT_SIGNED_PDF'});
  return [...new Map(files.filter(file=>file?.url).map(file=>[file.url,file])).values()];
}

export function validateSignedUpload(packet,dossier) {
  if(!packet?.signed1a||!packet?.signed2a)throw uploadError('Vui lòng chọn đủ hai bản PDF đã ký: Mẫu 1a và Mẫu 2a.');
  if(!Array.isArray(packet.evidenceFiles)||packet.evidenceFiles.length>8)throw uploadError('Chỉ được gửi tối đa 8 tệp minh chứng.');
  const existing=currentUploadFiles(dossier);
  const normalize=(selection,form)=>{
    if(!selection||typeof selection.url!=='string')throw uploadError('Thông tin tệp không hợp lệ.');
    let file=selection;
    if(!selection.fresh){
      file=existing.find(item=>item.url===selection.url&&(form?item.form===form&&item.type==='DEPARTMENT_SIGNED_PDF':item.type==='EVIDENCE'));
      if(!file)throw uploadError('Tệp giữ lại không thuộc đúng biểu mẫu hoặc lượt nộp hiện tại của hồ sơ.');
    }
    const absolute=resolveUploadAbsolutePath(file.url);
    if(!absolute||!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())throw uploadError('Không tìm thấy tệp. Vui lòng chọn và tải lại file gốc.');
    let sha256;
    if(!form&&selection.fresh&&!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.mimeType))throw uploadError('Minh chứng phải là ảnh hoặc tệp PDF.');
    if(form){
      const bytes=fs.readFileSync(absolute);
      if(!file.name?.toLowerCase().endsWith('.pdf')||bytes.subarray(0,5).toString()!=='%PDF-')throw uploadError('Bản ký Mẫu '+form+' phải là tệp PDF.');
      sha256=createHash('sha256').update(bytes).digest('hex');
    }
    return {name:String(file.name||'Tệp đính kèm').slice(0,255),url:file.url,size:file.size||'',mimeType:form?'application/pdf':file.mimeType||'',type:form?'DEPARTMENT_SIGNED_PDF':'EVIDENCE',...(form?{form,sha256}:{}),uploadedAt:file.uploadedAt||new Date().toISOString()};
  };
  const signed=[normalize(packet.signed1a,'1a'),normalize(packet.signed2a,'2a')];
  if(signed[0].sha256===signed[1].sha256)throw uploadError('Hai bản ký Mẫu 1a và Mẫu 2a phải là hai tệp khác nhau.');
  const evidence=packet.evidenceFiles.map(file=>normalize(file));
  const files=[...signed,...evidence];
  if(new Set(files.map(file=>file.url)).size!==files.length)throw uploadError('Một tệp không được dùng đồng thời cho nhiều vị trí trong bộ hồ sơ.');
  return {signed,evidence,files};
}

export function validateCurrentSignedUpload(dossier) {
  const files=currentUploadFiles(dossier);
  return validateSignedUpload({signed1a:files.find(file=>file.form==='1a'),signed2a:files.find(file=>file.form==='2a'),evidenceFiles:(dossier.evidence_files||[]).filter(file=>file.type==='EVIDENCE')},dossier);
}

// References survive replacement of the current packet, so history remains
// downloadable by the owner and is retained by cleanup/backup.
export async function preserveUploadFiles(dossier,files,uploadedBy) {
  for(const file of files){
    const [stored]=await query('SELECT id FROM attachments WHERE dossier_id=? AND file_url=? LIMIT 1',[dossier.id,file.url]);
    if(stored)continue;
    await execute('INSERT INTO attachments (id,dossier_id,file_name,file_path,file_url,file_type,file_size,uploaded_by) VALUES (?,?,?,?,?,?,?,?)',
      ['att-'+randomUUID(),dossier.id,String(file.name||'Tệp đã nộp').slice(0,255),file.url,file.url,file.type==='EVIDENCE'?'EVIDENCE':'FACULTY_SIGNED_PDF',file.size||'',uploadedBy||dossier.user_id]);
  }
}
