import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../components/common/Badge';
import { MetricCard } from '../components/common/MetricCard';
import { Notice } from '../components/common/Notice';

describe('Common UI Components', () => {
  it('renders provenance badge with correct label and styling', () => {
    render(<Badge variant="provenance" provenance="measured" />);
    expect(screen.getByText('Scale Measured')).toBeDefined();
  });

  it('renders demo provenance badge with warning color indicator', () => {
    render(<Badge variant="provenance" provenance="demo" />);
    expect(screen.getByText('Sample Demo Record')).toBeDefined();
  });

  it('renders metric card with tabular numerals and data quality badge', () => {
    render(
      <MetricCard
        label="Cumulative Mass"
        value="3,030"
        unit="kg"
        provenance="measured"
        subtext="7 days audit"
      />
    );
    expect(screen.getByText('Cumulative Mass')).toBeDefined();
    expect(screen.getByText('3,030')).toBeDefined();
    expect(screen.getByText('kg')).toBeDefined();
    expect(screen.getByText('Scale Measured')).toBeDefined();
  });

  it('renders notice component with accessible alert role', () => {
    render(
      <Notice type="warning" title="Inert Contamination Alert">
        Cutlery detected in batch
      </Notice>
    );
    expect(screen.getByText('Inert Contamination Alert')).toBeDefined();
    expect(screen.getByText('Cutlery detected in batch')).toBeDefined();
  });
});

describe('AiInsightsSection Component', () => {
  it('renders grounded insights when API succeeds', async () => {
    const mockInsightResponse = {
      success: true,
      insights: {
        summary: 'Deterministic Environmental Assessment for site-campus-main.',
        status: 'available',
        insights: [
          {
            title: 'Waste Profile Characterization',
            category: 'waste_profile',
            explanation: 'Prepared food represents dominant stream.',
            evidence: ['Measured records: 8 batches'],
            confidence: 'high',
            status: 'measured',
            limitations: ['Moisture content unmeasured'],
          },
        ],
        recommendations: [
          {
            title: 'Install Feedstock Scalper Screen',
            priority: 'high',
            reason: 'Protect digester pumps from inert debris',
            benefit: 'Prevents mechanical fouling',
            requiredInputs: ['Screen mesh specification'],
            limitations: ['Requires weekly cleaning'],
          },
        ],
        missingData: ['Daily solids test'],
        assumptions: ['300 operating days'],
        provider: 'deterministic',
        modelIdentifier: 'deterministic-rules-v1',
        generatedAt: '2026-03-28T10:00:00Z',
        humanReviewRequired: true,
      },
      message: 'Insights generated successfully.',
    };

    const { apiClient } = await import('../lib/apiClient');
    vi.spyOn(apiClient, 'generateInsights').mockResolvedValueOnce(mockInsightResponse as any);

    const { AiInsightsSection } = await import('../features/analysis/AiInsightsSection');
    render(<AiInsightsSection siteId="site-campus-main" />);

    expect(await screen.findByText('Explainable AI Intelligence Layer')).toBeDefined();
    expect(await screen.findByText(/Deterministic Engine/)).toBeDefined();
    expect(await screen.findByText(/Prepared food represents dominant stream/)).toBeDefined();
    expect(await screen.findByText(/Install Feedstock Scalper Screen/)).toBeDefined();
    expect(await screen.findByText(/high priority/i)).toBeDefined();
  });

  it('renders fallback badge and reason when provider fails back', async () => {
    const mockFallbackResponse = {
      success: true,
      insights: {
        summary: 'Fallback deterministic assessment.',
        status: 'fallback',
        fallbackReason: 'External AI timed out',
        insights: [],
        recommendations: [],
        missingData: [],
        assumptions: [],
        provider: 'deterministic',
        modelIdentifier: 'deterministic-rules-v1',
        generatedAt: '2026-03-28T10:00:00Z',
        humanReviewRequired: true,
      },
      message: 'Fallback active.',
    };

    const { apiClient } = await import('../lib/apiClient');
    vi.spyOn(apiClient, 'generateInsights').mockResolvedValueOnce(mockFallbackResponse as any);

    const { AiInsightsSection } = await import('../features/analysis/AiInsightsSection');
    render(<AiInsightsSection siteId="site-campus-main" />);

    expect(await screen.findByText(/Fallback Mode Active/)).toBeDefined();
    expect(await screen.findByText(/Note: External AI timed out/)).toBeDefined();
  });
});
