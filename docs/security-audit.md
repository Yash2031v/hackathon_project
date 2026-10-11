# Waste2Watt — Milestone 6 Security Audit & Architecture Assessment

This document details the read-only security audit and architectural evaluation performed on the local-first Waste2Watt application, establishing the verified baseline before any AWS cloud staging or deployment.

---

## 1. Executive Summary

| Category | Findings Evaluated | Remediated Locally | Design Gaps (Cloud Required) |
| :--- | :---: | :---: | :---: |
| **Authentication & Authorization** | 2 | 0 | 2 (Requires Cognito/AuthZ) |
| **API & Network Security** | 4 | 4 | 0 |
| **Data Persistence & Concurrency** | 2 | 1 | 1 (Requires DynamoDB) |
| **AI & Mathematical Integrity** | 1 | 1 | 0 |
| **CSV & Report Generation** | 1 | 1 | 0 |
| **Dependencies & Secrets** | 1 | 1 | 0 |
| **Total** | **11** | **7** | **3** |

---

## 2. Audit Findings Registry

### FINDING-01: Lack of User Authentication & Site Authorization
- **Severity**: **High** (Design Gap for Cloud; Acceptable for Single-User Local Demo)
- **Affected Components**: All API endpoints (`/waste-records`, `/analyses`, `/scenarios`, `/insights`), `backend/src/routes/`
- **Observed Evidence**:
  - `siteId` is accepted as an untrusted client string in query strings and request bodies (e.g. `GET /waste-records?siteId=site-campus-02`).
  - No authentication tokens (JWT/OAuth), session cookies, or user identity verification exist.
  - Any caller with network access can read, create, or export waste records for any facility ID without verification.
- **Impact**: In a multi-tenant cloud deployment, this would permit horizontal privilege escalation and cross-tenant data exposure.
- **Remediation**:
  - *Local Mode*: Documented reality — `siteId` is strictly an operational partition key, not an authorization token. No fake auth implemented.
  - *Cloud Staging Target*: Enforce AWS Cognito User Pools with JWT authorizer at API Gateway. Extract caller identity and verified site membership from the decoded token claims, rejecting client-provided `siteId` overrides.
- **Status**: **Design Gap Documented (Cloud Required)**

---

### FINDING-02: Missing Defensive HTTP Security Headers
- **Severity**: **Medium**
- **Affected Component**: `backend/src/app.ts`
- **Observed Evidence**: The Express API previously did not set standard defensive security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy`).
- **Reproduction**: Calling `GET /health` returned standard Express headers without MIME-sniffing or framing restrictions.
- **Impact**: Increased susceptibility to MIME sniffing and clickjacking if API responses are embedded in frames.
- **Remediation**: Implemented `backend/src/middleware/securityHeaders.ts` setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy: default-src 'self'`.
- **Status**: **Remediated & Verified** (Tested in `backend/tests/security.test.ts`)

---

### FINDING-03: Missing API Rate Limiting & Abuse Prevention
- **Severity**: **Medium**
- **Affected Component**: `backend/src/app.ts`
- **Observed Evidence**: API routes accepted unlimited requests with no throttling, token bucket, or sliding-window rate limits.
- **Impact**: Vulnerable to localized denial of service, resource exhaustion, or compute-heavy scenario evaluation hammering.
- **Remediation**: Built `backend/src/middleware/rateLimiter.ts` using an in-memory sliding window (120 req/min default), setting `X-RateLimit-*` and `Retry-After` headers and returning HTTP 429 `TOO_MANY_REQUESTS`.
- **Status**: **Remediated & Verified** (Tested in `backend/tests/security.test.ts`)

---

### FINDING-04: Unsanitized `X-Request-Id` Header Reflection
- **Severity**: **Medium**
- **Affected Component**: `backend/src/middleware/requestId.ts`
- **Observed Evidence**: `requestIdMiddleware` reflected any incoming `X-Request-Id` directly into response headers without length limits or character filtering.
- **Impact**: Potential for HTTP header injection or log corruption if malicious characters were passed.
- **Remediation**: Sanitized `X-Request-Id` using regex `^[a-zA-Z0-9\-_]{1,64}$`; invalid or non-compliant headers are replaced with safe server-generated IDs (`req-<timestamp>-<hash>`).
- **Status**: **Remediated & Verified** (Tested in `backend/tests/security.test.ts`)

---

### FINDING-05: Potential Error Detail Leakage in Production 500 Responses
- **Severity**: **Low**
- **Affected Component**: `backend/src/middleware/errorHandler.ts`
- **Observed Evidence**: Error middleware directly returned `err.message` in HTTP 500 responses regardless of `NODE_ENV`.
- **Impact**: Internal file paths (e.g. `Failed to read JSON from D:/...`) or system details could be exposed to callers on unhandled exceptions.
- **Remediation**: Updated `errorHandler.ts` so when `NODE_ENV === 'production'`, internal 500 messages are masked with generic text: `"An unexpected internal server error occurred."` while preserving safe error codes and correlation request IDs.
- **Status**: **Remediated & Verified**

