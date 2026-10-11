# Design System — Quiet Intelligence, Visible Impact

## 1. Design direction
A premium environmental operations product: calm, tactile, clear and data-led. The AI should feel powerful in the results, not shout about itself in the interface.

**Visual keywords:** field notes, sustainable infrastructure, editorial typography, natural materials, operational clarity, trustworthy data.

## 2. Palette
Use CSS variables and keep contrast accessible.

- Forest: `#173F35` — primary brand, navigation accents.
- Deep pine: `#102D27` — headings and dark surfaces.
- Leaf: `#547A56` — secondary positive state.
- Warm paper: `#F6F3EA` — page background.
- White: `#FFFFFF` — cards and data surfaces.
- Charcoal: `#242B28` — body text.
- Stone: `#777D75` — muted text.
- Amber: `#D99A35` — caution/attention, not generic decoration.
- Clay: `#B85C43` — errors or critical warnings.
- Border: `#E2E3D9`.

Never use neon purple, glowing cyan, sci-fi gradients or excessive glassmorphism.

## 3. Typography
- Use a highly legible sans-serif such as Inter or system sans for UI.
- Use a restrained editorial serif only for occasional hero/section headings if it improves the design.
- Use tabular numerals for metric cards and tables.
- Keep hierarchy clear: page title, section title, body, metadata.

## 4. Layout
- Desktop: left navigation rail/sidebar, top context bar, spacious main canvas.
- Main overview: concise page heading; one primary action; a small row of meaningful metrics; waste trend chart; pathway comparison; recent records.
- Use generous whitespace, 8-point spacing rhythm, 12–16 px card radius and thin borders.
- Prefer real charts and structured comparison cards over decorative illustrations.
- Mobile: collapse sidebar, stack metrics, make forms and tables usable.

## 5. UI language
Prefer:
- “Waste profile”
- “Potential energy”
- “Scenario comparison”
- “Assumptions & evidence”
- “Data quality”
- “Measured”
- “Estimated”
- “Needs verification”

Avoid:
- “AI magic”
- “Superintelligence”
- “Autonomous climate brain”
- “100% accurate”
- “Guaranteed savings”
- “Real-time” unless the data really is live.

## 6. AI visual treatment
- AI is a quiet capability, not the brand theme.
- A small text label such as “AI-assisted interpretation” is enough.
- Show structured reasoning as “Why this option?” with 2–4 concise reasons and evidence links.
- Do not make a chat screen the home page.
- No animated sparkles, robot mascots, glowing brain icons, oversized chat bubbles or purple AI gradients.
- If adding a natural-language assistant, keep it secondary to the operational workflow.

## 7. Data visualisation
- Label units on every axis and metric.
- Use consistent colors for measured vs estimated vs assumed.
- Do not use red/green alone to convey status; include text/icons.
- Show ranges when supported; do not imply precision beyond input quality.
- Add empty states, tooltips and source notes.

## 8. Interaction states
Every primary feature must include loading, success, empty, invalid input, network/API failure and retry states. Include keyboard focus and reduced-motion support.
