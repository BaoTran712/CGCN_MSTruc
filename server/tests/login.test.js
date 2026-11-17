import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createLoginLimiter } from '../src/middlewares/loginLimiter.js';
import { configureProxy } from '../src/utils/proxy.js';

test('trusted tunnel separates clients, ignores spoofed leftmost addresses and keeps brute-force limits', async () => {
  const app = express();
  configureProxy(app);
  let time = Date.now();
  app.post('/login', createLoginLimiter({now: () => time}), (req, res) => res.status(req.query.fail ? 401 : req.query.unavailable ? 503 : 200).json({ip: req.ip}));
  const server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  const send = async (ip, query = '') => {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/login' + query, {method: 'POST', headers: {'X-Forwarded-For': ip}});
    return {status: response.status, retry: response.headers.get('retry-after'), body: await response.json()};
  };
  try {
    assert.equal(app.get('trust proxy fn')('127.0.0.1', 0), true);
    assert.equal(app.get('trust proxy fn')('192.0.2.10', 0), false);
    for (let client = 1; client <= 31; client++) assert.equal((await send('198.51.100.' + client, '?fail=1')).status, 401);
    // Each IP has only one failure, even though >30 clients share the tunnel.
    assert.equal((await send('198.51.100.31')).status, 200);
    for (let success = 0; success < 40; success++) assert.equal((await send('203.0.113.1')).status, 200);
    for (let unavailable = 0; unavailable < 31; unavailable++) assert.equal((await send('203.0.113.2', '?unavailable=1')).status, 503);
    for (let failure = 1; failure < 30; failure++) assert.equal((await send('198.51.100.1', '?fail=1')).status, 401);
    const blocked = await send('198.51.100.1');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.retry) > 0);
    assert.equal((await send('198.51.100.32')).status, 200);
    const forwarded = await send('203.0.113.99, 198.51.100.32');
    assert.equal(forwarded.body.ip, '198.51.100.32');
    time += 15 * 60 * 1000;
    assert.equal((await send('198.51.100.1')).status, 200);
    configureProxy(app, 'false');
    assert.equal((await send('203.0.113.99')).body.ip, '127.0.0.1');
    configureProxy(app, '10.0.0.0/8, loopback');
    assert.equal(app.get('trust proxy fn')('10.0.0.2', 0), true);
    assert.equal(app.get('trust proxy fn')('198.51.100.2', 0), false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
