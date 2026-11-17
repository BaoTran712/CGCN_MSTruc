import { randomUUID } from 'node:crypto';
import { afterCommit, execute, query, withDossierLock } from '../utils/db.js';
import { sendWorkflowEmail } from '../utils/mailer.js';
import { config } from '../utils/config.js';
import path from 'node:path';
import { resolveUploadAbsolutePath } from '../utils/cleanupGarbageData.js';
import { getSmtpReadiness } from '../utils/smtpConfig.js';

let wakeWorker;

export async function enqueueEmail({dossierId,recipientEmail,recipientName,subject,content,stepName,attachments=[]}) {
  const id='em-'+randomUUID();
  const portableAttachments=attachments.map(attachment=>{
    const absolute=resolveUploadAbsolutePath(attachment.path);
    return absolute?{...attachment,path:'/uploads/'+path.relative(config.uploadDir,absolute).split(path.sep).join('/')} : attachment;
  });
  await execute("INSERT INTO email_notifications (id,dossier_id,recipient_email,recipient_name,subject,content,step_name,status,sent_at,attachments,next_attempt_at) VALUES (?,?,?,?,?,?,?,'PENDING',NULL,?,UTC_TIMESTAMP())",
    [id,dossierId||null,recipientEmail,recipientName||recipientEmail,subject,content,stepName||'Thông báo hệ thống',JSON.stringify(portableAttachments)]);
  // Wake the durable outbox after commit; never await SMTP in an HTTP request.
  await afterCommit(()=>{ wakeWorker?.(); });
  const [stored]=await query('SELECT status,sent_at,attempts,last_error FROM email_notifications WHERE id=?',[id]);
  return {id,dossierId,recipientEmail,recipientName,subject,content,stepName,status:stored.status,sentAt:stored.sent_at,attempts:stored.attempts,last_error:stored.last_error};
}
export async function deliverEmail(id) {
  if(!getSmtpReadiness(config.smtp,config.mailDisabled).ready)return;
  return withDossierLock('mail:'+id,async()=>{
    const [email]=await query("SELECT * FROM email_notifications WHERE id=? AND status='PENDING' AND (next_attempt_at IS NULL OR next_attempt_at<=UTC_TIMESTAMP()) FOR UPDATE",[id]);
    if(!email)return;
    let result;
    try {
      const attachments=typeof email.attachments==='string'?JSON.parse(email.attachments):email.attachments||[];
      if(!Array.isArray(attachments))throw new Error('Invalid attachment data');
      result=await sendWorkflowEmail({to:email.recipient_email,subject:email.subject,html:email.content,attachments});
    } catch {
      result={success:false,error:'Dữ liệu tệp đính kèm email không hợp lệ.'};
    }
    if(result.success)await execute("UPDATE email_notifications SET status='SENT',sent_at=UTC_TIMESTAMP(),last_error=NULL,attempts=attempts+1 WHERE id=?",[id]);
    else {
      const attempts=Number(email.attempts)+1;
      await execute('UPDATE email_notifications SET status=?,attempts=?,last_error=?,next_attempt_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND) WHERE id=?',
        [attempts>=5?'FAILED':'PENDING',attempts,result.error||'Không gửi được email',Math.min(3600,60*2**attempts),id]);
    }
  });
}
export function startMailWorker() {
  let active=null, scheduled=null, stopped=false, requested=false;
  const tick=async()=>{
    if(stopped||!getSmtpReadiness(config.smtp,config.mailDisabled).ready)return;
    if(active){requested=true;return;}
    requested=false;
    active=(async()=>{
      try{
        const pending=await query("SELECT id FROM email_notifications WHERE status='PENDING' AND (next_attempt_at IS NULL OR next_attempt_at<=UTC_TIMESTAMP()) ORDER BY next_attempt_at,id LIMIT 20");
        for(const email of pending){
          if(stopped)break;
          try{await deliverEmail(email.id);}catch(error){console.error('[MailQueue]',email.id,error.message);}
        }
      }catch(error){console.error('[MailQueue]',error.message);}
    })();
    try{await active;}finally{active=null;if(requested&&!stopped)wake();}
  };
  const wake=()=>{
    if(stopped)return;
    requested=true;
    if(!scheduled)scheduled=setImmediate(()=>{scheduled=null;void tick();});
  };
  if(wakeWorker)throw new Error('Mail worker đã chạy trong tiến trình này.');
  wakeWorker=wake;
  const timer=setInterval(wake,30000);
  timer.unref();
  wake();
  return async()=>{
    stopped=true;
    clearInterval(timer);
    if(scheduled)clearImmediate(scheduled);
    if(wakeWorker===wake)wakeWorker=null;
    await active;
  };
}
