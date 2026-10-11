# Waste2Watt — Team NULLVERSE

**Waste-to-Energy Intelligence Platform**  
**Tagline:** From food waste to actionable energy intelligence.

Waste2Watt helps colleges, hostels, canteens and institutions understand their organic-waste streams, evaluate appropriate management pathways, estimate the energy potentially recoverable through anaerobic digestion, and assess indicative economics.

## Product principle
This is a decision-support product, not a promise of energy production. Every estimate must expose its assumptions, data quality, uncertainty and source. Actual energy generated is shown only when real measurements are provided.

## Start here
1. Read `PROJECT_BRIEF.md`.
2. Follow `AGENTS.md` as the non-negotiable engineering and product rules.
3. Read `ARCHITECTURE.md`, `AI_SYSTEM.md`, and `DESIGN_SYSTEM.md`.
4. Use `IMPLEMENTATION_PLAN.md` to build in small, testable milestones.
5. Paste `ANTIGRAVITY_START_PROMPT.md` into Antigravity after these files are in the project root.

## Proposed stack
- Frontend: React + TypeScript + Vite.
- UI: Tailwind CSS (or existing styling system if already scaffolded), accessible components, Recharts for charts.
- Cloud: AWS Amplify Hosting, API Gateway, AWS Lambda, DynamoDB, S3, CloudWatch.
- AI: Amazon Bedrock through a server-side adapter; use the Strands Agents SDK if compatible with the selected model/runtime and time budget.
- Testing: Vitest + React Testing Library; API/domain tests; basic end-to-end smoke test.
- Infrastructure: AWS SAM or CDK only if it can be set up without jeopardising the working MVP.

## Hackathon scope guard
Build a credible end-to-end MVP before optional features. Do not claim sensor integration, live plant measurements, production deployment, verified savings, or model accuracy unless demonstrated. Keep a record of AI coding tools used and credit third-party assets/libraries.
