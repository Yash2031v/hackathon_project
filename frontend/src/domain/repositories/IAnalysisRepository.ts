import type { AnalysisResult } from '../schemas/analysis.schema';

export interface IAnalysisRepository {
  createAnalysis(analysis: AnalysisResult): Promise<AnalysisResult>;
  getAnalysisById(analysisId: string): Promise<AnalysisResult | null>;
  listAnalysesBySite(siteId: string, limit?: number): Promise<AnalysisResult[]>;
}
