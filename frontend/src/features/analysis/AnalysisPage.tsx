import React, { useState } from 'react';
import { 
  RotateCw, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  ArrowRight
} from 'lucide-react';
import type { AnalysisResult, PathwayType } from '../../types/domain';
import { Badge } from '../../components/common/Badge';
import { Notice } from '../../components/common/Notice';
import { AiInsightsSection } from './AiInsightsSection';

interface AnalysisPageProps {
  analysis: AnalysisResult;
  onRunNewAnalysis: () => void;
  isAnalyzing: boolean;
  onSelectPathwayForScenario: (pathway: PathwayType) => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  analysis,
  onRunNewAnalysis,
  isAnalyzing,
  onSelectPathwayForScenario,
}) => {
  const [expandedPathway, setExpandedPathway] = useState<string>('anaerobic_digestion');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title & Trigger */}
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
            Decision Intelligence &amp; Hierarchy
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
            Waste Pathway Recommendations
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-stone)', marginTop: '4px' }}>
            Systematic screening across waste prevention, redistribution, anaerobic digestion, and composting.
          </p>
        </div>

        <button
          onClick={onRunNewAnalysis}
          disabled={isAnalyzing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-forest)',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13.5px',
            fontWeight: 600,
            opacity: isAnalyzing ? 0.7 : 1,
            cursor: isAnalyzing ? 'wait' : 'pointer',
          }}
        >
          <RotateCw size={16} className={isAnalyzing ? 'spin' : ''} />
          <span>{isAnalyzing ? 'Evaluating Stream Rules...' : 'Re-run Pathway Analysis'}</span>
        </button>
      </div>

      {/* Rule-Based Governance Disclosure */}
      <Notice
        type="info"
        title="Rule-Based Decision Intelligence &amp; Transparent Hierarchy"
      >
        Rankings are evaluated against deterministic hierarchy rules and volume thresholds (&gt;300 kg/day for continuous AD). 
        The explainable AI intelligence layer below provides decoupled explanations without altering authoritative numerical outputs (AGENTS.md Rules B1 &amp; C1).
      </Notice>

      {/* Synthesis Executive Summary Card */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-deep-pine)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Synthesis Summary
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-stone)' }}>
              (Audit Scope: {analysis.dateRange.start} to {analysis.dateRange.end} • {analysis.recordCount} batches)
            </span>
          </div>
          <Badge variant="provenance" provenance="estimated">Snapshot #{analysis.analysisId.slice(-7)}</Badge>
        </div>

        <p style={{ fontSize: '15px', color: 'var(--color-charcoal)', lineHeight: 1.6, marginBottom: '18px' }}>
          {analysis.summary}
        </p>

        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--color-surface-subtle)',
            borderLeft: '4px solid var(--color-forest)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recommended Next Step
          </div>
          <div style={{ fontSize: '13.5px', color: 'var(--color-deep-pine)', fontWeight: 500, marginTop: '2px' }}>
            {analysis.recommendedNextStep}
          </div>
        </div>
      </div>

      {/* Ranked Pathway Candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
          Evaluated Recovery Pathways
        </h3>

        {analysis.pathwayCandidates.map((cand, idx) => {
          const isExpanded = expandedPathway === cand.pathway;
          return (
            <div
              key={cand.pathway}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: cand.isPrioritized ? '1.5px solid var(--color-leaf)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-card)',
                overflow: 'hidden',
                transition: 'border-color var(--transition-fast)',
              }}
            >
              {/* Accordion Header */}
              <div
                onClick={() => setExpandedPathway(isExpanded ? '' : cand.pathway)}
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: isExpanded ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-warm-paper)',
                      color: 'var(--color-deep-pine)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                        {cand.title}
                      </h4>
                      {cand.isPrioritized && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-forest)',
                            backgroundColor: 'var(--color-leaf-light)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          Primary Candidate
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-stone)', marginTop: '2px' }}>
                      Confidence: {cand.confidenceLabel} • Evidence links: {cand.evidenceIds.length || 'Hierarchy default'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Badge variant="suitability" suitability={cand.suitability} />
                  {isExpanded ? <ChevronUp size={18} color="var(--color-stone)" /> : <ChevronDown size={18} color="var(--color-stone)" />}
                </div>
              </div>

              {/* Accordion Body */}
              {isExpanded && (
                <div style={{ padding: '20px 24px 24px', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Reasons */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-forest)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={14} />
                        <span>Why this option?</span>
                      </div>
                      <ul style={{ paddingLeft: '18px', fontSize: '13.5px', color: 'var(--color-charcoal)', lineHeight: 1.6 }}>
                        {cand.reasons.map((r, i) => (
                          <li key={i} style={{ marginBottom: '6px' }}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Constraints */}
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-amber)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>Pre-requisites &amp; Constraints</span>
                      </div>
                      <ul style={{ paddingLeft: '18px', fontSize: '13.5px', color: 'var(--color-charcoal)', lineHeight: 1.6 }}>
                        {cand.constraints.map((c, i) => (
                          <li key={i} style={{ marginBottom: '6px' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Contextual Action Button if Anaerobic Digestion */}
                  {cand.pathway === 'anaerobic_digestion' && (
                    <div
                      style={{
                        marginTop: '20px',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <button
                        onClick={() => onSelectPathwayForScenario(cand.pathway)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--color-forest)',
                          backgroundColor: 'var(--color-leaf-light)',
                          border: '1px solid var(--color-leaf-border)',
                        }}
                      >
                        <Flame size={15} />
                        <span>Open AD Scenario Studio</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explainable AI Intelligence Section (Milestone 4) */}
      <AiInsightsSection siteId={analysis.siteId} analysisId={analysis.analysisId} />

      {/* Missing Data & Uncertainty Notice (AGENTS.md Rule B6) */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '22px 26px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldAlert size={18} color="var(--color-amber)" />
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
            Data Quality &amp; Uncertainty Disclosures
          </h4>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-stone)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Identified Information Gaps
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
              {analysis.missingData.map((gap, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{gap}</li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-stone)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Engineering Assumption Boundaries
            </div>
            <ul style={{ paddingLeft: '18px', fontSize: '13px', color: 'var(--color-charcoal)', lineHeight: 1.5 }}>
              {analysis.uncertaintyNotes.map((note, i) => (
                <li key={i} style={{ marginBottom: '4px' }}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
