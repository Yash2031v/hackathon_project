import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawHeader = req.header('X-Request-Id');
  // Sanitize: allow only alphanumeric characters, dashes, and underscores (max 64 chars) to prevent CRLF injection
  const isSafe = rawHeader && /^[a-zA-Z0-9\-_]{1,64}$/.test(rawHeader);
  const reqId = isSafe ? rawHeader : `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
