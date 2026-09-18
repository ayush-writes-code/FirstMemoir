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

// Liveness probe - process is alive
app.get('/api/health/live', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'first-memoir-api' });
});

// Readiness probe - dependencies are available
app.get('/api/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', service: 'first-memoir-api', database: 'connected' });
  } catch (error) {
    logger.error(error, '[Readiness] Database connection failed');
    res.status(503).json({ status: 'error', service: 'first-memoir-api', database: 'disconnected' });
  }
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

let server: ReturnType<typeof app.listen> | undefined;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(port, () => {
    logger.info(`Server is running on port ${port} in ${env.NODE_ENV} mode`);
  });
}

// Graceful Shutdown Handler
function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error(err, 'Error closing Express server');
      } else {
        logger.info('Express server closed');
      }

      try {
        await prisma.$disconnect();
        logger.info('Prisma disconnected successfully');
        process.exit(0);
      } catch (dbErr) {
        logger.error(dbErr, 'Error disconnecting Prisma');
        process.exit(1);
      }
    });

    // Fallback timeout to force exit if connections hang
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, server };
