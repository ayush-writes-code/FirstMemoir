import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function generateOtp(): string {
  if (env.NODE_ENV === 'development') return '123456';
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
