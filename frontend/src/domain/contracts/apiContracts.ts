import { z } from 'zod';
import { WasteRecordSchema } from '../schemas/wasteRecord.schema';
import { AnalysisResultSchema } from '../schemas/analysis.schema';
import { ScenarioAssumptionsSchema, ScenarioEconomicsSchema } from '../schemas/scenario.schema';

// Standard API Error Response
export const ApiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  errorCode: z.string(),
  message: z.string(),
  details: z.array(z.string()).optional(),
  requestId: z.string().optional(),
  timestamp: z.string(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// 1. POST /waste-records
export const CreateWasteRecordRequestSchema = WasteRecordSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(), // Server can generate if not supplied
});
export type CreateWasteRecordRequest = z.infer<typeof CreateWasteRecordRequestSchema>;

export const CreateWasteRecordResponseSchema = z.object({
  success: z.boolean(),
  record: WasteRecordSchema,
  message: z.string(),
});
export type CreateWasteRecordResponse = z.infer<typeof CreateWasteRecordResponseSchema>;

// 2. GET /waste-records
export const GetWasteRecordsQuerySchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  provenance: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type GetWasteRecordsQuery = z.infer<typeof GetWasteRecordsQuerySchema>;

export const GetWasteRecordsResponseSchema = z.object({
  records: z.array(WasteRecordSchema),
  totalCount: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type GetWasteRecordsResponse = z.infer<typeof GetWasteRecordsResponseSchema>;

// 3. POST /analyses
export const CreateAnalysisRequestSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  recordIds: z.array(z.string()).optional(), // if empty, runs across all active site records
  customAssumptions: ScenarioAssumptionsSchema.optional(),
});
export type CreateAnalysisRequest = z.infer<typeof CreateAnalysisRequestSchema>;

export const CreateAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: AnalysisResultSchema,
  message: z.string(),
});
export type CreateAnalysisResponse = z.infer<typeof CreateAnalysisResponseSchema>;

// 4. GET /analyses/{id}
export const GetAnalysisResponseSchema = z.object({
  analysis: AnalysisResultSchema,
});
export type GetAnalysisResponse = z.infer<typeof GetAnalysisResponseSchema>;

// 5. POST /scenarios/compare
export const CompareScenariosRequestSchema = z.object({
  siteId: z.string().min(1),
  dailyFeedstockKg: z.number().positive('Daily feedstock must be positive'),
  scenarios: z.array(
    z.object({
      scenarioId: z.string().min(1),
      title: z.string().min(1),
      assumptions: ScenarioAssumptionsSchema,
    })
  ).min(1, 'Must provide at least one scenario to evaluate').max(5, 'Maximum 5 scenarios can be compared'),
});
export type CompareScenariosRequest = z.infer<typeof CompareScenariosRequestSchema>;

export const ScenarioComparisonItemSchema = z.object({
  scenarioId: z.string(),
  title: z.string(),
  economics: ScenarioEconomicsSchema,
});
export type ScenarioComparisonItem = z.infer<typeof ScenarioComparisonItemSchema>;

export const CompareScenariosResponseSchema = z.object({
  siteId: z.string(),
  comparison: z.array(ScenarioComparisonItemSchema),
  summary: z.string(),
});
export type CompareScenariosResponse = z.infer<typeof CompareScenariosResponseSchema>;

// 6. POST /insights
export { InsightResponseSchema, type InsightResponse, type InsightItem, type ActionRecommendation } from '../schemas/insight.schema';
import { InsightResponseSchema } from '../schemas/insight.schema';

export const GenerateInsightsRequestSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  analysisId: z.string().optional(),
  recordIds: z.array(z.string()).optional(),
  scenarioAssumptions: ScenarioAssumptionsSchema.optional(),
});
export type GenerateInsightsRequest = z.infer<typeof GenerateInsightsRequestSchema>;

export const GenerateInsightsResponseSchema = z.object({
  success: z.boolean(),
  insights: InsightResponseSchema,
  message: z.string(),
});
export type GenerateInsightsResponse = z.infer<typeof GenerateInsightsResponseSchema>;

