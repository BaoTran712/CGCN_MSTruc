import { config, validateConfig } from './utils/config.js';
import { initDb, pool } from './utils/db.js';
import { createApp } from './app.js';
import { startMailWorker } from './services/mailQueue.js';

let server;
let stopWorker;
async function shutdown() {
  await stopWorker?.();
  if(server)await new Promise(resolve=>server.close(resolve));
  await pool.end();
}
try {
  validateConfig();
  await initDb();
  const app=createApp();
  server=app.listen(config.port,'0.0.0.0',()=>console.log('CTUMP DocuGov: http://localhost:'+config.port));
  stopWorker=startMailWorker();
  server.on('error',async error=>{console.error(error.message);await shutdown();process.exitCode=1;});
  process.once('SIGINT',()=>shutdown().then(()=>process.exit(0)));
  process.once('SIGTERM',()=>shutdown().then(()=>process.exit(0)));
}catch(error){console.error('[Startup]',error.message);await pool.end();process.exitCode=1;}
