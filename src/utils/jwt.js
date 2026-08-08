import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const secrets = {
  customer: env.jwt.customerSecret,
  admin: env.jwt.adminSecret,
  staff: env.jwt.staffSecret,
};

export function signToken(type, payload) {
  return jwt.sign(payload, secrets[type], { expiresIn: env.jwt.expiresIn });
}

export function verifyToken(type, token) {
  return jwt.verify(token, secrets[type]);
}
