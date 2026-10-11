import { Router } from 'express';
import { GenerateInsightsRequestSchema } from '../../../frontend/src/domain/contracts/apiContracts';
import type { AiService } from '../services/ai/aiService';

import { requireSiteAuthorization } from '../middleware/authorization';

export function createInsightsRouter(aiService: AiService): Router {
  const router = Router();

  // GET /insights/config
  router.get('/config', (_req, res) => {
    const config = aiService.getConfig();
    res.status(200).json({
      provider: config.provider,
      model: config.model,
      hasApiKey: !!config.apiKey,
      timeoutMs: config.timeoutMs,
      fallbackAvailable: true,
    });
  });

  // POST /insights
  router.post(
    '/',
    requireSiteAuthorization(req => req.body?.siteId),
    async (req, res, next) => {
    try {
      const parsedBody = GenerateInsightsRequestSchema.parse(req.body);
      const insights = await aiService.generateInsights(parsedBody);

      res.status(200).json({
        success: true,
        insights,
        message:
          insights.status === 'fallback'
            ? 'External provider unavailable; deterministic insights returned.'
            : insights.status === 'insufficient_data'
            ? 'Insufficient data available for thorough evaluation.'
            : 'Insights generated successfully.',
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
