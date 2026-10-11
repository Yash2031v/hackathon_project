import { z } from 'zod';
import { WasteCategorySchema } from './wasteRecord.schema';
import { PathwayCandidateSchema } from './pathway.schema';
import { FactorRecordSchema } from './factorRecord.schema';

export const ExecutionStatusSchema = z.enum([
  'completed',
  'partial',
  'insufficient_data',
  'failed',
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const MetricItemSchema = z.object({
  metricId: z.string(),
  name: z.string(),
  value: z.number().finite(),
  unit: z.string(),
  status: z.enum(['measured', 'user_provided', 'assumed', 'estimated', 'simulated']),
  factorIds: z.array(z.string()).default([]),
});
export type MetricItem = z.infer<typeof MetricItemSchema>;

export const AnalysisResultSchema = z.object({
  analysisId: z.string().min(1),
  siteId: z.string().min(1),
  createdAt: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  recordCount: z.number().int().nonnegative(),
  inputRecordIds: z.array(z.string()),
  totalMassKg: z.number().nonnegative(),
  dailyAverageKg: z.number().nonnegative(),
  predominantCategory: WasteCategorySchema.nullable(),
  contaminationProfile: z.object({
    cleanPct: z.number().min(0).max(100),
    moderateSeverePct: z.number().min(0).max(100),
  }),
  metrics: z.array(MetricItemSchema).default([]),
  pathwayCandidates: z.array(PathwayCandidateSchema),
  factorSnapshot: z.array(FactorRecordSchema).default([]),
  summary: z.string(),
  recommendedNextStep: z.string(),
  missingData: z.array(z.string()).default([]),
  uncertaintyNotes: z.array(z.string()).default([]),
  executionStatus: ExecutionStatusSchema,
  humanReviewRequired: z.boolean().default(true),
});
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
