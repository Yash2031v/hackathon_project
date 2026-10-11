import { z } from 'zod';

export const InsightCategorySchema = z.enum([
  'waste_profile',
  'energy_potential',
  'pathway_selection',
  'economic_feasibility',
  'operational_hygiene',
]);
export type InsightCategory = z.infer<typeof InsightCategorySchema>;

export const InsightItemSchema = z.object({
  title: z.string().min(1),
  category: InsightCategorySchema,
  explanation: z.string().min(1),
  evidence: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  status: z.enum(['indicative', 'measured', 'assumption_based']),
  limitations: z.array(z.string()),
});
export type InsightItem = z.infer<typeof InsightItemSchema>;

export const ActionRecommendationSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  reason: z.string().min(1),
  benefit: z.string().min(1),
  requiredInputs: z.array(z.string()),
  limitations: z.array(z.string()),
});
export type ActionRecommendation = z.infer<typeof ActionRecommendationSchema>;

export const InsightResponseSchema = z.object({
  summary: z.string().min(1),
  status: z.enum(['available', 'insufficient_data', 'fallback']),
  insights: z.array(InsightItemSchema),
  recommendations: z.array(ActionRecommendationSchema),
  missingData: z.array(z.string()),
  assumptions: z.array(z.string()),
  provider: z.enum(['deterministic', 'external']),
  modelIdentifier: z.string().min(1),
  generatedAt: z.string(),
  humanReviewRequired: z.boolean().default(true),
  fallbackReason: z.string().optional(),
});
export type InsightResponse = z.infer<typeof InsightResponseSchema>;
