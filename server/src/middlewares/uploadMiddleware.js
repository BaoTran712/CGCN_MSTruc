import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { config } from '../utils/config.js';

for (const name of ['pdf','signed','evidence','docx']) fs.mkdirSync(path.join(config.uploadDir,name),{recursive:true});
const mimeExtensions = {
  'application/pdf':['.pdf'], 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/webp':['.webp'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'],
};
function uploader(final=false) {
  return multer({
    storage:multer.diskStorage({
      destination:(_req,file,callback)=>callback(null,path.join(config.uploadDir,final?'pdf':file.mimetype==='application/pdf'?'signed':'evidence')),
      filename:(_req,file,callback)=>callback(null,randomUUID()+path.extname(file.originalname).toLowerCase()),
    }),
    limits:{fileSize:25*1024*1024,files:10,fields:20,fieldSize:1024*1024},
    fileFilter:(_req,file,callback)=>{
      const valid=mimeExtensions[file.mimetype]?.includes(path.extname(file.originalname).toLowerCase()) && (!final || file.mimetype==='application/pdf');
      const error = valid ? null : Object.assign(new Error('Định dạng tệp không hợp lệ.'),{status:400});
      callback(error,Boolean(valid));
    }
  });
}
export const uploadSignedAndEvidence=uploader();
export const uploadMulti=uploadSignedAndEvidence;
export const uploadFinalSignedPdf=uploader(true);
export function verifyUploadedFiles(req,_res,next) {
  const files=req.file?[req.file]:req.files||[];
  try {
    for(const file of files){
      const descriptor=fs.openSync(file.path,'r');
      const buffer=Buffer.alloc(12);
      try{fs.readSync(descriptor,buffer,0,12,0);}finally{fs.closeSync(descriptor);}
      const valid=file.mimetype==='application/pdf'?buffer.subarray(0,5).toString()==='%PDF-':
        file.mimetype==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
        file.mimetype==='image/jpeg'?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:
        file.mimetype==='image/webp'?buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP':
        buffer[0]===80&&buffer[1]===75;
      if(!valid)throw new Error('Nội dung tệp không khớp định dạng khai báo.');
    }
    next();
  }catch(error){for(const file of files)fs.rmSync(file.path,{force:true});error.status=400;next(error);}
}
