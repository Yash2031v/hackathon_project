import type { GroundedAiContext } from './aiContext';

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export function buildGroundedPrompts(context: GroundedAiContext): PromptPayload {
  const { siteId, records, analysis, economics, assumptions, dataQuality } = context;

  const systemPrompt = `You are the explainable intelligence layer for Waste2Watt, an institutional waste-to-energy decision support platform.
Your role is to explain, interpret, contextualize, and summarize grounded calculation outputs.

CRITICAL INSTRUCTIONS:
1. AUTHORITATIVE NUMBERS: All energy, mass, economic, and pathway suitability metrics are computed deterministically. You MUST NOT invent, alter, recalculate, or contradict any numerical values.
2. NO INVENTED EVIDENCE: You must not fabricate scientific literature citations, case studies, or sensor readings. All evidence references must point to supplied calculation outputs or verified factor IDs.
3. DATA QUALITY HONESTY: If data is insufficient for trend analysis (${dataQuality.uniqueDates} unique dates < 7 required), state explicitly that no trend can be concluded.
4. FOOD SAFETY & HYGIENE: Never recommend redistribution for post-consumer plate scraps. Explain strict hygiene and cold-chain constraints.
5. GROUNDED FORMAT: You must return ONLY a valid JSON object matching the requested schema. No conversational filler or markdown wrappers.`;

  // Aggregate category breakdowns
  const categoryBreakdown: Record<string, number> = {};
  for (const r of records) {
    categoryBreakdown[r.category] = (categoryBreakdown[r.category] || 0) + r.massKg;
  }

  const userPrompt = JSON.stringify({
    task: 'Generate structured explainable insights and prioritized recommendations based strictly on the grounded data below.',
    siteId,
    wasteProfile: {
      totalMassKg: analysis.totalMassKg,
      dailyAverageKg: analysis.dailyAverageKg,
      recordCount: analysis.recordCount,
      uniqueCollectionDates: dataQuality.uniqueDates,
      dateRange: dataQuality.dateRange,
      categoryMassKg: categoryBreakdown,
      contaminationProfile: analysis.contaminationProfile,
      duplicateRecordsDetected: dataQuality.duplicateCount,
      unmeasuredProvenanceRecords: dataQuality.unmeasuredProvenanceCount,
      trendAnalysisAllowed: dataQuality.sufficientForTrend,
    },
    metricsSummary: analysis.metrics.map(m => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
      status: m.status,
    })),
    pathwayCandidates: analysis.pathwayCandidates.map(c => ({
      pathway: c.pathway,
      title: c.title,
      suitability: c.suitability,
      confidence: c.confidenceLabel,
      isPrioritized: c.isPrioritized,
      reasons: c.reasons,
      constraints: c.constraints,
    })),
    scenarioEconomics: economics ? {
      currency: economics.currency,
      dailyBiogasM3: economics.dailyBiogasM3,
      annualBiogasM3: economics.annualBiogasM3,
      annualElectricityKwh: economics.annualElectricityKwh,
      annualEnergyValue: economics.annualEnergyValue,
      annualNetBenefit: economics.annualNetBenefit,
      simplePaybackYears: economics.simplePaybackYears,
      paybackStatus: economics.paybackStatus,
      assumptionsUsed: assumptions,
    } : null,
    gapsAndBoundaries: {
      missingData: analysis.missingData,
      uncertaintyNotes: analysis.uncertaintyNotes,
    },
    schemaRequirement: {
      summary: 'string',
      status: 'available | insufficient_data | fallback',
      insights: [
        {
          title: 'string',
          category: 'waste_profile | energy_potential | pathway_selection | economic_feasibility | operational_hygiene',
          explanation: 'string',
          evidence: ['string'],
          confidence: 'high | medium | low',
          status: 'indicative | measured | assumption_based',
          limitations: ['string'],
        },
      ],
      recommendations: [
        {
          title: 'string',
          priority: 'high | medium | low',
          reason: 'string',
          benefit: 'string',
          requiredInputs: ['string'],
          limitations: ['string'],
        },
      ],
      missingData: ['string'],
      assumptions: ['string'],
      provider: 'external',
      modelIdentifier: 'string',
    },
  }, null, 2);

  return { systemPrompt, userPrompt };
}
