import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  FileWasteRecordRepository, 
  FileFactorRepository, 
  FileAnalysisRepository 
} from '../src/repositories/FileRepositories';
import type { WasteRecord } from '../../frontend/src/domain/schemas/wasteRecord.schema';

describe('Durable File Persistence & Restart Verification', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2w-test-data-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists waste records across repository instance restarts', async () => {
    // 1. Initial server instance writes a record
    const repoInstance1 = new FileWasteRecordRepository(tempDir);
    const newRecord: WasteRecord = {
      id: 'rec-persistent-01',
      siteId: 'site-campus',
      date: '2026-03-25',
      source: 'canteen_kitchen',
      category: 'prepared_food',
      massKg: 520,
      massUnit: 'kg',
      contamination: 'clean',
      provenance: 'measured',
      notes: 'Audited digital platform scale ticket',
      createdAt: '2026-03-25T11:00:00Z',
    };
    await repoInstance1.createRecord(newRecord);

    // Verify file exists on disk and is non-empty
    const recordsFilePath = path.join(tempDir, 'records.json');
    expect(fs.existsSync(recordsFilePath)).toBe(true);

    // 2. Simulate server restart: completely new repository instance
    const repoInstance2 = new FileWasteRecordRepository(tempDir);
    const retrieved = await repoInstance2.getRecordById('rec-persistent-01');

    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe('rec-persistent-01');
    expect(retrieved!.massKg).toBe(520);
    expect(retrieved!.notes).toBe('Audited digital platform scale ticket');

    // 3. Delete record and verify delete persists across new instance
    const deleted = await repoInstance2.deleteRecord('rec-persistent-01');
    expect(deleted).toBe(true);

    const repoInstance3 = new FileWasteRecordRepository(tempDir);
    const checkAfterDelete = await repoInstance3.getRecordById('rec-persistent-01');
    expect(checkAfterDelete).toBeNull();
  });

  it('restores baseline demo data upon calling resetToInitialSeed', async () => {
    const repo = new FileWasteRecordRepository(tempDir);
    // Add custom record
    await repo.createRecord({
      id: 'rec-custom-999',
      siteId: 'site-custom',
      date: '2026-03-25',
      source: 'hostel_dining',
      category: 'bakery_grains',
      massKg: 100,
      massUnit: 'kg',
      contamination: 'clean',
      provenance: 'measured',
      createdAt: '2026-03-25T11:00:00Z',
    });

    // Reset
    repo.resetToInitialSeed();

    // Verify custom record is gone and demo records are restored
    const custom = await repo.getRecordById('rec-custom-999');
    expect(custom).toBeNull();

    const list = await repo.listRecords({});
    expect(list.totalCount).toBeGreaterThan(5);
  });

  it('persists analysis snapshots across repository instance restarts', async () => {
    const analysisRepo1 = new FileAnalysisRepository(tempDir);
    const analysisId = 'ana-test-restart-101';
    await analysisRepo1.createAnalysis({
      analysisId,
      siteId: 'site-campus',
      createdAt: '2026-03-25T12:00:00Z',
      dateRange: { start: '2026-03-20', end: '2026-03-25' },
      recordCount: 8,
      inputRecordIds: ['rec-1', 'rec-2'],
      totalMassKg: 2800,
      dailyAverageKg: 350,
      predominantCategory: 'prepared_food',
      contaminationProfile: { cleanPct: 75, moderateSeverePct: 25 },
      metrics: [],
      pathwayCandidates: [],
      factorSnapshot: [],
      summary: 'Durable snapshot verification',
      recommendedNextStep: 'Proceed to design stage',
      missingData: [],
      uncertaintyNotes: [],
      executionStatus: 'completed',
      humanReviewRequired: true,
    });

    // Restart
    const analysisRepo2 = new FileAnalysisRepository(tempDir);
    const retrieved = await analysisRepo2.getAnalysisById(analysisId);
    expect(retrieved).toBeDefined();
    expect(retrieved!.totalMassKg).toBe(2800);
    expect(retrieved!.summary).toBe('Durable snapshot verification');
  });
});
