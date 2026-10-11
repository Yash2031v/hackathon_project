import { z } from 'zod';

export const PathwayTypeSchema = z.enum([
  'prevention',
  'redistribution',
  'anaerobic_digestion',
  'composting',
]);
export type PathwayType = z.infer<typeof PathwayTypeSchema>;

export const SuitabilityStatusSchema = z.enum([
  'promising',
  'conditional',
  'insufficient_data',
  'unsuitable',
]);
export type SuitabilityStatus = z.infer<typeof SuitabilityStatusSchema>;

export const ConfidenceLevelSchema = z.enum([
  'verified',
  'indicative',
  'insufficient_data',
]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const PathwayCandidateSchema = z.object({
  pathway: PathwayTypeSchema,
  title: z.string().min(1),
  suitability: SuitabilityStatusSchema,
  reasons: z.array(z.string()),
  constraints: z.array(z.string()),
  evidenceIds: z.array(z.string()),
  confidenceLabel: ConfidenceLevelSchema,
  isPrioritized: z.boolean().default(false),
});
export type PathwayCandidate = z.infer<typeof PathwayCandidateSchema>;
