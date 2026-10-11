import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface NoticeProps {
  type?: 'demo' | 'mock' | 'info' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export const Notice: React.FC<NoticeProps> = ({
  type = 'info',
  title,
  children,
  action,
}) => {
  let bg = 'var(--color-surface)';
  let borderColor = 'var(--color-border)';
  let iconColor = 'var(--color-forest)';
  let IconComponent = Info;

  switch (type) {
    case 'demo':
      bg = '#FDFBF7';
      borderColor = 'var(--color-amber-border)';
      iconColor = 'var(--color-amber)';
      IconComponent = AlertCircle;
      break;
    case 'mock':
      bg = '#F9F8F5';
      borderColor = 'var(--color-border)';
      iconColor = 'var(--color-stone)';
      IconComponent = Info;
      break;
    case 'warning':
      bg = 'var(--color-amber-light)';
      borderColor = 'var(--color-amber-border)';
      iconColor = 'var(--color-amber)';
      IconComponent = AlertTriangle;
      break;
    case 'error':
      bg = 'var(--color-clay-light)';
      borderColor = 'var(--color-clay-border)';
      iconColor = 'var(--color-clay)';
      IconComponent = AlertCircle;
      break;
    case 'info':
    default:
      bg = 'var(--color-leaf-light)';
      borderColor = 'var(--color-leaf-border)';
      iconColor = 'var(--color-forest)';
      IconComponent = CheckCircle2;
      break;
  }

  return (
    <div
      role="region"
      aria-label={title || 'System Notice'}
      style={{
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        fontSize: '13px',
        color: 'var(--color-charcoal)',
        lineHeight: 1.5,
      }}
    >
      <div style={{ color: iconColor, marginTop: '2px', flexShrink: 0 }}>
        <IconComponent size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
              marginBottom: '2px',
              fontSize: '13.5px',
            }}
          >
            {title}
          </div>
        )}
        <div style={{ color: 'var(--color-charcoal)', opacity: 0.9 }}>
          {children}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
};
