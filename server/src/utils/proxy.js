// Trust headers only from the configured reverse proxy, never every remote peer.
// cloudflared on this host connects over loopback.
export function configureProxy(app, value = process.env.TRUST_PROXY) {
  const setting = String(value ?? 'loopback').trim();
  const trust = setting === 'false' || setting === '0' ? false :
    /^\d+$/.test(setting) ? Number(setting) : setting || 'loopback';
  app.set('trust proxy', trust);
}
