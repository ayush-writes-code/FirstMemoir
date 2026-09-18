import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

/**
 * Middleware to ensure a secure, signed HttpOnly session cookie exists for the cart.
 * If one does not exist, it generates a new UUID, signs it, and attaches it.
 */
export function ensureCartSession(req: Request, res: Response, next: NextFunction) {
  // Read signed cookie. 'cookie-parser' exposes signed cookies on req.signedCookies
  let sessionId = req.signedCookies['cart_session'];

  if (!sessionId) {
    // Generate a new secure session UUID
    sessionId = randomUUID();

    // Set a signed HttpOnly cookie
    res.cookie('cart_session', sessionId, {
      httpOnly: true,
      secure: env.COOKIE_SAME_SITE === 'none' ? true : env.NODE_ENV === 'production',
      signed: true,
      sameSite: env.COOKIE_SAME_SITE,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    
    // Make the new session ID available to the rest of the request lifecycle
    req.signedCookies['cart_session'] = sessionId;
  }

  next();
}

/**
 * Helper to safely extract the session ID from the request in controllers.
 */
export function getSessionId(req: Request): string {
  const sessionId = req.signedCookies['cart_session'];
  if (!sessionId) {
    throw new Error('No secure cart session found. Ensure ensureCartSession middleware is used.');
  }
  return sessionId;
}
