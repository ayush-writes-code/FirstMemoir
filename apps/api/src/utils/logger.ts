import pino from 'pino';
import { env } from '../config/env.js';

const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});
