import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { env } from '../config/env.js';

export const sendOtpSchema = {
  body: z.object({
    phone_number: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    phone_number: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
};

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export const authController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone_number } = req.body;
      await authService.sendOtp(phone_number);
      res.json(successResponse({ message: 'OTP sent successfully' }));
    } catch (error) {
      next(error);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone_number, otp } = req.body;
      const { user, accessToken, refreshToken } = await authService.verifyOtp(phone_number, otp);

      res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json(successResponse({ user }));
    } catch (error) {
      next(error);
    }
  },

  async refreshTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token;
      if (!token) {
        return res.status(401).json(errorResponse('No refresh token provided', 401));
      }

      const { accessToken, refreshToken } = await authService.refreshTokens(token);

      res.cookie('access_token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json(successResponse({ message: 'Tokens refreshed successfully' }));
    } catch (error) {
      // If refresh fails, clear cookies to force re-login
      res.clearCookie('access_token', cookieOptions);
      res.clearCookie('refresh_token', cookieOptions);
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refresh_token;
      if (token) {
        await authService.logout(token);
      }

      res.clearCookie('access_token', cookieOptions);
      res.clearCookie('refresh_token', cookieOptions);

      res.json(successResponse({ message: 'Logged out successfully' }));
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(successResponse({ user: req.user }));
    } catch (error) {
      next(error);
    }
  },
};
