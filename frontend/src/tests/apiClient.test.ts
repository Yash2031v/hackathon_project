import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../lib/apiClient';

describe('Frontend API Client (apiClient)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('exposes configured base URL', () => {
    expect(apiClient.getBaseUrl()).toBeTruthy();
  });

  it('fetches waste records with query parameters', async () => {
    const mockResponse = {
      records: [
        {
          id: 'rec-1',
          siteId: 'site-campus-main',
          date: '2026-03-01',
          source: 'canteen_kitchen',
          category: 'prepared_food',
          massKg: 420,
          contamination: 'low',
          provenance: 'measured',
          createdAt: '2026-03-01T10:00:00Z',
        },
      ],
      totalCount: 1,
      limit: 50,
      offset: 0,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient.getWasteRecords({
      siteId: 'site-campus-main',
      category: 'prepared_food',
      limit: 20,
    });

    expect(result.records).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('siteId=site-campus-main'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('throws ApiError with structured details when server returns 400', async () => {
    const errorPayload = {
      statusCode: 400,
      errorCode: 'VALIDATION_ERROR',
      message: 'Request payload failed schema validation.',
      details: ['massKg: Mass must be positive'],
      timestamp: '2026-03-01T12:00:00Z',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => errorPayload,
    });

    await expect(
      apiClient.createWasteRecord({
        siteId: 'site-campus-main',
        date: '2026-03-01',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: -10,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'user_provided',
      })
    ).rejects.toThrow(ApiError);
  });

  it('calls POST /analyses and parses analysis response', async () => {
    const mockAnalysis = {
      success: true,
      analysis: {
        analysisId: 'ana-test-1',
        siteId: 'site-campus-main',
        dateRange: { start: '2026-03-01', end: '2026-03-07' },
        recordCount: 10,
        totalMassKg: 4500,
        dailyAverageKg: 450,
        missingData: [],
        uncertaintyNotes: [],
        pathwayCandidates: [],
        summary: 'Synthetic analysis summary',
        recommendedNextStep: 'Pilot digestion',
        createdAt: '2026-03-07T10:00:00Z',
      },
      message: 'Analysis completed successfully',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAnalysis,
    });

    const result = await apiClient.createAnalysis({
      siteId: 'site-campus-main',
    });

    expect(result.success).toBe(true);
    expect(result.analysis.analysisId).toBe('ana-test-1');
  });

  it('calls POST /scenarios/compare with multiple scenarios', async () => {
    const mockComparison = {
      siteId: 'site-campus-main',
      comparison: [
        {
          scenarioId: 'sc-1',
          title: 'Baseline Digester',
          economics: {
            currency: 'USD',
            dailyFeedstockKg: 430,
            annualFeedstockTonnes: 129,
            dailyBiogasM3: 50,
            annualBiogasM3: 15000,
            annualElectricityKwh: 30000,
            annualEnergyValue: 4500,
            annualNetBenefit: 2500,
            simplePaybackYears: 12,
            paybackStatus: 'moderate',
          },
        },
      ],
      summary: 'Comparison of 1 scenarios',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComparison,
    });

    const res = await apiClient.compareScenarios({
      siteId: 'site-campus-main',
      dailyFeedstockKg: 430,
      scenarios: [
        {
          scenarioId: 'sc-1',
          title: 'Baseline Digester',
          assumptions: {
            currency: 'USD',
            biogasYieldM3PerTonne: 120,
            methaneFractionPct: 60,
            electricalEfficiencyPct: 34,
            electricityTariffPerKwh: 0.15,
            capexAmount: 65000,
            opexAnnualAmount: 2000,
            operatingDaysPerYear: 300,
          },
        },
      ],
    });

    expect(res.comparison).toHaveLength(1);
    expect(res.comparison[0].scenarioId).toBe('sc-1');
  });

  it('posts generateInsights and returns grounded insight payload', async () => {
    const mockInsightResponse = {
      success: true,
      insights: {
        summary: 'Deterministic Environmental Assessment for site-campus-main.',
        status: 'available',
        insights: [],
        recommendations: [],
        missingData: [],
        assumptions: [],
        provider: 'deterministic',
        modelIdentifier: 'rule-based-v1',
        generatedAt: '2026-03-28T10:00:00Z',
        humanReviewRequired: true,
      },
      message: 'Insights generated successfully.',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockInsightResponse,
    });

    const res = await apiClient.generateInsights({
      siteId: 'site-campus-main',
    });

    expect(res.success).toBe(true);
    expect(res.insights.provider).toBe('deterministic');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/insights'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });

  it('fetches insights config metadata', async () => {
    const mockConfig = {
      provider: 'deterministic',
      model: 'deterministic-rules-v1',
      hasApiKey: false,
      timeoutMs: 10000,
      fallbackAvailable: true,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    });

    const res = await apiClient.getInsightsConfig();
    expect(res.provider).toBe('deterministic');
    expect(res.hasApiKey).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/insights/config'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});
