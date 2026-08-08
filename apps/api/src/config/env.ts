import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'access_secret_default',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh_secret_default',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),

  // Cloudflare R2 Storage
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || '',
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || '',
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || '',
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || '',
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL || '',
  
  COOKIE_SECRET: process.env.COOKIE_SECRET || (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 'dev_cookie_secret_override' : undefined),
};

if (env.NODE_ENV === 'production' && !env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET environment variable is required in production');
}

if (!env.COOKIE_SECRET) {
  throw new Error('COOKIE_SECRET must be defined');
}
