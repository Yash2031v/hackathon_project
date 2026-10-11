# Waste2Watt Explainable AI Insights API Documentation

## 1. Overview & Architectural Philosophy

Waste2Watt provides an optional, explainable AI intelligence layer that operates in tandem with the deterministic calculation engine.
Per **AGENTS.md Section B & C**, the AI layer is **purely explanatory and decision-support oriented**. It is strictly decoupled from the mathematical source of truth.

- **Authoritative calculations** (mass balance, daily averages, Gross/Parasitic/Usable kWh, m³ biogas, simple payback, NPV) are executed by unit-tested deterministic TypeScript services.
- **Explainable AI intelligence** translates these deterministic results into structured, grounded environmental narratives, boundary disclosures, and actionable engineering next steps.
- **Zero Hallucination Tolerance**: The server rejects client-supplied numbers, validates all inputs, and validates all provider outputs with strict Zod schemas (`InsightResponseSchema`).

---

## 2. API Endpoints

### 2.1 POST `/insights`

Generates structured environmental insights from verified repository records or an existing analysis ID.

#### Request Headers
```http
Content-Type: application/json
Accept: application/json
X-Request-Id: (optional, generated automatically if omitted)
```

#### Request Payload Schema (`GenerateInsightsRequestSchema`)
```typescript
{
  siteId: string;                  // Required: Site identifier
  analysisId?: string;             // Optional: ID of pre-existing AnalysisResult
  recordIds?: string[];            // Optional: Narrow evaluation to specific record IDs
  scenarioAssumptions?: {          // Optional: Economic and physical assumptions
    currency: "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD" | "JPY";
    biogasYieldM3PerTonne: number; // 20 - 400 m³/t
    methaneFractionPct: number;    // 20 - 90%
    electricalEfficiencyPct: number;// 10 - 60%
    capexAmount: number;
    opexAnnualAmount: number;
    electricityTariffPerKwh: number;
    operatingDaysPerYear: number;  // 1 - 365
  };
}
```

#### Successful Response (200 OK)
```json
{
  "success": true,
  "insights": {
    "summary": "Deterministic Environmental Assessment for site-campus-main: 8 waste records evaluated...",
    "status": "available",
    "insights": [
      {
        "title": "Waste Profile Characterization",
        "category": "waste_profile",
        "explanation": "Primary feedstock contributor is prepared_food (52.2% of 3,360 kg total mass).",
        "evidence": [
          "Total recorded mass: 3360 kg",
          "Audited collection batches: 8",
          "Data collection span: 8 days"
        ],
        "confidence": "high",
        "status": "measured",
        "limitations": [
          "Continuous moisture content (volatile solids ratio) not measured via laboratory drying test."
        ]
      },
      {
        "title": "Biochemical Energy Potential Explanation",
        "category": "energy_potential",
        "explanation": "At 420.0 kg/day feedstock, the system yields ~50.4 m³/day biogas at 60% CH4, generating ~101.4 kWh/day gross electricity.",
        "evidence": [
          "Daily average feedstock: 420 kg/day",
          "Biogas yield assumption: 120 m³/tonne",
          "Parasitic internal digester thermal/electrical load estimated at 12%."
        ],
        "confidence": "medium",
        "status": "assumption_based",
        "limitations": [
          "Realized electrical output will fluctuate depending on digester temperature and parasitic heating loads."
        ]
      }
    ],
    "recommendations": [
      {
        "title": "Implement Daily Moisture & Scalper Screening",
        "priority": "high",
        "reason": "Prevent pump fouling and verify total solids content before digestion.",
        "benefit": "Avoids digester pump impeller damage and stabilizes bacterial retention time.",
        "requiredInputs": ["Manual scale log", "Physical scalper screen mesh"],
        "limitations": ["Requires 15 minutes of operator labor per shift."]
      }
    ],
    "missingData": [],
    "assumptions": [
      "Assumed continuous operating schedule of 300 days/year."
    ],
    "provider": "deterministic",
    "modelIdentifier": "deterministic-rules-v1",
    "generatedAt": "2026-03-28T10:00:00.000Z",
    "humanReviewRequired": true
  },
  "message": "Insights generated successfully."
}
```

