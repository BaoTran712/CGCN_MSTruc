import { spawn } from 'node:child_process';
const child=spawn(process.execPath,['server/src/server.js'],{stdio:'inherit',env:{...process.env,NODE_ENV:'production'},windowsHide:true});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
