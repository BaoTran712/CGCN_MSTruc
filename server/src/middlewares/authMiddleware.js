import jwt from 'jsonwebtoken';
import { ApiResponse } from '../dtos/apiResponse.js';
import { config } from '../utils/config.js';

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '7d';

/**
 * Tạo JWT token cho user đã đăng nhập
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'USER',
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware xác thực JWT — Bắt buộc đăng nhập
 * Gắn `req.user` nếu token hợp lệ
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error('Vui lòng đăng nhập để tiếp tục.', 401).send(res);
  }

  const token = authHeader.split(' ')[1];

  // Hỗ trợ dev token khi đang ở môi trường development
  if (config.nodeEnv === 'development' && token && token.startsWith('dev-token-')) {
    const role = token.includes('admin') ? 'ADMIN' : 'USER';
    const email = role === 'ADMIN' ? 'toanhkhai12345@gmail.com' : 'user.test@gmail.com';
    req.user = {
      id: token,
      email,
      role,
      name: role === 'ADMIN' ? 'Quản trị viên (Toàn Khải)' : 'Cán bộ / Giảng viên (User)',
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401).send(res);
    }
    return ApiResponse.error('Token không hợp lệ.', 401).send(res);
  }
}

/**
 * Middleware phân quyền Admin — Chỉ role ADMIN mới được truy cập
 * Phải gắn SAU requireAuth
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return ApiResponse.error('Chưa xác thực.', 401).send(res);
  }

  const isAdmin =
    req.user.role === 'ADMIN' ||
    req.user.email?.trim().toLowerCase() === 'toanhkhai12345@gmail.com';

  if (!isAdmin) {
    return ApiResponse.error('Bạn không có quyền truy cập chức năng này. Chỉ Admin mới được phép.', 403).send(res);
  }

  next();
}

/**
 * Middleware tùy chọn xác thực — Không bắt buộc token
 * Nếu có token hợp lệ thì gắn req.user, nếu không thì bỏ qua
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
}
