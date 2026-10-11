import serverlessExpress from '@codegenie/serverless-express';
import type { Handler, Context, Callback } from 'aws-lambda';
import { createApp } from './app';
import {
  FileWasteRecordRepository,
  FileFactorRepository,
  FileAnalysisRepository,
} from './repositories/FileRepositories';
import {
  DynamoWasteRecordRepository,
  DynamoFactorRepository,
  DynamoAnalysisRepository,
} from './repositories/DynamoRepositories';

let serverlessExpressInstance: Handler | null = null;

function setupApp() {
  const storageType = process.env.STORAGE_TYPE || 'dynamo';
  const tableName = process.env.DYNAMO_TABLE_NAME || 'waste2watt-records-staging';

  let wasteRepo;
  let factorRepo;
  let analysisRepo;

  if (storageType === 'dynamo') {
    wasteRepo = new DynamoWasteRecordRepository(tableName);
    factorRepo = new DynamoFactorRepository(tableName);
    analysisRepo = new DynamoAnalysisRepository(tableName);
  } else {
    const dataDir = process.env.WASTE2WATT_DATA_DIR || '/tmp/data';
    wasteRepo = new FileWasteRecordRepository(dataDir);
    factorRepo = new FileFactorRepository(dataDir);
    analysisRepo = new FileAnalysisRepository(dataDir);
  }

  const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map(s => s.trim())
    : undefined;

  return createApp({
    wasteRepo,
    factorRepo,
    analysisRepo,
    storageType: storageType === 'dynamo' ? 'memory' : 'file',
    allowedOrigins,
  });
}

/**
 * AWS Lambda handler entrypoint.
 * Reuses execution context across warm invocations without starting a local TCP port.
 */
export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  if (!serverlessExpressInstance) {
    const app = setupApp();
    serverlessExpressInstance = serverlessExpress({ app });
  }

  return serverlessExpressInstance(event, context, callback);
};
