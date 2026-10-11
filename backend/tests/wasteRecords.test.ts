import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryWasteRecordRepository, InMemoryFactorRepository, InMemoryAnalysisRepository } from '../../frontend/src/domain/repositories/InMemoryRepositories';

describe('Waste Records API Routes', () => {
  let app: ReturnType<typeof createApp>;
  let wasteRepo: InMemoryWasteRecordRepository;

  beforeEach(() => {
    wasteRepo = new InMemoryWasteRecordRepository();
    const factorRepo = new InMemoryFactorRepository();
    const analysisRepo = new InMemoryAnalysisRepository();
    app = createApp({ wasteRepo, factorRepo, analysisRepo, storageType: 'memory' });
  });

  describe('POST /waste-records', () => {
    it('creates a new waste record with valid payload', async () => {
      const payload = {
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 420.5,
        contamination: 'clean',
        provenance: 'measured',
        notes: 'Calibrated scale receipt #402',
      };

      const res = await request(app)
        .post('/waste-records')
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.record).toBeDefined();
      expect(res.body.record.id).toBeDefined();
      expect(res.body.record.massKg).toBe(420.5);
      expect(res.body.record.category).toBe('prepared_food');
      expect(res.header['x-request-id']).toBeDefined();
    });

    it('rejects payload with negative mass with 400 Validation Error', async () => {
      const payload = {
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: -50,
        contamination: 'clean',
        provenance: 'measured',
      };

      const res = await request(app)
        .post('/waste-records')
        .send(payload)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.some((d: string) => d.includes('massKg'))).toBe(true);
    });

    it('rejects batch mass exceeding 50,000 kg physical plausibility bound', async () => {
      const payload = {
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 75000,
        contamination: 'clean',
        provenance: 'measured',
      };

      const res = await request(app)
        .post('/waste-records')
        .send(payload)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.details.some((d: string) => d.includes('exceeds realistic physical limit'))).toBe(true);
    });

    it('rejects invalid ISO date format', async () => {
      const payload = {
        siteId: 'site-campus',
        date: 'invalid-date',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 100,
        contamination: 'clean',
        provenance: 'measured',
      };

      const res = await request(app)
        .post('/waste-records')
        .send(payload)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /waste-records', () => {
    beforeEach(async () => {
      await wasteRepo.createRecord({
        id: 'r1',
        siteId: 'site-campus',
        date: '2026-03-20',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 300,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-20T10:00:00Z',
      });
      await wasteRepo.createRecord({
        id: 'r2',
        siteId: 'site-campus',
        date: '2026-03-22',
        source: 'plate_scraps',
        category: 'prepared_food',
        massKg: 400,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'user_provided',
        createdAt: '2026-03-22T10:00:00Z',
      });
      await wasteRepo.createRecord({
        id: 'r3',
        siteId: 'site-other',
        date: '2026-03-24',
        source: 'campus_cafe',
        category: 'fruit_vegetable',
        massKg: 50,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-24T10:00:00Z',
      });
    });

    it('lists records for a specific site with pagination metadata', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus')
        .expect(200);

      expect(res.body.totalCount).toBe(2);
      expect(res.body.records.length).toBe(2);
      expect(res.body.limit).toBe(50);
      expect(res.body.offset).toBe(0);
    });

    it('filters records by category and date range', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus&category=prepared_food&startDate=2026-03-21')
        .expect(200);

      expect(res.body.totalCount).toBe(1);
      expect(res.body.records[0].id).toBe('r2');
    });

    it('respects limit and offset for pagination', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus&limit=1&offset=0')
        .expect(200);

      expect(res.body.records.length).toBe(1);
      expect(res.body.totalCount).toBe(2);
      expect(res.body.limit).toBe(1);
    });

    it('rejects request missing siteId with 400 Validation Error', async () => {
      const res = await request(app)
        .get('/waste-records')
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });
});
