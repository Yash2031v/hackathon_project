/**
 * Waste2Watt Domain Types
 * Strict typing for waste logging, pathway assessment, anaerobic digestion modeling, and data provenance.
 * Separate measured, user_provided, assumed, estimated, simulated, and demo values.
 */

export type DataProvenance = 
  | 'measured' 
  | 'user_provided' 
  | 'assumed' 
  | 'estimated' 
  | 'simulated' 
  | 'demo';

export type ContaminationLevel = 
  | 'clean' 
  | 'low' 
  | 'moderate' 
  | 'severe' 
  | 'unknown';

export type WasteCategory = 
  | 'prepared_food' 
  | 'raw_kitchen_prep' 
  | 'bakery_grains' 
  | 'fruit_vegetable' 
  | 'dairy_liquids' 
  | 'mixed_organic';

export type WasteSource = 
  | 'canteen_kitchen' 
  | 'plate_scraps' 
  | 'hostel_dining' 
  | 'campus_cafe' 
  | 'faculty_club' 
  | 'event_hall'
  | 'other';

export interface WasteRecord {
  id: string;
  siteId: string;
  date: string; // YYYY-MM-DD
  category: WasteCategory;
  source: WasteSource;
  massKg: number;
  massUnit?: 'kg' | 'tonne' | 'lb' | 't' | 'lbs';
  contamination: ContaminationLevel;
  provenance: DataProvenance;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PathwayType = 
  | 'prevention' 
  | 'redistribution' 
  | 'composting' 
  | 'anaerobic_digestion';

export type SuitabilityStatus = 
  | 'promising' 
  | 'conditional' 
  | 'insufficient_data' 
  | 'unsuitable';

export interface PathwayCandidate {
  pathway: PathwayType;
  title: string;
  suitability: SuitabilityStatus;
  reasons: string[];
  constraints: string[];
  evidenceIds: string[];
  confidenceLabel: 'Verified' | 'Indicative' | 'Needs Data' | 'verified' | 'indicative' | 'insufficient_data';
  isPrioritized?: boolean;
}

export type FactorQualityStatus =
  | 'verified_constant'
  | 'illustrative_literature_range'
  | 'engineering_assumption'
  | 'user_configured'
  | 'demo_only'
  | 'missing'
  | 'Standard Baseline'
  | 'Literature Field Data'
  | 'Site Specific';

export interface FactorRecord {
  factorId: string;
  name: string;
  value: number;
  unit: string;
  sourceName: string;
  sourceReference: string;
  effectiveDate: string;
  qualityStatus: FactorQualityStatus;
  notes: string;
  minValue?: number;
  maxValue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioAssumptions {
  currency?: string;
  biogasYieldM3PerTonne: number; // m3 raw biogas / tonne wet feedstock
  methaneFractionPct: number;    // % CH4 in raw biogas (typically 55-65%)
  electricalEfficiencyPct: number; // % CHP electrical efficiency (typically 30-38%)
  capexAmount?: number;
  capexUsd: number;             // Capital expenditure
  opexAnnualAmount?: number;
  opexAnnualUsd: number;        // Annual operational expenditure
  electricityTariffPerKwh: number; // Displaced grid power cost ($/kWh)
  operatingDaysPerYear: number;
}

export interface ScenarioEconomics {
  currency?: string;
  dailyFeedstockKg: number;
  annualFeedstockTonnes: number;
  dailyBiogasM3: number;
  annualBiogasM3: number;
  annualElectricityKwh: number;
  annualEnergyValue?: number;
  annualEnergyValueUsd: number;
  annualNetBenefit?: number;
  annualNetBenefitUsd: number;
  simplePaybackYears: number | null; // null if annualNetBenefit <= 0
  paybackStatus: 'attractive' | 'moderate' | 'marginal' | 'negative_return';
}

export interface MetricItem {
  metricId: string;
  name: string;
  value: number;
  unit: string;
  status: 'measured' | 'user_provided' | 'assumed' | 'estimated' | 'simulated';
  factorIds?: string[];
}

export interface AnalysisResult {
  analysisId: string;
  siteId: string;
  createdAt: string;
  dateRange: { start: string; end: string };
  recordCount: number;
  inputRecordIds?: string[];
  totalMassKg: number;
  dailyAverageKg: number;
  predominantCategory: WasteCategory | null;
  contaminationProfile: { cleanPct: number; moderateSeverePct: number };
  metrics?: MetricItem[];
  summary: string;
  recommendedNextStep: string;
  pathwayCandidates: PathwayCandidate[];
  factorSnapshot?: FactorRecord[];
  missingData: string[];
  uncertaintyNotes: string[];
  executionStatus?: string;
  isAiAssisted?: boolean;
  modelIdentifier?: string;
  humanReviewRequired: boolean;
}

export interface SiteInfo {
  id: string;
  name: string;
  institution: string;
  studentHeadcount: number;
  primaryCanteenCount: number;
  location: string;
}
