import { describe, it, expect } from 'vitest';
import { 
  InMemoryWasteRecordRepository, 
  InMemoryFactorRepository, 
  InMemoryAnalysisRepository 
} from '../repositories/InMemoryRepositories';
import type { WasteRecord } from '../schemas/wasteRecord.schema';
import type { AnalysisResult } from '../schemas/analysis.schema';
import { 
  CreateWasteRecordRequestSchema, 
  GetWasteRecordsQuerySchema, 
  CreateAnalysisRequestSchema, 
  CompareScenariosRequestSchema 
} from '../contracts/apiContracts';

describe('Repository Interfaces & In-Memory Adapters', () => {
  describe('InMemoryWasteRecordRepository', () => {
    it('creates, retrieves, filters, paginates, and deletes records', async () => {
      const repo = new InMemoryWasteRecordRepository();

      const r1: WasteRecord = {
        id: 'rec-1',
        siteId: 'site-alpha',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 300,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T10:00:00Z',
      };
      const r2: WasteRecord = {
        id: 'rec-2',
        siteId: 'site-alpha',
        date: '2026-03-26',
        source: 'plate_scraps',
        category: 'prepared_food',
        massKg: 400,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'user_provided',
        createdAt: '2026-03-26T10:00:00Z',
      };
      const r3: WasteRecord = {
        id: 'rec-3',
        siteId: 'site-beta',
        date: '2026-03-26',
        source: 'campus_cafe',
        category: 'fruit_vegetable',
        massKg: 80,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-26T10:00:00Z',
      };

      await repo.createRecord(r1);
      await repo.createRecord(r2);
      await repo.createRecord(r3);

      // Filter by siteId
      const alphaList = await repo.listRecords({ siteId: 'site-alpha' });
      expect(alphaList.totalCount).toBe(2);
      expect(alphaList.records.length).toBe(2);

      // Pagination test
      const paginated = await repo.listRecords({ siteId: 'site-alpha', limit: 1, offset: 0 });
      expect(paginated.records.length).toBe(1);
      expect(paginated.totalCount).toBe(2);

      // Filter by category
      const prepFood = await repo.listRecords({ category: 'prepared_food' });
      expect(prepFood.totalCount).toBe(2);

      // Delete test
      const deleted = await repo.deleteRecord('rec-1');
      expect(deleted).toBe(true);
      const afterDelete = await repo.getRecordById('rec-1');
      expect(afterDelete).toBeNull();
    });
  });

  describe('InMemoryFactorRepository', () => {
    it('retrieves default verified factors and saves modifications', async () => {
      const repo = new InMemoryFactorRepository();
      const factors = await repo.listFactors();
      expect(factors.length).toBeGreaterThan(3);

      const lhv = await repo.getFactorById('FAC-CH4-LHV');
      expect(lhv).toBeDefined();
      expect(lhv!.value).toBe(9.95);

      // Update factor
      const updated = await repo.saveFactor({
        ...lhv!,
        notes: 'Updated calibration notes',
      });
      expect(updated.notes).toBe('Updated calibration notes');
    });
  });

  describe('InMemoryAnalysisRepository', () => {
    it('stores and retrieves analysis snapshots by site', async () => {
      const repo = new InMemoryAnalysisRepository();
      const analysis: AnalysisResult = {
        analysisId: 'ana-101',
        siteId: 'site-alpha',
        createdAt: '2026-03-25T15:00:00Z',
        dateRange: { start: '2026-03-20', end: '2026-03-25' },
        recordCount: 5,
        inputRecordIds: ['r1', 'r2'],
        totalMassKg: 1500,
        dailyAverageKg: 300,
        predominantCategory: 'prepared_food',
        contaminationProfile: { cleanPct: 80, moderateSeverePct: 20 },
        metrics: [],
        pathwayCandidates: [],
        factorSnapshot: [],
        summary: 'Sample analysis summary',
        recommendedNextStep: 'Conduct sorting audit',
        missingData: [],
        uncertaintyNotes: [],
        executionStatus: 'completed',
        humanReviewRequired: true,
      };

      await repo.createAnalysis(analysis);
      const retrieved = await repo.getAnalysisById('ana-101');
      expect(retrieved).toBeDefined();
      expect(retrieved!.totalMassKg).toBe(1500);

      const siteAnalyses = await repo.listAnalysesBySite('site-alpha');
      expect(siteAnalyses.length).toBe(1);
    });
  });
});

describe('API Boundary Contract Validation', () => {
  it('validates CreateWasteRecordRequest payload', () => {
    const valid = {
      siteId: 'site-campus',
      date: '2026-03-25',
      source: 'canteen_kitchen',
      category: 'prepared_food',
      massKg: 350,
      contamination: 'clean',
      provenance: 'measured',
      notes: 'Dock scale printout',
    };
    expect(CreateWasteRecordRequestSchema.safeParse(valid).success).toBe(true);

    const missingSite = { ...valid, siteId: '' };
    expect(CreateWasteRecordRequestSchema.safeParse(missingSite).success).toBe(false);
  });

  it('validates GetWasteRecordsQuery with pagination defaults', () => {
    const parsed = GetWasteRecordsQuerySchema.parse({
      siteId: 'site-campus',
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.offset).toBe(0);
  });

  it('validates CreateAnalysisRequest payload', () => {
    const valid = {
      siteId: 'site-campus',
      recordIds: ['rec-1', 'rec-2'],
    };
    expect(CreateAnalysisRequestSchema.safeParse(valid).success).toBe(true);
  });

  it('validates CompareScenariosRequest payload across multi-currency scenarios', () => {
    const valid = {
      siteId: 'site-campus',
      dailyFeedstockKg: 450,
      scenarios: [
        {
          scenarioId: 'scen-baseline',
          title: 'Standard AD Package',
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
      ],
    };
    expect(CompareScenariosRequestSchema.safeParse(valid).success).toBe(true);

    // Rejects empty scenarios array
    const emptyScenarios = { ...valid, scenarios: [] };
    expect(CompareScenariosRequestSchema.safeParse(emptyScenarios).success).toBe(false);
  });
});
