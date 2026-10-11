import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createApp } from '../app';
import {
  FileWasteRecordRepository,
  FileFactorRepository,
  FileAnalysisRepository,
} from '../repositories/FileRepositories';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

async function runSmokeTest(): Promise<void> {
  console.log('====================================================');
  console.log('   WASTE2WATT — MILESTONE 3 SMOKE TEST SUITE        ');
  console.log('====================================================');
  console.log(`[Storage] Target data directory: ${DATA_DIR}`);

  // 1. Initialize Repositories and Express App
  const wasteRepo = new FileWasteRecordRepository(DATA_DIR);
  const factorRepo = new FileFactorRepository(DATA_DIR);
  const analysisRepo = new FileAnalysisRepository(DATA_DIR);

  const app = createApp({
    wasteRepo,
    factorRepo,
    analysisRepo,
    storageType: 'file',
  });

  const PORT = 3009; // Isolated smoke test port
  const server = app.listen(PORT, '127.0.0.1');
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  let createdRecordId = '';
  let createdAnalysisId = '';

  try {
    console.log(`\n--- Step 1: Health Check (GET /health) ---`);
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthBody = await (healthRes.json() as Promise<any>);
    console.log(`Status: ${healthRes.status} ${healthRes.statusText}`);
    console.log(`Response:`, JSON.stringify(healthBody));
    if (healthRes.status !== 200 || healthBody.status !== 'ok') {
      throw new Error(`Health check failed: expected 200 ok`);
    }

    console.log(`\n--- Step 2: Create Waste Record (POST /waste-records) ---`);
    const recordPayload = {
      siteId: 'site-campus-main',
      date: '2026-03-20',
      source: 'canteen_kitchen',
      category: 'prepared_food',
      massKg: 465.5,
      massUnit: 'kg',
      contamination: 'low',
      provenance: 'measured',
      notes: 'Smoke test audit record: post-dinner dining scale slip #402',
    };
    const createRes = await fetch(`${BASE_URL}/waste-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordPayload),
    });
    const createBody = await createRes.json();
    console.log(`Status: ${createRes.status} (Expected: 201)`);
    console.log(`Created Record ID: ${createBody.record?.id}`);
    if (createRes.status !== 201 || !createBody.record?.id) {
      throw new Error(`Record creation failed`);
    }
    createdRecordId = createBody.record.id;

    console.log(`\n--- Step 3: Retrieve Records with Filter & Pagination (GET /waste-records) ---`);
    const listRes = await fetch(
      `${BASE_URL}/waste-records?siteId=site-campus-main&category=prepared_food&limit=10`
    );
    const listBody = await listRes.json();
    console.log(`Status: ${listRes.status} (Expected: 200)`);
    console.log(`Total count matching filter: ${listBody.totalCount}`);
    const foundCreated = listBody.records.some((r: any) => r.id === createdRecordId);
    console.log(`Verified newly created record is in listing: ${foundCreated}`);
    if (!foundCreated) {
      throw new Error(`Created record ${createdRecordId} not found in listing`);
    }

    console.log(`\n--- Step 4: Deterministic Analysis Run (POST /analyses) ---`);
    const anaPayload = {
      siteId: 'site-campus-main',
    };
    const anaRes = await fetch(`${BASE_URL}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anaPayload),
    });
    const anaBody = await anaRes.json();
    console.log(`Status: ${anaRes.status} (Expected: 201)`);
    console.log(`Analysis ID: ${anaBody.analysis?.analysisId}`);
    console.log(`Recommended Next Step: "${anaBody.analysis?.recommendedNextStep}"`);
    console.log(`Evaluated Pathways Count: ${anaBody.analysis?.pathwayCandidates?.length}`);
    if (anaRes.status !== 201 || !anaBody.analysis?.analysisId) {
      throw new Error(`Analysis creation failed`);
    }
    createdAnalysisId = anaBody.analysis.analysisId;

    console.log(`\n--- Step 5: Retrieve Saved Analysis Snapshot (GET /analyses/:id) ---`);
    const getAnaRes = await fetch(`${BASE_URL}/analyses/${createdAnalysisId}`);
    const getAnaBody = await getAnaRes.json();
    console.log(`Status: ${getAnaRes.status} (Expected: 200)`);
    console.log(`Snapshot matches created ID: ${getAnaBody.analysis?.analysisId === createdAnalysisId}`);
    if (getAnaRes.status !== 200) {
      throw new Error(`Failed to retrieve analysis snapshot`);
    }

    console.log(`\n--- Step 6: Multi-Scenario Comparison Engine (POST /scenarios/compare) ---`);
    const comparePayload = {
      siteId: 'site-campus-main',
      dailyFeedstockKg: 450,
      scenarios: [
        {
          scenarioId: 'sc-1',
          title: 'Baseline Standard Digester',
          assumptions: {
            currency: 'USD',
            biogasYieldM3PerTonne: 120,
            methaneFractionPct: 60,
            electricalEfficiencyPct: 34,
            electricityTariffPerKwh: 0.15,
            capexAmount: 65000,
            opexAnnualAmount: 2000,
            operatingDaysPerYear: 300,
          },
        },
        {
          scenarioId: 'sc-2',
          title: 'High-Efficiency Micro-CHP',
          assumptions: {
            currency: 'USD',
            biogasYieldM3PerTonne: 140,
            methaneFractionPct: 62,
            electricalEfficiencyPct: 38,
            electricityTariffPerKwh: 0.15,
            capexAmount: 85000,
            opexAnnualAmount: 2400,
            operatingDaysPerYear: 300,
          },
        },
        {
          scenarioId: 'sc-3',
          title: 'Negative Cashflow Boundary Condition',
          assumptions: {
            currency: 'USD',
            biogasYieldM3PerTonne: 80,
            methaneFractionPct: 50,
            electricalEfficiencyPct: 25,
            electricityTariffPerKwh: 0.05,
            capexAmount: 100000,
            opexAnnualAmount: 8000,
            operatingDaysPerYear: 250,
          },
        },
      ],
    };
    const compRes = await fetch(`${BASE_URL}/scenarios/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comparePayload),
    });
    const compBody = await compRes.json();
    console.log(`Status: ${compRes.status} (Expected: 200)`);
    console.log(`Evaluated Scenarios Count: ${compBody.comparison?.length}`);
    compBody.comparison.forEach((c: any) => {
      console.log(`  - Scenario "${c.title}": Payback=${c.economics.simplePaybackYears ?? 'None'} yrs, NetBenefit=$${c.economics.annualNetBenefit}/yr, Status=${c.economics.paybackStatus}`);
    });
    if (compRes.status !== 200 || compBody.comparison?.length !== 3) {
      throw new Error(`Scenario comparison failed`);
    }

    console.log(`\n--- Step 7: Negative / Validation Error Handling Tests ---`);
    // 7a. Negative mass rejection
    const invalidMassRes = await fetch(`${BASE_URL}/waste-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recordPayload, massKg: -50 }),
    });
    const invalidMassBody = await invalidMassRes.json();
    console.log(`Negative mass response: ${invalidMassRes.status} [${invalidMassBody.errorCode}] ${invalidMassBody.message}`);
    if (invalidMassRes.status !== 400 || invalidMassBody.errorCode !== 'VALIDATION_ERROR') {
      throw new Error(`Negative mass was not rejected with 400 VALIDATION_ERROR`);
    }

    // 7b. Exceeds plausibility bound (>50,000 kg)
    const excessMassRes = await fetch(`${BASE_URL}/waste-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...recordPayload, massKg: 999999 }),
    });
    const excessMassBody = await excessMassRes.json();
    console.log(`Exceeds 50k kg bound: ${excessMassRes.status} [${excessMassBody.errorCode}]`);
    if (excessMassRes.status !== 400 || excessMassBody.errorCode !== 'VALIDATION_ERROR') {
      throw new Error(`Mass exceeding bound was not rejected`);
    }

    // 7c. Malformed JSON
    const malformedJsonRes = await fetch(`${BASE_URL}/waste-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json payload without quotes',
    });
    const malformedJsonBody = await malformedJsonRes.json();
    console.log(`Malformed JSON payload: ${malformedJsonRes.status} [${malformedJsonBody.errorCode}]`);
    if (malformedJsonRes.status !== 400 || malformedJsonBody.errorCode !== 'INVALID_JSON') {
      throw new Error(`Malformed JSON did not return 400 INVALID_JSON`);
    }

    // 7d. Missing siteId on GET /waste-records
    const missingSiteRes = await fetch(`${BASE_URL}/waste-records`);
    const missingSiteBody = await missingSiteRes.json();
    console.log(`Missing siteId on GET: ${missingSiteRes.status} [${missingSiteBody.errorCode}]`);
    if (missingSiteRes.status !== 400 || missingSiteBody.errorCode !== 'VALIDATION_ERROR') {
      throw new Error(`Missing siteId did not return 400 VALIDATION_ERROR`);
    }

    // 7e. Unknown analysis ID (404)
    const unknownAnaRes = await fetch(`${BASE_URL}/analyses/ana-non-existent-99999`);
    const unknownAnaBody = await unknownAnaRes.json();
    console.log(`Unknown analysis ID: ${unknownAnaRes.status} [${unknownAnaBody.errorCode}] ${unknownAnaBody.message}`);
    if (unknownAnaRes.status !== 404 || (unknownAnaBody.errorCode !== 'NOT_FOUND' && unknownAnaBody.errorCode !== 'ANALYSIS_NOT_FOUND')) {
      throw new Error(`Unknown analysis ID did not return 404 NOT_FOUND / ANALYSIS_NOT_FOUND`);
    }

    // 7f. Scenarios empty array (400)
    const emptyScenariosRes = await fetch(`${BASE_URL}/scenarios/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: 'site-campus-main', dailyFeedstockKg: 400, scenarios: [] }),
    });
    const emptyScenariosBody = await emptyScenariosRes.json();
    console.log(`Empty scenarios array: ${emptyScenariosRes.status} [${emptyScenariosBody.errorCode}]`);
    if (emptyScenariosRes.status !== 400 || emptyScenariosBody.errorCode !== 'VALIDATION_ERROR') {
      throw new Error(`Empty scenarios array did not return 400 VALIDATION_ERROR`);
    }

    // 7g. Scenarios exceeding 5 items (400)
    const tooManyScenarios = Array.from({ length: 6 }).map((_, i) => ({
      scenarioId: `sc-${i}`,
      title: `Scenario ${i}`,
      assumptions: comparePayload.scenarios[0].assumptions,
    }));
    const excessScenariosRes = await fetch(`${BASE_URL}/scenarios/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: 'site-campus-main', dailyFeedstockKg: 400, scenarios: tooManyScenarios }),
    });
    const excessScenariosBody = await excessScenariosRes.json();
    console.log(`Excess scenarios (>5): ${excessScenariosRes.status} [${excessScenariosBody.errorCode}]`);
    if (excessScenariosRes.status !== 400 || excessScenariosBody.errorCode !== 'VALIDATION_ERROR') {
      throw new Error(`Excess scenarios array did not return 400 VALIDATION_ERROR`);
    }

    // 8. Server Shutdown & Restart Simulation
    console.log(`\n--- Step 8: Server Shutdown & Restart Verification ---`);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    console.log(`Server closed on port ${PORT}.`);

    console.log(`Re-instantiating repositories from disk (${DATA_DIR})...`);
    const newWasteRepo = new FileWasteRecordRepository(DATA_DIR);
    const newAnalysisRepo = new FileAnalysisRepository(DATA_DIR);

    const reloadedRecords = await newWasteRepo.listRecords({ siteId: 'site-campus-main' });
    const reloadedRecordFound = reloadedRecords.records.some((r) => r.id === createdRecordId);
    console.log(`Record ${createdRecordId} persisted and reloaded from disk: ${reloadedRecordFound}`);
    if (!reloadedRecordFound) {
      throw new Error(`Record was lost upon server restart!`);
    }

    const reloadedAnalysis = await newAnalysisRepo.getAnalysisById(createdAnalysisId);
    console.log(`Analysis ${createdAnalysisId} persisted and reloaded from disk: ${!!reloadedAnalysis}`);
    if (!reloadedAnalysis) {
      throw new Error(`Analysis snapshot was lost upon server restart!`);
    }

    console.log('\n====================================================');
    console.log('   ALL SMOKE TESTS PASSED CLEANLY (100% DURABLE)     ');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runSmokeTest().catch((err) => {
  console.error('[Smoke Test Error]', err);
  process.exit(1);
});
