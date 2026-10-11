# AI System — High capability, controlled outputs

## 1. AI design goal
Use AI deeply for interpreting messy inputs, orchestrating tools, comparing scenarios and communicating evidence. Do not use an LLM as an unverified calculator or as a substitute for environmental engineering data.

## 2. Recommended AI workflow
### Stage A — Input understanding
- Validate structured form data deterministically.
- Optional image model: suggest likely visible waste categories only. Return probabilities/categories if supported, then ask the user to confirm.
- Never infer exact mass, contamination chemistry, methane yield or calorific value from a photo.

### Stage B — Build a trusted context
- Fetch the user's waste history and configured assumptions.
- Retrieve only approved reference documents or configured factors.
- Attach source IDs, units, source dates and quality labels.
- Mark missing factors explicitly.

### Stage C — Tool-using analysis agent
Expose a narrow allowlist of typed tools:
1. `summarise_waste_profile(siteId, dateRange)`
2. `evaluate_pathway_rules(wasteProfile)`
3. `calculate_biogas_potential(input, factorSetId)`
4. `calculate_usable_energy(input, conversionConfigId)`
5. `calculate_feasibility(scenario, costAssumptions)`
6. `run_sensitivity_analysis(scenario, variableRanges)`
7. `retrieve_evidence(query, allowedSourceSet)`

The agent may call tools, but it cannot change tool results. Tool inputs and outputs must be schema-validated. Tool functions must be deterministic, tested and independent of the LLM.

### Stage D — Structured synthesis
Require JSON matching a schema such as:

```json
{
  "summary": "string",
  "recommendedNextStep": "string",
  "pathwayCandidates": [
    {
      "pathway": "composting | anaerobic_digestion | prevention | redistribution_review",
      "suitability": "promising | conditional | not_enough_data | unsuitable",
      "reasons": ["string"],
      "constraints": ["string"],
      "evidenceIds": ["string"]
    }
  ],
  "metrics": [
    {
      "metricId": "string",
      "value": 0,
      "unit": "string",
      "status": "measured | user_provided | assumed | estimated | simulated",
      "factorIds": ["string"]
    }
  ],
  "missingData": ["string"],
  "uncertaintyNotes": ["string"],
  "humanReviewRequired": true
}
```

The exact schema can be refined, but validate it at runtime. Numeric fields must come from tool outputs and be cross-checked against the calculation response. The model must not create new numeric metrics.

### Stage E — Guardrails and fallbacks
- If Bedrock is unavailable, return deterministic calculations and a templated explanation.
- If model output fails validation, retry once with a repair instruction; if still invalid, fall back.
- If factors are missing, return `not_enough_data`.
- Do not fabricate sources. Evidence IDs must resolve to retrieved/configured evidence.
- Keep the system prompt server-side and version-controlled.
- Use a model adapter so local mock mode and Bedrock mode share the same interface.

## 7. Milestone 4 Implementation — Explainable Intelligence Layer

As implemented in Milestone 4, the platform includes a decoupled, explainable AI intelligence layer:

### Architecture
- **Service Layer (`backend/src/services/ai/`)**:
  - `aiService.ts`: Core orchestrator. Fetches authoritative repository records, invokes deterministic engines, and passes grounded context to the configured provider.
  - `aiConfig.ts`: Safe environment configuration (`AI_PROVIDER`, `AI_MODEL`, `AI_TIMEOUT_MS`, etc.).
  - `aiContext.ts`: Grounded context builder with data-quality auditing and duplicate detection.
  - `deterministicInsightProvider.ts`: Mode A provider. Pure deterministic explainability engine implementing exact domain formulas and physical boundaries.
  - `aiProvider.ts`: Provider contract (`IAiProvider`) and `ExternalHttpAiProvider` (Mode B) with strict Zod validation, timeout handling, and automatic fallback.
  - `promptBuilder.ts`: Grounding system prompt builder enforcing zero numeric invention and provenance rules.

### Operating Modes
1. **Mode A — Deterministic (Default)**:
   - Operates completely locally without API keys, cloud credentials, or external network requests.
   - Generates transparent, audit-ready explanations across 5 core categories.
2. **Mode B — Optional External AI Provider**:
   - Server-side only via configurable HTTP endpoint and API key stored in backend `.env`.
   - Never exposes keys to the frontend.
   - Enforces 10,000ms timeout and strict Zod validation (`InsightResponseSchema`).
   - Automatically falls back to Mode A on timeout, 5xx/4xx errors, or schema validation failures.

### Non-Negotiable Grounding Guardrails
- AI cannot calculate, override, or alter authoritative physical numbers (mass, daily average, kWh, m³ biogas, CAPEX, OPEX, payback).
- Separate evidence provenance: `measured`, `user_provided`, `configured_factors`, `illustrative_assumptions`, and `derived_estimates`.
- Minimum 7 distinct collection dates required before historical trends can be asserted.
- All responses require human engineering review; output is decision support, not an engineering certification.

