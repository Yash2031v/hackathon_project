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
- `POST /insights` — generate grounded, explainable AI environmental insights without altering numerical calculations.
- `GET /insights/config` — expose AI provider configuration and runtime metadata without leaking secrets.
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

---

## 7. Milestone 3 Implementation: Local API & Persistence Layer

### 7.1 Architecture & Separation of Concerns

```text
┌──────────────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite + TS)                   │
│  - AppShell / TopBar with live API connection indicator          │
│  - WasteLogPage: listing, filtering, create batch modal          │
│  - AnalysisPage: deterministic synthesis, pathway recommendations │
│  - ScenarioStudioPage: interactive model + multi-scenario compare│
│  - Typed API client (apiClient.ts) with explicit error handling   │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTP / JSON (Port 3001)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Backend (Express + Node.js + TS)               │
│  - Request ID tracking (X-Request-Id)                            │
│  - Strict CORS origin restriction (localhost / 127.0.0.1)        │
│  - 1MB body limit & malformed JSON body protection               │
│  - Zod validation on all incoming query & body parameters         │
│  - Structured error responses (ApiErrorResponse)                 │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│     Domain Calculation Engines    │     │      Durable File Repositories    │
│  - pathwayRuleEngine.ts           │     │  - FileWasteRecordRepository      │
│  - biogasEnergyEngine.ts          │     │  - FileFactorRepository           │
│  - scenarioEconomicsEngine.ts     │     │  - FileAnalysisRepository         │
│  - unitConverter.ts               │     │  - Atomic write rename safety     │
│  - verifiedFactors.ts             │     │  - Seed reset & crash safety      │
└───────────────────────────────────┘     └─────────────────┬─────────────────┘
                                                            ▼
                                          ┌───────────────────────────────────┐
                                          │      Local JSON Storage           │
                                          │  backend/data/records.json        │
                                          │  backend/data/factors.json        │
                                          │  backend/data/analyses.json       │
                                          └───────────────────────────────────┘
```

### 7.2 Implemented Endpoints & Contracts

1. **`GET /health`**
   - Returns service health status, uptime, and local timestamp.
   - Example Response:
     ```json
     { "status": "healthy", "uptimeSeconds": 142.3, "timestamp": "2026-03-01T12:00:00.000Z" }
     ```

2. **`POST /waste-records`**
   - Validates input body against `CreateWasteRecordRequestSchema`.
   - Rejects negative mass, batch mass > 50,000 kg, malformed date.
   - Generates server ID (`rec-...`) and timestamp if omitted.
   - Example Request:
     ```bash
     curl -X POST http://127.0.0.1:3001/waste-records \
       -H "Content-Type: application/json" \
       -d '{
         "siteId": "site-campus-main",
         "date": "2026-03-10",
         "source": "canteen_kitchen",
         "category": "prepared_food",
         "massKg": 410,
         "massUnit": "kg",
         "contamination": "low",
         "provenance": "user_provided",
         "notes": "Audited kitchen prep batch"
       }'
     ```
   - Example Response (201 Created):
     ```json
     {
       "success": true,
       "record": {
         "id": "rec-1773161200000-xyz",
         "siteId": "site-campus-main",
         "date": "2026-03-10",
         "source": "canteen_kitchen",
         "category": "prepared_food",
         "massKg": 410,
         "massUnit": "kg",
         "contamination": "low",
         "provenance": "user_provided",
         "notes": "Audited kitchen prep batch",
         "createdAt": "2026-03-10T12:00:00.000Z"
       },
       "message": "Waste record successfully created and persisted."
     }
     ```

3. **`GET /waste-records`**
   - Query params: `siteId` (required), `category`, `source`, `provenance`, `startDate`, `endDate`, `limit` (max 200), `offset`.
   - Example Request:
     ```bash
     curl "http://127.0.0.1:3001/waste-records?siteId=site-campus-main&limit=10"
     ```
   - Example Response (200 OK):
     ```json
     {
       "records": [ ... ],
       "totalCount": 10,
       "limit": 10,
       "offset": 0
     }
     ```

