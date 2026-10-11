import { z } from 'zod';

export const FactorQualityStatusSchema = z.enum([
  'verified_constant',
  'illustrative_literature_range',
  'engineering_assumption',
  'user_configured',
  'demo_only',
  'missing',
]);
export type FactorQualityStatus = z.infer<typeof FactorQualityStatusSchema>;

export const FactorRecordSchema = z.object({
  factorId: z.string().min(1, 'Factor ID cannot be empty'),
  name: z.string().min(1, 'Factor name cannot be empty'),
  value: z.number().finite('Factor value must be a finite number'),
  unit: z.string().min(1, 'Unit must be specified explicitly'),
  sourceName: z.string().min(1, 'Source name cannot be empty'),
  sourceReference: z.string().min(1, 'Source reference citation cannot be empty'),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be YYYY-MM-DD').or(z.string().min(4)),
  qualityStatus: FactorQualityStatusSchema,
  notes: z.string().max(2000),
  minValue: z.number().finite().optional(),
  maxValue: z.number().finite().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type FactorRecord = z.infer<typeof FactorRecordSchema>;
