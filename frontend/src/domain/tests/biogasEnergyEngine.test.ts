import { describe, it, expect } from 'vitest';
import { calculateBiogasEnergyPotential } from '../services/biogasEnergyEngine';
import { VERIFIED_FACTORS } from '../constants/verifiedFactors';
import type { FactorRecord } from '../schemas/factorRecord.schema';

describe('Biogas & Energy Deterministic Engine', () => {
  it('computes verified physical yields with full factor set', () => {
    const result = calculateBiogasEnergyPotential({
      dailyFeedstockKg: 500,
      operatingDaysPerYear: 330,
      factors: VERIFIED_FACTORS,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    // 500 kg * 330 days / 1000 = 165 tonnes/yr
    expect(result.annualFeedstockTonnes).toBe(165);
    // 165 tonnes * 120 m3/t = 19,800 m3 biogas
    expect(result.annualBiogasM3).toBe(19800);
    // 19,800 * 0.60 = 11,880 m3 CH4
    expect(result.annualMethaneM3).toBe(11880);
    // 11,880 * 9.95 = 118,206 kWh thermal
    expect(result.annualThermalKwh).toBeCloseTo(118206, 0);
    // 118,206 * 0.34 = ~40,190 kWh electrical
    expect(result.annualElectricityKwh).toBeCloseTo(40190, 0);
  });

  it('strictly returns insufficient_data when required factors are missing instead of inventing defaults', () => {
    // Empty factors array and no direct overrides
    const result = calculateBiogasEnergyPotential({
      dailyFeedstockKg: 500,
      operatingDaysPerYear: 330,
      factors: [], // missing all conversion factors
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('insufficient_data');
    if (result.success) return;

    expect(result.missingFactors).toContain('FAC-AD-YIELD-FW (Specific Biogas Yield)');
    expect(result.missingFactors).toContain('FAC-CH4-FRACTION (Biogas Methane Content)');
    expect(result.missingFactors).toContain('FAC-CHP-EFF-EL (CHP Electrical Efficiency)');
    expect(result.error).toMatch(/Missing required conversion factors/);
  });

  it('strictly returns insufficient_data when a factor is explicitly flagged as missing in the register', () => {
    const factorsWithMissing: FactorRecord[] = [
      ...VERIFIED_FACTORS.filter(f => f.factorId !== 'FAC-AD-YIELD-FW'),
      {
        factorId: 'FAC-AD-YIELD-FW',
        name: 'Mixed Food Waste Specific Biogas Yield',
        value: NaN,
        unit: 'm3/tonne',
        sourceName: 'Unknown',
        sourceReference: 'Unverified',
        effectiveDate: '2026-01-01',
        qualityStatus: 'missing',
        notes: 'Awaiting lab proximate analysis',
      },
    ];

    const result = calculateBiogasEnergyPotential({
      dailyFeedstockKg: 500,
      operatingDaysPerYear: 330,
      factors: factorsWithMissing,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('insufficient_data');
  });

  it('safely clamps zero or negative feedstock to zero output without errors', () => {
    const result = calculateBiogasEnergyPotential({
      dailyFeedstockKg: -100,
      operatingDaysPerYear: 330,
      factors: VERIFIED_FACTORS,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.dailyFeedstockKg).toBe(0);
    expect(result.annualFeedstockTonnes).toBe(0);
    expect(result.annualBiogasM3).toBe(0);
    expect(result.annualElectricityKwh).toBe(0);
  });
});
