import test from 'node:test';
import assert from 'node:assert/strict';
import { smtpSink } from './helpers/smtpSink.js';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/utils/config.js';
import { pool } from '../src/config/database.js';
import { verifyWorkflowSmtp, sendWorkflowEmail } from '../src/utils/mailer.js';
import { getSmtpReadiness, normalizeSmtpSettings, smtpTransportOptions } from '../src/utils/smtpConfig.js';
import { EmailModel } from '../src/models/emailModel.js';

test('SMTP configuration requires credentials and protects remote STARTTLS connections', () => {
  const gmail = normalizeSmtpSettings({host: ' smtp.gmail.com ', port: 587, secure: false, user: ' sender@local.invalid ', pass: ' abcd efgh ijkl mnop '});
  assert.equal(gmail.pass, 'abcdefghijklmnop');
  assert.equal(gmail.user, 'sender@local.invalid');
  assert.equal(getSmtpReadiness({...gmail, pass: '   '}).code, 'SMTP_PASSWORD_MISSING');
  assert.equal(getSmtpReadiness(gmail, true).code, 'SMTP_DISABLED');
  assert.equal(getSmtpReadiness({...gmail, port: 0}).code, 'SMTP_PORT_INVALID');
  assert.equal(smtpTransportOptions(gmail).requireTLS, true);
  assert.equal(smtpTransportOptions({...gmail, port: 465, secure: true}).secure, true);
});

test('mail transport verifies without sending, handles SMTP failures and preserves PDF bytes', async t => {
  const sink = await smtpSink();
  const previous = {smtp: config.smtp, mailDisabled: config.mailDisabled, uploadDir: config.uploadDir};
  const directory = path.resolve(import.meta.dirname, '../../.local/mail-tests-' + Date.now());
  fs.mkdirSync(path.join(directory, 'pdf'), {recursive: true});
  const pdf = Buffer.from('%PDF-1.4\nSMTP attachment regression fixture\n%%EOF');
  fs.writeFileSync(path.join(directory, 'pdf', 'attachment.pdf'), pdf);
  config.uploadDir = directory;
  config.smtp = {host: '127.0.0.1', port: sink.port, secure: false, user: 'sender@local.invalid', pass: 'local-test-password', from: 'CGCN <sender@local.invalid>'};
  config.mailDisabled = false;
  const mail = {to: 'recipient@local.invalid', subject: 'Local SMTP test', html: '<p>SMTP test</p>'};
  try {
    await t.test('verification authenticates but sends no message', async () => {
      const result = await verifyWorkflowSmtp();
      assert.equal(result.success, true);
      assert.ok(sink.commands.includes('AUTH'));
      assert.equal(sink.commands.includes('DATA'), false);
      assert.equal(sink.messages.length, 0);
    });
    await t.test('real MIME payload includes the exact PDF attachment', async () => {
      const result = await sendWorkflowEmail({...mail, attachments: [{path: '/uploads/pdf/attachment.pdf', filename: 'CGCN-test.pdf'}]});
      assert.equal(result.success, true);
      assert.equal(sink.messages.length, 1);
      assert.match(sink.messages[0], /filename=CGCN-test.pdf/);
      assert.ok(sink.messages[0].includes(pdf.toString('base64')));
    });
    await t.test('SMTP recipient refusal never reports success', async () => {
      const result = await sendWorkflowEmail({...mail, to: 'reject@local.invalid'});
      assert.equal(result.success, false);
      assert.equal(sink.messages.length, 1);
    });
    await t.test('changed credentials are used and authentication errors are explained', async () => {
      config.smtp.pass = 'wrong-local-password';
      const verified = await verifyWorkflowSmtp();
      assert.equal(verified.success, false);
      assert.equal(verified.code, 'EAUTH');
      assert.match(verified.message, /mật khẩu ứng dụng/);
      const result = await sendWorkflowEmail(mail);
      assert.equal(result.success, false);
      assert.equal(result.code, 'EAUTH');
      assert.equal(result.error.includes('wrong-local-password'), false);
      assert.equal(sink.messages.length, 1);
      config.smtp.pass = 'local-test-password';
    });
    await t.test('missing password and disabled sending keep mail pending without a connection', async () => {
      const count = sink.commands.length;
      config.smtp.pass = '';
      assert.equal((await verifyWorkflowSmtp()).code, 'SMTP_PASSWORD_MISSING');
      const result = await sendWorkflowEmail(mail);
      assert.equal(result.success, false);
      assert.equal(result.pending, true);
      config.smtp.pass = 'local-test-password';
      config.mailDisabled = true;
      assert.equal((await sendWorkflowEmail(mail)).code, 'SMTP_DISABLED');
      config.mailDisabled = false;
      assert.equal(sink.commands.length, count);
    });
    await t.test('missing attachments fail before SMTP delivery', async () => {
      const result = await sendWorkflowEmail({...mail, attachments: [{path: '/uploads/pdf/missing.pdf'}]});
      assert.equal(result.success, false);
      assert.match(result.error, /Không tìm thấy tệp/);
      assert.equal(sink.messages.length, 1);
    });
  } finally {
    Object.assign(config, previous);
    await sink.close();
    // Only remove the exact test fixture; do not recursively remove storage.
    fs.unlinkSync(path.join(directory, 'pdf', 'attachment.pdf'));
    fs.rmdirSync(path.join(directory, 'pdf'));
    fs.rmdirSync(directory);
    await pool.end();
  }
});

test('email log exposes retry attempts and delivery failure without fabricating sentAt', () => {
  const log = EmailModel.fromRow({id: 'pending', status: 'PENDING', attempts: 2, last_error: 'SMTP rejected', sent_at: null}).toObject();
  assert.equal(log.attempts, 2);
  assert.equal(log.last_error, 'SMTP rejected');
  assert.equal(log.sent_at, null);
});
