import fs from 'node:fs';
import path from 'node:path';
import { query } from './db.js';
import { config } from './config.js';

export function resolveUploadAbsolutePath(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized=value.replaceAll('\\','/');
  const relative=normalized.startsWith('/uploads/')?normalized.slice(9):normalized.startsWith('server/uploads/')?normalized.slice(15):normalized;
  const candidate=path.resolve(config.uploadDir,relative);
  const within=path.relative(config.uploadDir,candidate);
  if (within.startsWith('..') || path.isAbsolute(within)) return null;
  return candidate;
}
export function deletePhysicalFile(value) {
  const file=resolveUploadAbsolutePath(value);
  if(file && fs.existsSync(file)){fs.unlinkSync(file);return true;}
  return false;
}
export async function cleanupGarbageData({apply=false,minAgeMs=24*60*60*1000}={}) {
  const dossiers=await query('SELECT * FROM dossiers');
  const versions=await query('SELECT generated_docx_path,generated_pdf_path FROM dossier_versions');
  const attachments=await query('SELECT file_path,file_url FROM attachments');
  const referenced=new Set();
  const add=value=>{
    if(typeof value==='string'){
      if(value.startsWith('/uploads/')||value.startsWith(config.uploadDir)){const file=resolveUploadAbsolutePath(value);if(file)referenced.add(path.normalize(file));}
      else if(value.startsWith('[')||value.startsWith('{')){try{add(JSON.parse(value));}catch{}}
    }else if(Array.isArray(value))value.forEach(add);
    else if(value && typeof value==='object')Object.values(value).forEach(add);
  };
  [...dossiers,...versions,...attachments].forEach(add);
  const orphanFiles=[];
  let removedOrphanFiles=0;
  for(const directory of ['docx','pdf','signed','evidence']){
    const root=path.join(config.uploadDir,directory);
    if(!fs.existsSync(root))continue;
    for(const entry of fs.readdirSync(root,{withFileTypes:true})){
      if(!entry.isFile()||entry.name.startsWith('.'))continue;
      const file=path.join(root,entry.name);
      if(referenced.has(path.normalize(file))||dossiers.some(d=>entry.name.startsWith(d.code+'-')))continue;
      if(Date.now()-fs.statSync(file).mtimeMs<minAgeMs)continue;
      orphanFiles.push('/uploads/'+directory+'/'+entry.name);
      if(apply){fs.unlinkSync(file);removedOrphanFiles++;}
    }
  }
  return {dryRun:!apply,removedDbRecords:0,removedOrphanFiles,removedFilesList:apply?orphanFiles:[],orphanFiles,activeDossierCount:dossiers.length};
}
export default {resolveUploadAbsolutePath,deletePhysicalFile,cleanupGarbageData};
