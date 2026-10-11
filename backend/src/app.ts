import express from 'express';
import cors from 'cors';
import type { IWasteRecordRepository } from '../../frontend/src/domain/repositories/IWasteRecordRepository';
import type { IFactorRepository } from '../../frontend/src/domain/repositories/IFactorRepository';
import type { IAnalysisRepository } from '../../frontend/src/domain/repositories/IAnalysisRepository';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { createRateLimiter, type RateLimiterOptions } from './middleware/rateLimiter';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandlerMiddleware, notFoundHandler } from './middleware/errorHandler';
import { createWasteRecordsRouter } from './routes/wasteRecords.routes';
import { createAnalysesRouter } from './routes/analyses.routes';
import { createScenariosRouter } from './routes/scenarios.routes';
import { createHealthRouter } from './routes/health.routes';
import { createInsightsRouter } from './routes/insights.routes';
import { AiService } from './services/ai/aiService';

export interface AppDependencies {
  wasteRepo: IWasteRecordRepository;
  factorRepo: IFactorRepository;
  analysisRepo: IAnalysisRepository;
  aiService?: AiService;
  allowedOrigins?: string[];
  storageType?: 'file' | 'memory';
  rateLimiterOptions?: RateLimiterOptions;
}

export function createApp(deps: AppDependencies): express.Express {
  const app = express();

  const aiService = deps.aiService || new AiService({
    wasteRepo: deps.wasteRepo,
    factorRepo: deps.factorRepo,
    analysisRepo: deps.analysisRepo,
  });

  const allowedOrigins = deps.allowedOrigins || [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  // 1. Defensive HTTP Security Headers
  app.use(securityHeadersMiddleware);

  // 2. Restricted CORS Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' not permitted by CORS policy.`));
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-Request-Id', 'Authorization'],
      credentials: true,
    })
  );

  // 3. Rate Limiter (sliding window abuse prevention)
  app.use(createRateLimiter(deps.rateLimiterOptions));

  // 4. Request body parser with 1mb limit
  app.use(express.json({ limit: '1mb' }));

  // 5. Safe Request ID middleware
  app.use(requestIdMiddleware);

  // 6. Routes
  app.use('/health', createHealthRouter(deps.storageType || 'file'));
  app.use('/waste-records', createWasteRecordsRouter(deps.wasteRepo));
  app.use('/analyses', createAnalysesRouter(deps.wasteRepo, deps.factorRepo, deps.analysisRepo));
  app.use('/scenarios', createScenariosRouter());
  app.use('/insights', createInsightsRouter(aiService));

  // 5. 404 handler
  app.use(notFoundHandler);

  // 6. Global error handler
  app.use(errorHandlerMiddleware);

  return app;
}
