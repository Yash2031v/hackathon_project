# Waste2Watt — Pre-Deployment Security Gate Review & Blocker Resolution (Milestone 6.2)

> [!IMPORTANT]
> **PRE-DEPLOYMENT GATE STATUS: CODE PREREQUISITES READY (AWAITING USER APPROVAL)**
> In strict accordance with `AGENTS.md` and Milestone 6.2 instructions:
> - **All 4 confirmed deployment blockers have been remediated in local code and verified via tests.**
> - **Zero AWS resources have been created, modified, or provisioned.**
> - **No deployment commands (`sam deploy`, etc.) were executed.**
> - Actual AWS deployment remains paused awaiting explicit user review and authorization.

---

## 1. Executive Summary & Remediation Matrix

| Review Area | Initial Status | Milestone 6.2 Resolution | Current Verdict |
| :--- | :---: | :--- | :---: |
| **Authentication & Site Authorization** | ❌ Incomplete | Implemented `authorization.ts` enforcing verified Cognito claims across all endpoints | ✅ **RESOLVED** (8 tests pass) |
| **Lambda Compatibility & Handler** | ❌ Incomplete | Implemented `backend/src/lambda.ts` via `@codegenie/serverless-express` | ✅ **RESOLVED** (Builds cleanly) |
| **Cloud Persistence Layer** | ❌ Incomplete | Implemented `DynamoRepositories.ts` using AWS SDK v3 with single-table keys | ✅ **RESOLVED** (11 tests pass) |
| **API Gateway Auth Routing** | ⚠️ Defective | Bound `DefaultAuthorizer: CognitoJwtAuthorizer` and unauthenticated `/health` | ✅ **RESOLVED** in template |
| **CloudFormation Syntax & Policies** | ⚠️ Defective | Standalone `BedrockInvocationPolicy`; `DeletionPolicy: Retain` added | ✅ **RESOLVED** in template |
| **CORS & Throttling Configuration** | ⚠️ Inconsistent | Added `DefaultRouteSettings` throttling (50/100) and staging domain CORS | ✅ **RESOLVED** in template |
| **Local Builds & Test Suites** | ✅ Verified | **61 backend tests, 69 frontend tests pass with zero regressions** | ✅ **VERIFIED** |
| **Final Recommendation** | **NO-GO** | **All 4 Critical/High Blockers Resolved Locally** | 🟢 **CODE-READY (AWAITING USER APPROVAL)** |

---

## 2. Detailed Findings Registry

