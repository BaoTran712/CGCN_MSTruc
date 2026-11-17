import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({mode})=>{
  const serverEnv=loadEnv(mode,path.resolve(import.meta.dirname,'server'),'');
  const target=process.env.BACKEND_URL || serverEnv.BACKEND_URL || 'http://127.0.0.1:'+(process.env.PORT || serverEnv.PORT || '5001');
  return {
    plugins:[react(),tailwindcss()],
    resolve:{alias:{'@':path.resolve(import.meta.dirname,'src')}},
    server:{
      port:3000,host:'0.0.0.0',
      proxy:{'/api':{target,changeOrigin:true},'/uploads':{target,changeOrigin:true}},
      hmr:process.env.DISABLE_HMR!=='true',
      watch:process.env.DISABLE_HMR==='true'?null:{},
    },
  };
});
