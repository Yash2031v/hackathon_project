import { Router } from 'express';
import { CompareScenariosRequestSchema } from '../../../frontend/src/domain/contracts/apiContracts';
import { calculateScenarioEconomics } from '../../../frontend/src/domain/services/scenarioEconomicsEngine';
import type { ScenarioComparisonItem } from '../../../frontend/src/domain/contracts/apiContracts';

import { requireSiteAuthorization } from '../middleware/authorization';

export function createScenariosRouter(): Router {
  const router = Router();

  // POST /scenarios/compare
  router.post(
    '/compare',
    requireSiteAuthorization(req => req.body?.siteId),
    (req, res, next) => {
    try {
      const { siteId, dailyFeedstockKg, scenarios } = CompareScenariosRequestSchema.parse(req.body);

      const comparison: ScenarioComparisonItem[] = [];

      for (const scen of scenarios) {
        const econResult = calculateScenarioEconomics({
          dailyFeedstockKg,
          assumptions: scen.assumptions,
        });

        if (!econResult.success) {
          res.status(400).json({
            statusCode: 400,
            errorCode: 'SCENARIO_CALCULATION_FAILED',
            message: `Failed to evaluate scenario '${scen.title}': ${econResult.error}`,
            details: econResult.missingFactors,
            requestId: req.id || 'unknown',
            timestamp: new Date().toISOString(),
          });
          return;
        }

        comparison.push({
          scenarioId: scen.scenarioId,
          title: scen.title,
          economics: econResult.economics,
        });
      }

      // Check if all evaluated scenarios share the same currency
      const currencies = Array.from(new Set(comparison.map(c => c.economics.currency)));
      let summary = `Evaluated ${comparison.length} anaerobic digestion scenarios at ${dailyFeedstockKg} kg/day throughput.`;
      if (currencies.length === 1) {
        summary += ` All figures computed in ${currencies[0]}.`;
      } else {
        summary += ` Note: Scenarios utilize distinct currencies (${currencies.join(', ')}). Cross-comparison requires exchange rate normalization.`;
      }

      res.status(200).json({
        siteId,
        comparison,
        summary,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
