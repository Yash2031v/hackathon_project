# Antigravity — Initial Build Prompt

You are the senior product engineer and solution architect for **Waste2Watt**, a project by Team NULLVERSE for an environmental hackathon. Read `AGENTS.md`, `PROJECT_BRIEF.md`, `ARCHITECTURE.md`, `AI_SYSTEM.md`, `DESIGN_SYSTEM.md`, and `IMPLEMENTATION_PLAN.md` fully before acting. These files are the source of truth.

## First response: do not code yet
1. Inspect the repository and report the framework, package manager, existing pages, scripts, test setup, and any risks.
2. Summarise the product in your own words and identify the smallest credible end-to-end MVP.
3. Propose a phased implementation plan that fits the current repository and time budget.
4. Identify decisions that need approval, especially paid AWS resources, destructive changes, model/region choice and public deployment.
5. Do not generate the whole application in one shot. Wait for my approval of the plan before making substantial changes.

## Product requirements
Build a polished, responsive institutional waste-intelligence product:
- Overview dashboard with waste records, trends and data-quality indicators.
- Waste log form with date, source, category, mass in kg, contamination/quality and provenance.
- Analysis page with pathway recommendations and “Why this option?” explanations.
- Anaerobic-digestion scenario with transparent biogas/energy assumptions.
- Scenario economics: editable capex/opex/tariff assumptions, indicative savings and simple payback.
- Visible distinction between measured, user-provided, assumed, estimated, simulated and unknown data.
- Clear empty, loading, error, insufficient-data and AI-unavailable states.
- Seed demo data only when visibly labelled as demo data.

## Strong AI requirements
AI should be technically meaningful and strong, but the UI must not look like an AI product. Use Amazon Bedrock on the server through an adapter. If compatible with the chosen runtime/model and time budget, use the Strands Agents SDK to orchestrate narrowly scoped tools:
- waste profile summarisation;
- pathway-rule evaluation;
- deterministic energy calculator;
- deterministic feasibility calculator;
- sensitivity analysis;
- approved evidence retrieval.

Use AI to interpret, classify, orchestrate tool calls, compare scenarios and explain the evidence. Do not let it invent numeric calculations, factors, prices, citations or actual measurements. Validate structured model output against a schema and tool results. If Bedrock is unavailable, the application must still run with deterministic calculations and a clearly documented fallback. Do not claim an AI integration is real until the server actually calls the configured model.

Optional later features: user-confirmed image-based waste category suggestions; forecasting only when enough dated data exists; evidence retrieval/RAG. Do not implement these before the core workflow works.

## AWS requirements
Target Amplify Hosting + API Gateway + Lambda + DynamoDB + S3 only where needed + CloudWatch. Keep secrets in server-side environment/configuration or AWS IAM. Verify the chosen Bedrock model is available in the selected region. Use least-privilege IAM. Do not provision or deploy paid resources without explicit approval. A local mock must never be presented as a real AWS integration.

## Visual direction
Create a calm, premium environmental operations interface: warm paper background, forest green, deep pine, white surfaces, restrained amber, strong typography, editorial layout, clear charts and thin borders. Use the tokens in `DESIGN_SYSTEM.md`.

The AI should be visually quiet. Do NOT use purple/cyan neon gradients, glowing orbs, robot mascots, sparkles, sci-fi glassmorphism, giant chat bubbles or an AI-chat-first homepage. Prioritise the waste workflow, data visualisation, assumptions, evidence and scenario comparisons. The product should feel like a serious climate/sustainability operations platform.

## Engineering rules
- TypeScript strict mode and typed domain models.
- Keep domain calculations independent from React and AWS.
- Validate API inputs and AI outputs.
- Add tests for domain maths, invalid inputs, missing factors, malformed model output and fallback.
- Never claim a test/build/deployment passed unless actually executed.
- No dead buttons, fake integrations, hard-coded environmental claims or unlabelled demo data.
- Keep dependencies lean; preserve existing work; update README with verified commands.

## Immediate task
After your repository assessment and plan, wait for approval. Once approved, implement only Milestone 1 from `IMPLEMENTATION_PLAN.md`. At completion, report files changed, commands run, actual test/build results, known gaps and the next recommended milestone.
