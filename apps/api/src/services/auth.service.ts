import { prisma } from '@repo/database';
import crypto from 'crypto';
import { generateOtp, hashOtp, verifyOtp as verifyOtpHash } from '../utils/otp.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { smsService } from './sms.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async sendOtp(phoneNumber: string) {
    // Rate limit check: max OTP_MAX_ATTEMPTS in last 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOtps = await prisma.otpRequest.count({
      where: {
        phone_number: phoneNumber,
        created_at: { gte: fifteenMinsAgo },
      },
    });

    if (recentOtps >= env.OTP_MAX_ATTEMPTS && env.NODE_ENV !== 'development') {
      throw { statusCode: 429, message: 'Too many OTP requests. Try again later.' };
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.otpRequest.create({
      data: {
        phone_number: phoneNumber,
        otp_hash: hashedOtp,
        expires_at: expiresAt,
      },
    });

    if (env.NODE_ENV === 'development') {
      logger.info(`[DEV OTP] Generated OTP for ${phoneNumber}: ${otp}`);
    }

    await smsService.sendOtp(phoneNumber, otp);
    return true;
  },

  async verifyOtp(phoneNumber: string, otp: string) {
    const latestOtp = await prisma.otpRequest.findFirst({
      where: {
        phone_number: phoneNumber,
        verified: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    if (!latestOtp) {
      throw { statusCode: 400, message: 'Invalid or expired OTP' };
    }

    const isValid = await verifyOtpHash(otp, latestOtp.otp_hash);
    if (!isValid) {
      throw { statusCode: 400, message: 'Invalid OTP' };
    }

    await prisma.otpRequest.update({
      where: { id: latestOtp.id },
      data: { verified: true },
    });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone_number: phoneNumber } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone_number: phoneNumber,
          role: env.NODE_ENV === 'development' ? 'ADMIN' : 'CUSTOMER',
        },
      });
    } else if (env.NODE_ENV === 'development' && user.role !== 'ADMIN') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    const tokenFamily = crypto.randomUUID();
    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = signRefreshToken({ userId: user.id, tokenFamily });
    const refreshTokenHash = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        token_hash: refreshTokenHash,
        user_id: user.id,
        family: tokenFamily,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { user, accessToken, refreshToken };
  },

  async refreshTokens(oldRefreshToken: string) {
    const hashedToken = hashToken(oldRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token_hash: hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw { statusCode: 401, message: 'Invalid refresh token' };
    }

    if (storedToken.revoked) {
      // Breach detection: Revoke all tokens in this family
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { revoked: true },
      });
      throw { statusCode: 401, message: 'Token reuse detected. Please login again.' };
    }

    if (storedToken.expires_at < new Date()) {
      throw { statusCode: 401, message: 'Refresh token expired' };
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const accessToken = signAccessToken({ userId: storedToken.user.id, role: storedToken.user.role });
    const newRefreshToken = signRefreshToken({ userId: storedToken.user.id, tokenFamily: storedToken.family! });
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        token_hash: newRefreshTokenHash,
        user_id: storedToken.user.id,
        family: storedToken.family,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    const hashedToken = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { token_hash: hashedToken },
      data: { revoked: true },
    });
    return true;
  },
};
