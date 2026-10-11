# Implementation Plan — Build in verified milestones

## Milestone 0 — Repository reconnaissance
- Inspect current files, package manager, framework, scripts and git status.
- Read all project docs.
- Report current state and propose a minimal plan.
- Do not replace or scaffold over an existing project without permission.

**Exit gate:** a concise assessment and agreed target structure.

## Milestone 1 — Product shell and visual system
- Set up React + TypeScript + Vite only if no suitable scaffold exists.
- Build responsive app shell, sidebar, overview page, waste-log page, analysis page and scenario page.
- Apply `DESIGN_SYSTEM.md`.
- Use labelled demo data while APIs are not implemented.
- All primary controls should work or be explicitly marked as not yet available.

**Exit gate:** build/type-check passes; responsive navigation and core page flow work.

## Milestone 2 — Domain model and deterministic engine
- Define typed waste records, factor records, analysis result and feasibility scenario.
- Implement input validation and unit-aware calculation functions.
- Implement pathway rules with transparent, configurable rules.
- Implement missing-factor and invalid-input handling.
- Add unit tests for calculations, boundaries and negative/zero cases.

**Exit gate:** calculation tests pass; no LLM-generated numeric results.

## Milestone 3 — API and persistence
- Add API handlers and repositories.
- Add DynamoDB persistence for records/analysis snapshots.
- Add S3 only for a real upload/report requirement.
- Add API error contract and request IDs.
- Add local mock repository only behind a clearly named development adapter.

**Exit gate:** create/read record and run analysis API flows work in tests.

## Milestone 4 — Explainable AI Intelligence Layer (Completed)
- Implement decoupled server-side AI architecture (`backend/src/services/ai/`) with `aiService.ts`, `aiProvider.ts`, `deterministicInsightProvider.ts`, and `aiConfig.ts`.
- Mode A (Deterministic, default): Runs 100% locally with zero external keys, network calls, or costs. Explains physical feedstock balance, energy calculations, pathway hierarchy, and payback guardrails.
- Mode B (Optional external HTTP provider): Server-side with strict Zod validation (`InsightResponseSchema`), 10,000ms timeout, and automatic fallback to Mode A on error or malformed schema.
- Endpoints: `POST /insights` and `GET /insights/config`. Rejects client-supplied calculation tampering.
- Frontend: `AiInsightsSection.tsx` integrated into `AnalysisPage.tsx` with grounded evidence chips, confidence badges, priority action items, boundary disclosures, and clear provider indicator.
- 31 backend tests and 57 frontend tests passing without regression.

**Exit gate:** valid output and fallback paths tested; strict response validation enforced; no secrets in frontend; builds succeed.

## Milestone 5 — Security Hardening, Reports & Export (Completed)
- **Security Hardening**:
  - Request body limits (1MB default with 413 `PAYLOAD_TOO_LARGE` structured RFC-compliant error envelopes).
  - Strict input validation on all API endpoints via Zod schemas.
  - CORS origin restriction configurable via `CORS_ORIGINS`.
  - Request ID correlation (`x-request-id` header or generated UUID) across logs and error responses.
  - Production error confidentiality: Internal stack traces, raw error messages, and secrets stripped from client responses.
  - Safe file persistence: `resolveSafeDataPath` blocks path traversal attempts (`..`, forward/backward slashes, null bytes) and guarantees directory confinement.
  - Corrupted JSON recovery: Automatically isolates corrupted files to `.corrupted.<timestamp>.bak` and safely restores default seeds.
  - Context-safe rendering: All AI and external text rendered as native React text nodes, preventing XSS.
  - Server-authoritative calculations: All financial and energy calculations executed server-side; client overrides rejected.
  - Explicit multi-tenant auth disclaimer: Documented that `siteId` is a multi-facility operational partition key, not an authentication or authorization credential. No fake authentication.
- **CSV Export Engine (`csvExportService.ts`)**:
  - Pure RFC 4180 CSV generation for waste records and analysis snapshots.
  - CSV formula injection protection: neutralizes `=cmd`, `+`, `-`, `@`, `\t`, `\r` prefixes by prepending `'`.
  - UTF-8 Byte Order Mark (`\uFEFF`) included for flawless Excel / Google Sheets character rendering.
  - Dedicated endpoint `GET /waste-records/export/csv` and client-side streaming download.
  - Respects active category/source filters and displays clear empty-state notifications when data is unavailable.
