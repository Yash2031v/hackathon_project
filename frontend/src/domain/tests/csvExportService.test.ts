import { describe, it, expect } from 'vitest';
import {
  sanitizeCsvCell,
  exportWasteRecordsToCsv,
  exportAnalysisToCsv,
} from '../services/csvExportService';
import type { WasteRecord } from '../schemas/wasteRecord.schema';
import type { AnalysisResult } from '../schemas/analysis.schema';

describe('CSV Export Service with Formula Injection Defense', () => {
  describe('sanitizeCsvCell', () => {
    it('returns empty quoted string for null or undefined', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });

    it('formats pure numbers without alteration', () => {
      expect(sanitizeCsvCell(450.5)).toBe('450.5');
      expect(sanitizeCsvCell(-12)).toBe('-12');
      expect(sanitizeCsvCell(0)).toBe('0');
    });

    it('neutralizes dangerous formula injection characters with single quote', () => {
      // Attacks starting with =, +, -, @, \t, \r
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe("\"'=cmd|\"\"/C calc\"\"!A0\"");
      expect(sanitizeCsvCell('+1+2')).toBe("\"'+1+2\"");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("\"'@SUM(A1:A10)\"");
      expect(sanitizeCsvCell('-2+5')).toBe("\"'-2+5\"");
      expect(sanitizeCsvCell('\tMaliciousTab')).toBe("\"'\tMaliciousTab\"");
    });

    it('escapes internal quotes and wraps values with commas in double quotes', () => {
      expect(sanitizeCsvCell('Dining Hall, Kitchen A')).toBe('"Dining Hall, Kitchen A"');
      expect(sanitizeCsvCell('Contains "quotes" inside')).toBe('"Contains ""quotes"" inside"');
      expect(sanitizeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });
  });

  describe('exportWasteRecordsToCsv', () => {
    it('returns empty string when record array is empty', () => {
      expect(exportWasteRecordsToCsv([])).toBe('');
    });

    it('exports well-formed CSV with headers and neutralized formula injection values', () => {
      const records: WasteRecord[] = [
        {
          id: 'rec-1',
          siteId: 'site-campus',
          date: '2026-03-25',
          category: 'prepared_food',
          massKg: 420.5,
          massUnit: 'kg',
          source: 'canteen_kitchen',
          contamination: 'clean',
          provenance: 'measured',
          createdAt: '2026-03-25T10:00:00Z',
          notes: '=HYPERLINK("http://evil.com")',
        },
      ];

      const csv = exportWasteRecordsToCsv(records);
      expect(csv).toContain('"Record ID","Site ID","Collection Date"');
      expect(csv).toContain('"rec-1"');
      expect(csv).toContain('420.5');
      // Verify formula injection neutralized
      expect(csv).toContain("\"'=HYPERLINK(\"\"http://evil.com\"\")\"");
    });
  });

  describe('exportAnalysisToCsv', () => {
    it('exports analysis metadata, metrics, and pathway hierarchy', () => {
      const mockAnalysis: AnalysisResult = {
        analysisId: 'ana-test-123',
        siteId: 'site-campus-main',
        createdAt: '2026-03-28T10:00:00Z',
        dateRange: { start: '2026-03-20', end: '2026-03-27' },
        recordCount: 8,
        inputRecordIds: ['rec-1', 'rec-2'],
        totalMassKg: 3360,
        dailyAverageKg: 420,
        predominantCategory: 'prepared_food',
        contaminationProfile: { cleanPct: 87.5, moderateSeverePct: 12.5 },
        summary: '8 batches evaluated.',
        recommendedNextStep: 'Screen feedstock for cutlery.',
        metrics: [
          {
            metricId: 'total_mass',
            name: 'Total Mass',
            value: 3360,
            unit: 'kg',
            status: 'measured',
            factorIds: [],
          },
        ],
        pathwayCandidates: [
          {
            pathway: 'anaerobic_digestion',
            title: 'Continuous High-Solids Anaerobic Digestion',
            suitability: 'promising',
            reasons: ['Throughput exceeds 300 kg/day'],
            constraints: ['Requires desulfurization'],
            confidenceLabel: 'indicative',
            isPrioritized: true,
            evidenceIds: ['ev-1'],
          },
        ],
        factorSnapshot: [],
        missingData: ['Daily volatile solids assay'],
        uncertaintyNotes: ['Digester heating parasitic load modeled at 12%'],
        executionStatus: 'completed',
        humanReviewRequired: true,
      };

      const csv = exportAnalysisToCsv(mockAnalysis);
      expect(csv).toContain('"SECTION","ANALYSIS METADATA"');
      expect(csv).toContain('"ana-test-123"');
      expect(csv).toContain('3360');
      expect(csv).toContain('"SECTION","PATHWAY RECOMMENDATION HIERARCHY"');
      expect(csv).toContain('"Continuous High-Solids Anaerobic Digestion"');
      expect(csv).toContain('"promising"');
      expect(csv).toContain('"Daily volatile solids assay"');
    });
  });
});
