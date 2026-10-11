import React from 'react';
import { 
  ArrowUpRight, 
  Flame, 
  Scale, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import type { AnalysisResult, WasteRecord } from '../../types/domain';
import { MetricCard } from '../../components/common/MetricCard';
import { Notice } from '../../components/common/Notice';
import { Badge } from '../../components/common/Badge';
import { 
  formatEnergyKwh, 
  formatMassKg, 
  formatPercentage, 
  getWasteCategoryLabel, 
  getWasteSourceLabel 
} from '../../lib/formatters';

interface OverviewPageProps {
  records: WasteRecord[];
  analysis: AnalysisResult;
  onNavigateToTab: (tab: 'waste-log' | 'analysis' | 'scenarios' | 'reports') => void;
  onOpenLogModal: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  records,
  analysis,
  onNavigateToTab,
  onOpenLogModal,
}) => {
  // Aggregate stats from records
  const totalKg = records.reduce((sum, r) => sum + r.massKg, 0);
  const cleanCount = records.filter(r => r.contamination === 'clean' || r.contamination === 'low').length;
  const cleanRatio = records.length > 0 ? (cleanCount / records.length) * 100 : 0;
  const uniqueDates = Array.from(new Set(records.map(r => r.date))).length;
  const avgDailyKg = uniqueDates > 0 ? totalKg / uniqueDates : 0;

  // Potential energy (120 m3/t, 60% CH4, 34% electrical efficiency)
  const indicativeBiogasM3 = (totalKg / 1000) * 120;
  const indicativeKwh = indicativeBiogasM3 * 0.60 * 9.97 * 0.34;

  // Group by date for the trend chart
  const dateMap = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.date] = (acc[r.date] || 0) + r.massKg;
    return acc;
  }, {});
  const trendEntries = Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b));
  const maxDaily = Math.max(...trendEntries.map(([, kg]) => kg), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header and Call to Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-stone)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Environmental Operations
          </span>
          <h2
            className="serif-heading"
            style={{
              fontSize: '28px',
              fontWeight: 600,
              marginTop: '2px',
              color: 'var(--color-deep-pine)',
            }}
          >
            Organic Waste Profile &amp; Recovery Intelligence
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-stone)', marginTop: '4px' }}>
            Structured stream tracking and verified pathway analysis for institutional dining facilities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigateToTab('analysis')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-forest)',
              backgroundColor: 'var(--color-leaf-light)',
              border: '1px solid var(--color-leaf-border)',
            }}
          >
            <Sparkles size={15} />
            <span>Open Pathway Analysis</span>
          </button>
        </div>
      </div>

      {/* Demo Data Transparency Alert */}
      <Notice
        type="demo"
        title="Sample Demonstration Baseline Active"
        action={
          <button
            onClick={onOpenLogModal}
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--color-forest)',
              textDecoration: 'underline',
            }}
          >
            Log New Real Record
          </button>
        }
      >
        The statistics below include <strong>{records.length} sample dining hall records</strong> representing 
        typical institutional food prep and plate scraps. To evaluate actual campus facility economics, log your measured weighing slip data.
      </Notice>

      {/* Primary Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
        }}
      >
        <MetricCard
          label="Cumulative Logged Mass"
          value={formatMassKg(totalKg)}
          provenance="demo"
          subtext={`${records.length} logged batches across ${uniqueDates} operational days`}
          icon={<Scale size={18} />}
        />

        <MetricCard
          label="Average Daily Generation"
          value={formatMassKg(avgDailyKg)}
          unit="/ day"
          provenance="estimated"
          subtext="Sufficient volume for modular micro-AD threshold (>300 kg/day)"
          icon={<TrendingUp size={18} />}
        />

        <MetricCard
          label="Feedstock Quality Ratio"
          value={formatPercentage(cleanRatio)}
          provenance="user_provided"
          subtext={`${cleanCount} of ${records.length} batches graded clean or low contaminant`}
          icon={<CheckCircle2 size={18} />}
        />

        <MetricCard
          label="Indicative Potential Power"
          value={formatEnergyKwh(indicativeKwh)}
          provenance="estimated"
          badgeLabel="Estimated Only"
          subtext="Theoretical yield at 120 m³/t biogas & 34% electrical efficiency"
          icon={<Flame size={18} />}
        />
      </div>

      {/* Operational Trend & Pathway Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Weekly Trend Chart */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Daily Waste Mass Profile
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
                Tracked kilograms per operational day with batch volume comparison
              </p>
            </div>
            <Badge variant="provenance" provenance="demo">Sample Trend</Badge>
          </div>

          {/* Pure SVG/CSS Clean Editorial Bar Chart */}
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px',
                height: '180px',
                paddingBottom: '24px',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {trendEntries.map(([dateStr, mass]) => {
                const heightPct = Math.max(12, Math.round((mass / maxDaily) * 100));
                const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
                return (
                  <div
                    key={dateStr}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      position: 'relative',
                    }}
                  >
                    <div
                      title={`${dayLabel}: ${mass} kg`}
                      style={{
                        width: '100%',
                        maxWidth: '44px',
                        height: `${heightPct}%`,
                        backgroundColor: 'var(--color-forest)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'background-color var(--transition-fast)',
                        opacity: 0.9,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-leaf)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-forest)')}
                    />
                    <span
                      className="tabular-nums"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        fontSize: '10.5px',
                        color: 'var(--color-stone)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dateStr.slice(5)}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-deep-pine)',
                      }}
                    >
                      {mass}k
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11.5px', color: 'var(--color-stone)' }}>
              <span>Y-Axis: Total Measured Mass (kg)</span>
              <span>Baseline Consistency: High (&gt;400 kg/day typical)</span>
            </div>
          </div>
        </div>

        {/* Pathway Recommendations Preview */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                  Pathway Suitability Summary
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
                  Evaluated against local composition and contamination constraints
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('analysis')}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-forest)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Full Analysis</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analysis.pathwayCandidates.map((pathway) => (
                <div
                  key={pathway.pathway}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                      {pathway.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-stone)', marginTop: '2px' }}>
                      {pathway.reasons[0] || 'Standard hierarchy recommendation.'}
                    </div>
                  </div>
                  <Badge variant="suitability" suitability={pathway.suitability} />
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--color-stone)',
            }}
          >
            <span>Primary Recovery Route: <strong>Modular Anaerobic Digestion</strong></span>
            <button
              onClick={() => onNavigateToTab('scenarios')}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-forest)',
                textDecoration: 'underline',
              }}
            >
              Model AD Scenario &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Records Table Preview */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
              Recent Waste Log Entries
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
              Latest batches recorded at the campus dining complexes
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('waste-log')}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-forest)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View All Logs</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-stone)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Source</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Mass</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Contamination</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 5).map((record) => (
                <tr
                  key={record.id}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="tabular-nums" style={{ padding: '12px', fontWeight: 500 }}>
                    {record.date}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getWasteSourceLabel(record.source)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getWasteCategoryLabel(record.category)}
                  </td>
                  <td className="tabular-nums" style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                    {record.massKg} kg
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="contamination" contamination={record.contamination} />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="provenance" provenance={record.provenance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
