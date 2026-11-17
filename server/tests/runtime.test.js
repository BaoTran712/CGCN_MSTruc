import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { matchesTunnelProcess } from '../../scripts/lib/processIdentity.js';
import { requireFileAccess } from '../src/middlewares/fileAccess.js';
import { pool } from '../src/config/database.js';

test('tunnel reuse requires correct executable, command and creation time', () => {
  const binary=path.resolve('.local/bin/cloudflared.exe');
  const state={pid:123,startedAt:'2026-11-17T01:00:00.000Z'};
  const actual={pid:123,executable:binary,startedAt:'2026-11-17T01:00:00.000Z',commandLine:binary+' --no-autoupdate tunnel --url http://127.0.0.1:5001 --protocol http2'};
  assert.equal(matchesTunnelProcess(state,actual,binary),true);
  assert.equal(matchesTunnelProcess(state,null,binary),false);
  assert.equal(matchesTunnelProcess(state,{...actual,executable:path.resolve('node.exe')},binary),false);
  assert.equal(matchesTunnelProcess(state,{...actual,startedAt:'2026-11-17T02:00:00.000Z'},binary),false);
  assert.equal(matchesTunnelProcess(state,{...actual,commandLine:binary+' tunnel --url http://127.0.0.1:8000'},binary),false);
  assert.equal(matchesTunnelProcess({...state,processStartedAt:actual.startedAt},actual,binary),true);
});

test('missing historical file returns useful 404 without leaking filesystem path', async () => {
  const req={user:{role:'ADMIN'},path:'/pdf/nonexistent-regression-file.pdf'};
  const res={status(value){this.code=value;return this;},json(value){this.body=value;return this;}};
  await requireFileAccess(req,res,()=>{throw new Error('Missing file was passed to static server');});
  assert.equal(res.code,404);
  assert.match(res.body.message,/phục hồi đúng file gốc/);
  assert.equal(res.body.message.includes('ENOENT'),false);
  const invalid={...req,path:'/pdf/%ZZ'};
  await requireFileAccess(invalid,res,()=>{throw new Error('Invalid URI was accepted');});
  assert.equal(res.code,400);
  await pool.end();
});