### BLOCKER-01: Missing Lambda Entrypoint (`lambda.ts`) and Serverless Adapter
- **Severity**: **Critical (Deployment Blocker)**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L141-L142), [backend/src/](file:///D:/Waste2Watt/backend/src/)
- **Observed Evidence**:
  - The CloudFormation SAM template specifies:
    ```yaml
    ApiFunction:
      Type: AWS::Serverless::Function
      Properties:
        Handler: lambda.handler
        CodeUri: ../backend/dist/
    ```
  - Inspection of `backend/src/` reveals only `server.ts` and `app.ts`. There is **no `lambda.ts`** entrypoint file.
  - Inspection of `backend/package.json` shows that no serverless adapter (such as `@codegenie/serverless-express` or `@vendia/serverless-express`) is installed.
- **Impact**: Any attempt to deploy and invoke the Lambda function will immediately crash with runtime exception `Runtime.HandlerNotFound: lambda.handler cannot be found in /var/task`.
- **Required Remediation**:
  1. Install `@codegenie/serverless-express` as a production dependency in `backend/package.json`.
  2. Implement `backend/src/lambda.ts` wrapping `createApp` with `serverlessExpress`.
  3. Verify that `npm run build` compiles `dist/lambda.js` with exported `handler`.

---

### BLOCKER-02: Missing DynamoDB Repository Implementation & AWS SDK Dependencies
- **Severity**: **Critical (Deployment Blocker)**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L35-L36), [backend/src/repositories/](file:///D:/Waste2Watt/backend/src/repositories/)
- **Observed Evidence**:
  - The template injects environment variables:
    ```yaml
    STORAGE_TYPE: dynamo
    DYNAMO_TABLE_NAME: !Ref RecordsTable
    ```
  - Inspection of `backend/src/repositories/` reveals **only `FileRepositories.ts`**. No DynamoDB repository implementation exists.
  - Inspection of `backend/package.json` reveals that `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` are **not installed**.
  - `backend/src/server.ts` only instantiates `FileWasteRecordRepository`, `FileFactorRepository`, and `FileAnalysisRepository`, which write synchronously to local disk.
- **Impact**: In AWS Lambda, container filesystems are read-only outside `/tmp`, and state is not shared across instances. If deployed with `STORAGE_TYPE: dynamo`, the application will crash because no DynamoDB driver or adapter exists.
- **Required Remediation**:
  1. Add `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` to `backend/package.json`.
  2. Implement `DynamoWasteRecordRepository`, `DynamoFactorRepository`, and `DynamoAnalysisRepository` adhering to the existing `IWasteRecordRepository`, `IFactorRepository`, and `IAnalysisRepository` interfaces.
  3. Update `createApp` dependency injection in `lambda.ts` to instantiate DynamoDB repositories when `STORAGE_TYPE === 'dynamo'`.
  4. Add unit and integration tests using mocked AWS DynamoDB clients to verify partition isolation (`SITE#<siteId>`) and conditional writes.

---

### BLOCKER-03: Site-Level Multi-Tenant Authorization Not Implemented (Only Proposed)
- **Severity**: **Critical (Security Blocker)**
- **Affected File**: [backend/src/routes/wasteRecords.routes.ts](file:///D:/Waste2Watt/backend/src/routes/wasteRecords.routes.ts), [backend/src/routes/analyses.routes.ts](file:///D:/Waste2Watt/backend/src/routes/analyses.routes.ts)
- **Observed Evidence**:
  - The architecture documents propose that `custom:authorized_sites` in Cognito JWT claims will enforce site isolation.
  - However, in the actual Express API code, **zero authorization middleware exists**.
  - All endpoints read `siteId` directly from untrusted client input (`req.query.siteId` or `req.body.siteId`).
  - No code inspects the Cognito token claims (`req.requestContext.authorizer.jwt.claims`) or validates that the authenticated caller has permission to access the requested facility.
- **Impact**: A caller authenticated for `site-campus-01` could supply `siteId=site-campus-02` and view, export, or create waste records for another institution (horizontal privilege escalation / IDOR).
- **Mandatory Policy Rule**: `AGENTS.md` and the Milestone prompt state:
  > *"If authentication or site-level authorization is missing, explicitly mark deployment as blocked until an adequate solution is implemented and tested."*
- **Required Remediation**:
  1. Implement an Express authorization middleware (`backend/src/middleware/authorization.ts`).
  2. Extract authenticated claims from `req.requestContext?.authorizer?.jwt?.claims` (or incoming Authorization header in development).
  3. Validate that requested `siteId` is present in `claims['custom:authorized_sites']` (or `*` for system admins).
  4. Return HTTP 403 `UNAUTHORIZED_SITE_ACCESS` if the caller lacks authorization.
  5. Add unit and integration tests verifying that cross-site requests are rejected with 403.

---

### BLOCKER-04: API Gateway JWT Authorizer Unattached to Routes
- **Severity**: **High (Configuration Defect)**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L127-L134,L157-L163)
- **Observed Evidence**:
  - In `HttpApi`, the authorizer is declared under `Auth.Authorizers.CognitoJwtAuthorizer`:
    ```yaml
    HttpApi:
      Type: AWS::Serverless::HttpApi
      Properties:
        Auth:
          Authorizers:
            CognitoJwtAuthorizer: ...
    ```
  - However:
    1. `HttpApi.Properties.Auth.DefaultAuthorizer` is **not set**.
    2. `ApiEvent` on `ApiFunction` does **not declare** `Auth.Authorizer: CognitoJwtAuthorizer`.
- **Impact**: In AWS SAM, defining an authorizer without setting `DefaultAuthorizer` or attaching it to the event leaves the `/{proxy+}` route unauthenticated! Requests without an `Authorization` header would pass straight to the Lambda function.
- **Required Remediation**:
  1. Explicitly attach `Authorizer: CognitoJwtAuthorizer` to authenticated API events in SAM.
  2. Split routes or configure route-level authorization so that `GET /health` remains publicly accessible without a token, while `/waste-records`, `/analyses`, `/scenarios`, and `/insights` require valid JWTs.

---

### FINDING-CFN-01: Conditional IAM Policy Syntax in SAM Template
- **Severity**: **Medium (Template Validation Risk)**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L148-L155)
- **Observed Evidence**:
  - The template places an `!If` condition inside the YAML `Policies` array:
    ```yaml
    Policies:
      - DynamoDBCrudPolicy: ...
      - !If
        - BedrockEnabled
        - Statement:
            - Effect: Allow
              Action: [bedrock:InvokeModel]
              Resource: !Sub 'arn:aws:bedrock:${AWS::Region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'
        - !Ref 'AWS::NoValue'
    ```
