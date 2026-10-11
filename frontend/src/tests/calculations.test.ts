import { describe, it, expect } from 'vitest';
import { calculateScenarioEconomics } from '../lib/calculations';
import { DEFAULT_SCENARIO_ASSUMPTIONS } from '../lib/mockData';
import { formatCurrency, formatEnergyKwh, formatMassKg, formatYears } from '../lib/formatters';

describe('Deterministic Scenario Calculation Engine', () => {
  it('correctly calculates biogas volume and electrical power for baseline campus throughput', () => {
    const dailyKg = 430;
    const assumptions = { ...DEFAULT_SCENARIO_ASSUMPTIONS };
    const result = calculateScenarioEconomics(dailyKg, assumptions);

    // 1. Throughput: 430 kg * 330 days / 1000 = 141.9 tonnes
    expect(result.annualFeedstockTonnes).toBeCloseTo(141.9, 2);

    // 2. Biogas: 141.9 tonnes * 120 m3/t = 17028 m3
    expect(result.annualBiogasM3).toBeCloseTo(17028, 0);
    expect(result.dailyBiogasM3).toBeCloseTo(51.6, 1);

    // 3. Electrical power: 17028 * 0.60 * 9.97 * 0.34 = ~34632.9 kWh
    expect(result.annualElectricityKwh).toBeCloseTo(34632.9, 0);

    // 4. Value: 34632.9 * 0.12 = ~$4155.9
    expect(result.annualEnergyValueUsd).toBeCloseTo(4155.95, 1);
  });

  it('enforces guardrail when annual OPEX exceeds energy revenue (negative net cashflow)', () => {
    const dailyKg = 150; // low throughput
    const highOpexAssumptions = {
      ...DEFAULT_SCENARIO_ASSUMPTIONS,
      opexAnnualUsd: 5000,
      capexUsd: 40000,
    };
    const result = calculateScenarioEconomics(dailyKg, highOpexAssumptions);

    // Net benefit is negative
    expect(result.annualNetBenefitUsd).toBeLessThan(0);
    // Payback must NOT be a negative number or Infinity, it must be null with negative_return status
    expect(result.simplePaybackYears).toBeNull();
    expect(result.paybackStatus).toBe('negative_return');
  });

  it('safely handles zero or negative mass input without NaN', () => {
    const result = calculateScenarioEconomics(-50, DEFAULT_SCENARIO_ASSUMPTIONS);
    expect(result.dailyFeedstockKg).toBe(0);
    expect(result.annualBiogasM3).toBe(0);
    expect(result.annualElectricityKwh).toBe(0);
    expect(result.simplePaybackYears).toBeNull();
    expect(result.paybackStatus).toBe('negative_return');
  });

  it('determines attractive payback when net savings yield payback under 5 years', () => {
    const highVolumeKg = 1200; // high volume cluster
    const efficientAssumptions = {
      ...DEFAULT_SCENARIO_ASSUMPTIONS,
      capexUsd: 35000,
      opexAnnualUsd: 2500,
      electricityTariffPerKwh: 0.18, // high retail rate
    };
    const result = calculateScenarioEconomics(highVolumeKg, efficientAssumptions);

    expect(result.annualNetBenefitUsd).toBeGreaterThan(0);
    expect(result.simplePaybackYears).not.toBeNull();
    expect(result.simplePaybackYears!).toBeLessThan(5);
    expect(result.paybackStatus).toBe('attractive');
  });
});

describe('Formatting Utilities', () => {
  it('formats mass in kg and tonnes cleanly', () => {
    expect(formatMassKg(450)).toBe('450 kg');
    expect(formatMassKg(3250)).toBe('3.25 t');
  });

  it('formats energy units properly', () => {
    expect(formatEnergyKwh(450)).toBe('450 kWh');
    expect(formatEnergyKwh(34500)).toBe('34.5 MWh');
  });

  it('formats payback years with guardrails', () => {
    expect(formatYears(null)).toBe('Not recoverable');
    expect(formatYears(3.45)).toBe('3.5 yrs');
    expect(formatYears(45)).toBe('> 30 yrs (marginal)');
  });

  it('formats currency with standard dollar format', () => {
    expect(formatCurrency(4155.95)).toBe('$4,156');
  });
});
