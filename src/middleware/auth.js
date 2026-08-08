import jwt from 'jsonwebtoken';
import { fail } from '../utils/response.js';
import { verifyToken } from '../utils/jwt.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function authCustomer(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return fail(res, 'Authentication required', 401);
    req.user = verifyToken('customer', token);
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function authAdmin(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return fail(res, 'Authentication required', 401);
    req.admin = verifyToken('admin', token);
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function authStaff(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return fail(res, 'Authentication required', 401);
    req.staff = verifyToken('staff', token);
    next();
  } catch {
    return fail(res, 'Invalid or expired token', 401);
  }
}

export function requireStaffRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.staff.role)) {
      return fail(res, 'Forbidden', 403);
    }
    next();
  };
}

export function requireAdminRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return fail(res, 'Forbidden', 403);
    }
    next();
  };
}

export function optionalAuthCustomer(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) req.user = verifyToken('customer', token);
  } catch { /* ignore */ }
  next();
}
