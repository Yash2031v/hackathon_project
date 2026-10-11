import type { IWasteRecordRepository } from '../../../../frontend/src/domain/repositories/IWasteRecordRepository';
import type { IFactorRepository } from '../../../../frontend/src/domain/repositories/IFactorRepository';
import type { IAnalysisRepository } from '../../../../frontend/src/domain/repositories/IAnalysisRepository';
import type { ScenarioAssumptions, ScenarioEconomics } from '../../../../frontend/src/domain/schemas/scenario.schema';
import type { InsightResponse } from '../../../../frontend/src/domain/schemas/insight.schema';
import { calculateScenarioEconomics } from '../../../../frontend/src/domain/services/scenarioEconomicsEngine';
import { evaluatePathwayRules } from '../../../../frontend/src/domain/services/pathwayRuleEngine';
import { calculateBiogasEnergyPotential } from '../../../../frontend/src/domain/services/biogasEnergyEngine';
import type { AnalysisResult, MetricItem } from '../../../../frontend/src/domain/schemas/analysis.schema';
import { DeterministicInsightProvider } from './deterministicInsightProvider';
import { ExternalHttpAiProvider, type IAiProvider } from './aiProvider';
import { getAiConfig, type AiConfig } from './aiConfig';
import { buildGroundedDataQualityProfile, type GroundedAiContext } from './aiContext';

export interface AiServiceDependencies {
  wasteRepo: IWasteRecordRepository;
  factorRepo: IFactorRepository;
  analysisRepo: IAnalysisRepository;
  config?: AiConfig;
  customExternalProvider?: IAiProvider;
}

export class AiService {
  private readonly wasteRepo: IWasteRecordRepository;
  private readonly factorRepo: IFactorRepository;
  private readonly analysisRepo: IAnalysisRepository;
  private readonly config: AiConfig;
  private readonly deterministicProvider: DeterministicInsightProvider;
  private readonly externalProvider: IAiProvider | null;

  constructor(deps: AiServiceDependencies) {
    this.wasteRepo = deps.wasteRepo;
    this.factorRepo = deps.factorRepo;
    this.analysisRepo = deps.analysisRepo;
    this.config = deps.config || getAiConfig();
    this.deterministicProvider = new DeterministicInsightProvider();

    if (deps.customExternalProvider) {
      this.externalProvider = deps.customExternalProvider;
    } else if (this.config.provider === 'external' && this.config.apiKey) {
      this.externalProvider = new ExternalHttpAiProvider(this.config);
    } else {
      this.externalProvider = null;
    }
  }

  getConfig(): AiConfig {
    return { ...this.config };
  }

  async generateInsights(params: {
    siteId: string;
    analysisId?: string;
    recordIds?: string[];
    scenarioAssumptions?: ScenarioAssumptions;
  }): Promise<InsightResponse> {
    const { siteId, analysisId, recordIds, scenarioAssumptions } = params;

    // 1. Fetch site waste records from server repository
    const { records: allRecords } = await this.wasteRepo.listRecords({ siteId });
    const targetRecords = recordIds && recordIds.length > 0
      ? allRecords.filter(r => recordIds.includes(r.id))
      : allRecords;

    // 2. Resolve or deterministically recalculate analysis result
    let analysis: AnalysisResult | null = null;
    if (analysisId) {
      analysis = await this.analysisRepo.getAnalysisById(analysisId);
    }

    if (!analysis) {
      // Run authoritative deterministic calculation engines
      const pathwayResult = evaluatePathwayRules(targetRecords);
      const factors = await this.factorRepo.listFactors();
      const energyResult = calculateBiogasEnergyPotential({
        dailyFeedstockKg: pathwayResult.dailyAverageKg,
        operatingDaysPerYear: 330,
        factors,
      });

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

      const dates = targetRecords.map(r => r.date).sort();
      const cleanCount = targetRecords.filter(r => r.contamination === 'clean' || r.contamination === 'low').length;
      const cleanPct = targetRecords.length > 0 ? Math.round((cleanCount / targetRecords.length) * 100) : 0;

      const categoryTotals: Record<string, number> = {};
      for (const r of targetRecords) {
        categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.massKg;
      }
      let topCategory = null;
      let topMass = 0;
      for (const [cat, mass] of Object.entries(categoryTotals)) {
        if (mass > topMass) {
          topMass = mass;
          topCategory = cat as any;
        }
      }

      analysis = {
        analysisId: `ana-live-${Date.now()}`,
        siteId,
        createdAt: new Date().toISOString(),
        dateRange: {
          start: dates[0] || new Date().toISOString().split('T')[0],
          end: dates[dates.length - 1] || new Date().toISOString().split('T')[0],
        },
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
        summary: `Deterministic evaluation across ${targetRecords.length} records.`,
        recommendedNextStep: 'Review pathway hierarchy and proximate solids analysis.',
        missingData: pathwayResult.missingData,
        uncertaintyNotes: pathwayResult.uncertaintyNotes,
        executionStatus: pathwayResult.status === 'insufficient_data' ? 'insufficient_data' : 'completed',
        humanReviewRequired: true,
      };
    }

    // 3. Deterministic economic evaluation if assumptions supplied
    let economics: ScenarioEconomics | undefined = undefined;
    if (scenarioAssumptions && analysis.dailyAverageKg > 0) {
      const econResult = calculateScenarioEconomics({
        dailyFeedstockKg: analysis.dailyAverageKg,
        assumptions: scenarioAssumptions,
      });
      if (econResult.success) {
        economics = econResult.economics;
      }
    }

    // 4. Build trusted context
    const factors = await this.factorRepo.listFactors();
    const dataQuality = buildGroundedDataQualityProfile(targetRecords);
    const context: GroundedAiContext = {
      siteId,
      records: targetRecords,
      analysis,
      factors,
      economics,
      assumptions: scenarioAssumptions,
      dataQuality,
    };

    // 5. Provider Execution & Safe Fallback
    if (this.config.provider === 'external' && this.externalProvider) {
      try {
        const externalResult = await this.externalProvider.generateInsights(context);
        return externalResult;
      } catch (externalError: unknown) {
        const errorReason = externalError instanceof Error ? externalError.message : 'External AI provider failure';
        console.warn(`[AiService] External provider failed. Executing deterministic fallback. Reason: ${errorReason}`);

        const fallbackResult = await this.deterministicProvider.generateInsights(context);
        return {
          ...fallbackResult,
          status: 'fallback',
          fallbackReason: `External provider unavailable (${errorReason}). Insights safely computed by deterministic engine.`,
        };
      }
    }

    // Default: Mode A (Deterministic)
    return this.deterministicProvider.generateInsights(context);
  }
}
