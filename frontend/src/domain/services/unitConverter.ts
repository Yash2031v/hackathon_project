import type { EnergyUnit, MassUnit, VolumeUnit } from '../schemas/units.schema';

export class UnitConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitConversionError';
  }
}

// Exact Physical Conversion Ratios to Base Units
// Base Mass: kg
const MASS_TO_KG: Record<MassUnit, number> = {
  kg: 1,
  tonne: 1000,
  lb: 0.45359237,
};

// Base Volume: m3
const VOLUME_TO_M3: Record<VolumeUnit, number> = {
  m3: 1,
  L: 0.001,
  ft3: 0.028316846592,
};

// Base Energy: kWh
const ENERGY_TO_KWH: Record<EnergyUnit, number> = {
  kWh: 1,
  MJ: 1 / 3.6,
  MWh: 1000,
  GWh: 1000000,
};

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError(`Cannot convert non-finite mass value: ${value}`);
  }
  const inKg = value * MASS_TO_KG[from];
  return inKg / MASS_TO_KG[to];
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError(`Cannot convert non-finite volume value: ${value}`);
  }
  const inM3 = value * VOLUME_TO_M3[from];
  return inM3 / VOLUME_TO_M3[to];
}

export function convertEnergy(value: number, from: EnergyUnit, to: EnergyUnit): number {
  if (!Number.isFinite(value)) {
    throw new UnitConversionError(`Cannot convert non-finite energy value: ${value}`);
  }
  const inKwh = value * ENERGY_TO_KWH[from];
  return inKwh / ENERGY_TO_KWH[to];
}

export interface CurrencyConversionRate {
  from: string;
  to: string;
  rate: number;
  effectiveDate: string; // ISO-8601 YYYY-MM-DD
  source: string;
}

/**
 * Currency conversion requires explicit, documented exchange rate and date.
 * Never silently assumes 1:1 or guesses parity.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rateRecord?: CurrencyConversionRate
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  if (!rateRecord) {
    throw new UnitConversionError(
      `Cannot convert currency from ${fromCurrency} to ${toCurrency} without documented exchange rate and effective date.`
    );
  }
  if (rateRecord.from !== fromCurrency || rateRecord.to !== toCurrency) {
    throw new UnitConversionError(
      `Supplied conversion rate (${rateRecord.from}->${rateRecord.to}) does not match requested pair (${fromCurrency}->${toCurrency}).`
    );
  }
  if (!Number.isFinite(rateRecord.rate) || rateRecord.rate <= 0) {
    throw new UnitConversionError(`Invalid exchange rate: ${rateRecord.rate}`);
  }
  return amount * rateRecord.rate;
}
