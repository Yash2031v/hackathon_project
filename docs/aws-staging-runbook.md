# Waste2Watt — AWS Staging Deployment Runbook

> [!WARNING]
> **Approval Gate Rule**:
> **DO NOT EXECUTE THESE COMMANDS WITHOUT EXPLICIT USER APPROVAL.**
> This runbook is an operational procedure guide prepared for future deployment. No command in this document has been executed, and no AWS resources have been created.

---

## 1. Prerequisites Checklist

Before executing any deployment command, the operator must verify:
- [ ] AWS account access verified with non-root credentials.
- [ ] Target AWS Region selected (`us-east-1` or `eu-west-1`).
- [ ] AWS CLI v2 installed (`aws --version`).
- [ ] AWS SAM CLI or CloudFormation CLI installed.
- [ ] Free Tier or AWS Activate credit balance active on the account.
- [ ] Explicit written approval obtained from the project owner.

---

## 2. Dry-Run & Offline Validation (Safe to Run Offline)

To validate the template syntax without contacting AWS or incurring charges:

```bash
# 1. Type-check backend and frontend
cd D:\Waste2Watt\backend && npm run build
cd D:\Waste2Watt\frontend && npm run build

# 2. Run complete test suites
cd D:\Waste2Watt\backend && npm test
cd D:\Waste2Watt\frontend && npm test

# 3. Offline template linting / syntax validation (if cfn-lint is installed)
cfn-lint D:\Waste2Watt\infra\waste2watt-staging.yaml
```

---

## 3. Step-by-Step Staging Provisioning Plan (Future Execution)

When explicit approval is granted, execute the following sequence:

### Step 3.1: Build Backend Lambda Artifact
```bash
cd D:\Waste2Watt\backend
npm run build
# Pack production dependencies into dist
```

### Step 3.2: Deploy Serverless Infrastructure
```bash
cd D:\Waste2Watt\infra
sam deploy \
  --template-file waste2watt-staging.yaml \
  --stack-name waste2watt-staging \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides Environment=staging EnableBedrock=false \
  --region us-east-1 \
  --no-execute-changeset # <-- Generates reviewable change set first!
```

### Step 3.3: Review Change Set
Inspect the generated AWS Change Set in the CloudFormation Console to ensure only the planned resources (DynamoDB table, Cognito pool, API Gateway, Lambda function) are queued for creation.

### Step 3.4: Execute Change Set
```bash
sam deploy --execute-changeset
```

### Step 3.5: Seed Verified Factors & Initial Schema
```bash
# Export outputs
export API_URL=$(aws cloudformation describe-stacks --stack-name waste2watt-staging --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text)

# Verify health check
curl -s "${API_URL}/health"
```

### Step 3.6: Configure & Deploy Frontend to Amplify
```bash
# In frontend/.env.production
VITE_API_BASE_URL=${API_URL}

cd D:\Waste2Watt\frontend
npm run build
# Deploy dist/ via AWS Amplify Console or AWS CLI
```

---

## 4. Post-Deployment Verification & Smoke Test

1. **Health Check**: Call `GET ${API_URL}/health` and confirm HTTP 200 with operational status.
2. **Security Headers**: Verify `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Content-Security-Policy` in the response headers.
3. **Payload Limits**: Post an oversized body (>1MB); verify 413 `PAYLOAD_TOO_LARGE`.
4. **Deterministic Math**: Post waste records and generate an analysis snapshot; verify that gross energy potential matches local calculation results exactly.
5. **CSV Export**: Call `GET /waste-records/export/csv`; confirm headers, formula neutralization, and UTF-8 BOM.

---

## 5. Teardown & Clean-up Runbook (Cost Avoidance)

To completely delete all deployed staging resources and prevent any residual charges:

```bash
# 1. Delete CloudFormation stack and all associated resources
aws cloudformation delete-stack --stack-name waste2watt-staging --region us-east-1

# 2. Wait for deletion completion
aws cloudformation wait stack-delete-complete --stack-name waste2watt-staging --region us-east-1

# 3. Clean up CloudWatch Log Groups
aws logs delete-log-group --log-group-name /aws/lambda/waste2watt-staging-ApiFunction --region us-east-1
```
All resources will be cleanly destroyed within ~3 minutes.
