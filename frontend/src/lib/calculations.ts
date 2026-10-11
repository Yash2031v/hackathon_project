/**
 * Deterministic calculation helpers for Waste2Watt
 * Independent of React and AWS. All mathematical formulas are unit-tested and verified.
 */

import type { ScenarioAssumptions, ScenarioEconomics } from '../types/domain';

// Standard Physical Constants
export const METHANE_LHV_KWH_PER_M3 = 9.97; // Lower heating value of pure CH4 at standard conditions

/**
 * Deterministically computes anaerobic digestion yield and financial feasibility
 */
export function calculateScenarioEconomics(
  dailyFeedstockKg: number,
  assumptions: ScenarioAssumptions
): ScenarioEconomics {
  // Safe bounds guardrails
  const safeDailyKg = Math.max(0, dailyFeedstockKg);
  const safeOperatingDays = Math.max(1, Math.min(365, assumptions.operatingDaysPerYear));
  const safeYield = Math.max(0, assumptions.biogasYieldM3PerTonne);
  const safeMethanePct = Math.max(0, Math.min(100, assumptions.methaneFractionPct));
  const safeElectricalEffPct = Math.max(0, Math.min(100, assumptions.electricalEfficiencyPct));
  const safeTariff = Math.max(0, assumptions.electricityTariffPerKwh);
  const safeCapex = Math.max(0, assumptions.capexUsd);
  const safeOpex = Math.max(0, assumptions.opexAnnualUsd);

  // 1. Mass throughput
  const annualFeedstockTonnes = (safeDailyKg * safeOperatingDays) / 1000;

  // 2. Biogas production
  const dailyBiogasM3 = (safeDailyKg / 1000) * safeYield;
  const annualBiogasM3 = annualFeedstockTonnes * safeYield;

  // 3. Methane & Usable Electrical Energy
  const annualMethaneM3 = annualBiogasM3 * (safeMethanePct / 100);
  const annualThermalPotentialKwh = annualMethaneM3 * METHANE_LHV_KWH_PER_M3;
  const annualElectricityKwh = annualThermalPotentialKwh * (safeElectricalEffPct / 100);

  // 4. Financial valuation
  const annualEnergyValueUsd = annualElectricityKwh * safeTariff;
  const annualNetBenefitUsd = annualEnergyValueUsd - safeOpex;

  // 5. Simple Payback Period Guardrail
  let simplePaybackYears: number | null = null;
  let paybackStatus: ScenarioEconomics['paybackStatus'] = 'negative_return';

  if (annualNetBenefitUsd > 0 && safeCapex > 0) {
    simplePaybackYears = safeCapex / annualNetBenefitUsd;
    if (simplePaybackYears <= 5) {
      paybackStatus = 'attractive';
    } else if (simplePaybackYears <= 9) {
      paybackStatus = 'moderate';
    } else {
      paybackStatus = 'marginal';
    }
  } else if (annualNetBenefitUsd <= 0) {
    simplePaybackYears = null;
    paybackStatus = 'negative_return';
  } else {
    // Capex is 0
    simplePaybackYears = 0;
    paybackStatus = 'attractive';
  }

  return {
    dailyFeedstockKg: safeDailyKg,
    annualFeedstockTonnes,
    dailyBiogasM3,
    annualBiogasM3,
    annualElectricityKwh,
    annualEnergyValueUsd,
    annualNetBenefitUsd,
    simplePaybackYears,
    paybackStatus,
  };
}
