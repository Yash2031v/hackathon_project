import type { PathwayCandidate } from '../schemas/pathway.schema';
import type { WasteRecord } from '../schemas/wasteRecord.schema';

export interface PathwayEvaluationResult {
  status: 'evaluated' | 'insufficient_data';
  totalMassKg: number;
  dailyAverageKg: number;
  recordCount: number;
  candidates: PathwayCandidate[];
  missingData: string[];
  uncertaintyNotes: string[];
}

/**
 * Pure deterministic waste hierarchy rule evaluation engine.
 * Ranks prevention, redistribution review, anaerobic digestion, and composting based on transparent logic.
 */
export function evaluatePathwayRules(records: WasteRecord[]): PathwayEvaluationResult {
  if (!records || records.length === 0) {
    return {
      status: 'insufficient_data',
      totalMassKg: 0,
      dailyAverageKg: 0,
      recordCount: 0,
      candidates: [
        {
          pathway: 'prevention',
          title: 'Source Waste Prevention',
          suitability: 'insufficient_data',
          reasons: ['No logged waste records available for site.'],
          constraints: ['Requires historical weighing data.'],
          evidenceIds: [],
          confidenceLabel: 'insufficient_data',
          isPrioritized: false,
        },
        {
          pathway: 'anaerobic_digestion',
          title: 'Anaerobic Digestion (AD)',
          suitability: 'insufficient_data',
          reasons: ['Feedstock mass and contamination profile unknown.'],
          constraints: ['Requires daily volumetric logs.'],
          evidenceIds: [],
          confidenceLabel: 'insufficient_data',
          isPrioritized: false,
        },
      ],
      missingData: ['Logged waste batch records', 'Feedstock composition breakdown'],
      uncertaintyNotes: ['Cannot evaluate pathway feasibility without logged institutional data.'],
    };
  }

  const totalMassKg = records.reduce((sum, r) => sum + r.massKg, 0);
  const uniqueDates = Array.from(new Set(records.map(r => r.date))).length;
  const dailyAverageKg = uniqueDates > 0 ? totalMassKg / uniqueDates : 0;

  // Category mass aggregation
  const categoryMass: Record<string, number> = {};
  let cleanOrLowContaminationMass = 0;
  let severeContaminationMass = 0;
  let eventHallMass = 0;

  for (const r of records) {
    categoryMass[r.category] = (categoryMass[r.category] || 0) + r.massKg;
    if (r.contamination === 'clean' || r.contamination === 'low') {
      cleanOrLowContaminationMass += r.massKg;
    } else if (r.contamination === 'severe') {
      severeContaminationMass += r.massKg;
    }
    if (r.source === 'event_hall' || r.source === 'faculty_club') {
      eventHallMass += r.massKg;
    }
  }

  const cookedOrBakeryMass = (categoryMass['prepared_food'] || 0) + (categoryMass['bakery_grains'] || 0);
  const cookedFraction = totalMassKg > 0 ? cookedOrBakeryMass / totalMassKg : 0;
  const severeFraction = totalMassKg > 0 ? severeContaminationMass / totalMassKg : 0;

  const candidates: PathwayCandidate[] = [];
  const missingData: string[] = [];
  const uncertaintyNotes: string[] = [];

  // 1. PREVENTION RULE
  const isHighCookedSurplus = cookedFraction >= 0.15;
  candidates.push({
    pathway: 'prevention',
    title: 'Kitchen & Batch Overproduction Prevention',
    suitability: isHighCookedSurplus ? 'promising' : 'conditional',
    reasons: [
      isHighCookedSurplus
        ? `Cooked leftovers and bakery surplus represent ${(cookedFraction * 100).toFixed(1)}% of mass, indicating preventable preparation surplus.`
        : 'Continuous tracking identifies avoidable trimming and prep scrap.',
      'Highest environmental return: avoiding raw food purchase yields 10x greater financial savings than energy recovery.',
    ],
    constraints: [
      'Requires daily kitchen batch planning linked to student attendance headcounts.',
      'Staff training on portion control and trim efficiency.',
    ],
    evidenceIds: ['FAC-AD-YIELD-FW'],
    confidenceLabel: 'indicative',
    isPrioritized: isHighCookedSurplus,
  });

  // 2. ANAEROBIC DIGESTION RULE
  const isHighVolume = dailyAverageKg >= 300;
  const isLowVolume = dailyAverageKg < 100;
  const isSevereContaminated = severeFraction >= 0.20;

  let adSuitability: PathwayCandidate['suitability'] = 'conditional';
  const adReasons: string[] = [];
  const adConstraints: string[] = [];

  if (isHighVolume && !isSevereContaminated) {
    adSuitability = 'promising';
    adReasons.push(
      `Daily organic volume (~${Math.round(dailyAverageKg)} kg/day) meets minimum viability threshold (≥300 kg/day) for continuous modular AD.`,
      'High biochemical methane potential from kitchen and cafeteria food scrap substrate (~120 m³/t biogas baseline).'
    );
  } else if (isLowVolume) {
    adSuitability = 'conditional';
    adReasons.push(
      `Generation volume (~${Math.round(dailyAverageKg)} kg/day) is below standalone continuous micro-AD threshold (≥300 kg/day).`,
      'Requires batch digester design or co-digestion with external food waste streams to achieve operational economy.'
    );
  } else {
    adSuitability = 'conditional';
    adReasons.push('Moderate generation volume supports intermediate digestion sizing.');
  }

  if (isSevereContaminated) {
    adConstraints.push(
      `High inert contamination detected (${(severeFraction * 100).toFixed(1)}% severe). Automated de-packaging or manual sorting required to prevent digester pump clogging.`
    );
  } else {
    adConstraints.push('Requires physical screening at dish-return station to remove plastic cutlery and napkins.');
  }
  adConstraints.push('Requires ~35–50 m² outdoor operational footprint with gas safety and odor mitigation.');

  candidates.push({
    pathway: 'anaerobic_digestion',
    title: 'On-Site Modular Anaerobic Digestion (AD)',
    suitability: adSuitability,
    reasons: adReasons,
    constraints: adConstraints,
    evidenceIds: ['FAC-CH4-LHV', 'FAC-AD-YIELD-FW', 'FAC-CH4-FRACTION', 'FAC-CHP-EFF-EL'],
    confidenceLabel: 'indicative',
    isPrioritized: adSuitability === 'promising',
  });

  // 3. SAFE SURPLUS REDISTRIBUTION REVIEW
  const hasEventSurplus = eventHallMass > 0;
  candidates.push({
    pathway: 'redistribution',
    title: 'Surplus Prepared Food Redistribution Review',
    suitability: hasEventSurplus ? 'conditional' : 'conditional',
    reasons: [
      hasEventSurplus
        ? 'Campus catering and event halls generate intact, unserved buffet surplus eligible for safe donation.'
        : 'Applies strictly to unserved kitchen pans and whole unpeeled produce.',
    ],
    constraints: [
      'STRICT SAFETY RULE: Post-consumer plate scraps and unchilled counter food are strictly ineligible for human consumption.',
      'Requires documented temperature log (>60°C hot or <4°C cold) and certified non-profit food rescue partner.',
    ],
    evidenceIds: [],
    confidenceLabel: 'indicative',
    isPrioritized: false,
  });

  // 4. COMPOSTING RULE
  const rawVegMass = (categoryMass['raw_kitchen_prep'] || 0) + (categoryMass['fruit_vegetable'] || 0);
  const rawVegFraction = totalMassKg > 0 ? rawVegMass / totalMassKg : 0;
  candidates.push({
    pathway: 'composting',
    title: 'Aerobic On-Site / Windrow Composting',
    suitability: 'conditional',
    reasons: [
      `Raw vegetable trimmings and fruit residue represent ${(rawVegFraction * 100).toFixed(1)}% of volume, suitable for aerobic decomposition.`,
      'Generates soil amendment for campus landscaping and grounds.',
    ],
    constraints: [
      'High moisture food scraps require blending with carbonaceous bulking agents (dry leaves, woodchips) at ~2:1 to 3:1 ratio.',
      'Cooked oily food attract vectors (rodents, flies) unless enclosed in in-vessel drum systems.',
      'Does not capture renewable energy or displace grid electricity.',
    ],
    evidenceIds: [],
    confidenceLabel: 'indicative',
    isPrioritized: false,
  });

  // Data gap identification
  missingData.push(
    'Substrate Proximate Analysis (Laboratory Total Solids TS% and Volatile Solids VS% determination)',
    'Seasonal Academic Calendar Variance (semester breaks vs peak examination enrollment)'
  );

  uncertaintyNotes.push(
    'Biogas potential is computed from empirical literature median (120 m³/t wet waste); actual yields vary ±15% with moisture shifts.',
    'Contamination grades are visual estimates from facility operators rather than standardized manual sorting audits.'
  );

  return {
    status: 'evaluated',
    totalMassKg,
    dailyAverageKg,
    recordCount: records.length,
    candidates,
    missingData,
    uncertaintyNotes,
  };
}
