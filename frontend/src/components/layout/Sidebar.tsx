import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Sparkles, 
  Flame, 
  BookOpen, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import type { SiteInfo } from '../../types/domain';

export type NavTab = 'overview' | 'waste-log' | 'analysis' | 'scenarios' | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  site: SiteInfo;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  site,
  isOpen,
  onCloseMobile,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard size={18} />,
      hint: 'Metrics & Trends',
    },
    {
      id: 'waste-log',
      label: 'Waste Log',
      icon: <ClipboardList size={18} />,
      hint: 'Daily Records',
    },
    {
      id: 'analysis',
      label: 'Pathway Analysis',
      icon: <Sparkles size={18} />,
      hint: 'Intelligence Engine',
    },
    {
      id: 'scenarios',
      label: 'Scenario Studio',
      icon: <Flame size={18} />,
      hint: 'Biogas & Payback',
    },
    {
      id: 'reports',
      label: 'Factors & Audit',
      icon: <BookOpen size={18} />,
      hint: 'Assumptions Register',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(16, 45, 39, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}
      >
        {/* Brand Header */}
        <div>
          <div
            style={{
              padding: '24px 22px 20px',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-forest)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  W2W
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: '17px',
                      fontWeight: 700,
                      color: 'var(--color-deep-pine)',
                      lineHeight: 1.1,
                    }}
                  >
                    Waste2Watt
                  </h1>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--color-stone)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Team NULLVERSE
                  </div>
                </div>
              </div>

              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  aria-label="Close Navigation Menu"
                  className="mobile-menu-btn"
                  style={{
                    padding: '6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-stone)',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Institutional Site Chip */}
            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-forest)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '2px',
                }}
              >
                <Building2 size={12} />
                <span>Active Facility</span>
              </div>
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--color-deep-pine)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={site.name}
              >
                {site.name}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-stone)',
                  marginTop: '1px',
                }}
              >
                {site.studentHeadcount.toLocaleString()} students • {site.primaryCanteenCount} canteens
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav
            aria-label="Main Navigation"
            style={{
              padding: '16px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-forest)' : 'var(--color-charcoal)',
                    backgroundColor: isActive ? 'var(--color-leaf-light)' : 'transparent',
                    border: isActive ? '1px solid var(--color-leaf-border)' : '1px solid transparent',
                    transition: 'all var(--transition-fast)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        color: isActive ? 'var(--color-forest)' : 'var(--color-stone)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} color="var(--color-forest)" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / Governance Guardrail */}
        <div
          style={{
            padding: '16px 18px',
            borderTop: '1px solid var(--color-border-subtle)',
            backgroundColor: 'var(--color-surface-subtle)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--color-stone)',
              marginBottom: '4px',
            }}
          >
            <ShieldCheck size={14} color="var(--color-forest)" />
            <span style={{ fontWeight: 600 }}>Decision Support Only</span>
          </div>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-stone)',
              lineHeight: 1.4,
            }}
          >
            Estimates require engineering verification before capital investment.
          </p>
        </div>
      </aside>
    </>
  );
};