- **Printable Assessment Report (`PrintableReportView.tsx`)**:
  - Executive layout with `@media print` styling conforming to editorial forest-green / deep-pine / warm-paper tokens.
  - Complete report sections: site metadata, collection audit, energy balance, pathway recommendations, scenario economics, AI insights, missing data caveats, and scientific disclaimer banner.
  - Native print triggers via `window.print()` with keyboard accessibility and clean print page breaks.
- **Verification**: 38 backend tests and 69 frontend tests passing with 0 regressions; production builds (`tsc`, `vite build`) succeed cleanly.

**Exit gate:** security controls, formula-injection defense, CSV export, and printable report verified and documented.

## Milestone 6 — Security Audit, Architecture Review & Pre-Deployment Gate (Completed)
- **Security & Architecture Audit**: Documented in `docs/security-audit.md` and pre-deployment gate in `docs/predeployment-review.md`.
- **Infrastructure-as-Code**: Hardened `infra/waste2watt-staging.yaml` with least-privilege IAM, DynamoDB `DeletionPolicy: Retain`, API Gateway throttling (50/100), and `DefaultAuthorizer: CognitoJwtAuthorizer`.
- **Staging Runbook**: Detailed future deployment and teardown steps in `docs/aws-staging-runbook.md`.

## Milestone 6.2 — Resolve Deployment Blockers (Completed)
- **Task 1 (Lambda Entrypoint)**: Implemented `backend/src/lambda.ts` using `@codegenie/serverless-express`, exporting `backend/src/lambda.handler` without starting local TCP ports. Compiles cleanly to `dist/backend/src/lambda.js`.
- **Task 2 (DynamoDB Repositories)**: Implemented `DynamoWasteRecordRepository`, `DynamoFactorRepository`, and `DynamoAnalysisRepository` in `backend/src/repositories/DynamoRepositories.ts` using AWS SDK v3. Enforces single-table access patterns (`PK=SITE#<id>`, `SK=REC#<date>#<id>`) and conditional writes. Added 11 mocked unit tests.
- **Task 3 (Server-Side Site Authorization)**: Implemented `backend/src/middleware/authorization.ts` enforcing verified Cognito JWT claims on all read, write, export, analysis, scenario, and insight endpoints. Blocks horizontal cross-site privilege escalation with HTTP 403 `UNAUTHORIZED_SITE_ACCESS`. Added 8 authorization integration tests.
- **Task 4 (Infrastructure Consistency)**: Verified `infra/waste2watt-staging.yaml` handler path, DynamoDB permissions, key schema, route authorizers, and public `/health` bypass.
- **Task 5 (Test Verification)**: 61 backend tests (all 9 suites) and 69 frontend tests (all 11 suites) passing. Production builds (`tsc`, `vite build`) succeed cleanly.
- **Approval Gate**: Closed. Zero AWS resources created or provisioned. Awaiting explicit user approval before executing any deployment command.

**Exit gate:** all deployment blockers resolved in local code, tests passing, zero cloud resources provisioned pending authorization.

## Milestone 7 — Final demo
Suggested 3-minute structure:
1. 0:00–0:20 — campus food waste problem and user.
2. 0:20–0:50 — enter a waste record and see history.
3. 0:50–1:30 — run analysis; show recommendation, assumptions and evidence.
4. 1:30–2:10 — compare anaerobic digestion and alternative pathways; adjust costs.
5. 2:10–2:40 — show the actual AWS architecture/request path and fallback transparency.
6. 2:40–3:00 — impact and limitations.

The hackathon rules say the submission is judged from the public repository, write-up and a demo video of up to three minutes. Show actual working features and actual AWS integration in the video. Follow the event's exact deadline and eligibility rules.

## Priority rule
A complete vertical slice beats a collection of unfinished advanced features. If time is short, finish Milestones 1–3 and one real Bedrock-assisted workflow before adding images, forecasting or advanced RAG.