---

### FINDING-06: Inconsistent CORS Environment Variable Naming
- **Severity**: **Low**
- **Affected Components**: `backend/src/server.ts`, `backend/.env.example`, `docs/security-architecture.md`
- **Observed Evidence**: `.env.example` defined `ALLOWED_ORIGINS`, `docs/security-architecture.md` mentioned `CORS_ORIGINS`, and `server.ts` read `CORS_ORIGIN`.
- **Impact**: Misconfiguration risk during deployment leading to CORS lockouts or unintentional fallbacks.
- **Remediation**: Updated `server.ts` to check `ALLOWED_ORIGINS || CORS_ORIGINS || CORS_ORIGIN` hierarchically.
- **Status**: **Remediated & Verified**

---

### FINDING-07: Concurrency & Ephemeral Filesystem Limits in Serverless
- **Severity**: **High** (Architectural Constraint for AWS Lambda)
- **Affected Component**: `backend/src/repositories/FileRepositories.ts`
- **Observed Evidence**:
  - Current storage uses synchronous local JSON file writes (`atomicWriteJsonSync`).
  - In serverless environments (AWS Lambda), container filesystems are ephemeral, read-only outside `/tmp`, and state is not shared across concurrent Lambda instances.
  - High-concurrency simultaneous writes locally would suffer from race conditions.
- **Impact**: File-based storage is strictly unsuitable for multi-instance cloud deployments.
- **Remediation**: Designed DynamoDB single-table schema with atomic conditional writes (`attribute_not_exists`) for staging cloud deployment. Retained local file storage behind repository interfaces (`IWasteRecordRepository`, `IFactorRepository`, `IAnalysisRepository`) for 100% offline local development parity.
- **Status**: **Migration Design Prepared (Cloud Required)**

---

### FINDING-08: AI Provider Client Tampering & Source of Truth Protection
- **Severity**: **Informational / Confirmed Secure**
- **Affected Components**: `backend/src/services/ai/aiService.ts`, `backend/src/routes/insights.routes.ts`
- **Observed Evidence**:
  - Deterministic calculations execute exclusively server-side (`biogasEnergyEngine.ts`, `pathwayRuleEngine.ts`, `scenarioEconomicsEngine.ts`).
  - `AiService` does not allow external AI outputs to overwrite energy figures or payback metrics.
  - Strict Zod schema validation (`InsightResponseSchema`), bounded 10,000ms timeout, and fallback to `DeterministicInsightProvider` are fully active.
  - Zero external network calls occur during default test runs.
- **Status**: **Confirmed Secure**

---

### FINDING-09: CSV Formula Injection & Character Sanitization
- **Severity**: **Informational / Confirmed Secure**
- **Affected Component**: `frontend/src/domain/services/csvExportService.ts`
- **Observed Evidence**:
  - Formula injection prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`) are neutralized with prepended `'`.
  - UTF-8 BOM (`\uFEFF`) is prepended for Excel/Google Sheets compatibility.
  - Browser printable view uses native React JSX escaping; `dangerouslySetInnerHTML` is not present.
- **Status**: **Confirmed Secure**

---

### FINDING-10: Secret Scans and Dependency Vulnerabilities
- **Severity**: **Informational / Confirmed Secure**
- **Observed Evidence**:
  - `npm audit` executed on both `backend/` and `frontend/`: **0 known vulnerabilities**.
  - Secret scan across git-tracked files: 0 active AWS keys (`AKIA...`), 0 leaked credentials.
  - `.env.example` files contain only empty placeholders.
- **Status**: **Confirmed Secure**

---

## 3. Audit Verification Matrix

| Area | Tool / Test | Verified Result |
| :--- | :--- | :--- |
| **Path Traversal** | `tests/security.test.ts` | Rejected `../` and slash sequences |
| **Corrupted File Recovery** | `tests/security.test.ts` | Auto-backed up `.corrupted.bak`, recovered seed defaults |
| **Body Size Limit (1MB)** | `tests/security.test.ts` | Returned 413 `PAYLOAD_TOO_LARGE` |
| **Defensive Headers** | `tests/security.test.ts` | Verified `nosniff`, `DENY`, `CSP` |
| **Request ID Sanitization** | `tests/security.test.ts` | Replaced special characters with safe ID |
| **Rate Limiter** | `tests/security.test.ts` | Returned 429 after threshold |
| **CSV Formula Defense** | `tests/security.test.ts` & frontend tests | Neutralized `=cmd\|...` with leading quote |
| **Dependency Audits** | `npm audit` (backend & frontend) | 0 vulnerabilities |
