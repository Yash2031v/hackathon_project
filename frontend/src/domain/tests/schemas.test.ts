import { describe, it, expect } from 'vitest';
import { WasteRecordSchema } from '../schemas/wasteRecord.schema';
import { CurrencyCodeSchema } from '../schemas/units.schema';
import { FactorRecordSchema } from '../schemas/factorRecord.schema';
import { ScenarioAssumptionsSchema } from '../schemas/scenario.schema';

describe('Zod Schema Validation & Boundary Rules', () => {
  describe('WasteRecordSchema', () => {
    it('accepts valid waste record', () => {
      const valid = {
        id: 'rec-001',
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 450,
        massUnit: 'kg',
        contamination: 'low',
        provenance: 'measured',
        notes: 'Calibrated scale weighing',
        createdAt: '2026-03-25T12:00:00Z',
      };
      const result = WasteRecordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects zero or negative mass', () => {
      const invalidZero = {
        id: 'rec-002',
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 0,
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      };
      expect(WasteRecordSchema.safeParse(invalidZero).success).toBe(false);

      const invalidNegative = { ...invalidZero, massKg: -25 };
      expect(WasteRecordSchema.safeParse(invalidNegative).success).toBe(false);
    });

    it('rejects batches exceeding plausible physical single-batch limit (> 50,000 kg)', () => {
      const invalidExtreme = {
        id: 'rec-003',
        siteId: 'site-campus',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 55000,
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      };
      expect(WasteRecordSchema.safeParse(invalidExtreme).success).toBe(false);
    });

    it('rejects malformed date formats', () => {
      const invalidDate = {
        id: 'rec-004',
        siteId: 'site-campus',
        date: '25/03/2026', // non-ISO
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 100,
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T12:00:00Z',
      };
      expect(WasteRecordSchema.safeParse(invalidDate).success).toBe(false);
    });
  });

  describe('CurrencyCodeSchema', () => {
    it('accepts valid 3-letter ISO-4217 uppercase codes', () => {
      expect(CurrencyCodeSchema.safeParse('USD').success).toBe(true);
      expect(CurrencyCodeSchema.safeParse('EUR').success).toBe(true);
      expect(CurrencyCodeSchema.safeParse('GBP').success).toBe(true);
      expect(CurrencyCodeSchema.safeParse('INR').success).toBe(true);
      expect(CurrencyCodeSchema.safeParse('CAD').success).toBe(true);
    });

    it('rejects invalid or lowercase currency codes', () => {
      expect(CurrencyCodeSchema.safeParse('usd').success).toBe(false);
      expect(CurrencyCodeSchema.safeParse('US').success).toBe(false);
      expect(CurrencyCodeSchema.safeParse('USDD').success).toBe(false);
      expect(CurrencyCodeSchema.safeParse('123').success).toBe(false);
    });
  });

  describe('FactorRecordSchema', () => {
    it('requires explicit unit and source citation', () => {
      const missingUnit = {
        factorId: 'F-01',
        name: 'Biogas Yield',
        value: 120,
        unit: '',
        sourceName: 'EPA',
        sourceReference: 'EPA Table',
        effectiveDate: '2020-01-01',
        qualityStatus: 'verified_constant',
        notes: 'Standard note',
      };
      expect(FactorRecordSchema.safeParse(missingUnit).success).toBe(false);
    });
  });

  describe('ScenarioAssumptionsSchema', () => {
    it('validates physical parameter boundaries and rejects negative finances', () => {
      const valid = {
        currency: 'EUR',
        biogasYieldM3PerTonne: 125,
        methaneFractionPct: 62,
        electricalEfficiencyPct: 35,
        capexAmount: 45000,
        opexAnnualAmount: 3200,
        electricityTariffPerKwh: 0.15,
        operatingDaysPerYear: 330,
      };
      expect(ScenarioAssumptionsSchema.safeParse(valid).success).toBe(true);

      const negativeCapex = { ...valid, capexAmount: -1000 };
      expect(ScenarioAssumptionsSchema.safeParse(negativeCapex).success).toBe(false);

      const outOfBoundsMethane = { ...valid, methaneFractionPct: 98 };
      expect(ScenarioAssumptionsSchema.safeParse(outOfBoundsMethane).success).toBe(false);
    });
  });
});
