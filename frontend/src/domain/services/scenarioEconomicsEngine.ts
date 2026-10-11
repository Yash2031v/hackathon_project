import type { ScenarioAssumptions, ScenarioEconomics } from '../schemas/scenario.schema';
import { calculateBiogasEnergyPotential } from './biogasEnergyEngine';

export interface EconomicCalculationInputs {
  dailyFeedstockKg: number;
  assumptions: ScenarioAssumptions;
}

export type EconomicCalculationResult = 
  | {
      success: true;
      status: 'calculated';
      economics: ScenarioEconomics;
    }
  | {
      success: false;
      status: 'insufficient_data';
      missingFactors: string[];
      error: string;
    };

/**
 * Pure deterministic scenario economics engine.
 * Supports configurable global currencies and enforces strict payback guardrails.
 */
export function calculateScenarioEconomics(
  inputs: EconomicCalculationInputs
): EconomicCalculationResult {
  const { dailyFeedstockKg, assumptions } = inputs;

  // 1. Calculate physical energy outputs first
  const energyResult = calculateBiogasEnergyPotential({
    dailyFeedstockKg,
    operatingDaysPerYear: assumptions.operatingDaysPerYear,
    overrideBiogasYieldM3PerTonne: assumptions.biogasYieldM3PerTonne,
    overrideMethaneFractionPct: assumptions.methaneFractionPct,
    overrideElectricalEfficiencyPct: assumptions.electricalEfficiencyPct,
  });

  if (!energyResult.success) {
    return {
      success: false,
      status: 'insufficient_data',
      missingFactors: energyResult.missingFactors,
      error: energyResult.error,
    };
  }

  // 2. Financial valuation in configured currency
  const annualEnergyValue = energyResult.annualElectricityKwh * assumptions.electricityTariffPerKwh;
  const annualNetBenefit = annualEnergyValue - assumptions.opexAnnualAmount;

  // 3. Simple payback period guardrails
  let simplePaybackYears: number | null = null;
  let paybackStatus: ScenarioEconomics['paybackStatus'] = 'negative_return';

  if (annualNetBenefit > 0 && assumptions.capexAmount > 0) {
    simplePaybackYears = assumptions.capexAmount / annualNetBenefit;
    if (simplePaybackYears <= 5) {
      paybackStatus = 'attractive';
    } else if (simplePaybackYears <= 9) {
      paybackStatus = 'moderate';
    } else {
      paybackStatus = 'marginal';
    }
  } else if (annualNetBenefit <= 0) {
    simplePaybackYears = null;
    paybackStatus = 'negative_return';
  } else {
    // CAPEX is 0
    simplePaybackYears = 0;
    paybackStatus = 'attractive';
  }

  const economics: ScenarioEconomics = {
    currency: assumptions.currency,
    dailyFeedstockKg: energyResult.dailyFeedstockKg,
    annualFeedstockTonnes: energyResult.annualFeedstockTonnes,
    dailyBiogasM3: energyResult.dailyBiogasM3,
    annualBiogasM3: energyResult.annualBiogasM3,
    annualElectricityKwh: energyResult.annualElectricityKwh,
    annualEnergyValue,
    annualNetBenefit,
    simplePaybackYears,
    paybackStatus,
  };

  return {
    success: true,
    status: 'calculated',
    economics,
  };
}
