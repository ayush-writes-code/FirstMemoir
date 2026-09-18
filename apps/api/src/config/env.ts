import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001').transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // JWT
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(1, 'COOKIE_SECRET is required'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  
  // OTP
  OTP_EXPIRY_MINUTES: z.string().default('5').transform(val => parseInt(val, 10)),
  OTP_MAX_ATTEMPTS: z.string().default('5').transform(val => parseInt(val, 10)),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000').transform(val => val.split(',')),

  // R2
  R2_ACCOUNT_ID: z.string().min(1, 'R2_ACCOUNT_ID is required'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID is required'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY is required'),
  R2_BUCKET_NAME: z.string().min(1, 'R2_BUCKET_NAME is required'),
  R2_PUBLIC_URL: z.string().optional().default(''),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  
  // Shiprocket
  SHIPROCKET_WEBHOOK_TOKEN: z.string().default('sr_webhook_mock_token'),
  
  // Resend (Optional for local dev, fallback to mock provider if absent)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  // Trust Proxy for Rate Limiting (false, true, or numeric hops)
  TRUST_PROXY: z.string().default('false').transform((val): boolean | number => {
    const trimmed = val.trim();
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);

    throw new Error(`Invalid TRUST_PROXY value: "${val}". Must be "true", "false", or a positive integer.`);
  }),
});

// Provide safe developer defaults if NOT in production or staging
const devDefaults = {
  JWT_ACCESS_SECRET: 'access_secret_default',
  JWT_REFRESH_SECRET: 'refresh_secret_default',
  COOKIE_SECRET: 'dev_cookie_secret_override',
  R2_ACCOUNT_ID: 'mock',
  R2_ACCESS_KEY_ID: 'mock',
  R2_SECRET_ACCESS_KEY: 'mock',
  R2_BUCKET_NAME: 'mock',
  RAZORPAY_KEY_ID: 'mock',
  RAZORPAY_KEY_SECRET: 'mock',
  RAZORPAY_WEBHOOK_SECRET: 'mock',
};

const processEnv = { ...process.env };

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
  // Apply developer defaults ONLY if not set explicitly
  Object.keys(devDefaults).forEach(key => {
    if (!processEnv[key]) {
      processEnv[key] = devDefaults[key as keyof typeof devDefaults];
    }
  });
}

const parsedEnv = envSchema.safeParse(processEnv);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach(issue => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
