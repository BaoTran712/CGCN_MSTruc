import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './utils/config.js';
import { projectRoot } from './config/env.js';
import { requireAuth } from './middlewares/authMiddleware.js';
import { requireFileAccess } from './middlewares/fileAccess.js';
import apiRoutes from './routes/api.js';
import { configureProxy } from './utils/proxy.js';

export function createApp() {
  const app=express();
  app.disable('x-powered-by');
  configureProxy(app);
  app.use(cors({origin:(origin,callback)=>callback(null,!origin || !config.allowedOrigins.length || config.allowedOrigins.includes(origin))}));
  app.use((req,res,next)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    const local = ['localhost','127.0.0.1','[::1]'].includes(req.hostname);
    res.setHeader('Referrer-Policy',local?'no-referrer-when-downgrade':'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy','same-origin-allow-popups');
    res.setHeader('X-Frame-Options','SAMEORIGIN');
    next();
  });
  app.use(express.json({limit:'50mb'}));
  app.use(express.urlencoded({extended:false,limit:'1mb'}));
  app.use('/api',apiRoutes);
  app.use('/api',(_req,res)=>res.status(404).json({success:false,message:'Không tìm thấy API.'}));
  app.use('/uploads',requireAuth,requireFileAccess,express.static(config.uploadDir,{dotfiles:'deny',fallthrough:false}));
  const dist=path.join(projectRoot,'dist');
  if(config.nodeEnv==='production'){
    if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('Chưa build frontend. Chạy npm run build trước npm start.');
    app.use(express.static(dist,{index:false}));
    app.get('*',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
  }else app.get('/',(_req,res)=>res.json({name:'CTUMP DocuGov Backend Service',status:'Running'}));
  app.use((error,_req,res,_next)=>{
    console.error('[API]',error.code||'',error.message);
    if(res.headersSent)return;
    const status=error.code==='LIMIT_FILE_SIZE'?413:error.code?.startsWith('LIMIT_')?400:
      ['ECONNREFUSED','ETIMEDOUT','PROTOCOL_CONNECTION_LOST','ECONNRESET','SCHEMA_NOT_READY'].includes(error.code)?503:Number(error.status)||500;
    res.status(status).json({success:false,message:status===503?'Cơ sở dữ liệu chưa sẵn sàng. Thao tác chưa được lưu.':config.nodeEnv==='production'&&status===500?'Không thể xử lý yêu cầu. Vui lòng thử lại hoặc liên hệ quản trị viên.':error.message});
  });
  return app;
}
