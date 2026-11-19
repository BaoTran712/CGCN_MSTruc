import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Render the actual UI with in-memory fixtures. Download actions are not run.
const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},ssr:{noExternal:['file-saver']},appType:'custom',plugins:[{
  name:'signed-ui-download-stub',enforce:'pre',
  resolveId(id){if(id==='file-saver')return '\0signed-ui-download';},
  load(id){if(id==='\0signed-ui-download')return 'export function saveAs(){throw new Error("Downloads are outside this render test")} export default saveAs;';},
}]});
try{
  const {DossierDetailView}=await vite.ssrLoadModule('/src/pages/DossierDetailView.tsx');
  const {OFFICIAL_TEMPLATES}=await vite.ssrLoadModule('/src/constants/index.ts');
  const files=[{name:'signed-1a.pdf',url:'/uploads/signed/fixture1a.pdf',form:'1a',type:'DEPARTMENT_SIGNED_PDF'},{name:'signed-2a.pdf',url:'/uploads/signed/fixture2a.pdf',form:'2a',type:'DEPARTMENT_SIGNED_PDF'},{name:'proof.png',url:'/uploads/evidence/proof.png',type:'EVIDENCE'}];
  const submitted={id:'submit-1',type:'SIGNED_UPLOAD_SUBMITTED',step:4,status:'PENDING_SIGNED_REVIEW',title:'Đã nộp bản ký',timestamp:'2026-11-19T01:00:00Z',files};
  const returned={id:'return-1',type:'SIGNED_UPLOAD_RETURNED',step:4,status:'VALIDATED',title:'Yêu cầu tải lại bản ký/minh chứng',note:'Ảnh minh chứng chưa rõ',timestamp:'2026-11-19T01:10:00Z',files};
  const base={id:'ui-fixture',code:'CGCN-2026-9000',title:'Kiểm thử giao diện',templateId:'tmpl-cgcn-1a',current_version:1,status_1a:'APPROVED',status_2a:'APPROVED',formData:{},formData1a:{},formData2a:{},createdBy:{id:'ui-user',name:'Người nộp',email:'ui@local.invalid'},department_signed_files:files,evidence_files:files.filter(file=>file.type==='EVIDENCE')};
  const render=(role,status,timeline)=>renderToStaticMarkup(React.createElement(DossierDetailView,{dossier:{...base,status,timeline_logs:timeline},template:OFFICIAL_TEMPLATES[0],currentUser:{id:role==='ADMIN'?'ui-admin':'ui-user',name:role,email:'ui@local.invalid',role},onBack:()=>{},onEditDossier:()=>{}}));
  const admin=render('ADMIN','PENDING_SIGNED_REVIEW',[submitted]);
  assert.ok(admin.includes('Yêu cầu tải lại bản ký/minh chứng'));assert.ok(admin.includes('Chuyển sang Chờ ký Hiệu trưởng'));
  console.log('PASS admin pending-review screen exposes the return-upload action');
  const waiting=render('USER','PENDING_SIGNED_REVIEW',[submitted]);
  assert.equal((waiting.match(/type="file"/g)||[]).length,0);
  console.log('PASS submitter cannot replace files from the pending-review screen');
  const returnScreen=render('USER','VALIDATED',[submitted,returned]);
  assert.ok(returnScreen.includes('Admin yêu cầu tải lại bản ký/minh chứng'));assert.ok(returnScreen.includes('Ảnh minh chứng chưa rõ'));
  assert.ok(returnScreen.includes('Bản PDF đã ký Mẫu 1a'));assert.ok(returnScreen.includes('Bản PDF đã ký Mẫu 2a'));
  assert.equal((returnScreen.match(/type="file"/g)||[]).length,3);
  assert.ok(returnScreen.includes('Lịch sử nộp và trả lại'));assert.ok(returnScreen.includes('signed-1a.pdf'));
  console.log('PASS returned packet shows reason, separate PDF selectors, evidence and old file history');
  const next=render('USER','PENDING_SIGNED_REVIEW',[submitted,returned,{...submitted,id:'submit-2',timestamp:'2026-11-19T01:20:00Z'}]);
  assert.equal(next.includes('Admin yêu cầu tải lại bản ký/minh chứng'),false);assert.ok(next.includes('Ảnh minh chứng chưa rõ'));
  console.log('PASS resubmission closes upload controls and keeps the prior return reason in history');
}finally{await vite.close();}
