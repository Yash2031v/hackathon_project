import React, { useState } from 'react';
import { 
  Building2, 
  Printer,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import type { SiteInfo, WasteRecord, AnalysisResult } from '../../types/domain';
import { REFERENCE_FACTORS } from '../../lib/mockData';
import { Notice } from '../../components/common/Notice';
import { exportWasteRecordsToCsv, exportAnalysisToCsv, downloadCsvFile } from '../../domain/services/csvExportService';
import { PrintableReportView } from './PrintableReportView';

interface ReportsSettingsPageProps {
  site: SiteInfo;
  records: WasteRecord[];
  analysis?: AnalysisResult;
}

export const ReportsSettingsPage: React.FC<ReportsSettingsPageProps> = ({
  site,
  records,
  analysis,
}) => {
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'info' | 'error'; title: string; text: string } | null>(null);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState<boolean>(false);

  // Provenance counts
  const provenanceCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.provenance] = (acc[r.provenance] || 0) + 1;
    return acc;
  }, {});

  const handleExportRecordsCsv = () => {
    if (!records || records.length === 0) {
      setFeedbackNotice({
        type: 'error',
        title: 'No Exportable Records',
        text: 'There are no waste records available for this facility to export.',
      });
      return;
    }

    const csv = exportWasteRecordsToCsv(records);
    const filename = `waste2watt-records-${site.id}-${new Date().toISOString().split('T')[0]}.csv`;
    const success = downloadCsvFile(csv, filename);

    if (success) {
      setFeedbackNotice({
        type: 'info',
        title: 'CSV Export Generated',
        text: `Exported ${records.length} waste records to ${filename} with formula injection protection.`,
      });
    } else {
      setFeedbackNotice({
        type: 'error',
        title: 'Export Failed',
        text: 'Unable to initiate browser download.',
      });
    }
  };

  const handleExportAnalysisCsv = () => {
    if (!analysis) {
      setFeedbackNotice({
        type: 'error',
        title: 'No Analysis Result Available',
        text: 'Run pathway analysis first to generate an auditable analysis export.',
      });
      return;
    }

    const csv = exportAnalysisToCsv(analysis);
    const filename = `waste2watt-analysis-${analysis.analysisId || site.id}-${new Date().toISOString().split('T')[0]}.csv`;
    const success = downloadCsvFile(csv, filename);

    if (success) {
      setFeedbackNotice({
        type: 'info',
        title: 'Analysis CSV Exported',
        text: `Exported deterministic synthesis and pathway rankings to ${filename}.`,
      });
    } else {
      setFeedbackNotice({
        type: 'error',
        title: 'Export Failed',
        text: 'Unable to initiate browser download.',
      });
    }
  };

  if (isPrintViewOpen && analysis) {
    return (
      <PrintableReportView
        site={site}
        records={records}
        analysis={analysis}
        onClose={() => setIsPrintViewOpen(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Title & Actions */}
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
            Scientific Standards &amp; Facility Audit
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
            Engineering Factors &amp; Reports
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-stone)', marginTop: '4px' }}>
            Full transparency into empirical conversion factors, literature citations, and auditable ledger exports for {site.name}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportRecordsCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-charcoal)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={15} color="var(--color-forest)" />
            <span>Export Waste CSV</span>
          </button>

          <button
            onClick={handleExportAnalysisCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-charcoal)',
              padding: '9px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-subtle)',
              cursor: 'pointer',
            }}
          >
            <FileText size={15} color="var(--color-forest)" />
            <span>Export Analysis CSV</span>
          </button>

          {analysis && (
            <button
              onClick={() => setIsPrintViewOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--color-forest)',
                border: 'none',
                color: '#FFFFFF',
                padding: '9px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              <span>Printable Audit Report</span>
            </button>
          )}
        </div>
      </div>

      {feedbackNotice && (
        <Notice
          type={feedbackNotice.type === 'error' ? 'warning' : 'info'}
          title={feedbackNotice.title}
        >
          {feedbackNotice.text}
        </Notice>
      )}

      {/* Facility Overview Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          color: 'var(--color-charcoal)',
        }}
      >
        <Building2 size={16} color="var(--color-forest)" />
        <span>
          Facility Audit Scope: <strong>{site.name}</strong> ({site.location}) — Serving {site.studentHeadcount.toLocaleString()} students across {site.primaryCanteenCount} dining facilities.
        </span>
      </div>

      {/* Provenance Distribution Strip */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-deep-pine)', marginBottom: '4px' }}>
          Active Data Provenance Breakdown
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--color-stone)', marginBottom: '16px' }}>
          Verification status across current {records.length} logged institutional records
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              minWidth: '160px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase', fontWeight: 600 }}>
              Sample Demo Records
            </div>
            <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-deep-pine)', marginTop: '2px' }}>
              {provenanceCounts['demo'] || 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-stone)' }}>Synthetic seed data</div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              minWidth: '160px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase', fontWeight: 600 }}>
              Operator Entered
            </div>
            <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-forest)', marginTop: '2px' }}>
              {provenanceCounts['user_provided'] || 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-stone)' }}>Manual facility logs</div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              minWidth: '160px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--color-stone)', textTransform: 'uppercase', fontWeight: 600 }}>
              Scale Measured
            </div>
            <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-forest)', marginTop: '2px' }}>
              {provenanceCounts['measured'] || 0}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-stone)' }}>Verified scale tickets</div>
          </div>
        </div>
      </div>

      {/* Engineering Factors Register Table */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
            Biochemical &amp; Energy Conversion Factors
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
            Auditable factors used in energy and financial calculations (AGENTS.md Rule B5)
          </p>
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
              <tr
                style={{
                  backgroundColor: 'var(--color-surface-subtle)',
                  borderBottom: '1px solid var(--color-border)',
                  color: 'var(--color-stone)',
                }}
              >
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Factor Identifier &amp; Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Standard Value</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Physical Unit</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Authoritative Source</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_FACTORS.map((fac) => (
                <tr
                  key={fac.factorId}
                  style={{
                    borderBottom: '1px solid var(--color-border-subtle)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>{fac.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-stone)' }}>ID: {fac.factorId}</div>
                  </td>
                  <td className="tabular-nums" style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--color-deep-pine)' }}>
                    {fac.value}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--color-charcoal)' }}>
                    {fac.unit}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                    <div style={{ fontWeight: 500 }}>{fac.sourceName}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-stone)', marginTop: '2px' }}>
                      {fac.sourceReference}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          fac.qualityStatus === 'Standard Baseline'
                            ? 'var(--color-leaf-light)'
                            : fac.qualityStatus === 'Literature Field Data'
                            ? '#EEF3F8'
                            : 'var(--color-amber-light)',
                        color:
                          fac.qualityStatus === 'Standard Baseline'
                            ? 'var(--color-forest)'
                            : fac.qualityStatus === 'Literature Field Data'
                            ? '#1D4063'
                            : '#8A5A14',
                        border:
                          fac.qualityStatus === 'Standard Baseline'
                            ? '1px solid var(--color-leaf-border)'
                            : fac.qualityStatus === 'Literature Field Data'
                            ? '1px solid #C8D8E8'
                            : '1px solid var(--color-amber-border)',
                      }}
                    >
                      {fac.qualityStatus}
                    </span>
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