4. **`POST /analyses`**
   - Runs deterministic pathway and energy calculations across site records.
   - Example Request:
     ```bash
     curl -X POST http://127.0.0.1:3001/analyses \
       -H "Content-Type: application/json" \
       -d '{ "siteId": "site-campus-main" }'
     ```
   - Example Response (201 Created):
     ```json
     {
       "success": true,
       "analysis": {
         "analysisId": "ana-1773161250000-abc",
         "siteId": "site-campus-main",
         "createdAt": "2026-03-10T12:01:00.000Z",
         "dateRange": { "start": "2026-03-01", "end": "2026-03-07" },
         "recordCount": 10,
         "totalMassKg": 4410,
         "dailyAverageKg": 630,
         "predominantCategory": "prepared_food",
         "pathwayCandidates": [
           {
             "pathway": "anaerobic_digestion",
             "title": "On-Site Mesophilic Anaerobic Digestion (Continuous CHP)",
             "suitability": "promising",
             "confidenceLabel": "verified",
             "isPrioritized": true,
             "reasons": [ "Consistent feedstock volume exceeds threshold..." ],
             "constraints": [ "Requires inert kitchen screening..." ]
           }
         ],
         "summary": "Verified average feedstock generation rate...",
         "recommendedNextStep": "Perform 14-day volatile solids laboratory assay..."
       },
       "message": "Deterministic analysis executed and snapshot saved."
     }
     ```

5. **`GET /analyses/:id`**
   - Retrieves saved analysis snapshot by ID (returns 404 with structured error if not found).

6. **`POST /scenarios/compare`**
   - Validates and deterministically evaluates 1 to 5 scenarios.
   - Example Request:
     ```bash
     curl -X POST http://127.0.0.1:3001/scenarios/compare \
       -H "Content-Type: application/json" \
       -d '{
         "siteId": "site-campus-main",
         "dailyFeedstockKg": 430,
         "scenarios": [
           {
             "scenarioId": "sc-base",
             "title": "Baseline Standard Digester",
             "assumptions": {
               "currency": "USD",
               "biogasYieldM3PerTonne": 120,
               "methaneFractionPct": 60,
               "electricalEfficiencyPct": 34,
               "electricityTariffPerKwh": 0.15,
               "capexAmount": 65000,
               "opexAnnualAmount": 2000,
               "operatingDaysPerYear": 300
             }
           }
         ]
       }'
     ```

---

## 8. Local Setup & Verification Guide

### 8.1 Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **Package Manager**: `npm` v9+.

### 8.2 Installation

Clone and install dependencies for both frontend and backend:

```bash
# 1. Install frontend dependencies
cd frontend
npm install

# 2. Install backend dependencies
cd ../backend
npm install
```

### 8.3 Starting the Application Locally

Run backend and frontend concurrently in two terminal sessions:

```bash
# Terminal 1 — Start the local API server (Port 3001)
cd backend
npm run dev

# Terminal 2 — Start the React Vite frontend (Port 5173)
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173` in your browser. The top header will show:
`Local API (Port 3001)` with a green indicator.

### 8.4 Environment Variables

- **Frontend (`frontend/.env` or `.env.local`)**:
  ```env
  VITE_API_BASE_URL=http://127.0.0.1:3001
  ```
- **Backend (`backend/.env`)**:
  ```env
  PORT=3001
  DATA_DIR=data
  CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
  ```

### 8.5 Running Tests & Production Builds

```bash
# Run all backend tests (21 endpoint, persistence & error tests)
cd backend
npm test

# Build backend TypeScript
npm run build

# Run all frontend tests (53 domain, calculation, API client & UI tests)
cd ../frontend
npm test

# Build frontend production bundle
npm run build
```

### 8.6 Local Data Storage & Reset Procedure

Local durable data is stored in JSON files under `backend/data/`:
- `backend/data/records.json` — institutional waste logs.
- `backend/data/factors.json` — verified biochemical factors.
- `backend/data/analyses.json` — saved deterministic analysis snapshots.

All file writes use atomic rename (`.tmp` -> target) to prevent corrupted files on crash.

**To reset demo data to factory state:**
```bash
cd backend
npm run db:reset
```
Or simply delete the `backend/data/` directory; the server will re-seed automatically on the next request.

### 8.7 Security Limitations (Milestone 3)
- **Authentication**: User authentication is not yet implemented. All requests are attributed to the specified `siteId`.
- **Authorization**: Client-supplied `siteId` is validated for schema presence, not cryptographically verified.
- **Network Scope**: The API server is intended for local evaluation and restricted to localhost origins via CORS.
- **Multi-tenancy**: Production multi-tenant isolation requires Milestone 5 IAM / Cognito integration.

