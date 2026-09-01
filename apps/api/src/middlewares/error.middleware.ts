import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(err, 'Unhandled request error');

  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return res.status(400).json(errorResponse(`Validation failed: ${issues}`, 400));
  }

  // AWS SDK errors (e.g. R2 authentication failure, bucket not found).
  // The '$metadata' property is present on all AWS ServiceException objects.
  if (err?.$metadata?.httpStatusCode) {
    const awsStatus = err.$metadata.httpStatusCode as number;
    if (awsStatus === 403) {
      return res.status(502).json(errorResponse('Storage authentication failed. Check R2 credentials.', 502));
    }
    if (awsStatus === 404) {
      return res.status(404).json(errorResponse('The requested storage asset was not found.', 404));
    }
    return res.status(502).json(errorResponse('Storage service error. Please try again later.', 502));
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(errorResponse(message, statusCode));
}

