import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { smtpSink } from './helpers/smtpSink.js';

// Every row is created in a fresh scratch DB and SMTP cannot relay outside.
const database = 'ctump_docugov_verify_mail_' + Date.now();
if (!/^ctump_docugov_verify_mail_\d+$/.test(database)) throw new Error('Unsafe test database');
let release;
const gate = new Promise(resolve => { release = resolve; });
const sink = await smtpSink({beforeAccept: () => gate});
Object.assign(process.env, {DB_NAME: database, SMTP_HOST: '127.0.0.1', SMTP_PORT: String(sink.port), SMTP_SECURE: 'false', SMTP_USER: 'sender@local.invalid', SMTP_PASS: 'local-test-password', SMTP_FROM: 'sender@local.invalid', MAIL_DISABLED: 'false'});
const {pool, query, execute, transaction} = await import('../src/config/database.js');
const {maintenanceConnection, identifier} = await import('../src/db/maintenance.js');
const {migrate} = await import('../src/db/migrate.js');
const {enqueueEmail, deliverEmail, startMailWorker} = await import('../src/services/mailQueue.js');
let connection, stopWorker;
const passed = [];
const pass = name => { passed.push(name); console.log('PASS ' + name); };
const mail = {recipientEmail: 'recipient@local.invalid', subject: 'Local outbox test', content: '<p>Local test</p>'};
async function until(check) {
  for (let attempt = 0; attempt < 200; attempt++) { if (await check()) return; await delay(20); }
  throw new Error('Outbox condition timed out');
}
try {
  connection = await maintenanceConnection(null);
  await connection.query('CREATE DATABASE ' + identifier(database) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await connection.changeUser({database});
  await migrate(connection, {backup: false, copyUploads: false});
  stopWorker = startMailWorker();
  const queued = await Promise.race([
    transaction(async () => {
      const result = await enqueueEmail(mail);
      await delay(30);
      assert.equal(sink.received.length, 0, 'SMTP cannot run before commit');
      return result;
    }),
    delay(2000).then(() => { throw new Error('Caller waited for SMTP acceptance'); }),
  ]);
  assert.equal(queued.status, 'PENDING');
  await until(() => sink.received.length === 1);
  assert.equal((await query('SELECT status FROM email_notifications WHERE id=?', [queued.id]))[0].status, 'PENDING');
  pass('caller returns after durable commit while slow SMTP is still waiting');
  let stopped = false;
  const stopping = stopWorker().then(() => { stopped = true; });
  await delay(30);
  assert.equal(stopped, false);
  release();
  await stopping;
  stopWorker = null;
  const sent = (await query('SELECT status,attempts,last_error FROM email_notifications WHERE id=?', [queued.id]))[0];
  assert.equal(sent.status, 'SENT');assert.equal(sent.attempts, 1);assert.equal(sent.last_error, null);
  pass('shutdown waits for in-flight SMTP and persists SENT before DB closes');

  let rolledBack;
  await assert.rejects(transaction(async () => {
    rolledBack = await enqueueEmail(mail);
    throw new Error('Intentional rollback');
  }), /Intentional rollback/);
  assert.equal((await query('SELECT id FROM email_notifications WHERE id=?', [rolledBack.id])).length, 0);
  assert.equal(sink.messages.length, 1);
  pass('rolled-back work never persists or sends a notification');

  stopWorker = startMailWorker();
  let malformed, good;
  await transaction(async () => {
    malformed = await enqueueEmail(mail);
    await execute('UPDATE email_notifications SET attachments=? WHERE id=?', ['{}', malformed.id]);
    good = await enqueueEmail(mail);
  });
  await until(async () => (await query('SELECT status FROM email_notifications WHERE id=?', [good.id]))[0].status === 'SENT');
  const retry = (await query('SELECT status,attempts,last_error,next_attempt_at FROM email_notifications WHERE id=?', [malformed.id]))[0];
  assert.equal(retry.status, 'PENDING');assert.equal(retry.attempts, 1);assert.match(retry.last_error, /đính kèm/);
  assert.ok(new Date(retry.next_attempt_at).getTime() > Date.now());
  pass('bad attachment metadata is retried with backoff and does not block the next mail');
  await stopWorker();stopWorker = null;
  for (let attempt = 2; attempt <= 5; attempt++) {
    await execute('UPDATE email_notifications SET next_attempt_at=UTC_TIMESTAMP() WHERE id=?', [malformed.id]);
    await deliverEmail(malformed.id);
  }
  const failed = (await query('SELECT status,attempts FROM email_notifications WHERE id=?', [malformed.id]))[0];
  assert.equal(failed.status, 'FAILED');assert.equal(failed.attempts, 5);
  pass('existing five-attempt retry policy remains unchanged');

  const concurrent = await enqueueEmail(mail);
  await Promise.all(Array.from({length: 5}, () => deliverEmail(concurrent.id)));
  const once = (await query('SELECT status,attempts FROM email_notifications WHERE id=?', [concurrent.id]))[0];
  assert.equal(once.status, 'SENT');assert.equal(once.attempts, 1);
  assert.equal(sink.messages.length, 3);
  pass('concurrent workers send a queued message only once');
  fs.writeFileSync('.local/outbox-results.json', JSON.stringify({database, passed, completedAt: new Date().toISOString(), productionDatabaseModified: false}, null, 2));
} catch (error) { console.error(error);process.exitCode = 1; }
finally { release();await stopWorker?.();await sink.close();await connection?.end();await pool.end(); }
