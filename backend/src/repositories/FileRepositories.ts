import fs from 'fs';
import path from 'path';
import type { IWasteRecordRepository, WasteRecordFilter } from '../../../frontend/src/domain/repositories/IWasteRecordRepository';
import type { IFactorRepository } from '../../../frontend/src/domain/repositories/IFactorRepository';
import type { IAnalysisRepository } from '../../../frontend/src/domain/repositories/IAnalysisRepository';
import type { WasteRecord } from '../../../frontend/src/domain/schemas/wasteRecord.schema';
import type { FactorRecord } from '../../../frontend/src/domain/schemas/factorRecord.schema';
import type { AnalysisResult } from '../../../frontend/src/domain/schemas/analysis.schema';
import { VERIFIED_FACTORS } from '../../../frontend/src/domain/constants/verifiedFactors';
import { INITIAL_DEMO_RECORDS, INITIAL_DEMO_ANALYSIS } from '../../../frontend/src/lib/mockData';

export class FileStorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'FileStorageError';
  }
}

/**
 * Resolves a safe file path within the specified base directory, strictly preventing
 * path traversal attacks (e.g. '../', absolute paths, or escaping base directory).
 */
export function resolveSafeDataPath(baseDir: string, filename: string): string {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new FileStorageError(`Path traversal rejected: invalid filename '${filename}'`);
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, filename);
  // Ensure the resolved target is strictly contained within the resolved base directory
  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    throw new FileStorageError(`Path traversal rejected: target path escapes base directory`);
  }
  return resolvedTarget;
}

/**
 * Safely writes data to a file atomically by writing to a temporary file first,
 * then renaming it to the target file.
 */
function atomicWriteJsonSync(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Ignore temp cleanup error
      }
    }
    throw new FileStorageError(`Failed to atomically write data to ${filePath}`, error);
  }
}

function readJsonSync<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      atomicWriteJsonSync(filePath, defaultValue);
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) {
      atomicWriteJsonSync(filePath, defaultValue);
      return defaultValue;
    }
    return JSON.parse(content) as T;
  } catch (error) {
    // If file is corrupted on disk (SyntaxError), back up corrupted file and recover gracefully
    if (error instanceof SyntaxError) {
      const backupPath = `${filePath}.corrupted.${Date.now()}.bak`;
      try {
        if (fs.existsSync(filePath)) {
          fs.copyFileSync(filePath, backupPath);
        }
        atomicWriteJsonSync(filePath, defaultValue);
        return defaultValue;
      } catch {
        // Fall through to throw
      }
    }
    throw new FileStorageError(`Failed to read JSON from ${filePath}`, error);
  }
}

const SEED_RECORDS: WasteRecord[] = INITIAL_DEMO_RECORDS.map(r => ({
  ...r,
  massUnit: 'kg' as const,
  updatedAt: r.createdAt,
}));

const SEED_ANALYSIS: AnalysisResult = {
  analysisId: INITIAL_DEMO_ANALYSIS.analysisId,
  siteId: INITIAL_DEMO_ANALYSIS.siteId,
  createdAt: INITIAL_DEMO_ANALYSIS.createdAt,
  dateRange: INITIAL_DEMO_ANALYSIS.dateRange,
  recordCount: INITIAL_DEMO_ANALYSIS.recordCount,
  inputRecordIds: SEED_RECORDS.map(r => r.id),
  totalMassKg: INITIAL_DEMO_ANALYSIS.totalMassKg,
  dailyAverageKg: INITIAL_DEMO_ANALYSIS.dailyAverageKg,
  predominantCategory: INITIAL_DEMO_ANALYSIS.predominantCategory,
  contaminationProfile: INITIAL_DEMO_ANALYSIS.contaminationProfile,
  summary: INITIAL_DEMO_ANALYSIS.summary,
  recommendedNextStep: INITIAL_DEMO_ANALYSIS.recommendedNextStep,
  pathwayCandidates: INITIAL_DEMO_ANALYSIS.pathwayCandidates.map(c => ({
    pathway: c.pathway,
    title: c.title,
    suitability: c.suitability,
    reasons: c.reasons,
    constraints: c.constraints,
    evidenceIds: c.evidenceIds,
    confidenceLabel: 'indicative' as const,
    isPrioritized: !!c.isPrioritized,
  })),
  missingData: INITIAL_DEMO_ANALYSIS.missingData,
  uncertaintyNotes: INITIAL_DEMO_ANALYSIS.uncertaintyNotes,
  humanReviewRequired: true,
  metrics: [
    {
      metricId: 'total_mass',
      name: 'Total Logged Feedstock',
      value: INITIAL_DEMO_ANALYSIS.totalMassKg,
      unit: 'kg',
      status: 'measured',
      factorIds: [],
    },
    {
      metricId: 'daily_average',
      name: 'Daily Average Generation',
      value: INITIAL_DEMO_ANALYSIS.dailyAverageKg,
      unit: 'kg/day',
      status: 'estimated',
      factorIds: [],
    },
  ],
  factorSnapshot: VERIFIED_FACTORS,
  executionStatus: 'completed',
};

