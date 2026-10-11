import type { IWasteRecordRepository, WasteRecordFilter } from './IWasteRecordRepository';
import type { IFactorRepository } from './IFactorRepository';
import type { IAnalysisRepository } from './IAnalysisRepository';
import type { WasteRecord } from '../schemas/wasteRecord.schema';
import type { FactorRecord } from '../schemas/factorRecord.schema';
import type { AnalysisResult } from '../schemas/analysis.schema';
import { VERIFIED_FACTORS } from '../constants/verifiedFactors';

export class InMemoryWasteRecordRepository implements IWasteRecordRepository {
  private records: Map<string, WasteRecord> = new Map();

  constructor(initialRecords: WasteRecord[] = []) {
    for (const r of initialRecords) {
      this.records.set(r.id, { ...r });
    }
  }

  async createRecord(record: WasteRecord): Promise<WasteRecord> {
    this.records.set(record.id, { ...record });
    return { ...record };
  }

  async getRecordById(recordId: string): Promise<WasteRecord | null> {
    const r = this.records.get(recordId);
    return r ? { ...r } : null;
  }

  async listRecords(filter: WasteRecordFilter): Promise<{ records: WasteRecord[]; totalCount: number }> {
    let list = Array.from(this.records.values());

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

    // Sort by date descending
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
    return this.records.delete(recordId);
  }
}

export class InMemoryFactorRepository implements IFactorRepository {
  private factors: Map<string, FactorRecord> = new Map();

  constructor(initialFactors: FactorRecord[] = VERIFIED_FACTORS) {
    for (const f of initialFactors) {
      this.factors.set(f.factorId, { ...f });
    }
  }

  async getFactorById(factorId: string): Promise<FactorRecord | null> {
    const f = this.factors.get(factorId);
    return f ? { ...f } : null;
  }

  async listFactors(): Promise<FactorRecord[]> {
    return Array.from(this.factors.values()).map(f => ({ ...f }));
  }

  async saveFactor(factor: FactorRecord): Promise<FactorRecord> {
    this.factors.set(factor.factorId, { ...factor });
    return { ...factor };
  }
}

export class InMemoryAnalysisRepository implements IAnalysisRepository {
  private analyses: Map<string, AnalysisResult> = new Map();

  constructor(initialAnalyses: AnalysisResult[] = []) {
    for (const a of initialAnalyses) {
      this.analyses.set(a.analysisId, { ...a });
    }
  }

  async createAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
    this.analyses.set(analysis.analysisId, { ...analysis });
    return { ...analysis };
  }

  async getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
    const a = this.analyses.get(analysisId);
    return a ? { ...a } : null;
  }

  async listAnalysesBySite(siteId: string, limit?: number): Promise<AnalysisResult[]> {
    const list = Array.from(this.analyses.values())
      .filter(a => a.siteId === siteId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const bounded = limit ? list.slice(0, limit) : list;
    return bounded.map(a => ({ ...a }));
  }
}
