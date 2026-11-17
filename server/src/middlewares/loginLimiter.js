import { ApiResponse } from '../dtos/apiResponse.js';

export function createLoginLimiter({ maxAttempts = 30, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    if (attempts.size > 10000) for (const [key, entry] of attempts) if (entry.expires <= time) attempts.delete(key);
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const previous = attempts.get(key);
    const current = previous && previous.expires > time ? previous : { count: 0, expires: time + windowMs };
    attempts.set(key, current);
    if (current.count >= maxAttempts) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((current.expires - time) / 1000)));
      return ApiResponse.error('Quá nhiều lần đăng nhập. Vui lòng thử lại sau.', 429).send(res);
    }
    // Reserve a slot while authentication is in flight. Successful logins and
    // unavailable services must not consume the failed-password budget.
    current.count++;
    res.once('finish', () => {
      if (res.statusCode < 400 || res.statusCode >= 500) current.count = Math.max(0, current.count - 1);
    });
    next();
  };
}

export const limitLogin = createLoginLimiter();
