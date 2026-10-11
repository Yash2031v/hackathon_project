import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { 
  InMemoryWasteRecordRepository, 
  InMemoryFactorRepository, 
  InMemoryAnalysisRepository 
} from '../../frontend/src/domain/repositories/InMemoryRepositories';

describe('Analyses API Routes', () => {
  let app: ReturnType<typeof createApp>;
  let wasteRepo: InMemoryWasteRecordRepository;
  let analysisRepo: InMemoryAnalysisRepository;

  beforeEach(async () => {
    wasteRepo = new InMemoryWasteRecordRepository();
    const factorRepo = new InMemoryFactorRepository();
    analysisRepo = new InMemoryAnalysisRepository();
    app = createApp({ wasteRepo, factorRepo, analysisRepo, storageType: 'memory' });

    // Seed test records
    await wasteRepo.createRecord({
      id: 'rec-1',
      siteId: 'site-campus',
      date: '2026-03-25',
      source: 'canteen_kitchen',
      category: 'prepared_food',
      massKg: 400,
      massUnit: 'kg',
      contamination: 'clean',
      provenance: 'measured',
      createdAt: '2026-03-25T10:00:00Z',
    });
    await wasteRepo.createRecord({
      id: 'rec-2',
      siteId: 'site-campus',
      date: '2026-03-26',
      source: 'plate_scraps',
      category: 'prepared_food',
      massKg: 500,
      massUnit: 'kg',
      contamination: 'low',
      provenance: 'user_provided',
      createdAt: '2026-03-26T10:00:00Z',
    });
  });

  describe('POST /analyses', () => {
    it('runs deterministic rule evaluation and saves an analysis result snapshot', async () => {
      const res = await request(app)
        .post('/analyses')
        .send({ siteId: 'site-campus' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.analysis).toBeDefined();

      const a = res.body.analysis;
      expect(a.siteId).toBe('site-campus');
      expect(a.totalMassKg).toBe(900);
      expect(a.recordCount).toBe(2);
      expect(a.dailyAverageKg).toBe(450); // 900 kg / 2 days
      expect(a.pathwayCandidates.length).toBeGreaterThan(0);

      // Anaerobic digestion candidate check (volume 450 kg/day > 300)
      const ad = a.pathwayCandidates.find((c: any) => c.pathway === 'anaerobic_digestion');
      expect(ad).toBeDefined();
      expect(ad.suitability).toBe('promising');

      // Metric items check
      expect(a.metrics.length).toBeGreaterThan(0);
      const massMetric = a.metrics.find((m: any) => m.metricId === 'met-total-mass');
      expect(massMetric.value).toBe(900);

      // Verify analysis was saved in repository
      const savedInRepo = await analysisRepo.getAnalysisById(a.analysisId);
      expect(savedInRepo).toBeDefined();
    });

    it('returns 400 Validation Error when siteId is missing', async () => {
      const res = await request(app)
        .post('/analyses')
        .send({})
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /analyses/:id', () => {
    it('retrieves an existing analysis by ID', async () => {
      // Create first
      const createRes = await request(app)
        .post('/analyses')
        .send({ siteId: 'site-campus' })
        .expect(201);

      const id = createRes.body.analysis.analysisId;

      const getRes = await request(app)
        .get(`/analyses/${id}`)
        .expect(200);

      expect(getRes.body.analysis).toBeDefined();
      expect(getRes.body.analysis.analysisId).toBe(id);
    });

    it('returns 404 with structured error response for non-existent analysis ID', async () => {
      const res = await request(app)
        .get('/analyses/ana-non-existent-999')
        .expect(404);

      expect(res.body.errorCode).toBe('ANALYSIS_NOT_FOUND');
      expect(res.body.message).toMatch(/not found/);
      expect(res.body.timestamp).toBeDefined();
    });
  });
});
