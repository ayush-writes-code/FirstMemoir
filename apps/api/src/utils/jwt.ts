import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AccessTokenPayload extends jwt.JwtPayload {
  userId: string;
  role: string;
}

export interface RefreshTokenPayload extends jwt.JwtPayload {
  userId: string;
  tokenFamily: string;
}

export function signAccessToken(payload: { userId: string; role: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });
}

export function signRefreshToken(payload: { userId: string; tokenFamily: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