### 2.2 GET `/insights/config`

Exposes non-sensitive AI runtime metadata to the frontend.

#### Response (200 OK)
```json
{
  "provider": "deterministic",
  "model": "deterministic-rules-v1",
  "hasApiKey": false,
  "timeoutMs": 10000,
  "fallbackAvailable": true
}
```
*Note: API keys and backend secrets are never leaked in this endpoint.*

---

## 3. Provider Operating Modes

### Mode A — Deterministic (Default)
- **Activation**: Set `AI_PROVIDER=deterministic` (or leave default).
- **Network**: Zero external HTTP calls, works 100% offline.
- **Cost**: $0.00.
- **Behavior**: Uses `DeterministicInsightProvider` to generate rule-grounded, audit-ready explanations based on exact engineering formulas:
  - Theoretical Biogas: $V_{biogas} = \text{Feedstock (t)} \times Y_{biogas}$
  - Gross Energy: $E_{gross} = V_{biogas} \times f_{CH_4} \times 9.97 \times \eta_{elec}$
  - Parasitic Deduction: 12% internal heat/pumping load disclosure.
  - Payback: $\frac{\text{CAPEX}}{\text{Net Benefit}}$ with negative return guardrails.

### Mode B — Optional External AI Provider
- **Activation**: Set in backend `.env`:
  ```bash
  AI_PROVIDER=external
  AI_BASE_URL=https://api.openai.com/v1/chat/completions
  AI_MODEL=gpt-4o-mini
  AI_API_KEY=your_key_here
  AI_TIMEOUT_MS=10000
  ```
- **Payload Privacy**: Only non-personal, site-level aggregate feedstock metrics and calculation outputs are transmitted. No personal identifiable information (PII) or credentials are ever sent.
- **Fail-Safe Mechanism**:
  If the external provider times out (>10,000ms), returns 4xx/5xx, or returns JSON that fails `InsightResponseSchema` validation, `AiService` automatically intercepts the failure, executes Mode A deterministic insights, tags the status as `"fallback"`, and appends `fallbackReason` explaining the issue.

---

## 4. Evidence Provenance & Confidence Levels

Per **AGENTS.md Rule B2 & C7**, all insight items include provenance classifications:

| Status | Meaning |
| :--- | :--- |
| `measured` | Directly sourced from calibrated scale weight tickets or physical sensors. |
| `user_provided` | Manually entered by operator without calibrated scale ticket evidence. |
| `configured_factors` | Sourced from the approved institutional factor register (`verifiedFactors.ts`). |
| `assumption_based` | Illustrative scenario parameter (e.g. hypothetical CAPEX or tariff). |
| `indicative` | Derived rule-based estimation. |

Confidence ratings:
- **`high`**: Complete data (≥7 collection days, measured provenance, verified conversion factors).
- **`medium`**: Adequate data, but reliant on assumed biochemical yields or unmeasured moisture ratios.
- **`low`**: Data gaps present, short observation window, or high contamination risk.

---

## 5. Local Testing & Verification

Run backend AI integration and edge-case tests:
```bash
cd backend
npm test
```
Verifies:
1. Valid site record generation.
2. Explicit `insufficient_data` state on empty sites.
3. Anti-trend guardrail (refuses to claim trends when <7 observation dates exist).
4. Category breakdown and predominant stream detection.
5. Exact preservation of numerical outputs without drift.
6. Server-side computation preventing client payload tampering.
7. 400 validation error on malformed requests.
8. External provider timeout fallback.
9. External provider schema validation failure fallback.
10. Secrets leakage prevention on `/insights/config`.
