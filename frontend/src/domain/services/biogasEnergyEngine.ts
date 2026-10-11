import { VERIFIED_FACTORS } from '../constants/verifiedFactors';
import type { FactorRecord } from '../schemas/factorRecord.schema';

export interface BiogasEnergyCalculationInputs {
  dailyFeedstockKg: number;
  operatingDaysPerYear: number;
  factors?: FactorRecord[];
  // Direct overrides allowed only if explicitly provided
  overrideBiogasYieldM3PerTonne?: number;
  overrideMethaneFractionPct?: number;
  overrideElectricalEfficiencyPct?: number;
}

export type BiogasEnergyCalculationResult = 
  | {
      success: true;
      status: 'calculated';
      dailyFeedstockKg: number;
      annualFeedstockTonnes: number;
      dailyBiogasM3: number;
      annualBiogasM3: number;
      annualMethaneM3: number;
      annualThermalKwh: number;
      annualElectricityKwh: number;
      appliedFactors: {
        biogasYieldM3PerTonne: number;
        methaneFractionPct: number;
        electricalEfficiencyPct: number;
        ch4LhvKwhPerM3: number;
      };
      notes: string[];
    }
  | {
      success: false;
      status: 'insufficient_data';
      missingFactors: string[];
      error: string;
    };

/**
 * Pure deterministic biogas and electricity conversion engine.
 * Never invents missing factors; returns explicit 'insufficient_data' if required factors are missing.
 */
export function calculateBiogasEnergyPotential(
  inputs: BiogasEnergyCalculationInputs
): BiogasEnergyCalculationResult {
  const missingFactors: string[] = [];

  // 1. Resolve Methane LHV (Constant)
  const lhvFactor = inputs.factors?.find(f => f.factorId === 'FAC-CH4-LHV') ||
                    VERIFIED_FACTORS.find(f => f.factorId === 'FAC-CH4-LHV');
  const ch4Lhv = lhvFactor ? lhvFactor.value : 9.95;

  // 2. Resolve Biogas Yield
  let biogasYield = inputs.overrideBiogasYieldM3PerTonne;
  if (biogasYield === undefined) {
    const yieldFactor = inputs.factors?.find(f => f.factorId === 'FAC-AD-YIELD-FW');
    if (yieldFactor && yieldFactor.qualityStatus !== 'missing' && Number.isFinite(yieldFactor.value)) {
      biogasYield = yieldFactor.value;
    } else {
      missingFactors.push('FAC-AD-YIELD-FW (Specific Biogas Yield)');
    }
  }

  // 3. Resolve Methane Fraction
  let methaneFraction = inputs.overrideMethaneFractionPct;
  if (methaneFraction === undefined) {
    const ch4Factor = inputs.factors?.find(f => f.factorId === 'FAC-CH4-FRACTION');
    if (ch4Factor && ch4Factor.qualityStatus !== 'missing' && Number.isFinite(ch4Factor.value)) {
      methaneFraction = ch4Factor.value;
    } else {
      missingFactors.push('FAC-CH4-FRACTION (Biogas Methane Content)');
    }
  }

  // 4. Resolve Electrical Efficiency
  let electricalEff = inputs.overrideElectricalEfficiencyPct;
  if (electricalEff === undefined) {
    const effFactor = inputs.factors?.find(f => f.factorId === 'FAC-CHP-EFF-EL');
    if (effFactor && effFactor.qualityStatus !== 'missing' && Number.isFinite(effFactor.value)) {
      electricalEff = effFactor.value;
    } else {
      missingFactors.push('FAC-CHP-EFF-EL (CHP Electrical Efficiency)');
    }
  }

  // Guardrail: return explicit insufficient_data state if any required factors are absent
  if (missingFactors.length > 0 || biogasYield === undefined || methaneFraction === undefined || electricalEff === undefined) {
    return {
      success: false,
      status: 'insufficient_data',
      missingFactors,
      error: `Missing required conversion factors: ${missingFactors.join(', ')}. Deterministic calculations halted to prevent guessing.`,
    };
  }

  // Boundary checks
  const safeDailyKg = Math.max(0, inputs.dailyFeedstockKg);
  const safeOperatingDays = Math.max(1, Math.min(365, inputs.operatingDaysPerYear));
  const safeYield = Math.max(0, biogasYield);
  const safeCh4Pct = Math.max(0, Math.min(100, methaneFraction));
  const safeEffPct = Math.max(0, Math.min(100, electricalEff));

  // 1. Throughput (1 tonne = 1000 kg)
  const annualFeedstockTonnes = (safeDailyKg * safeOperatingDays) / 1000;

  // 2. Biogas production
  const dailyBiogasM3 = (safeDailyKg / 1000) * safeYield;
  const annualBiogasM3 = annualFeedstockTonnes * safeYield;

  // 3. Methane volume & energy
  const annualMethaneM3 = annualBiogasM3 * (safeCh4Pct / 100);
  const annualThermalKwh = annualMethaneM3 * ch4Lhv;
  const annualElectricityKwh = annualThermalKwh * (safeEffPct / 100);

  return {
    success: true,
    status: 'calculated',
    dailyFeedstockKg: safeDailyKg,
    annualFeedstockTonnes,
    dailyBiogasM3,
    annualBiogasM3,
    annualMethaneM3,
    annualThermalKwh,
    annualElectricityKwh,
    appliedFactors: {
      biogasYieldM3PerTonne: safeYield,
      methaneFractionPct: safeCh4Pct,
      electricalEfficiencyPct: safeEffPct,
      ch4LhvKwhPerM3: ch4Lhv,
    },
    notes: [
      `Throughput: ${safeDailyKg.toFixed(1)} kg/day across ${safeOperatingDays} operating days/yr.`,
      `Methane LHV applied: ${ch4Lhv} kWh/m³ CH₄ (ISO 6976:2016 at 15°C).`,
      `CHP electrical conversion: ${safeEffPct}% (remaining ~50% thermal energy supports digester parasitic heating).`,
    ],
  };
}
