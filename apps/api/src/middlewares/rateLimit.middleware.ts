import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/response.js';
import { env } from '../config/env.js';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (SPA friendly)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse('Too many requests, please try again later.', 429));
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse('Too many auth attempts, please try again later.', 429));
  },
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse('Too many OTP requests, please try again later.', 429));
  },
});

export const orderTrackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'development' ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(errorResponse('Too many order track requests, please try again later.', 429));
  },
});
