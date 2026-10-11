import { describe, it, expect } from 'vitest';
import { calculateScenarioEconomics } from '../services/scenarioEconomicsEngine';
import type { ScenarioAssumptions } from '../schemas/scenario.schema';

describe('Scenario Economics Engine', () => {
  it('supports global non-USD currencies explicitly and retains currency code', () => {
    const assumptionsEUR: ScenarioAssumptions = {
      currency: 'EUR',
      biogasYieldM3PerTonne: 120,
      methaneFractionPct: 60,
      electricalEfficiencyPct: 34,
      capexAmount: 42000,
      opexAnnualAmount: 3500,
      electricityTariffPerKwh: 0.16, // €0.16/kWh
      operatingDaysPerYear: 330,
    };

    const result = calculateScenarioEconomics({
      dailyFeedstockKg: 500,
      assumptions: assumptionsEUR,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.economics.currency).toBe('EUR');
    expect(result.economics.annualElectricityKwh).toBeCloseTo(40190, 0);
    // 40,190 kWh * €0.16 = €6,430.40
    expect(result.economics.annualEnergyValue).toBeCloseTo(6430.4, 0);
    // €6,430.40 - €3,500 = €2,930.40 net benefit
    expect(result.economics.annualNetBenefit).toBeCloseTo(2930.4, 0);
    // Payback: 42,000 / 2,930.4 = ~14.3 yrs
    expect(result.economics.simplePaybackYears).toBeCloseTo(14.3, 1);
    expect(result.economics.paybackStatus).toBe('marginal');
  });

  it('enforces guardrail: strictly returns null payback and negative_return when OPEX exceeds energy revenue', () => {
    const unprofitableAssumptions: ScenarioAssumptions = {
      currency: 'INR',
      biogasYieldM3PerTonne: 120,
      methaneFractionPct: 60,
      electricalEfficiencyPct: 34,
      capexAmount: 2500000,
      opexAnnualAmount: 500000, // high opex
      electricityTariffPerKwh: 8.5, // ₹8.5/kWh
      operatingDaysPerYear: 300,
    };

    // Low volume: 100 kg/day -> 30 tonnes/yr -> 3600 m3 biogas -> 2160 m3 CH4 -> 21492 kWh thermal -> 7307 kWh elec
    // Revenue: 7307 * 8.5 = ₹62,110 vs OPEX ₹500,000
    const result = calculateScenarioEconomics({
      dailyFeedstockKg: 100,
      assumptions: unprofitableAssumptions,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.economics.annualNetBenefit).toBeLessThan(0);
    expect(result.economics.simplePaybackYears).toBeNull();
    expect(result.economics.paybackStatus).toBe('negative_return');
  });

  it('computes attractive payback (< 5 years) when high throughput and tariffs yield strong net return', () => {
    const highReturnAssumptions: ScenarioAssumptions = {
      currency: 'USD',
      biogasYieldM3PerTonne: 130,
      methaneFractionPct: 62,
      electricalEfficiencyPct: 36,
      capexAmount: 55000,
      opexAnnualAmount: 3000,
      electricityTariffPerKwh: 0.22, // high commercial tariff
      operatingDaysPerYear: 350,
    };

    // 1000 kg/day -> 350 tonnes -> 45,500 m3 biogas -> 28,210 m3 CH4 -> 280,689.5 kWh th -> 101,048 kWh elec
    // Revenue: ~101,048 * 0.22 = $22,230 -> Net = $19,230 -> Payback = 55,000 / 19,230 = ~2.86 yrs
    const result = calculateScenarioEconomics({
      dailyFeedstockKg: 1000,
      assumptions: highReturnAssumptions,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.economics.annualNetBenefit).toBeGreaterThan(15000);
    expect(result.economics.simplePaybackYears).toBeLessThan(4);
    expect(result.economics.paybackStatus).toBe('attractive');
  });
});
