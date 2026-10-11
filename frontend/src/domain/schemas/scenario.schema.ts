import { z } from 'zod';
import { CurrencyCodeSchema } from './units.schema';

export const ScenarioAssumptionsSchema = z.object({
  currency: CurrencyCodeSchema.default('USD'),
  biogasYieldM3PerTonne: z.number().min(20).max(400, 'Biogas yield out of physical organic bounds (20-400 m3/t)'),
  methaneFractionPct: z.number().min(20).max(90, 'Methane content out of physical biogas bounds (20-90%)'),
  electricalEfficiencyPct: z.number().min(10).max(60, 'Electrical generator efficiency out of plausible bounds (10-60%)'),
  capexAmount: z.number().nonnegative('CAPEX cannot be negative'),
  opexAnnualAmount: z.number().nonnegative('Annual OPEX cannot be negative'),
  electricityTariffPerKwh: z.number().nonnegative('Electricity tariff cannot be negative'),
  operatingDaysPerYear: z.number().int().min(1).max(365, 'Operating days must be between 1 and 365'),
});
export type ScenarioAssumptions = z.infer<typeof ScenarioAssumptionsSchema>;

export const PaybackStatusSchema = z.enum([
  'attractive',
  'moderate',
  'marginal',
  'negative_return',
]);
export type PaybackStatus = z.infer<typeof PaybackStatusSchema>;

export const ScenarioEconomicsSchema = z.object({
  currency: CurrencyCodeSchema,
  dailyFeedstockKg: z.number().nonnegative(),
  annualFeedstockTonnes: z.number().nonnegative(),
  dailyBiogasM3: z.number().nonnegative(),
  annualBiogasM3: z.number().nonnegative(),
  annualElectricityKwh: z.number().nonnegative(),
  annualEnergyValue: z.number().nonnegative(),
  annualNetBenefit: z.number(),
  simplePaybackYears: z.number().positive().nullable(),
  paybackStatus: PaybackStatusSchema,
});
export type ScenarioEconomics = z.infer<typeof ScenarioEconomicsSchema>;
