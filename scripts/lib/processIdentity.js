import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile=promisify(execFile);
export async function readProcessIdentity(pid) {
  if(!Number.isSafeInteger(pid)||pid<1)return null;
  // share:https uses a verified Windows cloudflared.exe on this workspace.
  if(process.platform!=='win32')throw new Error('Kiểm tra tunnel này yêu cầu Windows.');
  const command=`Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | ForEach-Object { [pscustomobject]@{ pid=$_.ProcessId; executable=$_.ExecutablePath; startedAt=$_.CreationDate.ToUniversalTime().ToString('o'); commandLine=$_.CommandLine } } | ConvertTo-Json -Compress`;
  const {stdout}=await runFile('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{windowsHide:true,timeout:10000});
  return stdout.trim()?JSON.parse(stdout):null;
}

export function matchesTunnelProcess(state, actual, binary) {
  if(!actual || Number(actual.pid)!==Number(state.pid) || !actual.executable)return false;
  if(path.resolve(actual.executable).toLowerCase()!==path.resolve(binary).toLowerCase())return false;
  if(!actual.commandLine?.includes('--url http://127.0.0.1:5001'))return false;
  if(state.processStartedAt)return state.processStartedAt===actual.startedAt;
  // Old manifests stored the time immediately after spawn. A recycled PID must
  // not make an unrelated process look like the tunnel from that manifest.
  return Math.abs(Date.parse(state.startedAt)-Date.parse(actual.startedAt))<15000;
}
