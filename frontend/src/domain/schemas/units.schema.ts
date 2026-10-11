import { z } from 'zod';

export const MassUnitSchema = z.enum(['kg', 'tonne', 'lb']);
export type MassUnit = z.infer<typeof MassUnitSchema>;

export const VolumeUnitSchema = z.enum(['m3', 'L', 'ft3']);
export type VolumeUnit = z.infer<typeof VolumeUnitSchema>;

export const EnergyUnitSchema = z.enum(['kWh', 'MJ', 'MWh', 'GWh']);
export type EnergyUnit = z.infer<typeof EnergyUnitSchema>;

export const CurrencyCodeSchema = z.string()
  .min(3)
  .max(3)
  .regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO-4217 code (e.g. USD, EUR, GBP, INR)');
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const QuantitySchema = z.object({
  value: z.number().finite(),
  unit: z.string(),
});
export type Quantity = z.infer<typeof QuantitySchema>;
