import { Router } from 'express';
import type { IWasteRecordRepository } from '../../../frontend/src/domain/repositories/IWasteRecordRepository';
import type { IFactorRepository } from '../../../frontend/src/domain/repositories/IFactorRepository';
import type { IAnalysisRepository } from '../../../frontend/src/domain/repositories/IAnalysisRepository';
import { CreateAnalysisRequestSchema } from '../../../frontend/src/domain/contracts/apiContracts';
import { evaluatePathwayRules } from '../../../frontend/src/domain/services/pathwayRuleEngine';
import { calculateBiogasEnergyPotential } from '../../../frontend/src/domain/services/biogasEnergyEngine';
import type { AnalysisResult, MetricItem } from '../../../frontend/src/domain/schemas/analysis.schema';

import { requireSiteAuthorization, extractVerifiedUser } from '../middleware/authorization';

export function createAnalysesRouter(
  wasteRepo: IWasteRecordRepository,
  factorRepo: IFactorRepository,
  analysisRepo: IAnalysisRepository
): Router {
  const router = Router();

  // POST /analyses
  router.post(
    '/',
    requireSiteAuthorization(req => req.body?.siteId),
    async (req, res, next) => {
    try {
      const { siteId, recordIds } = CreateAnalysisRequestSchema.parse(req.body);

      // 1. Fetch site records
      const { records: allRecords } = await wasteRepo.listRecords({ siteId });
      const targetRecords = recordIds && recordIds.length > 0
        ? allRecords.filter(r => recordIds.includes(r.id))
        : allRecords;

      // 2. Run deterministic rule evaluation
      const pathwayResult = evaluatePathwayRules(targetRecords);

      // 3. Fetch factors snapshot
      const factors = await factorRepo.listFactors();

      // 4. Calculate deterministic biogas & energy yield
      const energyResult = calculateBiogasEnergyPotential({
        dailyFeedstockKg: pathwayResult.dailyAverageKg,
        operatingDaysPerYear: 330,
        factors,
      });

      // 5. Build reproducible metrics
      const metrics: MetricItem[] = [
        {
          metricId: 'met-total-mass',
          name: 'Total Tracked Mass',
          value: pathwayResult.totalMassKg,
          unit: 'kg',
          status: 'measured',
          factorIds: [],
        },
        {
          metricId: 'met-daily-avg',
          name: 'Average Daily Generation',
          value: parseFloat(pathwayResult.dailyAverageKg.toFixed(1)),
          unit: 'kg/day',
          status: 'estimated',
          factorIds: [],
        },
      ];

      if (energyResult.success) {
        metrics.push(
          {
            metricId: 'met-biogas-annual',
            name: 'Annual Potential Biogas Volume',
            value: Math.round(energyResult.annualBiogasM3),
            unit: 'm³/year',
            status: 'estimated',
            factorIds: ['FAC-AD-YIELD-FW'],
          },
          {
            metricId: 'met-elec-annual',
            name: 'Annual Cogeneration Electricity',
            value: Math.round(energyResult.annualElectricityKwh),
            unit: 'kWh/year',
            status: 'estimated',
            factorIds: ['FAC-CH4-LHV', 'FAC-CH4-FRACTION', 'FAC-CHP-EFF-EL'],
          }
        );
      }

      // Date range calculation
      const dates = targetRecords.map(r => r.date).sort();
      const dateRange = {
        start: dates[0] || new Date().toISOString().split('T')[0],
        end: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
      };

      // Predominant category
      const categoryCounts: Record<string, number> = {};
      for (const r of targetRecords) {
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + r.massKg;
      }
      let topCategory = null;
      let topMass = 0;
      for (const [cat, mass] of Object.entries(categoryCounts)) {
        if (mass > topMass) {
          topMass = mass;
          topCategory = cat as any;
        }
      }

      const cleanCount = targetRecords.filter(r => r.contamination === 'clean' || r.contamination === 'low').length;
      const cleanPct = targetRecords.length > 0 ? Math.round((cleanCount / targetRecords.length) * 100) : 0;

      const adCandidate = pathwayResult.candidates.find(c => c.pathway === 'anaerobic_digestion');
      const isAdViable = adCandidate?.suitability === 'promising';

      const summary = `Evaluated across ${targetRecords.length} logged batches (${pathwayResult.totalMassKg.toLocaleString()} kg total). Verified average generation rate of ~${Math.round(pathwayResult.dailyAverageKg)} kg/day. Feedstock exhibits ${isAdViable ? 'high suitability' : 'conditional suitability'} for modular anaerobic digestion, with source screening recommended to protect digester performance.`;

      const recommendedNextStep = isAdViable
        ? 'Conduct a targeted 14-day contaminant audit at dish return stations, while initiating a sizing study for a 500 kg/day modular anaerobic digestion system.'
        : 'Gather additional daily weighing logs and implement kitchen prep sorting before committing capital to digestion infrastructure.';

      const analysis: AnalysisResult = {
        analysisId: `ana-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        siteId,
        createdAt: new Date().toISOString(),
        dateRange,
        recordCount: targetRecords.length,
        inputRecordIds: targetRecords.map(r => r.id),
        totalMassKg: pathwayResult.totalMassKg,
        dailyAverageKg: parseFloat(pathwayResult.dailyAverageKg.toFixed(1)),
        predominantCategory: topCategory,
        contaminationProfile: {
          cleanPct,
          moderateSeverePct: 100 - cleanPct,
        },
        metrics,
        pathwayCandidates: pathwayResult.candidates,
        factorSnapshot: factors,
        summary,
        recommendedNextStep,
        missingData: pathwayResult.missingData,
        uncertaintyNotes: pathwayResult.uncertaintyNotes,
        executionStatus: pathwayResult.status === 'insufficient_data' ? 'insufficient_data' : 'completed',
        humanReviewRequired: true,
      };

      const saved = await analysisRepo.createAnalysis(analysis);

      res.status(201).json({
        success: true,
        analysis: saved,
        message: 'Analysis generated and saved successfully.',
      });
    } catch (error) {
      next(error);
    }
  });

  // GET /analyses/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params;
      const analysis = await analysisRepo.getAnalysisById(id);

      if (!analysis) {
        res.status(404).json({
          statusCode: 404,
          errorCode: 'ANALYSIS_NOT_FOUND',
          message: `Analysis with ID '${id}' was not found.`,
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Verify site authorization
      const user = extractVerifiedUser(req);
      if (user && !user.authorizedSites.includes('*') && !user.authorizedSites.includes(analysis.siteId)) {
        res.status(403).json({
          statusCode: 403,
          errorCode: 'UNAUTHORIZED_SITE_ACCESS',
          message: `Forbidden: Caller is not authorized to access analysis for site '${analysis.siteId}'.`,
          requestId: req.id || 'unknown',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({ analysis });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
