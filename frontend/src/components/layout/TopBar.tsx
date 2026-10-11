import React from 'react';
import { Menu, Plus, Database, Cpu } from 'lucide-react';
import type { SiteInfo } from '../../types/domain';

interface TopBarProps {
  site: SiteInfo;
  onOpenNewRecord: () => void;
  onToggleMobileMenu: () => void;
  totalRecordCount: number;
  apiStatus?: 'connected' | 'offline' | 'loading';
}

export const TopBar: React.FC<TopBarProps> = ({
  site,
  onOpenNewRecord,
  onToggleMobileMenu,
  totalRecordCount,
  apiStatus = 'connected',
}) => {
  return (
    <header
      className="topbar-container"
      style={{
        height: '64px',
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onToggleMobileMenu}
          aria-label="Toggle Navigation Menu"
          style={{
            display: 'none',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-charcoal)',
          }}
          className="mobile-menu-btn"
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-deep-pine)',
            }}
          >
            {site.institution}
          </span>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-stone)',
            }}
          >
            {site.name}
          </span>
        </div>
      </div>

      {/* Right Operational Status & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Local API Server Connection Indicator */}
        <div
          title={
            apiStatus === 'connected'
              ? 'Local API server is online at port 3001 with durable JSON persistence.'
              : apiStatus === 'loading'
              ? 'Connecting to local API server...'
              : 'Local API server offline. Start server with npm run dev in backend directory.'
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'var(--color-warm-paper)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11.5px',
            color: apiStatus === 'connected' ? 'var(--color-forest)' : 'var(--color-stone)',
          }}
        >
          <Cpu size={13} color={apiStatus === 'connected' ? 'var(--color-forest)' : 'var(--color-stone)'} />
          <span>
            {apiStatus === 'connected'
              ? 'Local API (Port 3001)'
              : apiStatus === 'loading'
              ? 'API Connecting...'
              : 'Local API Offline'}
          </span>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor:
                apiStatus === 'connected'
                  ? 'var(--color-forest)'
                  : apiStatus === 'loading'
                  ? 'var(--color-stone)'
                  : 'var(--color-clay)',
            }}
          />
        </div>

        {/* Demo Data Tracker */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: 'var(--color-warm-paper)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '11.5px',
            color: 'var(--color-charcoal)',
          }}
        >
          <Database size={13} color="var(--color-forest)" />
          <span>{totalRecordCount} Records Loaded</span>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenNewRecord}
          id="btn-log-waste-topbar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-forest)',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background-color var(--transition-fast)',
            boxShadow: 'var(--shadow-subtle)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-forest-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-forest)')}
        >
          <Plus size={16} />
          <span>Log Waste</span>
        </button>
      </div>
    </header>
  );
};
