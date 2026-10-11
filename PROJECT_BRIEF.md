# Project Brief — Waste2Watt

## 1. Executive summary
Waste2Watt is an AWS-powered waste-to-energy decision intelligence platform for institutions that generate food and other biodegradable organic waste. It converts waste logs into transparent, evidence-aware recommendations: prevent avoidable waste first, assess suitable reuse/redistribution where safe and lawful, compare composting or anaerobic digestion where appropriate, and model the indicative financial feasibility of selected pathways.

The core innovation is not a calculator or a chatbot. It is an explainable decision workflow that combines structured data, deterministic engineering calculations, AI-assisted interpretation, scenario comparison and evidence-backed recommendations.

## 2. Problem
Institutions often lack a single, usable view of:
- how much organic waste they generate and how the quantity changes over time;
- which waste streams are suitable for which treatment pathways;
- what energy recovery could realistically mean after conversion losses;
- whether a pathway appears financially plausible under local assumptions;
- which missing measurements would most improve confidence.

A dashboard alone displays information. Waste2Watt should turn that information into a practical next step.

## 3. Target users
- Campus sustainability or facilities managers.
- Hostel and canteen operators.
- Institutional administrators evaluating waste-management options.
- Sustainability teams preparing internal reports.

## 4. Product promise
“Understand your organic waste, compare responsible treatment options, and evaluate energy recovery before investing in infrastructure.”

## 5. Core workflow
1. Create or select an institution/site.
2. Log waste quantity, category, source, date, contamination estimate and data provenance.
3. Review the waste profile and trends.
4. Run an analysis.
5. Receive a ranked shortlist of suitable pathways with reasons, constraints, data gaps and evidence.
6. Open the anaerobic-digestion scenario to review biogas/energy estimates and editable assumptions.
7. Compare costs, operating expenses, indicative savings and simple payback.
8. Export a report that labels measured inputs, assumptions, estimates and unknowns separately.

## 6. Signature innovation: Explainable Waste Pathway Intelligence
The system should answer:
- What should be considered next for this waste stream?
- Why is this pathway suitable or unsuitable?
- What evidence supports the recommendation?
- Which inputs are measured, assumed or missing?
- How sensitive is the result to the uncertain inputs?
- What should the institution measure or verify before acting?

AI proposes and explains. Deterministic domain tools validate the numbers and enforce constraints. The interface displays uncertainty and evidence instead of hiding it.

## 7. AI capabilities (ambitious target, staged delivery)
### MVP AI
- Structured analysis orchestrator using Amazon Bedrock.
- Tool-using workflow with separate tools for waste profile, pathway rules, yield calculations, feasibility calculations and evidence retrieval.
- Evidence-grounded explanations with source references.
- Missing-data and assumption detection.
- Scenario comparison written in plain language.
- AI output schema validation and deterministic fallback if Bedrock is unavailable.

### Stretch AI
- Image-assisted waste category suggestion from a user-uploaded image, with human confirmation and a visible “AI suggestion” label.
- Time-series waste-generation forecast once enough historical records exist.
- Natural-language query over the institution’s own history and curated reference material (RAG).
- “What would change the recommendation?” sensitivity explanation.
- Optional agent trace panel for debugging/demo, not as a flashy user-facing AI gimmick.

Do not claim model training, accuracy, environmental savings, or forecast reliability without evaluation. Do not let the model invent emission factors, biogas yields, tariffs, prices or citations.

## 8. Product success criteria
- A user can log a waste record and retrieve it after refresh.
- A user can run a complete analysis with visible assumptions.
- Every numeric result comes from tested domain functions, not free-form LLM arithmetic.
- A recommendation explains reasons, limitations and missing data.
- The dashboard distinguishes estimated from measured metrics.
- The application handles AI/API failure without losing the core workflow.
- The frontend feels like a premium sustainability/operations product, not a generic AI chatbot.

## 9. Non-goals for the hackathon MVP
- Operating or controlling a real biogas plant.
- Guaranteed energy output, ROI, carbon savings or regulatory compliance.
- Fully autonomous infrastructure decisions.
- Real IoT integration unless a real device and measured data are actually connected.
- Training a custom foundation model.
- Using a blockchain or adding services only for architectural decoration.

## 10. Assumptions and trust
- All demo data is clearly labelled as sample/demo data.
- Yield factors, efficiencies, costs and tariffs are configurable and carry source/date/units where available.
- If a source or credible factor is unavailable, show “not configured” and request input rather than inventing a value.
- Human review is required before any real investment or operational decision.
