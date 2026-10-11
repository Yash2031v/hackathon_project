import { z } from 'zod';
import { MassUnitSchema } from './units.schema';

export const ContaminationLevelSchema = z.enum([
  'clean',
  'low',
  'moderate',
  'severe',
  'unknown',
]);
export type ContaminationLevel = z.infer<typeof ContaminationLevelSchema>;

export const DataProvenanceSchema = z.enum([
  'measured',
  'user_provided',
  'assumed',
  'estimated',
  'simulated',
  'demo',
]);
export type DataProvenance = z.infer<typeof DataProvenanceSchema>;

export const WasteCategorySchema = z.enum([
  'prepared_food',
  'raw_kitchen_prep',
  'bakery_grains',
  'fruit_vegetable',
  'dairy_liquids',
  'mixed_organic',
]);
export type WasteCategory = z.infer<typeof WasteCategorySchema>;

export const WasteSourceSchema = z.enum([
  'canteen_kitchen',
  'plate_scraps',
  'hostel_dining',
  'campus_cafe',
  'faculty_club',
  'event_hall',
  'other',
]);
export type WasteSource = z.infer<typeof WasteSourceSchema>;

export const WasteRecordSchema = z.object({
  id: z.string().min(1, 'Record ID cannot be empty'),
  siteId: z.string().min(1, 'Site ID cannot be empty'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO format YYYY-MM-DD'),
  source: WasteSourceSchema,
  category: WasteCategorySchema,
  massKg: z.number().positive('Mass must be strictly positive').max(50000, 'Batch mass exceeds realistic physical limit (50,000 kg)'),
  massUnit: MassUnitSchema.default('kg'),
  contamination: ContaminationLevelSchema,
  provenance: DataProvenanceSchema,
  notes: z.string().max(1000).optional(),
  createdAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)),
  updatedAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/)).optional(),
});
export type WasteRecord = z.infer<typeof WasteRecordSchema>;
