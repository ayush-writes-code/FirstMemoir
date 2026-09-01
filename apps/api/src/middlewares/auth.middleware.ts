import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token || req.cookies?.accessToken;
    
    if (!token) {
      return res.status(401).json(errorResponse('Authentication required', 401));
    }

    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (error) {
    return res.status(401).json(errorResponse('Invalid or expired token', 401));
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.access_token || req.cookies?.accessToken;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = { userId: payload.userId, role: payload.role };
    }
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json(errorResponse('Authentication required', 401));
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json(errorResponse('Forbidden: Admin access required', 403));
  }

  next();
}
