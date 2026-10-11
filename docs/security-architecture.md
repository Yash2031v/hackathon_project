# Waste2Watt Security Architecture & Data Protection

This document outlines the security controls, defensive data engineering, export protections, and trust boundaries implemented in Waste2Watt as of **Milestone 5**.

---

## 1. Trust Boundaries & Authentication Notice

### 1.1 Local-First Architecture
In its current local-first milestone, Waste2Watt operates as an environmental operations intelligence tool designed for local facilities, campus dining managers, and engineers.

### 1.2 Authentication & Authorization Reality
> [!IMPORTANT]
> **No Multi-Tenant Authentication or Access Control Claim**:
> Waste2Watt currently does **not** implement user authentication (authN) or role-based access control (authZ).
> - The `siteId` parameter is an **operational data partition key** representing physical campus facilities (e.g. `site-campus-01`), **not** an authentication credential, session token, or security boundary.
> - In accordance with `AGENTS.md` and repository standards, no fake authentication tokens, pseudo-logins, or insecure placeholder authorization mechanisms have been implemented.
> - Before multi-tenant public cloud deployment (Milestone 6), institutional identity federation (e.g. AWS Cognito with OAuth2/OIDC, Amazon Verified Permissions, or SAML) must be layered in front of the API Gateway.

---

## 2. API Hardening & Boundary Defense

### 2.1 Strict Input Validation
All incoming HTTP requests to Express endpoints are validated using Zod schemas before reaching any business logic or persistence repository:
- `POST /waste-records`: Validated against `CreateWasteRecordSchema` (positive mass values, allowable ISO dates, enumerated categories, contamination scores, and data provenance tags).
- `POST /analyses`: Validated against `CreateAnalysisRequestSchema` (array of record IDs, non-empty site IDs).
- `POST /insights`: Validated against `InsightRequestSchema` with input length and record array limits.
- Query parameters (e.g. `startDate`, `endDate`, `category`, `source`, `limit`, `offset`) are typed and validated, with invalid queries returning 400 Bad Request with structured error codes.

### 2.2 Payload & Request Size Limits
- Request bodies are strictly capped at **1MB** (`express.json({ limit: '1mb' })`).
- Payloads exceeding this limit are trapped by custom error middleware, returning HTTP 413 `PAYLOAD_TOO_LARGE` with a clean error envelope rather than leaking internal parser stack traces.

### 2.3 Strict CORS Policy
- Express server restricts Cross-Origin Resource Sharing (CORS) strictly to allowed origins configured via the `CORS_ORIGINS` environment variable (defaulting to the local Vite development origin `http://localhost:5173` and production domain).
- Prevents cross-origin malicious scripts from reading environmental records or triggering unauthorized evaluations.

### 2.4 Confidential Error Responses & Request IDs
- In production (`NODE_ENV === 'production'`), error middleware removes internal stack traces, database file paths, and low-level exception messages.
- Client responses follow a standardized, predictable error contract:
  ```json
  {
    "error": {
      "code": "PAYLOAD_TOO_LARGE",
      "message": "Request entity exceeds allowed payload size limit.",
      "requestId": "req-98f23719-7e28-40ea-9403-1ff6ec2cb612"
    }
  }
  ```
- All requests are tagged with a safe `requestId` (correlated with incoming `x-request-id` headers when provided), enabling trace correlation in CloudWatch / local logs without logging sensitive payload bodies.

---

## 3. Storage & Path Traversal Mitigation

### 3.1 `resolveSafeDataPath` Confinement
File-based persistence adapters (`FileWasteRecordRepository`, `FileFactorRepository`, `FileAnalysisRepository`) protect file paths against directory traversal:
- Filenames containing path traversal tokens (`..`), path separators (`/`, `\`), or null bytes (`\0`) are immediately rejected with an `Error('Path traversal detected')`.
- All paths are resolved using `path.resolve(baseDir, sanitizedFilename)` and verified to stay within `baseDir`:
  ```ts
  if (!resolvedPath.startsWith(baseDir)) {
    throw new Error('Path traversal attempt detected');
  }
  ```

### 3.2 Malformed JSON & Corrupted File Recovery
- If a persistent data file is corrupted on disk (e.g., partial write, power loss, invalid manual edit):
  1. The exception is caught safely without crashing the Node.js server.
  2. The corrupted file is renamed to a timestamped backup (`.corrupted.<timestamp>.bak`) for forensics.
  3. The repository safely falls back to known default seed records, ensuring system availability.

---

## 4. CSV Formula Injection Defense

Spreadsheets (Microsoft Excel, Google Sheets, LibreOffice Calc) interpret leading characters like `=`, `+`, `-`, `@`, `\t`, and `\r` as executable formula syntax, which attackers can exploit to execute arbitrary commands or exfiltrate data (CSV Injection / DDE attack).

Waste2Watt's `csvExportService.ts` implements RFC 4180 sanitization:
1. **Formula Character Neutralization**: Any cell whose string value starts with `=`, `+`, `-`, `@`, `\t`, or `\r` is prepended with a single quote (`'`), which instructs spreadsheets to treat the contents strictly as plaintext.
2. **Type-Safe Sanitization**: Pure numeric values (e.g. `450.5` kg, `-12` metric variance) are preserved as numbers to allow standard spreadsheet sum/average math.
3. **Escaping**: Double quotes inside cells are escaped as `""`, and cells containing commas or newlines are wrapped in standard RFC 4180 double quotes.
4. **UTF-8 Byte Order Mark (BOM)**: Prepended with `\uFEFF` so international character sets render correctly without mangled encoding.

---

## 5. UI XSS Defense & Printable Report Integrity

### 5.1 Safe AI Text Rendering
- AI-generated insights and external summaries are rendered strictly through standard React JSX text nodes (`<span>`, `<p>`, `<li>`).
- `dangerouslySetInnerHTML` is **never** used. Raw HTML tags or `<script>` tags injected into feedstocks or notes are safely escaped by the browser DOM.

### 5.2 Server-Authoritative Mathematical Model
- Frontend scenario studios and client inputs can never override authoritative calculations.
- Financial metrics, payback status, and pathway rankings are evaluated using deterministic server/domain engine functions (`pathwayRuleEngine.ts`, `biogasEnergyEngine.ts`, `scenarioEconomicsEngine.ts`).

### 5.3 Printable Environmental Assessment Report
- Native `@media print` CSS preserves clean typography, hides interactive buttons (`window.print()`, `close`), and forces background colors (`-webkit-print-color-adjust: exact`).
- Reports display explicit disclosures:
  - Provenance labels (`measured`, `user_provided`, `estimated`, `simulated`).
  - Missing data notices.
  - Mandatory disclaimer: *"This environmental assessment is an indicative decision-support evaluation based on deterministic rules and assumptions. It is not an engineering warranty or commercial guarantee."*
