# Data Dictionary (initial)

## WasteRecord
- `recordId`: stable unique identifier.
- `siteId`: institution/site identifier.
- `recordedAt`: ISO-8601 timestamp or date.
- `source`: canteen, hostel, kitchen, event, other.
- `wasteCategory`: configurable category, e.g. cooked food, fruit/vegetable scraps, mixed organics.
- `massKg`: positive finite number.
- `contaminationLevel`: low, medium, high, unknown; define how the user assesses it.
- `provenance`: measured, user_provided, demo.
- `notes`: optional, non-sensitive.
- `createdAt`, `updatedAt`: timestamps.

## FactorRecord
- `factorId`, `name`, `value`, `unit`.
- `sourceUrl` or `sourceDescription`.
- `effectiveDate` or version.
- `qualityStatus`: verified_source, user_configured, demo_only, missing.
- `notes`, `createdAt`, `updatedAt`.

## AnalysisResult
- `analysisId`, `siteId`, `inputRecordIds`, `createdAt`.
- `factorSnapshot`: exact factors used for reproducibility.
- `metrics`: each has `value`, `unit`, `status`, `factorIds`.
- `pathwayCandidates`: reasons, constraints and evidence IDs.
- `missingData`, `uncertaintyNotes`, `humanReviewRequired`.
- `aiProvider`, `modelId` where applicable; never store secrets.
- `executionStatus`: completed, partial, fallback, failed.
