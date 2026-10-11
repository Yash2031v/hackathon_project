import React from 'react';
import type { ContaminationLevel, DataProvenance, SuitabilityStatus } from '../../types/domain';
import { getContaminationLabel, getProvenanceLabel } from '../../lib/formatters';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'provenance' | 'suitability' | 'contamination' | 'neutral' | 'confidence';
  provenance?: DataProvenance;
  suitability?: SuitabilityStatus;
  contamination?: ContaminationLevel;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  provenance,
  suitability,
  contamination,
  className = '',
}) => {
  let text = children;
  let bg = 'var(--color-stone-light)';
  let color = 'var(--color-charcoal)';
  let border = '1px solid var(--color-border)';

  if (variant === 'provenance' && provenance) {
    text = getProvenanceLabel(provenance);
    switch (provenance) {
      case 'measured':
        bg = 'var(--color-leaf-light)';
        color = 'var(--color-forest)';
        border = '1px solid var(--color-leaf-border)';
        break;
      case 'user_provided':
        bg = '#F0F4F8';
        color = '#1D3557';
        border = '1px solid #D1E0EE';
        break;
      case 'demo':
        bg = 'var(--color-amber-light)';
        color = '#8A5A14';
        border = '1px solid var(--color-amber-border)';
        break;
      case 'estimated':
      case 'simulated':
        bg = '#F5F0F8';
        color = '#4A3B69';
        border = '1px solid #E2D9EC';
        break;
      case 'assumed':
      default:
        bg = 'var(--color-stone-light)';
        color = 'var(--color-charcoal)';
        border = '1px solid var(--color-border)';
        break;
    }
  } else if (variant === 'suitability' && suitability) {
    switch (suitability) {
      case 'promising':
        text = 'High Potential';
        bg = 'var(--color-leaf-light)';
        color = 'var(--color-forest)';
        border = '1px solid var(--color-leaf-border)';
        break;
      case 'conditional':
        text = 'Conditional';
        bg = 'var(--color-amber-light)';
        color = '#8A5A14';
        border = '1px solid var(--color-amber-border)';
        break;
      case 'insufficient_data':
        text = 'Needs Data';
        bg = '#F0F4F8';
        color = '#2B4A6F';
        border = '1px solid #CFDEEE';
        break;
      case 'unsuitable':
        text = 'Unsuitable';
        bg = 'var(--color-clay-light)';
        color = 'var(--color-clay)';
        border = '1px solid var(--color-clay-border)';
        break;
    }
  } else if (variant === 'contamination' && contamination) {
    text = getContaminationLabel(contamination);
    switch (contamination) {
      case 'clean':
        bg = 'var(--color-leaf-light)';
        color = 'var(--color-forest)';
        border = '1px solid var(--color-leaf-border)';
        break;
      case 'low':
        bg = '#F0F7F1';
        color = '#285834';
        border = '1px solid #D5E8D8';
        break;
      case 'moderate':
        bg = 'var(--color-amber-light)';
        color = '#8A5A14';
        border = '1px solid var(--color-amber-border)';
        break;
      case 'severe':
        bg = 'var(--color-clay-light)';
        color = 'var(--color-clay)';
        border = '1px solid var(--color-clay-border)';
        break;
      case 'unknown':
      default:
        bg = 'var(--color-stone-light)';
        color = 'var(--color-stone)';
        border = '1px solid var(--color-border)';
        break;
    }
  }

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: bg,
        color: color,
        border: border,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {text}
    </span>
  );
};
