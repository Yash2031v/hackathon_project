import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DynamoWasteRecordRepository,
  DynamoFactorRepository,
  DynamoAnalysisRepository,
  DynamoStorageError,
  DuplicateRecordError,
} from '../src/repositories/DynamoRepositories';
import type { WasteRecord } from '../../frontend/src/domain/schemas/wasteRecord.schema';
import type { AnalysisResult } from '../../frontend/src/domain/schemas/analysis.schema';

describe('DynamoDB Repository Adapters (Mocked SDK v3)', () => {
  const tableName = 'test-waste2watt-records';
  let mockDocClient: any;
  let wasteRepo: DynamoWasteRecordRepository;
  let factorRepo: DynamoFactorRepository;
  let analysisRepo: DynamoAnalysisRepository;

  beforeEach(() => {
    mockDocClient = {
      send: vi.fn(),
    };
    wasteRepo = new DynamoWasteRecordRepository(tableName, mockDocClient);
    factorRepo = new DynamoFactorRepository(tableName, mockDocClient);
    analysisRepo = new DynamoAnalysisRepository(tableName, mockDocClient);
  });

  describe('DynamoWasteRecordRepository', () => {
    const sampleRecord: WasteRecord = {
      id: 'rec-test-101',
      siteId: 'site-campus-01',
      date: '2026-03-25',
      category: 'prepared_food',
      massKg: 450,
      massUnit: 'kg',
      source: 'canteen_kitchen',
      contamination: 'clean',
      provenance: 'measured',
      createdAt: '2026-03-25T10:00:00Z',
    };

    it('creates record with correct single-table PK and SK partition mapping', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const result = await wasteRepo.createRecord(sampleRecord);
      expect(result.id).toBe('rec-test-101');
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);

      const commandArg = mockDocClient.send.mock.calls[0][0];
      expect(commandArg.input.TableName).toBe(tableName);
      expect(commandArg.input.Item.PK).toBe('SITE#site-campus-01');
      expect(commandArg.input.Item.SK).toBe('REC#2026-03-25#rec-test-101');
      expect(commandArg.input.Item.massKg).toBe(450);
    });

    it('throws DuplicateRecordError on ConditionalCheckFailedException', async () => {
      const conditionError = new Error('ConditionalCheckFailed');
      conditionError.name = 'ConditionalCheckFailedException';
      mockDocClient.send.mockRejectedValueOnce(conditionError);

      await expect(wasteRepo.createRecord(sampleRecord)).rejects.toThrow(DuplicateRecordError);
    });

    it('gets record by ID and validates stored schema', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: [
          {
            ...sampleRecord,
            PK: 'SITE#site-campus-01',
            SK: 'REC#2026-03-25#rec-test-101',
            entityType: 'WasteRecord',
          },
        ],
      });

      const found = await wasteRepo.getRecordById('rec-test-101');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('rec-test-101');
      expect(found?.massKg).toBe(450);
    });

    it('returns null when record is not found', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Items: [] });
      const found = await wasteRepo.getRecordById('nonexistent-id');
      expect(found).toBeNull();
    });

    it('throws DynamoStorageError when stored item fails schema validation', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: [
          {
            id: 'corrupted-rec',
            // missing siteId, massKg, category, etc.
          },
        ],
      });

      await expect(wasteRepo.getRecordById('corrupted-rec')).rejects.toThrow(DynamoStorageError);
    });

    it('lists records scoped by siteId partition and applies date range conditions', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: [
          { ...sampleRecord, date: '2026-03-26', id: 'rec-102' },
          { ...sampleRecord, date: '2026-03-25', id: 'rec-101' },
        ],
      });

      const res = await wasteRepo.listRecords({
        siteId: 'site-campus-01',
        startDate: '2026-03-20',
        endDate: '2026-03-27',
      });

      expect(res.records.length).toBe(2);
      expect(res.totalCount).toBe(2);

      const commandArg = mockDocClient.send.mock.calls[0][0];
      expect(commandArg.input.KeyConditionExpression).toContain('PK = :pk AND SK BETWEEN :startSk AND :endSk');
      expect(commandArg.input.ExpressionAttributeValues[':pk']).toBe('SITE#site-campus-01');
    });

    it('deletes record by resolving PK and SK first', async () => {
      // 1. Mock getRecordById finding the item
      mockDocClient.send.mockResolvedValueOnce({
        Items: [{ ...sampleRecord }],
      });
      // 2. Mock DeleteCommand succeeding
      mockDocClient.send.mockResolvedValueOnce({});

      const deleted = await wasteRepo.deleteRecord('rec-test-101');
      expect(deleted).toBe(true);

      const deleteCmd = mockDocClient.send.mock.calls[1][0];
      expect(deleteCmd.input.Key.PK).toBe('SITE#site-campus-01');
      expect(deleteCmd.input.Key.SK).toBe('REC#2026-03-25#rec-test-101');
    });
  });

  describe('DynamoFactorRepository', () => {
    it('returns verified fallback constants if DynamoDB table is not yet initialized', async () => {
      mockDocClient.send.mockResolvedValueOnce({ Item: undefined });
      const factor = await factorRepo.getFactorById('FAC-CH4-FRACTION');
      expect(factor).not.toBeNull();
      expect(factor?.factorId).toBe('FAC-CH4-FRACTION');
      expect(factor?.value).toBe(60);
    });

    it('saves factor to SYSTEM#FACTORS partition', async () => {
      mockDocClient.send.mockResolvedValueOnce({});
      const factor = {
        factorId: 'FAC-CUSTOM-1',
        name: 'Custom Yield Factor',
        value: 120,
        unit: 'm3/tonne',
        sourceName: 'Field Study',
        sourceReference: 'Internal Audit',
        effectiveDate: '2026-01-01',
        qualityStatus: 'user_configured' as const,
        notes: 'Test factor notes',
      };

      const saved = await factorRepo.saveFactor(factor);
      expect(saved.factorId).toBe('FAC-CUSTOM-1');

      const cmd = mockDocClient.send.mock.calls[0][0];
      expect(cmd.input.Item.PK).toBe('SYSTEM#FACTORS');
      expect(cmd.input.Item.SK).toBe('FAC#FAC-CUSTOM-1');
    });
  });

  describe('DynamoAnalysisRepository', () => {
    const sampleAnalysis: AnalysisResult = {
      analysisId: 'ana-test-999',
      siteId: 'site-campus-01',
      createdAt: '2026-03-28T10:00:00Z',
      dateRange: { start: '2026-03-25', end: '2026-03-26' },
      recordCount: 2,
      inputRecordIds: ['rec-101', 'rec-102'],
      totalMassKg: 900,
      dailyAverageKg: 450,
      predominantCategory: 'prepared_food',
      contaminationProfile: { cleanPct: 100, moderateSeverePct: 0 },
      summary: '2 collection batches audited.',
      recommendedNextStep: 'Proceed with digester design.',
      pathwayCandidates: [
        {
          pathway: 'anaerobic_digestion',
          title: 'Anaerobic Digestion',
          suitability: 'promising',
          reasons: ['High volume'],
          constraints: [],
          confidenceLabel: 'indicative',
          evidenceIds: ['ev-1'],
        },
      ],
      factorSnapshot: [],
      missingData: [],
      uncertaintyNotes: [],
      executionStatus: 'completed',
      humanReviewRequired: true,
    };

    it('saves analysis snapshot under site partition PK=SITE#siteId, SK=ANA#createdAt#analysisId', async () => {
      mockDocClient.send.mockResolvedValueOnce({});

      const saved = await analysisRepo.createAnalysis(sampleAnalysis);
      expect(saved.analysisId).toBe('ana-test-999');

      const cmd = mockDocClient.send.mock.calls[0][0];
      expect(cmd.input.Item.PK).toBe('SITE#site-campus-01');
      expect(cmd.input.Item.SK).toBe('ANA#2026-03-28T10:00:00Z#ana-test-999');
    });

    it('queries analyses by site partition in descending order', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Items: [{ ...sampleAnalysis }],
      });

      const list = await analysisRepo.listAnalysesBySite('site-campus-01', 5);
      expect(list.length).toBe(1);
      expect(list[0].analysisId).toBe('ana-test-999');

      const cmd = mockDocClient.send.mock.calls[0][0];
      expect(cmd.input.KeyConditionExpression).toContain('PK = :pk AND begins_with(SK, :skPrefix)');
      expect(cmd.input.ExpressionAttributeValues[':pk']).toBe('SITE#site-campus-01');
      expect(cmd.input.ScanIndexForward).toBe(false);
    });
  });
});
