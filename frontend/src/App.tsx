import { useState, useEffect, useCallback } from 'react';
import './styles/design-system.css';
import { AppShell } from './components/layout/AppShell';
import type { NavTab } from './components/layout/Sidebar';
import { OverviewPage } from './features/overview/OverviewPage';
import { WasteLogPage } from './features/waste-log/WasteLogPage';
import { AnalysisPage } from './features/analysis/AnalysisPage';
import { ScenarioStudioPage } from './features/scenarios/ScenarioStudioPage';
import { ReportsSettingsPage } from './features/reports/ReportsSettingsPage';
import { DEMO_SITE, INITIAL_DEMO_ANALYSIS, INITIAL_DEMO_RECORDS } from './lib/mockData';
import type { AnalysisResult, WasteRecord } from './types/domain';
import { WasteLogForm } from './features/waste-log/WasteLogForm';
import { Badge } from './components/common/Badge';
import { apiClient } from './lib/apiClient';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [records, setRecords] = useState<WasteRecord[]>(INITIAL_DEMO_RECORDS);
  const [analysis, setAnalysis] = useState<AnalysisResult>(INITIAL_DEMO_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // API connectivity and status state
  const [apiStatus, setApiStatus] = useState<'connected' | 'offline' | 'loading'>('loading');
  const [apiError, setApiError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Dynamic baseline daily mass
  const totalKg = records.reduce((s, r) => s + r.massKg, 0);
  const uniqueDates = Array.from(new Set(records.map((r) => r.date))).length;
  const baselineDailyKg = uniqueDates > 0 ? totalKg / uniqueDates : 430;

  // Load records and analysis from local API
  const loadDataFromApi = useCallback(async () => {
    setApiStatus('loading');
    setApiError(null);
    try {
      // 1. Health check
      await apiClient.checkHealth();

      // 2. Fetch records
      const recordsResponse = await apiClient.getWasteRecords({
        siteId: DEMO_SITE.id,
        limit: 100,
      });

      if (recordsResponse.records && recordsResponse.records.length > 0) {
        setRecords(recordsResponse.records as WasteRecord[]);
      }

      // 3. Request fresh analysis from deterministic engine
      const analysisResponse = await apiClient.createAnalysis({
        siteId: DEMO_SITE.id,
      });

      if (analysisResponse.analysis) {
        setAnalysis(analysisResponse.analysis as AnalysisResult);
      }

      setApiStatus('connected');
    } catch (err: unknown) {
      setApiStatus('offline');
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not connect to Waste2Watt local API on port 3001.';
      setApiError(
        `${msg} Running in offline viewing mode. To enable real persistence, start the backend with "npm run dev" in the backend directory.`
      );
    }
  }, []);

  useEffect(() => {
    loadDataFromApi();
  }, [loadDataFromApi]);

  // Handle adding record via API
  const handleAddRecord = async (newRecord: WasteRecord) => {
    try {
      if (apiStatus === 'connected') {
        const result = await apiClient.createWasteRecord({
          id: newRecord.id,
          siteId: newRecord.siteId,
          date: newRecord.date,
          source: newRecord.source,
          category: newRecord.category,
          massKg: newRecord.massKg,
          massUnit: (newRecord.massUnit as 'kg' | 'tonne' | 'lb') || 'kg',
          contamination: newRecord.contamination,
          provenance: newRecord.provenance,
          notes: newRecord.notes,
        });
        setRecords((prev) => [result.record as WasteRecord, ...prev]);

        // Auto re-run analysis to incorporate new batch
        const updatedAnalysis = await apiClient.createAnalysis({ siteId: DEMO_SITE.id });
        if (updatedAnalysis.analysis) {
          setAnalysis(updatedAnalysis.analysis as AnalysisResult);
        }

        setActionSuccess('Record persisted successfully to local storage (records.json).');
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        // Local state update when offline
        setRecords((prev) => [newRecord, ...prev]);
        setActionSuccess('Record added to active memory (backend offline).');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save waste record.';
      setApiError(`Save failed: ${msg}`);
      // Keep optimistic memory addition
      setRecords((prev) => [newRecord, ...prev]);
    }
  };

  // Handle re-running analysis via API
  const handleRunNewAnalysis = async () => {
    setIsAnalyzing(true);
    setApiError(null);
    try {
      if (apiStatus === 'connected') {
        const res = await apiClient.createAnalysis({ siteId: DEMO_SITE.id });
        setAnalysis(res.analysis as AnalysisResult);
        setActionSuccess('Deterministic engine re-evaluated via local API (POST /analyses).');
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        // Fallback local simulation calculation
        setTimeout(() => {
          setAnalysis((prev) => ({
            ...prev,
            recordCount: records.length,
            totalMassKg: totalKg,
            dailyAverageKg: parseFloat(baselineDailyKg.toFixed(1)),
            createdAt: new Date().toISOString(),
            summary: `Evaluated across ${records.length} logged batches (${totalKg.toLocaleString()} kg total). Verified average generation rate of ~${Math.round(baselineDailyKg)} kg/day. High suitability for modular anaerobic digestion.`,
          }));
          setActionSuccess('Analysis evaluated in local browser fallback (API offline).');
          setTimeout(() => setActionSuccess(null), 4000);
        }, 600);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed.';
      setApiError(`Analysis engine error: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <AppShell
        site={DEMO_SITE}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewRecord={() => setIsModalOpen(true)}
        totalRecordCount={records.length}
        apiStatus={apiStatus}
      >
        {/* API Error / Offline Notification Banner */}
        {apiError && (
          <div
            role="alert"
            style={{
              marginBottom: '20px',
              padding: '12px 18px',
              backgroundColor: 'var(--color-clay-light)',
              border: '1px solid var(--color-clay-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              color: 'var(--color-clay)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{apiError}</span>
            </div>
            <button
              onClick={loadDataFromApi}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-clay-border)',
                color: 'var(--color-clay)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Action Success Banner */}
        {actionSuccess && (
          <div
            role="status"
            style={{
              marginBottom: '20px',
              padding: '10px 18px',
              backgroundColor: 'var(--color-leaf-light)',
              border: '1px solid var(--color-leaf-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              color: 'var(--color-forest)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle size={16} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewPage
            records={records}
            analysis={analysis}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenLogModal={() => setIsModalOpen(true)}
          />
        )}

        {activeTab === 'waste-log' && (
          <WasteLogPage
            records={records}
            siteId={DEMO_SITE.id}
            onAddRecord={handleAddRecord}
            isFormOpen={isModalOpen}
            setIsFormOpen={setIsModalOpen}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisPage
            analysis={analysis}
            onRunNewAnalysis={handleRunNewAnalysis}
            isAnalyzing={isAnalyzing}
            onSelectPathwayForScenario={() => setActiveTab('scenarios')}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioStudioPage baselineDailyKg={baselineDailyKg} />
        )}

        {activeTab === 'reports' && (
          <ReportsSettingsPage site={DEMO_SITE} records={records} analysis={analysis} />
        )}
      </AppShell>

      {/* Global Modal for "+ Log Waste" from TopBar */}
      {isModalOpen && activeTab !== 'waste-log' && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(16, 45, 39, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '28px 32px',
              maxWidth: '640px',
              width: '100%',
              boxShadow: 'var(--shadow-modal)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: 'var(--color-deep-pine)',
                  }}
                >
                  Record Waste Weighing Batch
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-stone)' }}>
                  Log organic waste for {DEMO_SITE.name}
                </p>
              </div>
              <Badge variant="provenance" provenance="user_provided">
                Operator Entry
              </Badge>
            </div>

            <WasteLogForm
              siteId={DEMO_SITE.id}
              onSaveRecord={(newRec) => {
                handleAddRecord(newRec);
                setIsModalOpen(false);
              }}
              onCancel={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
