import jwt from 'jsonwebtoken';
import { ApiResponse } from '../dtos/apiResponse.js';
import { config } from '../utils/config.js';
import { query } from '../utils/db.js';
import { UserModel } from '../models/userModel.js';

export async function generateToken(user) {
  const [credential] = await query('SELECT token_version FROM auth_credentials WHERE user_id=?', [user.id]);
  return jwt.sign({ email: user.email, version: credential?.token_version || 0 }, config.jwtSecret, {
    subject: String(user.id), expiresIn: '7d', issuer: 'ctump-docugov', audience: 'ctump-docugov-client', algorithm: 'HS256',
  });
}
export async function requireAuth(req, res, next) {
  res.setHeader('Cache-Control','no-store');
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return ApiResponse.error('Vui lòng đăng nhập để tiếp tục.', 401).send(res);
  let payload;
  try {
    payload = jwt.verify(value.slice(7), config.jwtSecret, { algorithms: ['HS256'], issuer: 'ctump-docugov', audience: 'ctump-docugov-client' });
    if (!payload.sub) throw new Error('Missing subject');
  } catch {
    return ApiResponse.error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', 401).send(res);
  }
  try {
    const [row] = await query('SELECT u.*,COALESCE(c.token_version,0) AS token_version FROM users u LEFT JOIN auth_credentials c ON c.user_id=u.id WHERE u.id=?', [payload.sub]);
    if (!row || !row.is_active || row.token_version !== payload.version) return ApiResponse.error('Phiên đăng nhập đã bị thu hồi.', 401).send(res);
    req.user = UserModel.fromRow(row).toObject();
    next();
  } catch (error) { next(error); }
}
export function requireAdmin(req, res, next) {
  if (!req.user) return ApiResponse.error('Vui lòng đăng nhập để tiếp tục.', 401).send(res);
  if (String(req.user.role).toUpperCase() !== 'ADMIN') return ApiResponse.error('Chỉ quản trị viên được phép thực hiện thao tác này.', 403).send(res);
  next();
}
export const optionalAuth = (req, res, next) => req.headers.authorization ? requireAuth(req, res, next) : next();

export { limitLogin } from './loginLimiter.js';
