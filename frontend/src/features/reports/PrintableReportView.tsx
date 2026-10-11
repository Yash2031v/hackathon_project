import React from 'react';
import {
  Printer,
  X,
  ShieldAlert,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import type { SiteInfo, WasteRecord, AnalysisResult } from '../../types/domain';
import { formatMassKg, formatEnergyKwh, formatCo2Kg, getWasteCategoryLabel } from '../../lib/formatters';
import { REFERENCE_FACTORS } from '../../lib/mockData';

interface PrintableReportViewProps {
  site: SiteInfo;
  records: WasteRecord[];
  analysis: AnalysisResult;
  onClose: () => void;
}

export const PrintableReportView: React.FC<PrintableReportViewProps> = ({
  site,
  records,
  analysis,
  onClose,
}) => {
  const reportId = `W2W-REP-${analysis.analysisId ? analysis.analysisId.replace('ana-', '').toUpperCase() : Date.now()}`;
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate waste category mass distribution
  const categoryTotals = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.massKg;
    return acc;
  }, {});

  const totalMass = analysis.totalMassKg || records.reduce((s, r) => s + r.massKg, 0);

  // Extract key deterministic metrics
  const metricsList = analysis.metrics || [];
  const metricMap = new Map(metricsList.map(m => [m.metricId, m]));
  const grossEnergyKwh = metricMap.get('gross_energy')?.value ?? (analysis.dailyAverageKg * 0.24 * 300);
  const parasiticKwh = grossEnergyKwh * 0.12;
  const usableKwh = grossEnergyKwh - parasiticKwh;
  const co2AvoidedKg = usableKwh * 0.71;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-report-container" style={{ position: 'relative' }}>
      {/* Top Action Bar — Hidden during printing */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-deep-pine)',
          color: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={18} color="var(--color-amber)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            Printable Environmental Decision Report
          </span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>({reportId})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-forest)',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            <Printer size={15} />
            <span>Print / Save as PDF</span>
          </button>

          <button
            onClick={onClose}
            aria-label="Close printable report"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.25)',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        id="printable-report-sheet"
        style={{
          backgroundColor: '#FFFFFF',
          color: 'var(--color-charcoal)',
          padding: '40px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          lineHeight: 1.5,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Report Header */}
        <div
          style={{
            borderBottom: '2px solid var(--color-deep-pine)',
            paddingBottom: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--color-forest)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '4px',
              }}
            >
              Waste2Watt Institutional Intelligence • Executive Audit
            </div>
            <h1
              className="serif-heading"
              style={{
                fontSize: '26px',
                fontWeight: 600,
                color: 'var(--color-deep-pine)',
                margin: 0,
              }}
            >
              Organic Waste to Energy &amp; Pathway Assessment
            </h1>
            <div style={{ fontSize: '13.5px', color: 'var(--color-stone)', marginTop: '4px' }}>
              Facility: <strong>{site.name}</strong> • {site.institution} ({site.location})
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
              fontSize: '12.5px',
              color: 'var(--color-stone)',
            }}
          >
            <div><strong>Report Ref:</strong> {reportId}</div>
            <div><strong>Date of Issue:</strong> {generatedDate}</div>
            <div>
              <strong>Audit Period:</strong> {analysis.dateRange.start} to {analysis.dateRange.end}
            </div>
            <div><strong>Scope:</strong> {analysis.recordCount} audited batches</div>
          </div>
        </div>

        {/* Section 1: Executive Summary & Provenance Disclosure */}
        <div style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <h2
            className="serif-heading"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '6px',
              marginBottom: '10px',
            }}
          >
            1. Executive Assessment &amp; Governance Scope
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--color-charcoal)', margin: '0 0 10px 0' }}>
            {analysis.summary}
          </p>

          <div
            style={{
              backgroundColor: 'var(--color-leaf-light)',
              border: '1px solid var(--color-leaf-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: '12.5px',
              color: 'var(--color-deep-pine)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="var(--color-forest)" />
            <span>
              <strong>Primary Recommendation:</strong> {analysis.recommendedNextStep}
            </span>
          </div>
        </div>

        {/* Section 2: Waste Stream Composition & Mass Balance */}
        <div style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <h2
            className="serif-heading"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '6px',
              marginBottom: '12px',
            }}
          >
            2. Feedstock Mass Balance &amp; Category Breakdown
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Total Audited Mass</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>{formatMassKg(totalMass)}</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Daily Mean Throughput</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>{formatMassKg(analysis.dailyAverageKg)}/day</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Clean Stream Ratio</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-forest)' }}>{analysis.contaminationProfile.cleanPct}%</div>
            </div>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--color-stone-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Waste Category</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Aggregated Mass</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Mass Share (%)</th>
                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Recommended Initial Step</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryTotals).map(([cat, mass], idx) => {
                const sharePct = totalMass > 0 ? ((mass / totalMass) * 100).toFixed(1) : '0';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{getWasteCategoryLabel(cat as any)}</td>
                    <td style={{ padding: '8px 10px' }}>{formatMassKg(mass)}</td>
                    <td style={{ padding: '8px 10px' }}>{sharePct}%</td>
                    <td style={{ padding: '8px 10px', color: 'var(--color-stone)' }}>
                      {cat === 'prepared_food' ? 'Immediate Anaerobic Digestion / Redistribution' : 'Aerobic Composting or C:N Balancing'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section 3: Deterministic Energy Estimates */}
        <div style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <h2
            className="serif-heading"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '6px',
              marginBottom: '12px',
            }}
          >
            3. Deterministic Biochemical Energy Potential
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Est. Gross Electricity</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>{formatEnergyKwh(grossEnergyKwh)}/yr</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Parasitic Load (12%)</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-stone)' }}>-{formatEnergyKwh(parasiticKwh)}/yr</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>Net Usable Power</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-forest)' }}>{formatEnergyKwh(usableKwh)}/yr</div>
            </div>
            <div style={{ border: '1px solid var(--color-border)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase' }}>CO₂e Displacement</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-forest)' }}>{formatCo2Kg(co2AvoidedKg)}/yr</div>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--color-stone)', fontStyle: 'italic' }}>
            Formula Basis: E_gross = Feedstock (t) × Biogas Yield (m³/t) × Methane % × 9.97 × Generator Efficiency. Usable energy accounts for a conservative 12% parasitic internal thermal/electrical heating allowance.
          </div>
        </div>

        {/* Section 4: Pathway Hierarchy Recommendations */}
        <div style={{ marginBottom: '28px', pageBreakInside: 'avoid' }}>
          <h2
            className="serif-heading"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '6px',
              marginBottom: '12px',
            }}
          >
            4. Waste Pathway Screening Hierarchy
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.pathwayCandidates.map((cand, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-border)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-deep-pine)' }}>
                    {cand.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-stone)', marginTop: '2px' }}>
                    <strong>Key Justification:</strong> {cand.reasons.join('; ')}
                  </div>
                  {cand.constraints.length > 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--color-amber-dark)', marginTop: '2px' }}>
                      <strong>Constraints:</strong> {cand.constraints.join('; ')}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor:
                      cand.suitability === 'promising'
                        ? 'var(--color-leaf-light)'
                        : cand.suitability === 'conditional'
                        ? 'var(--color-amber-light)'
                        : 'var(--color-stone-light)',
                    color:
                      cand.suitability === 'promising'
                        ? 'var(--color-forest)'
                        : cand.suitability === 'conditional'
                        ? 'var(--color-amber-dark)'
                        : 'var(--color-stone)',
                  }}
                >
                  {cand.suitability}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Engineering Factor References */}
        <div style={{ marginBottom: '24px', pageBreakInside: 'avoid' }}>
          <h2
            className="serif-heading"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              borderBottom: '1px solid var(--color-border)',
              paddingBottom: '6px',
              marginBottom: '10px',
            }}
          >
            5. Approved Factors &amp; Empirical References
          </h2>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--color-stone-light)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '6px 8px' }}>Factor Name</th>
                <th style={{ padding: '6px 8px' }}>Configured Value</th>
                <th style={{ padding: '6px 8px' }}>Institutional Source / Standard</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_FACTORS.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 500 }}>{f.name}</td>
                  <td style={{ padding: '6px 8px' }}>{f.value} {f.unit}</td>
                  <td style={{ padding: '6px 8px', color: 'var(--color-stone)' }}>
                    {(f as any).source || f.sourceName || f.sourceReference || 'Institutional Standard'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 6: Governance & Uncertainty Disclaimer (AGENTS.md Rules B1 & B2) */}
        <div
          style={{
            borderTop: '2px solid var(--color-deep-pine)',
            paddingTop: '16px',
            marginTop: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            backgroundColor: 'var(--color-surface-subtle)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            pageBreakInside: 'avoid',
          }}
        >
          <ShieldAlert size={20} color="var(--color-amber-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '11.5px', color: 'var(--color-stone)', lineHeight: 1.5 }}>
            <strong>Institutional Decision Support Disclosure:</strong> Waste2Watt is designed for early-stage waste screening, scenario feasibility modeling, and decision support. 
            All estimated energy outputs, payback schedules, and environmental displacements are derived using mathematical models and user-configured empirical assumptions. 
            They do not constitute professional engineering guarantees, EPC contractual specifications, or regulatory certifications. 
            Actual digester biological yields require laboratory proximate volatile solids analysis and continuous feedstock moisture verification prior to capital commitment.
          </div>
        </div>
      </div>
    </div>
  );
};
