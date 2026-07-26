import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errLog = err instanceof Error
    ? `${err.constructor.name}: ${err.message}\n${err.stack}`
    : JSON.stringify(err);
  console.error('[Error]:', errLog);

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json(errorResponse(`Validation failed: ${issues}`, 400));
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(errorResponse(message, statusCode));
}
