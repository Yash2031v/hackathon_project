# Architecture — Waste2Watt

## 1. High-level architecture

```text
React + TypeScript (AWS Amplify Hosting)
                 |
                 v
          Amazon API Gateway
                 |
                 v
        AWS Lambda API layer
          |       |       |
          |       |       +--> Amazon S3 (uploads/reports/reference files)
          |       +----------> Amazon DynamoDB (waste records, analyses, config)
          |
          +--> Waste Intelligence Orchestrator
                    |--> deterministic domain tools
                    |--> Amazon Bedrock / Strands Agent (server-side)
                    |--> evidence retrieval adapter
                    +--> output schema validator
                 |
                 v
       Structured analysis response
                 |
                 v
       Dashboard + scenario comparison

CloudWatch: application logs, errors, latency and request IDs
```

## 2. Proposed stack
- Frontend: React, TypeScript, Vite.
- API: API Gateway + Lambda (TypeScript/Node.js or Python; choose one runtime and keep it consistent).
- Storage: DynamoDB for structured records; S3 for uploaded files and reports.
- AI: Amazon Bedrock Converse API; optionally Strands Agents SDK for tool orchestration if the selected runtime and model support it.
- Hosting: Amplify Hosting.
- Observability: CloudWatch logs and metrics.
- Infrastructure: AWS SAM is a reasonable starting point for a small serverless app; do not introduce multiple IaC systems.

## 3. Suggested repository layout

```text
waste2watt/
├── AGENTS.md
├── README.md
├── PROJECT_BRIEF.md
├── ARCHITECTURE.md
├── AI_SYSTEM.md
├── DESIGN_SYSTEM.md
├── IMPLEMENTATION_PLAN.md
├── ANTIGRAVITY_START_PROMPT.md
├── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── overview/
│   │   │   ├── waste-log/
│   │   │   ├── analysis/
│   │   │   ├── scenarios/
│   │   │   └── reports/
│   │   ├── lib/
│   │   ├── styles/
│   │   └── types/
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── handlers/
│   │   ├── domain/
│   │   │   ├── waste-profile/
│   │   │   ├── pathway-rules/
│   │   │   ├── energy-model/
│   │   │   ├── feasibility/
│   │   │   └── sensitivity/
│   │   ├── ai/
│   │   │   ├── orchestrator/
│   │   │   ├── prompts/
│   │   │   ├── schemas/
│   │   │   └── adapters/
│   │   ├── repositories/
│   │   ├── validation/
│   │   └── observability/
│   └── tests/
├── infra/
│   └── template.yaml
└── docs/
    ├── data-dictionary.md
    ├── assumptions-register.md
    └── demo-script.md
```

This is a target layout, not a command to generate every file at once. Keep the actual repository simpler if the existing scaffold or time budget requires it.

## 4. Core API proposal
- `POST /waste-records` — validate and save a record.
- `GET /waste-records?siteId=...` — retrieve site records with bounded pagination.
- `POST /analyses` — run deterministic calculations and AI-assisted explanation.
- `GET /analyses/{analysisId}` — retrieve an analysis.
- `POST /scenarios/compare` — compare configured pathways and economics.
- `GET /health` — basic health/status endpoint that does not leak internals.
- Optional: `POST /reports` — create a downloadable report.

All endpoints need input validation, consistent errors and appropriate authorisation before real multi-user deployment. For a short demo, a single demo site is acceptable if clearly scoped; do not claim multi-tenant security unless implemented.

## 5. Data model principles
Every waste record should include:
- `recordId`, `siteId`, `recordedAt`, `wasteCategory`, `massKg`;
- `source` (canteen, hostel, etc.);
- `contaminationLevel` or `unknown`;
- `provenance` (measured, user-provided, demo);
- `createdAt`, `updatedAt`.

Every factor should include:
- `factorId`, `name`, `value`, `unit`;
- `sourceUrl` or source description;
- `effectiveDate` or version where available;
- `qualityStatus`, `notes`.

Every analysis should include:
- input record IDs and snapshot of relevant factors;
- calculated values with units;
- pathway candidates, reasons and constraints;
- missing inputs and uncertainty notes;
- model/provider metadata (not secrets), timestamp and status;
- explicit `estimate`/`measured` status.

Store an analysis snapshot so results remain reproducible when assumptions change later.

## 6. Security and reliability
- Use least-privilege IAM roles.
- Keep Bedrock calls and AWS SDK operations in the backend.
- Validate file type and size for uploads; never trust file extensions alone.
- Avoid public S3 buckets by default; use short-lived pre-signed URLs only when needed.
- Add request IDs, timeouts and bounded retries.
- Do not expose stack traces or model prompts to end users.
- Add basic rate limiting and input size limits where practical.
- Define retention/deletion behaviour before storing real institutional data.