- **Impact**: When `BedrockEnabled` is `'false'`, `!Ref 'AWS::NoValue'` inside a CloudFormation list produces a null/empty array item, which causes `Template validation error: Value of property Policies must be a list of valid policy objects or strings`.
- **Required Remediation**:
  Use a separate `AWS::IAM::Policy` attachment conditional on `BedrockEnabled` or separate SAM roles rather than `AWS::NoValue` inside an array literal.

---

### FINDING-CFN-02: Missing `DeletionPolicy: Retain` on DynamoDB Table
- **Severity**: **Medium (Data Loss Risk)**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L86-L110)
- **Observed Evidence**:
  - `RecordsTable` does not specify `DeletionPolicy: Retain` or `UpdateReplacePolicy: Retain`.
- **Impact**: If the CloudFormation stack is updated with a replacement or deleted, CloudFormation's default behavior for DynamoDB tables without a deletion policy is `Delete`, permanently purging all historical environmental data.
- **Required Remediation**: Add `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to `RecordsTable`.

---

### FINDING-CFN-03: Hardcoded CORS Allowed Origins in SAM Template
- **Severity**: **Low**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml#L119-L122)
- **Observed Evidence**:
  - The template declares parameter `AllowedOrigins` (default: `'https://staging.waste2watt.internal,http://localhost:5173'`), but `HttpApi.Properties.CorsConfiguration.AllowOrigins` hardcodes:
    ```yaml
    AllowOrigins:
      - 'http://localhost:5173'
      - 'http://127.0.0.1:5173'
    ```
- **Impact**: Requests from the deployed Amplify frontend domain would be rejected by API Gateway CORS.
- **Required Remediation**: Reference the parameter or configure Amplify staging domain in `AllowOrigins`.

---

### FINDING-SEC-01: Missing API Gateway Throttling Configuration
- **Severity**: **Medium**
- **Affected File**: [infra/waste2watt-staging.yaml](file:///D:/Waste2Watt/infra/waste2watt-staging.yaml)
- **Observed Evidence**:
  - No `DefaultRouteSettings` (with `ThrottlingBurstLimit` and `ThrottlingRateLimit`) are configured on `HttpApi`.
- **Impact**: In-memory rate limiting in Express (`rateLimiter.ts`) is container-local; concurrent Lambda executions do not share memory. Without API Gateway throttling, an attacker could scale up concurrent Lambda instances and exhaust AWS account concurrency quotas.
- **Required Remediation**: Add `DefaultRouteSettings` (e.g. `ThrottlingRateLimit: 50`, `ThrottlingBurstLimit: 100`) to `HttpApi`.

---

### FINDING-COST-01: Cost Assumptions Requiring Live Account Verification
- **Severity**: **Low / Informational**
- **Affected File**: [docs/aws-staging-architecture.md](file:///D:/Waste2Watt/docs/aws-staging-architecture.md#62-monthly-cost-estimation-worksheet-staging-tier)
- **Observed Evidence**:
  - The previous cost estimate ($0.00 – $0.78/month) relied heavily on 12-month AWS Free Tier eligibility.
- **Reality & Unverified Factors**:
  1. **Account Age**: If the user's AWS account is >12 months old, Lambda (1M free requests/month remains permanent), but API Gateway and Amplify Hosting Free Tier expire.
  2. **Bedrock Has No Free Tier**: Bedrock Claude 3 Haiku charges $0.25 / million input tokens and $1.25 / million output tokens immediately.
  3. **Data Transfer & DNS**: Route 53 hosted zones ($0.50/month) and CloudWatch metrics alarms ($0.10/alarm/month above free quota) incur fixed costs.
- **Corrected Posture**: Deployment cannot be claimed as "guaranteed free." Staging costs are estimated at **$1.50 – $4.00 / month** on non-free-tier accounts without credits.

---

## 3. Pre-Deployment Remediation Checklist

All local prerequisite tasks have been completed and verified:

- [x] **1. Lambda Entrypoint & Adapter**:
  - [x] Installed `@codegenie/serverless-express` in `backend/package.json`.
  - [x] Created `backend/src/lambda.ts`.
  - [x] Verified `npm run build` compiles `dist/backend/src/lambda.js` with exported `handler`.
- [x] **2. DynamoDB Repository Adapter**:
  - [x] Installed `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`.
  - [x] Implemented `DynamoWasteRecordRepository`, `DynamoFactorRepository`, and `DynamoAnalysisRepository` in `backend/src/repositories/DynamoRepositories.ts`.
  - [x] Added 11 mocked unit tests in `backend/tests/dynamoRepositories.test.ts` verifying partition keys, sort keys, and conditional writes.
- [x] **3. Server-Side Site Authorization**:
  - [x] Implemented `backend/src/middleware/authorization.ts` with `requireSiteAuthorization`.
  - [x] Enforces verified Cognito claims across read, write, export, analysis, scenario, and insight endpoints.
  - [x] Returns 403 `UNAUTHORIZED_SITE_ACCESS` on cross-site requests.
  - [x] Added 8 integration tests in `backend/tests/authorization.test.ts` verifying horizontal privilege escalation defense.
- [x] **4. SAM Template Corrections**:
  - [x] Attached `CognitoJwtAuthorizer` explicitly to authenticated routes while leaving `/health` public (`Authorizer: NONE`).
  - [x] Refactored conditional Bedrock policy syntax into standalone `BedrockInvocationPolicy`.
  - [x] Added `DeletionPolicy: Retain` and `UpdateReplacePolicy: Retain` to `RecordsTable`.
  - [x] Added API Gateway `DefaultRouteSettings` throttling (50 req/sec, 100 burst).
  - [x] Set handler path to `backend/src/lambda.handler` matching build artifact output.

---

## 4. Final Go / No-Go Recommendation

### 🟢 CODE VERDICT: GO (CODE PREREQUISITES SATISFIED)
### 🛑 CLOUD PROVISIONING STATUS: PAUSED AT APPROVAL GATE

All code-level runtime requirements and security blockers are **100% resolved and verified locally**:
- Serverless Lambda adapter compiles cleanly.
- DynamoDB repository layer is fully implemented and tested.
- Server-side multi-tenant site authorization is strictly enforced.
- CloudFormation template syntax and security policies are aligned.

**Next Action**: In accordance with the project approval gate, **no AWS resources have been provisioned**. The codebase is now ready for deployment once you provide explicit authorization.