export class FileWasteRecordRepository implements IWasteRecordRepository {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = resolveSafeDataPath(dataDir, 'records.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.filePath)) {
      atomicWriteJsonSync(this.filePath, SEED_RECORDS);
    }
  }

  private getRecords(): WasteRecord[] {
    return readJsonSync<WasteRecord[]>(this.filePath, SEED_RECORDS);
  }

  private saveRecords(records: WasteRecord[]): void {
    atomicWriteJsonSync(this.filePath, records);
  }

  async createRecord(record: WasteRecord): Promise<WasteRecord> {
    const records = this.getRecords();
    const existingIndex = records.findIndex(r => r.id === record.id);
    if (existingIndex >= 0) {
      records[existingIndex] = { ...record };
    } else {
      records.unshift({ ...record });
    }
    this.saveRecords(records);
    return { ...record };
  }

  async getRecordById(recordId: string): Promise<WasteRecord | null> {
    const records = this.getRecords();
    const found = records.find(r => r.id === recordId);
    return found ? { ...found } : null;
  }

  async listRecords(filter: WasteRecordFilter): Promise<{ records: WasteRecord[]; totalCount: number }> {
    let list = this.getRecords();

    if (filter.siteId) {
      list = list.filter(r => r.siteId === filter.siteId);
    }
    if (filter.startDate) {
      list = list.filter(r => r.date >= filter.startDate!);
    }
    if (filter.endDate) {
      list = list.filter(r => r.date <= filter.endDate!);
    }
    if (filter.category && filter.category !== 'all') {
      list = list.filter(r => r.category === filter.category);
    }
    if (filter.source && filter.source !== 'all') {
      list = list.filter(r => r.source === filter.source);
    }
    if (filter.provenance && filter.provenance !== 'all') {
      list = list.filter(r => r.provenance === filter.provenance);
    }

    list.sort((a, b) => b.date.localeCompare(a.date));

    const totalCount = list.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || list.length;
    const paginated = list.slice(offset, offset + limit);

    return {
      records: paginated.map(r => ({ ...r })),
      totalCount,
    };
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const records = this.getRecords();
    const filtered = records.filter(r => r.id !== recordId);
    if (filtered.length !== records.length) {
      this.saveRecords(filtered);
      return true;
    }
    return false;
  }

  resetToInitialSeed(): void {
    this.saveRecords(SEED_RECORDS);
  }
}

export class FileFactorRepository implements IFactorRepository {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = resolveSafeDataPath(dataDir, 'factors.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.filePath)) {
      atomicWriteJsonSync(this.filePath, VERIFIED_FACTORS);
    }
  }

  private getFactors(): FactorRecord[] {
    return readJsonSync<FactorRecord[]>(this.filePath, VERIFIED_FACTORS);
  }

  private saveFactors(factors: FactorRecord[]): void {
    atomicWriteJsonSync(this.filePath, factors);
  }

  async getFactorById(factorId: string): Promise<FactorRecord | null> {
    const factors = this.getFactors();
    const found = factors.find(f => f.factorId === factorId);
    return found ? { ...found } : null;
  }

  async listFactors(): Promise<FactorRecord[]> {
    return this.getFactors().map(f => ({ ...f }));
  }

  async saveFactor(factor: FactorRecord): Promise<FactorRecord> {
    const factors = this.getFactors();
    const idx = factors.findIndex(f => f.factorId === factor.factorId);
    if (idx >= 0) {
      factors[idx] = { ...factor };
    } else {
      factors.push({ ...factor });
    }
    this.saveFactors(factors);
    return { ...factor };
  }

  resetToInitialSeed(): void {
    this.saveFactors(VERIFIED_FACTORS);
  }
}

export class FileAnalysisRepository implements IAnalysisRepository {
  private filePath: string;

  constructor(dataDir: string) {
    this.filePath = resolveSafeDataPath(dataDir, 'analyses.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (!fs.existsSync(this.filePath)) {
      atomicWriteJsonSync(this.filePath, [SEED_ANALYSIS]);
    }
  }

  private getAnalyses(): AnalysisResult[] {
    return readJsonSync<AnalysisResult[]>(this.filePath, [SEED_ANALYSIS]);
  }

  private saveAnalyses(analyses: AnalysisResult[]): void {
    atomicWriteJsonSync(this.filePath, analyses);
  }

  async createAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
    const analyses = this.getAnalyses();
    const idx = analyses.findIndex(a => a.analysisId === analysis.analysisId);
    if (idx >= 0) {
      analyses[idx] = { ...analysis };
    } else {
      analyses.unshift({ ...analysis });
    }
    this.saveAnalyses(analyses);
    return { ...analysis };
  }

  async getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
    const analyses = this.getAnalyses();
    const found = analyses.find(a => a.analysisId === analysisId);
    return found ? { ...found } : null;
  }

  async listAnalysesBySite(siteId: string, limit?: number): Promise<AnalysisResult[]> {
    const analyses = this.getAnalyses()
      .filter(a => a.siteId === siteId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const bounded = limit ? analyses.slice(0, limit) : analyses;
    return bounded.map(a => ({ ...a }));
  }

  resetToInitialSeed(): void {
    this.saveAnalyses([SEED_ANALYSIS]);
  }
}
