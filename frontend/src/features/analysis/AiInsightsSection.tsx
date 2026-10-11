import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Server,
  Zap,
  Leaf,
  DollarSign,
  Layers,
  Info,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/apiClient';
import type { InsightResponse, InsightCategory } from '../../domain/schemas/insight.schema';

interface AiInsightsSectionProps {
  siteId: string;
  analysisId?: string;
  currency?: string;
}

export const AiInsightsSection: React.FC<AiInsightsSectionProps> = ({
  siteId,
  analysisId,
}) => {
  const [insightsData, setInsightsData] = useState<InsightResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const response = await apiClient.generateInsights({
        siteId,
        analysisId,
      });

      if (response && response.insights) {
        setInsightsData(response.insights);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(`${err.message}${err.details ? ': ' + err.details.join(', ') : ''}`);
      } else if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setIsOffline(true);
          setError('Backend intelligence service is currently unreachable (port 3001). Local deterministic calculations remain functional.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while communicating with the AI intelligence service.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [siteId, analysisId]);

  const categoryLabels: Record<InsightCategory, { label: string; icon: React.ReactNode }> = {
    waste_profile: { label: 'Waste Profile', icon: <Layers size={14} /> },
    energy_potential: { label: 'Energy Potential', icon: <Zap size={14} /> },
    pathway_selection: { label: 'Pathway Selection', icon: <Leaf size={14} /> },
    economic_feasibility: { label: 'Economic Feasibility', icon: <DollarSign size={14} /> },
    operational_hygiene: { label: 'Data & Hygiene', icon: <ShieldAlert size={14} /> },
  };

  const filteredInsights = insightsData?.insights.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  }) || [];

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '22px',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-leaf-light)',
              border: '1px solid var(--color-leaf-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-forest)',
              flexShrink: 0,
            }}
          >
            <Brain size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3
                className="serif-heading"
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-deep-pine)',
                  margin: 0,
                }}
              >
                Explainable AI Intelligence Layer
              </h3>

              {insightsData && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      insightsData.provider === 'deterministic'
                        ? 'var(--color-surface-subtle)'
                        : 'var(--color-leaf-light)',
                    color:
                      insightsData.provider === 'deterministic'
                        ? 'var(--color-forest)'
                        : 'var(--color-deep-pine)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <Server size={12} />
                  <span>
                    {insightsData.provider === 'deterministic'
                      ? 'Deterministic Engine (Rule-Grounded)'
                      : `External Provider (${insightsData.modelIdentifier})`}
                  </span>
                </span>
              )}

              {insightsData?.status === 'fallback' && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-amber-light)',
                    color: 'var(--color-amber-dark)',
                    border: '1px solid var(--color-amber-border)',
                  }}
                >
                  Fallback Mode Active
                </span>
              )}
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--color-stone)', margin: '4px 0 0 0' }}>
              Decoupled explanations derived directly from deterministic mass balances and physical conversion factors.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            backgroundColor: 'var(--color-surface-subtle)',
            color: 'var(--color-deep-pine)',
            border: '1px solid var(--color-border)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: isLoading ? 'wait' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'background-color 0.15s ease',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          <span>{isLoading ? 'Synthesizing...' : 'Re-generate Insights'}</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          style={{
            padding: '36px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Sparkles size={24} className="spin" color="var(--color-forest)" />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-deep-pine)' }}>
            Synthesizing Grounded Environmental Explanations...
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--color-stone)', maxWidth: '420px' }}>
            Auditing feedstock distribution, evaluating thermodynamic methane parameters, and validating scenario assumptions.
          </div>
        </div>
      )}

      {/* Error / Offline state */}
      {!isLoading && error && (
        <div
          style={{
            padding: '18px 20px',
            backgroundColor: isOffline ? 'var(--color-surface-subtle)' : 'var(--color-rose-light)',
            border: `1px solid ${isOffline ? 'var(--color-border)' : 'var(--color-rose-border)'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <AlertCircle size={18} color={isOffline ? 'var(--color-amber)' : 'var(--color-rose)'} style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
              {isOffline ? 'Local API Offline' : 'Failed to Generate Insights'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-charcoal)', marginTop: '3px' }}>
              {error}
            </div>
            <button
              onClick={fetchInsights}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--color-forest)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Main Content when available */}
      {!isLoading && !error && insightsData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Executive Grounded Summary banner */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor:
                insightsData.status === 'insufficient_data'
                  ? 'var(--color-amber-light)'
                  : 'var(--color-leaf-light)',
              border: `1px solid ${
                insightsData.status === 'insufficient_data'
                  ? 'var(--color-amber-border)'
                  : 'var(--color-leaf-border)'
              }`,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {insightsData.status === 'insufficient_data' ? (
                <ShieldAlert size={16} color="var(--color-amber-dark)" />
              ) : (
                <CheckCircle2 size={16} color="var(--color-forest)" />
              )}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color:
                    insightsData.status === 'insufficient_data'
                      ? 'var(--color-amber-dark)'
                      : 'var(--color-forest)',
                }}
              >
                {insightsData.status === 'insufficient_data'
                  ? 'Data Quality Disclosure'
                  : 'Environmental Synthesis'}
              </span>
            </div>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--color-charcoal)',
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              {insightsData.summary}
            </p>
            {insightsData.fallbackReason && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-amber-dark)',
                  marginTop: '4px',
                  fontStyle: 'italic',
                }}
              >
                Note: {insightsData.fallbackReason}
              </div>
            )}
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedCategory === 'all' ? 'var(--color-forest)' : 'var(--color-border)',
                backgroundColor: selectedCategory === 'all' ? 'var(--color-leaf-light)' : 'var(--color-surface)',
                color: selectedCategory === 'all' ? 'var(--color-forest)' : 'var(--color-stone)',
                transition: 'all 0.15s ease',
              }}
            >
              All Topics ({insightsData.insights.length})
            </button>
            {Object.entries(categoryLabels).map(([catKey, { label, icon }]) => {
              const count = insightsData.insights.filter(i => i.category === catKey).length;
              if (count === 0) return null;
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-forest)' : 'var(--color-border)',
                    backgroundColor: isSelected ? 'var(--color-leaf-light)' : 'var(--color-surface)',
                    color: isSelected ? 'var(--color-forest)' : 'var(--color-stone)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {icon}
                  <span>{label}</span>
                  <span style={{ opacity: 0.7, fontSize: '11px' }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Insights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredInsights.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-bg)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <h4
                    style={{
                      fontSize: '14.5px',
                      fontWeight: 600,
                      color: 'var(--color-deep-pine)',
                      margin: 0,
                    }}
                  >
                    {item.title}
                  </h4>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          item.confidence === 'high'
                            ? 'var(--color-leaf-light)'
                            : item.confidence === 'medium'
                            ? 'var(--color-stone-light)'
                            : 'var(--color-amber-light)',
                        color:
                          item.confidence === 'high'
                            ? 'var(--color-forest)'
                            : item.confidence === 'medium'
                            ? 'var(--color-stone)'
                            : 'var(--color-amber-dark)',
                        border:
                          item.confidence === 'high'
                            ? '1px solid var(--color-leaf-border)'
                            : item.confidence === 'medium'
                            ? '1px solid var(--color-border)'
                            : '1px solid var(--color-amber-border)',
                      }}
                    >
                      {item.confidence} confidence
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          item.status === 'measured'
                            ? 'var(--color-leaf-light)'
                            : item.status === 'assumption_based'
                            ? 'var(--color-amber-light)'
                            : 'var(--color-stone-light)',
                        color:
                          item.status === 'measured'
                            ? 'var(--color-forest)'
                            : item.status === 'assumption_based'
                            ? 'var(--color-amber-dark)'
                            : 'var(--color-stone)',
                        border:
                          item.status === 'measured'
                            ? '1px solid var(--color-leaf-border)'
                            : item.status === 'assumption_based'
                            ? '1px solid var(--color-amber-border)'
                            : '1px solid var(--color-border)',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-charcoal)',
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {item.explanation}
                </p>

                {/* Grounded Evidence Chips */}
                {item.evidence && item.evidence.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-stone)', textTransform: 'uppercase' }}>
                      Supporting Deterministic Evidence:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {item.evidence.map((ev, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '12px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px 8px',
                            color: 'var(--color-deep-pine)',
                          }}
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boundaries / Limitations */}
                {item.limitations && item.limitations.length > 0 && (
                  <div
                    style={{
                      borderTop: '1px dashed var(--color-border)',
                      paddingTop: '8px',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-stone)' }}>
                      <Info size={11} />
                      <span>Boundary Caveats:</span>
                    </div>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px', color: 'var(--color-stone)', lineHeight: 1.4 }}>
                      {item.limitations.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actionable Recommendations section */}
          {insightsData.recommendations && insightsData.recommendations.length > 0 && (
            <div
              style={{
                marginTop: '10px',
                borderTop: '1px solid var(--color-border)',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--color-forest)" />
                <h4
                  className="serif-heading"
                  style={{
                    fontSize: '17px',
                    fontWeight: 600,
                    color: 'var(--color-deep-pine)',
                    margin: 0,
                  }}
                >
                  Prioritized Actionable Recommendations
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {insightsData.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-surface)',
                      padding: '16px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                        {rec.title}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            rec.priority === 'high'
                              ? 'var(--color-leaf-light)'
                              : rec.priority === 'medium'
                              ? 'var(--color-amber-light)'
                              : 'var(--color-stone-light)',
                          color:
                            rec.priority === 'high'
                              ? 'var(--color-forest)'
                              : rec.priority === 'medium'
                              ? 'var(--color-amber-dark)'
                              : 'var(--color-stone)',
                          border:
                            rec.priority === 'high'
                              ? '1px solid var(--color-leaf-border)'
                              : rec.priority === 'medium'
                              ? '1px solid var(--color-amber-border)'
                              : '1px solid var(--color-border)',
                        }}
                      >
                        {rec.priority} priority
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
                      <strong>Rationale:</strong> {rec.reason}
                    </div>

                    <div style={{ fontSize: '12.5px', color: 'var(--color-forest)', backgroundColor: 'var(--color-leaf-light)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Expected Benefit:</strong> {rec.benefit}
                    </div>

                    {rec.requiredInputs && rec.requiredInputs.length > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--color-stone)' }}>
                        <strong>Required Inputs:</strong> {rec.requiredInputs.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footnote / Provenance Guardrail (AGENTS.md Rule B7) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '12px',
              color: 'var(--color-stone)',
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: '12px',
            }}
          >
            <span>
              Generated at: {new Date(insightsData.generatedAt).toLocaleString()} • Engine: {insightsData.modelIdentifier}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontStyle: 'italic' }}>
              <ShieldAlert size={12} />
              Human review required. Explanations do not constitute engineering certification.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
