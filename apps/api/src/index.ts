import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalLimiter } from './middlewares/rateLimit.middleware.js';
import { logger } from './utils/logger.js';

const app = express();
const port = env.PORT;

// Proxy configuration: trust proxy based on environment configuration.
// If deployed behind a reverse proxy (e.g. Cloudflare, Nginx, Render), we must trust the proxy
// to receive the correct client IP for rate limiting, rather than limiting the proxy's IP.
if (env.TRUST_PROXY !== false) {
  app.set('trust proxy', env.TRUST_PROXY);
}

// Middlewares
app.use(helmet());
logger.debug(`CORS_ORIGIN configured as: ${env.CORS_ORIGIN.join(', ')}`);
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// We must parse Razorpay webhooks as raw Buffer/String to verify signatures correctly
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));

// Apply global rate limiting to all routes EXCEPT webhooks.
// Webhooks rely on HMAC signature verification for security and must not be
// accidentally dropped due to the provider's IP triggering the standard user limits.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1/webhooks')) {
    return next();
  }
  return globalLimiter(req, res, next);
});

import { prisma } from '@repo/database';

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'first-memoir-api', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'first-memoir-api', database: 'disconnected' });
  }
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info(`Server is running on port ${port} in ${env.NODE_ENV} mode`);
  });
}

export { app };
