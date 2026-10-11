import React, { useState } from 'react';
import { 
  Flame, 
  RotateCcw, 
  DollarSign, 
  Zap, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  RotateCw
} from 'lucide-react';
import type { ScenarioAssumptions, ScenarioEconomics } from '../../types/domain';
import type { ScenarioComparisonItem } from '../../domain/contracts/apiContracts';
import { DEFAULT_SCENARIO_ASSUMPTIONS } from '../../lib/mockData';
import { calculateScenarioEconomics } from '../../lib/calculations';
import { apiClient } from '../../lib/apiClient';
import { MetricCard } from '../../components/common/MetricCard';
import { Notice } from '../../components/common/Notice';
import { Badge } from '../../components/common/Badge';
import { 
  formatCurrency, 
  formatEnergyKwh, 
  formatVolumeM3, 
  formatYears 
} from '../../lib/formatters';

interface ScenarioStudioPageProps {
  baselineDailyKg: number;
}

export const ScenarioStudioPage: React.FC<ScenarioStudioPageProps> = ({
  baselineDailyKg,
}) => {
  const [dailyFeedstockKg, setDailyFeedstockKg] = useState<number>(Math.round(baselineDailyKg) || 430);
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(DEFAULT_SCENARIO_ASSUMPTIONS);
  const [comparisonResults, setComparisonResults] = useState<ScenarioComparisonItem[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Deterministic calculation
  const economics: ScenarioEconomics = calculateScenarioEconomics(dailyFeedstockKg, assumptions);

  const handleReset = () => {
    setAssumptions(DEFAULT_SCENARIO_ASSUMPTIONS);
    setDailyFeedstockKg(Math.round(baselineDailyKg) || 430);
  };

  const handleRunComparison = async () => {
    setIsComparing(true);
    setCompareError(null);
    try {
      const toDomainAssumption = (ass: ScenarioAssumptions) => ({
        currency: ass.currency || 'USD',
        biogasYieldM3PerTonne: ass.biogasYieldM3PerTonne,
        methaneFractionPct: ass.methaneFractionPct,
        electricalEfficiencyPct: ass.electricalEfficiencyPct,
        capexAmount: ass.capexAmount ?? ass.capexUsd,
        opexAnnualAmount: ass.opexAnnualAmount ?? ass.opexAnnualUsd,
        electricityTariffPerKwh: ass.electricityTariffPerKwh,
        operatingDaysPerYear: ass.operatingDaysPerYear,
      });

      const response = await apiClient.compareScenarios({
        siteId: 'site-campus-main',
        dailyFeedstockKg,
        scenarios: [
          {
            scenarioId: 'sc-current',
            title: 'Current Parameter Configuration',
            assumptions: toDomainAssumption(assumptions),
          },
          {
            scenarioId: 'sc-cogen-upgrade',
            title: 'Lean-Burn High-Efficiency CHP',
            assumptions: toDomainAssumption({
              ...assumptions,
              biogasYieldM3PerTonne: 135,
              methaneFractionPct: 62,
              electricalEfficiencyPct: 38,
              capexUsd: Math.round(assumptions.capexUsd * 1.25),
              opexAnnualUsd: Math.round(assumptions.opexAnnualUsd * 1.15),
            }),
          },
          {
            scenarioId: 'sc-bakery-codigest',
            title: 'Bakery Waste Co-Digestion Enriched',
            assumptions: toDomainAssumption({
              ...assumptions,
              biogasYieldM3PerTonne: 155,
              methaneFractionPct: 64,
              electricalEfficiencyPct: 35,
              capexUsd: Math.round(assumptions.capexUsd * 1.1),
              opexAnnualUsd: Math.round(assumptions.opexAnnualUsd * 1.05),
            }),
          },
          {
            scenarioId: 'sc-micro-pilot',
            title: 'Low-Capex Micro Digester System',
            assumptions: toDomainAssumption({
              ...assumptions,
              biogasYieldM3PerTonne: 110,
              methaneFractionPct: 56,
              electricalEfficiencyPct: 28,
              capexUsd: Math.round(assumptions.capexUsd * 0.55),
              opexAnnualUsd: Math.round(assumptions.opexAnnualUsd * 0.7),
            }),
          },
        ],
      });
      setComparisonResults(response.comparison);
    } catch (err: unknown) {
      setCompareError(err instanceof Error ? err.message : 'Scenario comparison API request failed.');
    } finally {
      setIsComparing(false);
    }
  };

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
            Engineering Feasibility &amp; Economics
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
            Anaerobic Digestion Scenario Studio
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-stone)', marginTop: '4px' }}>
            Interactive simulation of biomethane yield, cogeneration power output, and investment payback.
          </p>
        </div>

        <button
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-stone)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <RotateCcw size={14} />
          <span>Reset to Engineering Standards</span>
        </button>
      </div>

      {/* Illustrative Simulation Guardrail Notice */}
      <Notice
        type="info"
        title="Illustrative Feasibility Simulation"
      >
        Outputs are computed deterministically from configurable baseline constants (120 m³/t biogas, 60% CH₄, 34% CHP electrical conversion). 
        Actual facility returns depend on laboratory total/volatile solids testing, substrate contamination screening, parasitic digester heat demand, and binding vendor installation quotes.
      </Notice>

      {/* Primary KPI Outputs Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '18px',
        }}
      >
        <MetricCard
          label="Biogas Production Potential"
          value={formatVolumeM3(economics.annualBiogasM3)}
          unit="/ year"
          provenance="estimated"
          badgeLabel="Estimated"
          subtext={`~${formatVolumeM3(economics.dailyBiogasM3)} daily yield at ${assumptions.biogasYieldM3PerTonne} m³/t`}
          icon={<Flame size={18} />}
        />

        <MetricCard
          label="Cogeneration Power"
          value={formatEnergyKwh(economics.annualElectricityKwh)}
          unit="/ year"
          provenance="estimated"
          badgeLabel="Estimated"
          subtext={`Displaces utility draw at ${assumptions.electricalEfficiencyPct}% electrical conversion`}
          icon={<Zap size={18} />}
        />

        <MetricCard
          label="Annual Avoided Cost"
          value={formatCurrency(economics.annualEnergyValueUsd)}
          unit="/ year"
          provenance="estimated"
          badgeLabel="Estimated"
          subtext={`Valued at $${assumptions.electricityTariffPerKwh.toFixed(2)}/kWh retail utility tariff`}
          icon={<DollarSign size={18} />}
        />

        <MetricCard
          label="Simple Payback Period"
          value={formatYears(economics.simplePaybackYears)}
          provenance="assumed"
          badgeLabel="Model Payback"
          subtext={
            economics.annualNetBenefitUsd > 0
              ? `Net annual savings: ${formatCurrency(economics.annualNetBenefitUsd)}/yr`
              : 'Annual OPEX exceeds energy offset'
          }
          icon={<TrendingUp size={18} />}
        />
      </div>

      {/* Guardrail Alert for Financial Status */}
      {economics.annualNetBenefitUsd <= 0 ? (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--color-clay-light)',
            border: '1px solid var(--color-clay-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '13.5px',
            color: 'var(--color-clay)',
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>Payback Not Achievable:</strong> Annual operational maintenance costs ($
            {assumptions.opexAnnualUsd.toLocaleString()}) exceed estimated energy savings ($
            {Math.round(economics.annualEnergyValueUsd).toLocaleString()}). Consider higher throughput or co-digestion.
          </div>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--color-leaf-light)',
            border: '1px solid var(--color-leaf-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: 'var(--color-forest)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>
              Net Annual Operating Cash Flow: <strong>{formatCurrency(economics.annualNetBenefitUsd)}/year</strong>
            </span>
          </div>
          <span style={{ fontWeight: 600 }}>Status: {economics.paybackStatus.toUpperCase()}</span>
        </div>
      )}

      {/* Main Studio Controls Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Column 1: Feedstock & Bioprocess Parameters */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
              Bioprocess &amp; Feedstock Parameters
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
              Adjust substrate quality and physical conversion constants
            </p>
          </div>

          {/* Daily Mass */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="range-daily-kg" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Average Daily Feedstock Input
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {dailyFeedstockKg} kg / day
              </span>
            </div>
            <input
              id="range-daily-kg"
              type="range"
              min="100"
              max="2000"
              step="10"
              value={dailyFeedstockKg}
              onChange={(e) => setDailyFeedstockKg(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--color-forest)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-stone)', marginTop: '4px' }}>
              <span>100 kg (Micro pilot)</span>
              <span>2,000 kg (Multi-hostel cluster)</span>
            </div>
          </div>

          {/* Specific Biogas Yield */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="range-biogas-yield" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Substrate Specific Biogas Yield
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {assumptions.biogasYieldM3PerTonne} m³ / tonne
              </span>
            </div>
            <input
              id="range-biogas-yield"
              type="range"
              min="80"
              max="180"
              step="5"
              value={assumptions.biogasYieldM3PerTonne}
              onChange={(e) => setAssumptions({ ...assumptions, biogasYieldM3PerTonne: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--color-forest)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-stone)', marginTop: '4px' }}>
              <span>80 m³/t (High moisture vegetable)</span>
              <span>180 m³/t (Starch / bakery rich)</span>
            </div>
          </div>

          {/* Methane Fraction */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="range-methane-pct" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Methane (CH₄) Content
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {assumptions.methaneFractionPct}% vol
              </span>
            </div>
            <input
              id="range-methane-pct"
              type="range"
              min="50"
              max="70"
              step="1"
              value={assumptions.methaneFractionPct}
              onChange={(e) => setAssumptions({ ...assumptions, methaneFractionPct: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--color-forest)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-stone)', marginTop: '4px' }}>
              <span>50% (Standard mesophilic)</span>
              <span>70% (Enriched / co-digestion)</span>
            </div>
          </div>

          {/* Generator Electrical Efficiency */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="range-chp-eff" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                CHP Generator Electrical Efficiency
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {assumptions.electricalEfficiencyPct}%
              </span>
            </div>
            <input
              id="range-chp-eff"
              type="range"
              min="25"
              max="42"
              step="1"
              value={assumptions.electricalEfficiencyPct}
              onChange={(e) => setAssumptions({ ...assumptions, electricalEfficiencyPct: parseInt(e.target.value, 10) })}
              style={{ width: '100%', accentColor: 'var(--color-forest)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-stone)', marginTop: '4px' }}>
              <span>25% (Small micro-gen)</span>
              <span>42% (High-spec lean burn)</span>
            </div>
          </div>
        </div>

        {/* Column 2: Financial & Facility Economics */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
              Capital &amp; Operational Assumptions
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-stone)' }}>
              Configurable capex, maintenance expense, and utility electricity tariff
            </p>
          </div>

          {/* Turnkey CAPEX */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="input-capex" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Turnkey Digester &amp; CHP CAPEX ($)
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {formatCurrency(assumptions.capexUsd)}
              </span>
            </div>
            <input
              id="input-capex"
              type="number"
              step="1000"
              min="5000"
              value={assumptions.capexUsd}
              onChange={(e) => setAssumptions({ ...assumptions, capexUsd: Math.max(0, parseFloat(e.target.value) || 0) })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13.5px',
              }}
            />
          </div>

          {/* Annual OPEX */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="input-opex" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Annual Maintenance &amp; Parasitic OPEX ($/yr)
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {formatCurrency(assumptions.opexAnnualUsd)}
              </span>
            </div>
            <input
              id="input-opex"
              type="number"
              step="500"
              min="500"
              value={assumptions.opexAnnualUsd}
              onChange={(e) => setAssumptions({ ...assumptions, opexAnnualUsd: Math.max(0, parseFloat(e.target.value) || 0) })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13.5px',
              }}
            />
          </div>

          {/* Displaced Grid Electricity Tariff */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="input-tariff" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Displaced Utility Electricity Tariff ($/kWh)
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                ${assumptions.electricityTariffPerKwh.toFixed(3)} / kWh
              </span>
            </div>
            <input
              id="input-tariff"
              type="number"
              step="0.01"
              min="0.02"
              max="0.80"
              value={assumptions.electricityTariffPerKwh}
              onChange={(e) => setAssumptions({ ...assumptions, electricityTariffPerKwh: Math.max(0.01, parseFloat(e.target.value) || 0.01) })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13.5px',
              }}
            />
          </div>

          {/* Operating Days */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <label htmlFor="input-op-days" style={{ fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Facility Operating Days / Year
              </label>
              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-forest)' }}>
                {assumptions.operatingDaysPerYear} days
              </span>
            </div>
            <input
              id="input-op-days"
              type="number"
              min="180"
              max="365"
              value={assumptions.operatingDaysPerYear}
              onChange={(e) => setAssumptions({ ...assumptions, operatingDaysPerYear: Math.min(365, Math.max(180, parseInt(e.target.value, 10) || 300)) })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                fontSize: '13.5px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Multi-Scenario Comparison Engine (POST /scenarios/compare) */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--color-forest)" />
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                Multi-Scenario Feasibility Comparison
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-stone)', marginTop: '2px' }}>
              Evaluate up to 4 equipment sizing &amp; feedstock enrichment profiles simultaneously via local API (<code>POST /scenarios/compare</code>).
            </p>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={isComparing}
            id="btn-compare-scenarios"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-deep-pine)',
              color: '#FFFFFF',
              padding: '9px 18px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isComparing ? 'wait' : 'pointer',
              opacity: isComparing ? 0.7 : 1,
            }}
          >
            <RotateCw size={15} className={isComparing ? 'spin' : ''} />
            <span>{isComparing ? 'Evaluating Engine...' : 'Run Scenario Comparison (API)'}</span>
          </button>
        </div>

        {compareError && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-clay-light)',
              border: '1px solid var(--color-clay-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              color: 'var(--color-clay)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{compareError}</span>
          </div>
        )}

        {comparisonResults && (
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-stone)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Scenario Candidate</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Annual Biogas</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Power Output</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Avoided Cost</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Net Cashflow</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Simple Payback</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'center' }}>Feasibility Status</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResults.map((item) => (
                  <tr
                    key={item.scenarioId}
                    style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--color-deep-pine)' }}>
                      {item.title}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatVolumeM3(item.economics.annualBiogasM3)}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatEnergyKwh(item.economics.annualElectricityKwh)}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 14px', textAlign: 'right' }}>
                      {formatCurrency(item.economics.annualEnergyValue)}
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600, color: item.economics.annualNetBenefit > 0 ? 'var(--color-forest)' : 'var(--color-clay)' }}>
                      {formatCurrency(item.economics.annualNetBenefit)}/yr
                    </td>
                    <td className="tabular-nums" style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 600 }}>
                      {formatYears(item.economics.simplePaybackYears)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <Badge
                        variant="provenance"
                        provenance={
                          item.economics.paybackStatus === 'attractive'
                            ? 'measured'
                            : item.economics.paybackStatus === 'moderate'
                            ? 'user_provided'
                            : 'assumed'
                        }
                      >
                        {item.economics.paybackStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
