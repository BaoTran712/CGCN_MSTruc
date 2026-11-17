import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { resolveUploadAbsolutePath } from './cleanupGarbageData.js';
import { getSmtpReadiness, smtpTransportOptions, smtpErrorMessage, normalizeSmtpSettings } from './smtpConfig.js';

let transporter;
let transportKey;
function getTransporter() {
  const smtp = normalizeSmtpSettings(config.smtp);
  const key = JSON.stringify([smtp.host, smtp.port, smtp.secure, smtp.user, smtp.pass]);
  if (!transporter || key !== transportKey) {
    transporter?.close();
    transporter = nodemailer.createTransport(smtpTransportOptions(smtp));
    transportKey = key;
  }
  return transporter;
}

export async function verifyWorkflowSmtp() {
  const readiness = getSmtpReadiness(config.smtp, config.mailDisabled);
  if (!readiness.ready) return { success: false, ...readiness };
  try {
    await getTransporter().verify();
    return { success: true, ready: true, code: 'SMTP_VERIFIED', message: 'Kết nối và xác thực SMTP thành công. Chưa gửi email nào trong bước kiểm tra này.' };
  } catch (error) {
    return { success: false, ready: false, code: error.code || 'SMTP_VERIFY_FAILED', message: smtpErrorMessage(error) };
  }
}

export async function sendWorkflowEmail({to,subject,html,text,attachments=[]}) {
  const readiness = getSmtpReadiness(config.smtp, config.mailDisabled);
  if (!readiness.ready) return { success: false, pending: true, code: readiness.code, error: readiness.message };
  try {
    const files=attachments.map(attachment=>{
      const file=resolveUploadAbsolutePath(attachment.path);
      if(!file || !fs.existsSync(file))throw new Error('Không tìm thấy tệp đính kèm: '+(attachment.filename||'PDF'));
      return {filename:attachment.filename||path.basename(file),path:file,contentType:attachment.contentType||'application/pdf'};
    });
    const info=await getTransporter().sendMail({from:config.smtp.from || config.smtp.user,to,subject,html,text:text||html.replace(/<[^>]*>/g,''),attachments:files});
    if(!info.accepted?.length)return {success:false,error:'Máy chủ email không chấp nhận người nhận.'};
    return {success:true,messageId:info.messageId};
  }catch(error){return {success:false,code:error.code || 'SMTP_SEND_FAILED',error:smtpErrorMessage(error)};}
}
