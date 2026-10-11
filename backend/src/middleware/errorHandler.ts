import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../../../frontend/src/domain/contracts/apiContracts';

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const requestId = req.id || 'unknown';

  // 1. Zod Validation Error
  const isZodError =
    err instanceof ZodError ||
    (typeof err === 'object' &&
      err !== null &&
      ('issues' in err || (err as { name?: string }).name === 'ZodError'));

  if (isZodError) {
    const issues = (err as { issues?: Array<{ path: (string | number)[]; message: string }> }).issues || [];
    const details = issues.map(
      issue => `${(issue.path && issue.path.length > 0 ? issue.path.join('.') : 'body')}: ${issue.message}`
    );
    const errorResponse: ApiErrorResponse = {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Request payload failed schema validation.',
      details,
      requestId,
      timestamp,
    };
    res.status(400).json(errorResponse);
    return;
  }

  // 2. Malformed JSON Body
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    const errorResponse: ApiErrorResponse = {
      statusCode: 400,
      errorCode: 'INVALID_JSON',
      message: 'Malformed JSON payload in request body.',
      requestId,
      timestamp,
    };
    res.status(400).json(errorResponse);
    return;
  }

  // 3. Payload Too Large (413)
  if (
    typeof err === 'object' &&
    err !== null &&
    (('type' in err && (err as { type: string }).type === 'entity.too.large') ||
      ('status' in err && (err as { status: number }).status === 413))
  ) {
    const errorResponse: ApiErrorResponse = {
      statusCode: 413,
      errorCode: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload exceeds maximum allowed size limit (1MB).',
      requestId,
      timestamp,
    };
    res.status(413).json(errorResponse);
    return;
  }

  // 4. Generic/Server Error
  const isProduction = process.env.NODE_ENV === 'production';
  const rawMessage = err instanceof Error ? err.message : 'An unexpected internal error occurred.';
  const message = isProduction ? 'An unexpected internal server error occurred.' : rawMessage;

  const errorResponse: ApiErrorResponse = {
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    message,
    requestId,
    timestamp,
  };
  res.status(500).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ApiErrorResponse = {
    statusCode: 404,
    errorCode: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.id || 'unknown',
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(errorResponse);
}
