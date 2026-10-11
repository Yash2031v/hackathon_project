import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrintableReportView } from '../features/reports/PrintableReportView';
import type { SiteInfo, WasteRecord, AnalysisResult } from '../types/domain';

describe('PrintableReportView Component', () => {
  const mockSite: SiteInfo = {
    id: 'site-campus-01',
    name: 'Central Dining Complex',
    institution: 'Apex Institute of Technology',
    studentHeadcount: 4200,
    primaryCanteenCount: 3,
    location: 'Campus South Sector',
  };

  const mockRecords: WasteRecord[] = [
    {
      id: 'rec-1',
      siteId: 'site-campus-01',
      date: '2026-03-25',
      category: 'prepared_food',
      massKg: 450,
      contamination: 'clean',
      provenance: 'measured',
      source: 'canteen_kitchen',
      createdAt: '2026-03-25T10:00:00Z',
    },
    {
      id: 'rec-2',
      siteId: 'site-campus-01',
      date: '2026-03-26',
      category: 'fruit_vegetable',
      massKg: 350,
      contamination: 'low',
      provenance: 'measured',
      source: 'canteen_kitchen',
      createdAt: '2026-03-26T10:00:00Z',
    },
  ];

  const mockAnalysis: AnalysisResult = {
    analysisId: 'ana-test-456',
    siteId: 'site-campus-01',
    createdAt: '2026-03-28T10:00:00Z',
    dateRange: { start: '2026-03-25', end: '2026-03-26' },
    recordCount: 2,
    inputRecordIds: ['rec-1', 'rec-2'],
    totalMassKg: 800,
    dailyAverageKg: 400,
    predominantCategory: 'prepared_food',
    contaminationProfile: { cleanPct: 100, moderateSeverePct: 0 },
    summary: '2 collection batches audited across 2 calendar days.',
    recommendedNextStep: 'Proceed with continuous digestion engineering specification.',
    metrics: [
      {
        metricId: 'total_mass',
        name: 'Total Mass',
        value: 800,
        unit: 'kg',
        status: 'measured',
        factorIds: [],
      },
      {
        metricId: 'gross_energy',
        name: 'Gross Energy',
        value: 28800,
        unit: 'kWh/year',
        status: 'estimated',
        factorIds: [],
      },
    ],
    pathwayCandidates: [
      {
        pathway: 'anaerobic_digestion',
        title: 'Continuous High-Solids Anaerobic Digestion',
        suitability: 'promising',
        reasons: ['Daily volume exceeds 300 kg/day threshold'],
        constraints: ['Desulfurization required'],
        confidenceLabel: 'indicative',
        isPrioritized: true,
        evidenceIds: ['ev-1'],
      },
    ],
    factorSnapshot: [],
    missingData: ['Daily volatile solids assay'],
    uncertaintyNotes: ['Digester heating parasitic load modeled at 12%'],
    executionStatus: 'completed',
    humanReviewRequired: true,
  };

  it('renders executive report header and site details', () => {
    const handleClose = vi.fn();
    render(
      <PrintableReportView
        site={mockSite}
        records={mockRecords}
        analysis={mockAnalysis}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Organic Waste to Energy & Pathway Assessment/i)).toBeDefined();
    expect(screen.getByText(/Central Dining Complex/)).toBeDefined();
    expect(screen.getAllByText(/W2W-REP-TEST-456/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders mass balance and energy potential numbers', () => {
    render(
      <PrintableReportView
        site={mockSite}
        records={mockRecords}
        analysis={mockAnalysis}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('800 kg')).toBeDefined();
    expect(screen.getByText('400 kg/day')).toBeDefined();
    expect(screen.getByText(/Continuous High-Solids Anaerobic Digestion/)).toBeDefined();
  });

  it('renders statutory decision support disclosure', () => {
    render(
      <PrintableReportView
        site={mockSite}
        records={mockRecords}
        analysis={mockAnalysis}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Institutional Decision Support Disclosure:/)).toBeDefined();
    expect(screen.getByText(/They do not constitute professional engineering guarantees/)).toBeDefined();
  });

  it('triggers window.print when print button is clicked', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(
      <PrintableReportView
        site={mockSite}
        records={mockRecords}
        analysis={mockAnalysis}
        onClose={vi.fn()}
      />
    );

    const printBtn = screen.getByRole('button', { name: /Print \/ Save as PDF/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <PrintableReportView
        site={mockSite}
        records={mockRecords}
        analysis={mockAnalysis}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
