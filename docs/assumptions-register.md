# Assumptions Register — Waste2Watt

Maintained for transparency, auditability, and domain safety (per AGENTS.md Section B). Every configurable factor includes an ID, category, unit, reference basis, verification status, and limitations.

| Factor ID | Name & Description | Standard / Baseline Value | Unit | Source & Reference | Quality / Verification Status | Limitations & Boundary Conditions |
|---|---|---|---|---|---|---|
| `FAC-CH4-LHV` | Methane Lower Heating Value (LHV) | 9.95 (35.82 MJ/m³) | kWh / m³ CH₄ | ISO 6976:2016 / NIST Chemistry WebBook | Verified Standard Constant | Reference conditions: 15 °C, 101.325 kPa dry gas. |
| `FAC-AD-YIELD-FW` | Mixed Food Waste Biogas Yield | 120 (Range: 80–160) | m³ biogas / tonne wet waste | IEA Bioenergy Task 37 / US EPA AD Literature Review | Illustrative Literature Range | Strongly depends on moisture (75–85%) and volatile solids (VS/TS ratio). Requires lab proximate analysis for investment decisions. |
| `FAC-CH4-FRACTION` | Raw Biogas Methane Content | 60 (Range: 55–65) | % volume | US EPA AgSTAR & AD Technical Literature | Illustrative Literature Range | Remainder is CO₂ (35–45%) with trace moisture and H₂S. Souring or acid accumulation lowers CH₄ fraction. |
| `FAC-CHP-EFF-EL` | Micro-CHP Electrical Efficiency | 34 (Range: 30–36) | % electrical | Typical reciprocating gas engine generator specs (20–100 kWel) | Engineering Equipment Assumption | Manufacturer equipment-specific. Balance of thermal energy (~50%) contributes to digester heating / hot water. |
| `FAC-SITE-TARIFF` | Displaced Electricity Tariff | Site-dependent (Default: 0.12) | [Currency] / kWh | Facility utility power billing records | User-Configured Input | Regional and contract specific. Must be set by facility manager with local currency code. |
| `FAC-CAPEX` | Turnkey Digester + CHP Capital Cost | Site-dependent (Default: 48,000) | [Currency] | Vendor quotation or preliminary feasibility budget | User-Configured / Illustrative | Highly dependent on local civil works, odor control, grid interconnection, and permitting costs. |
| `FAC-OPEX-ANNUAL` | Annual O&M, Parasitic & Consumable Cost | Site-dependent (Default: 3,800) | [Currency] / year | Estimated ~5–10% of equipment CAPEX + service contract | User-Configured / Illustrative | Excludes major engine overhaul occurring at 20,000–30,000 run hours. |

## Data Quality Classifications
1. `verified_constant`: Established physical/chemical constant (e.g. ISO thermodynamic heating values).
2. `illustrative_literature_range`: Empirical median from published scientific literature with significant feedstock variation.
3. `engineering_assumption`: Vendor or equipment-class indicative performance parameter.
4. `user_configured`: Site-specific operational or economic value entered directly by the facility operator.
5. `demo_only`: Default placeholder provided solely to permit illustrative UI simulation.
6. `missing`: Required parameter absent; engine must return an explicit `insufficient_data` state without inventing defaults.
