import type { GroundedAiContext } from './aiContext';
import type {
  InsightResponse,
  InsightItem,
  ActionRecommendation,
} from '../../../../frontend/src/domain/schemas/insight.schema';

export class DeterministicInsightProvider {
  readonly providerName = 'deterministic' as const;
  readonly modelIdentifier = 'deterministic-rule-engine-v1';

  async generateInsights(context: GroundedAiContext): Promise<InsightResponse> {
    const { siteId, records, analysis, economics, assumptions, dataQuality } = context;
    const nowIso = new Date().toISOString();

    // 1. Boundary: Handle empty / insufficient records
    if (!records || records.length === 0 || analysis.totalMassKg <= 0) {
      return {
        summary: `Insufficient waste logs available for ${siteId}. A minimum of 7 consecutive days of verified weighing slips is required to perform reliable environmental and energy assessments.`,
        status: 'insufficient_data',
        insights: [
          {
            title: 'Baseline Feedstock Data Required',
            category: 'waste_profile',
            explanation: 'No audited organic waste records were found for this facility. Energy calculations and pathway recommendations cannot be evaluated without scale ticket data.',
            evidence: ['Site record count = 0', 'Logged mass = 0 kg'],
            confidence: 'low',
            status: 'indicative',
            limitations: ['Cannot evaluate feasibility without continuous batch weighing records.'],
          },
        ],
        recommendations: [
          {
            title: 'Deploy Digital Scale Weighing Protocol',
            priority: 'high',
            reason: 'Zero historical waste records prevent baseline feasibility calculation.',
            benefit: 'Establishes foundational feedstock mass registry for capital sizing.',
            requiredInputs: ['Daily scale tickets from central kitchen and dining halls'],
            limitations: ['Requires staff adherence at kitchen prep and dish return stations.'],
          },
        ],
        missingData: ['Logged daily mass (kg)', 'Substrate classification', 'Inert contamination screening'],
        assumptions: ['No assumptions can be projected prior to baseline data collection.'],
        provider: 'deterministic',
        modelIdentifier: this.modelIdentifier,
        generatedAt: nowIso,
        humanReviewRequired: true,
      };
    }

    const insights: InsightItem[] = [];
    const recommendations: ActionRecommendation[] = [];
    const assumptionsList: string[] = [];
    const missingDataList: string[] = [...analysis.missingData];

    // --- FEATURE A: Waste Profile Insights ---
    const categoryTotals: Record<string, number> = {};
    for (const r of records) {
      categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.massKg;
    }
    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topCatName = sortedCategories[0]?.[0]?.replace('_', ' ') || 'organic waste';
    const topCatMass = sortedCategories[0]?.[1] || 0;
    const topCatPct = Math.round((topCatMass / analysis.totalMassKg) * 100);

    let trendExplanation = '';
    if (dataQuality.sufficientForTrend) {
      trendExplanation = `Logged across ${dataQuality.uniqueDates} unique calendar dates from ${dataQuality.dateRange.start} to ${dataQuality.dateRange.end}. Feedstock exhibits consistent generation with an average generation rate of ${Math.round(analysis.dailyAverageKg)} kg/day.`;
    } else {
      trendExplanation = `Logged across only ${dataQuality.uniqueDates} unique date(s). Data volume is insufficient to confirm seasonal or weekly trends (minimum 7 distinct collection dates required).`;
    }

    let qualityNotes = `Inert contamination screening shows ${analysis.contaminationProfile.cleanPct}% clean batches.`;
    if (dataQuality.duplicateCount > 0) {
      qualityNotes += ` Warning: ${dataQuality.duplicateCount} duplicate weighing entry signature(s) detected; audit log reconciliation recommended.`;
    }
    if (dataQuality.unknownContaminationCount > 0) {
      qualityNotes += ` ${dataQuality.unknownContaminationCount} batch(es) lack contamination inspection records.`;
    }

    insights.push({
      title: 'Feedstock Stream Characterization & Quality',
      category: 'waste_profile',
      explanation: `Primary feedstock contributor is ${topCatName} (${topCatPct}% of total tracked volume; ${Math.round(topCatMass).toLocaleString()} kg). ${trendExplanation} ${qualityNotes}`,
      evidence: [
        `Total mass: ${Math.round(analysis.totalMassKg).toLocaleString()} kg across ${records.length} batches`,
        `Top category: ${topCatName} (${topCatPct}%)`,
        `Unique dates: ${dataQuality.uniqueDates}`,
        `Clean profile: ${analysis.contaminationProfile.cleanPct}%`,
      ],
      confidence: dataQuality.sufficientForTrend ? 'high' : 'medium',
      status: 'measured',
      limitations: [
        dataQuality.sufficientForTrend
          ? 'Visual sorting grade, not laboratory proximate analysis.'
          : 'Insufficient date span for seasonal variance determination.',
      ],
    });

    // --- FEATURE B: Energy Potential Explanation ---
    const rawBiogasMetric = analysis.metrics.find(m => m.metricId === 'met-biogas-annual');
    const elecMetric = analysis.metrics.find(m => m.metricId === 'met-elec-annual');
    const annualBiogas = rawBiogasMetric?.value || Math.round(analysis.dailyAverageKg * 330 * 0.12);
    const annualElecKwh = elecMetric?.value || Math.round(annualBiogas * 0.6 * 9.97 * 0.34);

    assumptionsList.push(
      'Specific Biogas Yield: 120 m³/tonne wet feedstock (VDI 4630 food waste median)',
      'Methane Concentration: 60% vol CH₄ (literature range 55-65%)',
      'Lower Heating Value: 9.97 kWh/m³ pure CH₄ (IPCC standard)',
      'CHP Electrical Efficiency: 34% (standard internal combustion engine generator)'
    );

    insights.push({
      title: 'Biochemical Methane Potential & Cogeneration Conversion',
      category: 'energy_potential',
      explanation: `Calculated deterministically: ${Math.round(analysis.dailyAverageKg)} kg/day generation across 330 operating days yields ~${annualBiogas.toLocaleString()} m³ raw biogas/year. Assuming 60% CH₄ content and 34% electrical conversion, cogeneration produces ~${annualElecKwh.toLocaleString()} kWh/yr of electricity. Real-world output may differ by ±15% due to substrate moisture, volatile solids content, and digester parasitic heat demand (~8-12% thermal load).`,
      evidence: [
        `Daily average feedstock: ${Math.round(analysis.dailyAverageKg)} kg/day`,
        `Annual potential biogas: ${annualBiogas.toLocaleString()} m³/yr`,
        `Annual usable power: ${annualElecKwh.toLocaleString()} kWh/yr`,
      ],
      confidence: 'medium',
      status: 'assumption_based',
      limitations: [
        'Calculated from literature biochemical median; total solids (TS) and volatile solids (VS) laboratory testing not yet performed.',
        'Parasitic digester pumping and heating loads are indicative averages.',
      ],
    });

    // --- FEATURE C: Waste Pathway Hierarchy Insights ---
    const prioritizedPathway = analysis.pathwayCandidates.find(c => c.isPrioritized) || analysis.pathwayCandidates[0];
    const adCandidate = analysis.pathwayCandidates.find(c => c.pathway === 'anaerobic_digestion');
    const preventionCandidate = analysis.pathwayCandidates.find(c => c.pathway === 'prevention');

    insights.push({
      title: 'Hierarchy Screening & Pathway Prioritization',
      category: 'pathway_selection',
      explanation: `Screened against the waste hierarchy: ${prioritizedPathway?.title || 'Anaerobic Digestion'} is prioritized. ${
        analysis.dailyAverageKg >= 300
          ? `Daily volume (~${Math.round(analysis.dailyAverageKg)} kg/day) satisfies the ≥300 kg/day viability threshold for on-site continuous digestion.`
          : `Daily volume (~${Math.round(analysis.dailyAverageKg)} kg/day) is below standalone continuous digestion scale; batch digestion or regional cluster co-digestion is recommended.`
      } Food waste prevention remains the highest return intervention, as avoiding food purchasing saves 10x more cost than recovering energy from discarded material.`,
      evidence: [
        `Prioritized pathway: ${prioritizedPathway?.pathway || 'none'}`,
        `AD suitability: ${adCandidate?.suitability || 'conditional'}`,
        `Prevention suitability: ${preventionCandidate?.suitability || 'conditional'}`,
      ],
      confidence: 'high',
      status: 'indicative',
      limitations: [
        'Rule-based hierarchy evaluation, not certified engineering feasibility.',
        'Redistribution requires certified cold-chain and unserved kitchen status; post-consumer scraps are legally and microbiologically excluded.',
      ],
    });

    // --- FEATURE D: Economic Feasibility Explanation ---
    if (economics && assumptions) {
      const isPositive = economics.annualNetBenefit > 0;
      assumptionsList.push(
        `CAPEX Assumption: ${economics.currency} ${assumptions.capexAmount.toLocaleString()}`,
        `Annual OPEX Assumption: ${economics.currency} ${assumptions.opexAnnualAmount.toLocaleString()}/yr`,
        `Grid Electricity Tariff: ${economics.currency} ${assumptions.electricityTariffPerKwh}/kWh`
      );

      insights.push({
        title: 'Capital Feasibility & Payback Sensitivity',
        category: 'economic_feasibility',
        explanation: isPositive
          ? `With an electricity tariff of ${economics.currency} ${assumptions.electricityTariffPerKwh}/kWh, displaced power delivers ${economics.currency} ${Math.round(economics.annualEnergyValue).toLocaleString()}/yr in avoided utility costs. Deducting ${economics.currency} ${assumptions.opexAnnualAmount.toLocaleString()} in annual OPEX yields a net benefit of ${economics.currency} ${Math.round(economics.annualNetBenefit).toLocaleString()}/yr, indicating a simple payback of ~${economics.simplePaybackYears ?? 'N/A'} years (${economics.paybackStatus}).`
          : `Annual operating and maintenance costs (${economics.currency} ${assumptions.opexAnnualAmount.toLocaleString()}) exceed the estimated gross energy value (${economics.currency} ${Math.round(economics.annualEnergyValue).toLocaleString()}). Payback is not achievable without co-digestion or higher volume.`,
        evidence: [
          `Annual energy savings: ${economics.currency} ${Math.round(economics.annualEnergyValue).toLocaleString()}`,
          `Net annual cash flow: ${economics.currency} ${Math.round(economics.annualNetBenefit).toLocaleString()}`,
          `Simple payback: ${economics.simplePaybackYears ? `${economics.simplePaybackYears} years` : 'Unattainable'}`,
          `Feasibility status: ${economics.paybackStatus}`,
        ],
        confidence: 'medium',
        status: 'assumption_based',
        limitations: [
          'Assumes unescalated retail power tariffs over asset lifetime.',
          'Excludes civil works site preparation, grid interconnection fees, and digestate disposal tariffs.',
        ],
      });
    }

    // --- FEATURE E: Actionable Recommendations ---
    // Rec 1: Source segregation
    recommendations.push({
      title: 'Enforce Kitchen Preparation vs Plate Scrap Separation',
      priority: 'high',
      reason: 'Raw prep scraps have higher biodegradability and zero cutlery contamination compared to student dish-return bins.',
      benefit: 'Reduces inert digester pump clogging risk and improves methane yield stability.',
      requiredInputs: ['Color-coded collection totes in prep kitchens'],
      limitations: ['Requires daily kitchen staff adherence.'],
    });

    // Rec 2: Laboratory testing
    recommendations.push({
      title: 'Conduct Proximate BMP & Volatile Solids Laboratory Assay',
      priority: 'medium',
      reason: 'Literature constants assume 120 m³/t biogas yield; real campus dining food waste varies with moisture and oil content.',
      benefit: 'Validates accurate digester sizing and avoids capital expenditure over-specification.',
      requiredInputs: ['Composite 5 kg waste sample sent to analytical lab'],
      limitations: ['Requires laboratory testing fee and 14-day incubation incubation turnaround.'],
    });

    // Rec 3: Feasibility vendor screening
    if (analysis.dailyAverageKg >= 300) {
      recommendations.push({
        title: 'Request Turnkey Quotations for Modular 500 kg/day Digester',
        priority: 'medium',
        reason: 'Generation rate satisfies continuous AD operational threshold.',
        benefit: 'Replaces generic CAPEX models with binding site-specific vendor proposals.',
        requiredInputs: ['Site layout plan with 40 m² footprint and utility tie-in points'],
        limitations: ['Vendor proposals are subject to local permitting and odor compliance.'],
      });
    } else {
      recommendations.push({
        title: 'Evaluate Clustered Co-Digestion with Adjacent Facilities',
        priority: 'medium',
        reason: 'Current generation volume is below standalone continuous micro-AD economic threshold.',
        benefit: 'Aggregates volume to achieve scale economy for shared digestion infrastructure.',
        requiredInputs: ['Distance and volume audit of nearby hostel/canteen kitchens'],
        limitations: ['Requires inter-facility transport logistics.'],
      });
    }

    const summary = `Deterministic Environmental Assessment: Facility generates ~${Math.round(analysis.dailyAverageKg)} kg/day of organic waste (${topCatPct}% ${topCatName}). ${
      analysis.dailyAverageKg >= 300
        ? `Sufficient continuous volume to justify on-site anaerobic digestion producing ~${annualElecKwh.toLocaleString()} kWh/yr.`
        : 'Volume is below continuous standalone digestion threshold; pre-treatment sorting and batch digestion recommended.'
    } All energy calculations are evaluated deterministically from literature physical constants.`;

    return {
      summary,
      status: 'available',
      insights,
      recommendations,
      missingData: missingDataList,
      assumptions: assumptionsList,
      provider: 'deterministic',
      modelIdentifier: this.modelIdentifier,
      generatedAt: nowIso,
      humanReviewRequired: true,
    };
  }
}
