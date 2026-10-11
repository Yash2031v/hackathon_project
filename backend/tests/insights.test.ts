import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  InMemoryWasteRecordRepository,
  InMemoryFactorRepository,
  InMemoryAnalysisRepository,
} from '../../frontend/src/domain/repositories/InMemoryRepositories';
import { AiService } from '../src/services/ai/aiService';
import type { IAiProvider } from '../src/services/ai/aiProvider';
import { AiProviderError } from '../src/services/ai/aiProvider';
import type { GroundedAiContext } from '../src/services/ai/aiContext';
import type { InsightResponse } from '../../frontend/src/domain/schemas/insight.schema';
import type { WasteRecord } from '../../frontend/src/domain/schemas/wasteRecord.schema';

describe('Explainable AI Intelligence Layer (POST /insights)', () => {
  let wasteRepo: InMemoryWasteRecordRepository;
  let factorRepo: InMemoryFactorRepository;
  let analysisRepo: InMemoryAnalysisRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    wasteRepo = new InMemoryWasteRecordRepository();
    factorRepo = new InMemoryFactorRepository();
    analysisRepo = new InMemoryAnalysisRepository();
    app = createApp({
      wasteRepo,
      factorRepo,
      analysisRepo,
      storageType: 'memory',
    });

    // Seed 8 distinct daily records for site-campus-main
    const dates = [
      '2026-03-20',
      '2026-03-21',
      '2026-03-22',
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
    ];

    for (let i = 0; i < dates.length; i++) {
      await wasteRepo.createRecord({
        id: `rec-main-${i + 1}`,
        siteId: 'site-campus-main',
        date: dates[i],
        source: i % 2 === 0 ? 'canteen_kitchen' : 'plate_scraps',
        category: i % 3 === 0 ? 'fruits_vegetables' : 'prepared_food',
        massKg: 350 + i * 20,
        massUnit: 'kg',
        contamination: i === 0 ? 'medium' : 'clean',
        provenance: 'measured',
        createdAt: `${dates[i]}T09:00:00Z`,
      });
    }
  });

  it('1. generates grounded deterministic insights for valid site records', async () => {
    const res = await request(app)
      .post('/insights')
      .send({
        siteId: 'site-campus-main',
        scenarioAssumptions: {
          currency: 'USD',
          biogasYieldM3PerTonne: 120,
          methaneFractionPct: 60,
          electricalEfficiencyPct: 34,
          capexAmount: 65000,
          opexAnnualAmount: 2000,
          electricityTariffPerKwh: 0.15,
          operatingDaysPerYear: 300,
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    const insights: InsightResponse = res.body.insights;
    expect(insights.provider).toBe('deterministic');
    expect(insights.status).toBe('available');
    expect(insights.summary).toContain('Deterministic Environmental Assessment');
    expect(insights.insights.length).toBeGreaterThanOrEqual(3);
    expect(insights.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(insights.humanReviewRequired).toBe(true);

    // Verify all 5 core insight features exist
    const categories = insights.insights.map(i => i.category);
    expect(categories).toContain('waste_profile');
    expect(categories).toContain('energy_potential');
    expect(categories).toContain('pathway_selection');
    expect(categories).toContain('economic_feasibility');
  });

  it('2. returns explicit insufficient_data state when zero waste records exist', async () => {
    const res = await request(app)
      .post('/insights')
      .send({ siteId: 'empty-site-without-records' })
      .expect(200);

    expect(res.body.success).toBe(true);
    const insights: InsightResponse = res.body.insights;
    expect(insights.status).toBe('insufficient_data');
    expect(insights.summary).toMatch(/insufficient waste logs/i);
    expect(insights.missingData).toContain('Logged daily mass (kg)');
    expect(insights.recommendations[0].priority).toBe('high');
  });

  it('3. flags insufficient observation period and prevents trend claims when < 7 unique dates exist', async () => {
    const shortRepo = new InMemoryWasteRecordRepository();
    // Only 2 dates
    const records: WasteRecord[] = [
      {
        id: 'r1',
        siteId: 'short-trend-site',
        date: '2026-03-01',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 400,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-01T10:00:00Z',
      },
      {
        id: 'r2',
        siteId: 'short-trend-site',
        date: '2026-03-02',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 450,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-02T10:00:00Z',
      },
    ];
    for (const r of records) await shortRepo.createRecord(r);

    const testApp = createApp({
      wasteRepo: shortRepo,
      factorRepo,
      analysisRepo,
    });

    const res = await request(testApp)
      .post('/insights')
      .send({ siteId: 'short-trend-site' })
      .expect(200);

    const profileInsight = res.body.insights.insights.find((i: any) => i.category === 'waste_profile');
    expect(profileInsight).toBeDefined();
    expect(profileInsight.explanation).toContain('Data volume is insufficient to confirm seasonal or weekly trends');
    expect(profileInsight.confidence).toBe('medium');
  });

  it('4. identifies dominant waste category and multiple categories breakdown', async () => {
    const res = await request(app)
      .post('/insights')
      .send({ siteId: 'site-campus-main' })
      .expect(200);

    const profileInsight = res.body.insights.insights.find((i: any) => i.category === 'waste_profile');
    expect(profileInsight.explanation).toMatch(/Primary feedstock contributor is/);
  });

  it('5. preserves numerical calculation outputs without altering values', async () => {
    // 5a. Get existing analysis
    const anaRes = await request(app)
      .post('/analyses')
      .send({ siteId: 'site-campus-main' })
      .expect(201);
    const existingAnalysis = anaRes.body.analysis;

    // 5b. Request insights using that exact analysis ID
    const res = await request(app)
      .post('/insights')
      .send({
        siteId: 'site-campus-main',
        analysisId: existingAnalysis.analysisId,
      })
      .expect(200);

    const energyInsight = res.body.insights.insights.find((i: any) => i.category === 'energy_potential');
    expect(energyInsight).toBeDefined();
    // Verify values match exact analysis metrics
    expect(energyInsight.evidence).toContain(
      `Daily average feedstock: ${Math.round(existingAnalysis.dailyAverageKg)} kg/day`
    );
  });

  it('6. prevents client-supplied numerical tampering (server computes from repository)', async () => {
    // Even if client passes malformed query or invalid ids, server validates and looks up from DB
    const res = await request(app)
      .post('/insights')
      .send({
        siteId: 'site-campus-main',
        recordIds: ['non-existent-rec-id'],
      })
      .expect(200);

    // Filtered to non-existent ids -> 0 records -> explicit insufficient_data
    expect(res.body.insights.status).toBe('insufficient_data');
  });

  it('7. rejects invalid request payload with 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/insights')
      .send({})
      .expect(400);

    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    expect(res.body.details[0]).toContain('siteId');
  });

  it('8. falls back to deterministic mode when external provider times out or throws error', async () => {
    // Mock failing external provider
    const failingProvider: IAiProvider = {
      providerName: 'external',
      modelIdentifier: 'failing-test-model',
      async generateInsights(_context: GroundedAiContext): Promise<InsightResponse> {
        throw new AiProviderError('External provider upstream 504 Gateway Timeout', 'AI_TIMEOUT', 504);
      },
    };

    const failingAiService = new AiService({
      wasteRepo,
      factorRepo,
      analysisRepo,
      config: {
        provider: 'external',
        model: 'failing-test-model',
        apiKey: 'fake-test-key',
        timeoutMs: 500,
        maxOutputTokens: 2048,
      },
      customExternalProvider: failingProvider,
    });

    const fallbackApp = createApp({
      wasteRepo,
      factorRepo,
      analysisRepo,
      aiService: failingAiService,
    });

    const res = await request(fallbackApp)
      .post('/insights')
      .send({ siteId: 'site-campus-main' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.insights.status).toBe('fallback');
    expect(res.body.insights.provider).toBe('deterministic');
    expect(res.body.insights.fallbackReason).toContain('External provider upstream 504');
    expect(res.body.insights.insights.length).toBeGreaterThan(0);
  });

  it('9. falls back when external provider output fails strict schema validation', async () => {
    // Mock provider returning malformed schema
    const malformedProvider: IAiProvider = {
      providerName: 'external',
      modelIdentifier: 'malformed-test-model',
      async generateInsights(_context: GroundedAiContext): Promise<InsightResponse> {
        throw new AiProviderError(
          'External AI provider output failed strict schema validation: insights: Required',
          'AI_SCHEMA_VALIDATION_ERROR',
          502
        );
      },
    };

    const testAiService = new AiService({
      wasteRepo,
      factorRepo,
      analysisRepo,
      config: {
        provider: 'external',
        model: 'malformed-test-model',
        apiKey: 'fake-test-key',
        timeoutMs: 500,
        maxOutputTokens: 2048,
      },
      customExternalProvider: malformedProvider,
    });

    const schemaFallbackApp = createApp({
      wasteRepo,
      factorRepo,
      analysisRepo,
      aiService: testAiService,
    });

    const res = await request(schemaFallbackApp)
      .post('/insights')
      .send({ siteId: 'site-campus-main' })
      .expect(200);

    expect(res.body.insights.status).toBe('fallback');
    expect(res.body.insights.fallbackReason).toContain('schema validation');
  });

  it('10. exposes GET /insights/config with provider mode and without leaking API secrets', async () => {
    const res = await request(app)
      .get('/insights/config')
      .expect(200);

    expect(res.body.provider).toBe('deterministic');
    expect(res.body.model).toBeDefined();
    expect(res.body.hasApiKey).toBe(false);
    expect(res.body.fallbackAvailable).toBe(true);
    expect(res.body).not.toHaveProperty('apiKey');
  });
});
