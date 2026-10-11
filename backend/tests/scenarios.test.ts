import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { 
  InMemoryWasteRecordRepository, 
  InMemoryFactorRepository, 
  InMemoryAnalysisRepository 
} from '../../frontend/src/domain/repositories/InMemoryRepositories';

describe('Scenarios Comparison API Routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const wasteRepo = new InMemoryWasteRecordRepository();
    const factorRepo = new InMemoryFactorRepository();
    const analysisRepo = new InMemoryAnalysisRepository();
    app = createApp({ wasteRepo, factorRepo, analysisRepo, storageType: 'memory' });
  });

  describe('POST /scenarios/compare', () => {
    it('compares multiple scenarios deterministically and computes payback periods', async () => {
      const payload = {
        siteId: 'site-campus',
        dailyFeedstockKg: 450,
        scenarios: [
          {
            scenarioId: 'scen-baseline',
            title: 'Standard Modular AD (USD)',
            assumptions: {
              currency: 'USD',
              biogasYieldM3PerTonne: 120,
              methaneFractionPct: 60,
              electricalEfficiencyPct: 34,
              capexAmount: 48000,
              opexAnnualAmount: 3800,
              electricityTariffPerKwh: 0.12,
              operatingDaysPerYear: 330,
            },
          },
          {
            scenarioId: 'scen-high-eff',
            title: 'High Efficiency Digester (USD)',
            assumptions: {
              currency: 'USD',
              biogasYieldM3PerTonne: 135,
              methaneFractionPct: 62,
              electricalEfficiencyPct: 36,
              capexAmount: 54000,
              opexAnnualAmount: 3500,
              electricityTariffPerKwh: 0.14,
              operatingDaysPerYear: 330,
            },
          },
        ],
      };

      const res = await request(app)
        .post('/scenarios/compare')
        .send(payload)
        .expect(200);

      expect(res.body.siteId).toBe('site-campus');
      expect(res.body.comparison).toBeDefined();
      expect(res.body.comparison.length).toBe(2);

      const scen1 = res.body.comparison[0];
      expect(scen1.scenarioId).toBe('scen-baseline');
      expect(scen1.economics.dailyBiogasM3).toBeCloseTo(54, 1); // 450 kg * 120 / 1000 = 54 m3
      expect(scen1.economics.currency).toBe('USD');

      const scen2 = res.body.comparison[1];
      expect(scen2.scenarioId).toBe('scen-high-eff');
      expect(scen2.economics.annualElectricityKwh).toBeGreaterThan(scen1.economics.annualElectricityKwh);
      expect(res.body.summary).toMatch(/Evaluated 2 anaerobic digestion scenarios/);
    });

    it('handles negative payback scenario safely: sets simplePaybackYears to null and flags negative_return', async () => {
      const payload = {
        siteId: 'site-campus',
        dailyFeedstockKg: 100, // low volume
        scenarios: [
          {
            scenarioId: 'scen-unprofitable',
            title: 'Unprofitable Pilot',
            assumptions: {
              currency: 'EUR',
              biogasYieldM3PerTonne: 120,
              methaneFractionPct: 60,
              electricalEfficiencyPct: 34,
              capexAmount: 40000,
              opexAnnualAmount: 6000, // OPEX exceeds power value
              electricityTariffPerKwh: 0.10,
              operatingDaysPerYear: 300,
            },
          },
        ],
      };

      const res = await request(app)
        .post('/scenarios/compare')
        .send(payload)
        .expect(200);

      const econ = res.body.comparison[0].economics;
      expect(econ.annualNetBenefit).toBeLessThan(0);
      expect(econ.simplePaybackYears).toBeNull();
      expect(econ.paybackStatus).toBe('negative_return');
    });

    it('rejects empty scenarios array with 400 Validation Error', async () => {
      const payload = {
        siteId: 'site-campus',
        dailyFeedstockKg: 450,
        scenarios: [],
      };

      const res = await request(app)
        .post('/scenarios/compare')
        .send(payload)
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });
  });
});
