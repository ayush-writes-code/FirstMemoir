import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();
const port = env.PORT;

// Middlewares
app.use(helmet());
console.log('--- ENV.CORS_ORIGIN ---', env.CORS_ORIGIN);
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
// We must parse Razorpay webhooks as raw Buffer/String to verify signatures correctly
app.use('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'first-memoir-api' });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port} in ${env.NODE_ENV} mode`);
  });
}

export { app };
