import type { WasteRecord } from '../../../../frontend/src/domain/schemas/wasteRecord.schema';
import type { FactorRecord } from '../../../../frontend/src/domain/schemas/factorRecord.schema';
import type { AnalysisResult } from '../../../../frontend/src/domain/schemas/analysis.schema';
import type { ScenarioAssumptions, ScenarioEconomics } from '../../../../frontend/src/domain/schemas/scenario.schema';

export interface GroundedDataQualityProfile {
  totalRecords: number;
  uniqueDates: number;
  dateRange: { start: string; end: string };
  duplicateCount: number;
  unmeasuredProvenanceCount: number;
  unknownContaminationCount: number;
  sufficientForTrend: boolean; // requires >= 7 distinct dates
}

export interface GroundedAiContext {
  siteId: string;
  records: WasteRecord[];
  analysis: AnalysisResult;
  factors: FactorRecord[];
  economics?: ScenarioEconomics;
  assumptions?: ScenarioAssumptions;
  dataQuality: GroundedDataQualityProfile;
}

export function buildGroundedDataQualityProfile(records: WasteRecord[]): GroundedDataQualityProfile {
  if (records.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalRecords: 0,
      uniqueDates: 0,
      dateRange: { start: today, end: today },
      duplicateCount: 0,
      unmeasuredProvenanceCount: 0,
      unknownContaminationCount: 0,
      sufficientForTrend: false,
    };
  }

  const dates = records.map(r => r.date).sort();
  const uniqueDates = Array.from(new Set(dates));

  // Detect potential duplicate weighings (exact same date, source, category, and massKg)
  const seenSignatures = new Set<string>();
  let duplicateCount = 0;
  for (const r of records) {
    const sig = `${r.date}|${r.source}|${r.category}|${r.massKg}`;
    if (seenSignatures.has(sig)) {
      duplicateCount++;
    } else {
      seenSignatures.add(sig);
    }
  }

  const unmeasuredProvenanceCount = records.filter(r => r.provenance !== 'measured').length;
  const unknownContaminationCount = records.filter(r => r.contamination === 'unknown').length;

  return {
    totalRecords: records.length,
    uniqueDates: uniqueDates.length,
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1],
    },
    duplicateCount,
    unmeasuredProvenanceCount,
    unknownContaminationCount,
    sufficientForTrend: uniqueDates.length >= 7,
  };
}
