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

## 3. RAG plan
For a hackathon MVP, start with a small curated set of reliable references and explicit factor records. If using Amazon Bedrock Knowledge Bases, verify setup, model/embedding availability, IAM, cost and region first. A simpler S3-backed curated reference store is acceptable initially. Do not claim RAG is implemented unless retrieval actually occurs at runtime.

## 4. Forecasting
Only add forecasting after sufficient dated history exists. Start with a simple baseline (moving average or seasonal naive model) and compare against it. If the history is too short, show a data-insufficient state instead of a confident forecast. The LLM may explain forecast results but must not invent the prediction.

## 5. AI transparency
- Use a small “AI-assisted analysis” note, not a giant AI badge.
- Show “why this recommendation?” with evidence and assumptions.
- Clearly label image classifications as suggestions.
- Avoid exposing private chain-of-thought. Provide concise, user-facing reasons, calculations, assumptions and evidence instead.
- Show the data source, factor version and run timestamp where relevant.

## 6. Evaluation checklist
Create a small test set with:
- clean food scraps with complete inputs;
- mixed/contaminated waste;
- missing yield factor;
- extremely large or negative mass;
- conflicting or untrusted uploaded text;
- unavailable Bedrock response;
- malformed model JSON;
- scenario with negative annual net benefit;
- too little history for forecasting.

Measure schema validity, tool-call success, grounding/source validity and safe fallback behaviour. Do not claim a percentage accuracy without a reproducible evaluation.
