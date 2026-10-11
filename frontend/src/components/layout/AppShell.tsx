import React, { useState } from 'react';
import { Sidebar, type NavTab } from './Sidebar';
import { TopBar } from './TopBar';
import type { SiteInfo } from '../../types/domain';

interface AppShellProps {
  site: SiteInfo;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewRecord: () => void;
  totalRecordCount: number;
  apiStatus?: 'connected' | 'offline' | 'loading';
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  site,
  activeTab,
  onTabChange,
  onOpenNewRecord,
  totalRecordCount,
  apiStatus = 'connected',
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        site={site}
        isOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-content">
        <TopBar
          site={site}
          onOpenNewRecord={onOpenNewRecord}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          totalRecordCount={totalRecordCount}
          apiStatus={apiStatus}
        />

        <main className="page-wrapper">
          {children}
        </main>
      </div>
    </div>
  );
};
