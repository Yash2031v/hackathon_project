import type { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse } from '../../../frontend/src/domain/contracts/apiContracts';

export interface AuthenticatedUser {
  sub: string;
  email?: string;
  institution?: string;
  authorizedSites: string[];
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      apiGateway?: {
        event?: {
          requestContext?: {
            authorizer?: {
              jwt?: {
                claims?: Record<string, any>;
              };
            };
          };
        };
      };
    }
  }
}

/**
 * Extracts verified user identity and authorized site claims.
 * In production/staging, claims MUST come from the verified API Gateway JWT Authorizer.
 */
export function extractVerifiedUser(req: Request): AuthenticatedUser | null {
  // 1. Production API Gateway HTTP API v2 path (verified by AWS Cognito JWT Authorizer)
  const claims = req.apiGateway?.event?.requestContext?.authorizer?.jwt?.claims;
  if (claims && claims.sub) {
    const rawSites = claims['custom:authorized_sites'] || '';
    const authorizedSites = typeof rawSites === 'string'
      ? rawSites.split(',').map((s: string) => s.trim()).filter(Boolean)
      : Array.isArray(rawSites) ? rawSites : [];

    return {
      sub: claims.sub,
      email: claims.email,
      institution: claims['custom:institution'],
      authorizedSites,
      role: claims['custom:role'] || 'user',
    };
  }

  // In production mode, claims MUST come from the verified API Gateway Authorizer
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // 2. Development & Test Environment Handlers
  const mockSitesHeader = req.header('X-Verified-Authorized-Sites');
  const mockSubHeader = req.header('X-Verified-User-Sub');

  // If explicit test/mock identity headers are passed, enforce them strictly
  if (mockSubHeader || mockSitesHeader) {
    if (mockSubHeader === 'unauthenticated') {
      return null;
    }
    return {
      sub: mockSubHeader || 'mock-cognito-user',
      authorizedSites: mockSitesHeader ? mockSitesHeader.split(',').map(s => s.trim()).filter(Boolean) : [],
      role: req.header('X-Verified-User-Role') || 'facility_operator',
    };
  }

  // If AUTH_MODE is explicitly set to 'strict', require authentication
  if (process.env.AUTH_MODE === 'strict') {
    return null;
  }

  // Default Local Demo Mode (developer offline on localhost:5173 without Cognito)
  return {
    sub: 'local-demo-operator',
    authorizedSites: ['*'],
    institution: 'Apex Institute of Technology',
    role: 'facility_operator',
  };
}

/**
 * Middleware that validates the caller's verified identity and confirms they have
 * authorization to access the specific facility/siteId.
 */
export function requireSiteAuthorization(getSiteId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const targetSiteId = getSiteId(req);

    // If targetSiteId is not supplied in query/body, pass through to route handler
    // so Zod schema validation returns the standardized 400 VALIDATION_ERROR
    if (!targetSiteId) {
      return next();
    }

    const user = extractVerifiedUser(req);
    const requestId = req.id || 'unknown';
    const timestamp = new Date().toISOString();

    if (!user) {
      const errorResponse: ApiErrorResponse = {
        statusCode: 401,
        errorCode: 'UNAUTHENTICATED',
        message: 'Authentication required: missing or invalid verified Cognito identity claims.',
        requestId,
        timestamp,
      };
      res.status(401).json(errorResponse);
      return;
    }

    req.user = user;

    const hasAccess =
      user.authorizedSites.includes('*') ||
      user.authorizedSites.includes(targetSiteId);

    if (!hasAccess) {
      const errorResponse: ApiErrorResponse = {
        statusCode: 403,
        errorCode: 'UNAUTHORIZED_SITE_ACCESS',
        message: `Forbidden: Caller '${user.sub}' is not authorized to access site '${targetSiteId}'.`,
        details: [`Caller authorized for: [${user.authorizedSites.join(', ')}]`],
        requestId,
        timestamp,
      };
      res.status(403).json(errorResponse);
      return;
    }

    next();
  };
}
