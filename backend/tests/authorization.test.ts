import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  FileWasteRecordRepository,
  FileFactorRepository,
  FileAnalysisRepository,
} from '../src/repositories/FileRepositories';
import os from 'os';
import path from 'path';
import fs from 'fs';

describe('Server-Side Site Authorization Enforcement', () => {
  let tempDir: string;
  let wasteRepo: FileWasteRecordRepository;
  let factorRepo: FileFactorRepository;
  let analysisRepo: FileAnalysisRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2w-auth-test-'));
    wasteRepo = new FileWasteRecordRepository(tempDir);
    factorRepo = new FileFactorRepository(tempDir);
    analysisRepo = new FileAnalysisRepository(tempDir);
    app = createApp({
      wasteRepo,
      factorRepo,
      analysisRepo,
      storageType: 'file',
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Cross-Site Horizontal Privilege Escalation Defense (HTTP 403)', () => {
    const userHeaders = {
      'X-Verified-User-Sub': 'operator-campus-01',
      'X-Verified-Authorized-Sites': 'site-campus-01', // Strictly authorized for campus 01 only
    };

    it('rejects GET /waste-records for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus-02')
        .set(userHeaders)
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
      expect(res.body.message).toContain('site-campus-02');
    });

    it('rejects POST /waste-records for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .post('/waste-records')
        .set(userHeaders)
        .send({
          siteId: 'site-campus-02',
          date: '2026-03-25',
          category: 'prepared_food',
          massKg: 300,
          source: 'canteen_kitchen',
          contamination: 'clean',
          provenance: 'measured',
        })
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
    });

    it('rejects GET /waste-records/export/csv for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .get('/waste-records/export/csv?siteId=site-campus-02')
        .set(userHeaders)
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
    });

    it('rejects POST /analyses for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .post('/analyses')
        .set(userHeaders)
        .send({
          siteId: 'site-campus-02',
        })
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
    });

    it('rejects POST /scenarios/compare for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .post('/scenarios/compare')
        .set(userHeaders)
        .send({
          siteId: 'site-campus-02',
          dailyFeedstockKg: 400,
          scenarios: [
            {
              scenarioId: 'scen-1',
              title: 'Standard Digestion',
              assumptions: {
                biogasYieldM3PerTonne: 110,
                methaneFractionPct: 60,
                electricalEfficiencyPct: 35,
                capexUsd: 120000,
                opexAnnualUsd: 15000,
                electricityTariffPerKwh: 0.12,
                operatingDaysPerYear: 330,
              },
            },
          ],
        })
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
    });

    it('rejects POST /insights for unauthorized siteId with 403', async () => {
      const res = await request(app)
        .post('/insights')
        .set(userHeaders)
        .send({
          siteId: 'site-campus-02',
        })
        .expect(403);

      expect(res.body.errorCode).toBe('UNAUTHORIZED_SITE_ACCESS');
    });
  });

  describe('Authorized Operations & Super-Admin Wildcard Access (HTTP 200/201)', () => {
    it('allows access when siteId is within authorized claims', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus-01')
        .set({
          'X-Verified-User-Sub': 'operator-campus-01',
          'X-Verified-Authorized-Sites': 'site-campus-01,site-campus-03',
        })
        .expect(200);

      expect(res.body.records).toBeDefined();
    });

    it('allows access for administrative callers with wildcard site access (*)', async () => {
      const res = await request(app)
        .get('/waste-records?siteId=site-campus-02')
        .set({
          'X-Verified-User-Sub': 'sysadmin-lead',
          'X-Verified-Authorized-Sites': '*',
        })
        .expect(200);

      expect(res.body.records).toBeDefined();
    });
  });
});
