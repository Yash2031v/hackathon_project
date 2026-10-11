import React from 'react';
import type { DataProvenance } from '../../types/domain';
import { Badge } from './Badge';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  provenance: DataProvenance;
  subtext?: string;
  badgeLabel?: string;
  trendText?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  provenance,
  subtext,
  badgeLabel,
  trendText,
  icon,
}) => {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px 22px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon && <span style={{ color: 'var(--color-forest)', opacity: 0.85 }}>{icon}</span>}
          <Badge variant="provenance" provenance={provenance}>
            {badgeLabel}
          </Badge>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0 8px' }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--color-deep-pine)',
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-stone)',
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {(subtext || trendText) && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-stone)',
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: '8px',
            marginTop: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{subtext}</span>
          {trendText && (
            <span style={{ fontWeight: 500, color: 'var(--color-forest)' }}>{trendText}</span>
          )}
        </div>
      )}
    </div>
  );
};
