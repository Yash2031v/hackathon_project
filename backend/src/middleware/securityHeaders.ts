import type { Request, Response, NextFunction } from 'express';

/**
 * Standard HTTP security headers middleware to enforce defensive browser protections:
 * - Prevents MIME-type sniffing (X-Content-Type-Options)
 * - Prevents clickjacking (X-Frame-Options & CSP frame-ancestors)
 * - Disables obsolete, buggy XSS auditors (X-XSS-Protection)
 * - Restricts referrer leakage (Referrer-Policy)
 * - Enforces Content-Security-Policy for API endpoints
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; frame-ancestors 'none'; base-uri 'none';"
  );
  next();
}
