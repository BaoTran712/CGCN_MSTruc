import net from 'node:net';

// Local SMTP sink: accepts only .invalid recipients and never relays messages.
export async function smtpSink({ beforeAccept } = {}) {
  const messages = [], received = [], commands = [], sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    let buffered = '', data = null;
    socket.write('220 local.invalid SMTP test server\r\n');
    socket.on('data', chunk => {
      buffered += chunk;
      let end;
      while ((end = buffered.indexOf('\r\n')) >= 0) {
        const line = buffered.slice(0, end);
        buffered = buffered.slice(end + 2);
        if (data !== null) {
          if (line === '.') {
            const message = data.join('\r\n');
            received.push(message);
            data = null;
            Promise.resolve().then(() => beforeAccept?.(message)).then(() => {
              messages.push(message);
              if (!socket.destroyed) socket.write('250 2.0.0 Message accepted\r\n');
            }, () => { if (!socket.destroyed) socket.write('451 Temporary test failure\r\n'); });
          } else data.push(line.replace(/^\.\./, '.'));
          continue;
        }
        const verb = line.split(' ')[0].toUpperCase();
        commands.push(verb); // Do not retain AUTH credentials.
        if (verb === 'EHLO') socket.write('250-local.invalid\r\n250-AUTH PLAIN\r\n250 SIZE 1048576\r\n');
        else if (verb === 'AUTH') {
          const password = Buffer.from(line.split(' ')[2] || '', 'base64').toString().split('\0').at(-1);
          socket.write(password === 'local-test-password' ? '235 2.7.0 Authenticated\r\n' : '535 5.7.8 Authentication rejected\r\n');
        } else if (verb === 'MAIL') socket.write('250 Sender accepted\r\n');
        else if (verb === 'RCPT') socket.write(/@local\.invalid>/i.test(line) && !line.includes('reject@') ? '250 Recipient accepted\r\n' : '550 Recipient rejected\r\n');
        else if (verb === 'DATA') { data = []; socket.write('354 End data with <CRLF>.<CRLF>\r\n'); }
        else if (verb === 'QUIT') socket.end('221 Goodbye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    messages, received, commands, port: server.address().port,
    close: async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); },
  };
}

