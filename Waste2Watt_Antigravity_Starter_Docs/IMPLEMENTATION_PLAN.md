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

## Milestone 4 — Bedrock AI orchestration
- Implement server-side model adapter and structured output schema.
- Connect typed deterministic tools to the agent.
- Add source-grounded explanation, missing-data analysis and scenario comparison.
- Validate output; implement timeout, bounded retry and fallback.
- Add mocked AI tests plus an optional integration test requiring explicit AWS credentials.

**Exit gate:** valid output and fallback paths tested; no secrets in frontend.

## Milestone 5 — Scenario economics and impact reporting
- Implement editable cost assumptions and simple payback.
- Prevent misleading payback when annual net benefit is zero/negative.
- Add scenario comparison, uncertainty notes and downloadable report only if time permits.
- Clearly label estimates and demo records.

**Exit gate:** economic calculations tested and assumptions visible.

## Milestone 6 — AWS deployment and demo hardening
- Verify AWS region/model access, IAM and cost before provisioning.
- Deploy API and data resources using one infrastructure approach.
- Deploy frontend to Amplify.
- Verify actual deployed request path; check CloudWatch logs.
- Add setup/teardown instructions and screenshots for the demo.
- Record AI coding tools and third-party asset credits.

**Exit gate:** public demo works, real AWS path is visible, no secrets or misleading claims.

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
