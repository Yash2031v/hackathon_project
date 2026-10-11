import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { IWasteRecordRepository, WasteRecordFilter } from '../../../frontend/src/domain/repositories/IWasteRecordRepository';
import type { IFactorRepository } from '../../../frontend/src/domain/repositories/IFactorRepository';
import type { IAnalysisRepository } from '../../../frontend/src/domain/repositories/IAnalysisRepository';
import { WasteRecordSchema, type WasteRecord } from '../../../frontend/src/domain/schemas/wasteRecord.schema';
import { FactorRecordSchema, type FactorRecord } from '../../../frontend/src/domain/schemas/factorRecord.schema';
import { AnalysisResultSchema, type AnalysisResult } from '../../../frontend/src/domain/schemas/analysis.schema';
import { VERIFIED_FACTORS } from '../../../frontend/src/domain/constants/verifiedFactors';

export class DynamoStorageError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DynamoStorageError';
  }
}

export class DuplicateRecordError extends DynamoStorageError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateRecordError';
  }
}

/**
 * Creates a configured DynamoDB Document Client instance.
 */
export function createDynamoDocClient(client?: DynamoDBClient): DynamoDBDocumentClient {
  const baseClient = client || new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });
  return DynamoDBDocumentClient.from(baseClient, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}

// ============================================================================
// 1. DynamoWasteRecordRepository
// Single-table keys: PK = SITE#<siteId>, SK = REC#<date>#<recordId>
// ============================================================================
export class DynamoWasteRecordRepository implements IWasteRecordRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string, docClient?: DynamoDBDocumentClient) {
    this.tableName = tableName;
    this.docClient = docClient || createDynamoDocClient();
  }

  async createRecord(record: WasteRecord): Promise<WasteRecord> {
    const validated = WasteRecordSchema.parse(record);
    const pk = `SITE#${validated.siteId}`;
    const sk = `REC#${validated.date}#${validated.id}`;

    const item = {
      PK: pk,
      SK: sk,
      entityType: 'WasteRecord',
      id: validated.id,
      siteId: validated.siteId,
      date: validated.date,
      category: validated.category,
      massKg: validated.massKg,
      massUnit: validated.massUnit,
      source: validated.source,
      contamination: validated.contamination,
      provenance: validated.provenance,
      notes: validated.notes || '',
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt || validated.createdAt,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );
      return validated;
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new DuplicateRecordError(`Record with ID '${validated.id}' already exists.`);
      }
      throw new DynamoStorageError(`Failed to put waste record '${validated.id}' in DynamoDB`, err);
    }
  }

  async getRecordById(recordId: string): Promise<WasteRecord | null> {
    try {
      // Query/Scan for the record by ID attribute
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'id = :id AND entityType = :type',
          ExpressionAttributeValues: {
            ':id': recordId,
            ':type': 'WasteRecord',
          },
          Limit: 1,
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      const parsed = WasteRecordSchema.safeParse(item);
      if (!parsed.success) {
        throw new DynamoStorageError(`Stored record '${recordId}' failed schema validation: ${parsed.error.message}`);
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof DynamoStorageError) throw err;
      throw new DynamoStorageError(`Failed to get waste record '${recordId}' from DynamoDB`, err);
    }
  }

  async listRecords(filter: WasteRecordFilter): Promise<{ records: WasteRecord[]; totalCount: number }> {
    try {
      let items: any[] = [];

      if (filter.siteId) {
        // High-efficiency partition query scoped by siteId
        const pk = `SITE#${filter.siteId}`;
        let keyCondition = 'PK = :pk AND begins_with(SK, :skPrefix)';
        const expressionValues: Record<string, any> = {
          ':pk': pk,
          ':skPrefix': 'REC#',
        };

        if (filter.startDate && filter.endDate) {
          keyCondition = 'PK = :pk AND SK BETWEEN :startSk AND :endSk';
          expressionValues[':startSk'] = `REC#${filter.startDate}#`;
          expressionValues[':endSk'] = `REC#${filter.endDate}#~`;
        }

        const filterExpressions: string[] = [];
        const expressionNames: Record<string, string> = {};

        if (filter.category && filter.category !== 'all') {
          filterExpressions.push('#cat = :cat');
          expressionNames['#cat'] = 'category';
          expressionValues[':cat'] = filter.category;
        }

        if (filter.source && filter.source !== 'all') {
          filterExpressions.push('#src = :src');
          expressionNames['#src'] = 'source';
          expressionValues[':src'] = filter.source;
        }

        if (filter.provenance && filter.provenance !== 'all') {
          filterExpressions.push('#prov = :prov');
          expressionNames['#prov'] = 'provenance';
          expressionValues[':prov'] = filter.provenance;
        }

        const queryParams: any = {
          TableName: this.tableName,
          KeyConditionExpression: keyCondition,
          ExpressionAttributeValues: expressionValues,
          ScanIndexForward: false, // newest records first
        };

        if (filterExpressions.length > 0) {
          queryParams.FilterExpression = filterExpressions.join(' AND ');
          queryParams.ExpressionAttributeNames = expressionNames;
        }

        const response = await this.docClient.send(new QueryCommand(queryParams));
        items = response.Items || [];
      } else {
        // Global scan when no siteId is provided (e.g. cross-site system query)
        const response = await this.docClient.send(
          new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'entityType = :type',
            ExpressionAttributeValues: {
              ':type': 'WasteRecord',
            },
          })
        );
        items = response.Items || [];
      }

      // Validate each item against Zod schema
      const validRecords: WasteRecord[] = [];
      for (const item of items) {
        const parsed = WasteRecordSchema.safeParse(item);
        if (parsed.success) {
          validRecords.push(parsed.data);
        }
      }

      validRecords.sort((a, b) => b.date.localeCompare(a.date));

      const totalCount = validRecords.length;
      const offset = filter.offset || 0;
      const limit = filter.limit || validRecords.length;
      const paginated = validRecords.slice(offset, offset + limit);

      return {
        records: paginated,
        totalCount,
      };
    } catch (err) {
      throw new DynamoStorageError(`Failed to list waste records from DynamoDB`, err);
    }
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    try {
      // Find item's PK and SK first
      const record = await this.getRecordById(recordId);
      if (!record) {
        return false;
      }

      const pk = `SITE#${record.siteId}`;
      const sk = `REC#${record.date}#${record.id}`;

      await this.docClient.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: pk, SK: sk },
        })
      );
      return true;
    } catch (err) {
      throw new DynamoStorageError(`Failed to delete record '${recordId}' from DynamoDB`, err);
    }
  }
}

// ============================================================================
// 2. DynamoFactorRepository
// Single-table keys: PK = SYSTEM#FACTORS, SK = FAC#<factorId>
// ============================================================================
export class DynamoFactorRepository implements IFactorRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string, docClient?: DynamoDBDocumentClient) {
    this.tableName = tableName;
    this.docClient = docClient || createDynamoDocClient();
  }

  async getFactorById(factorId: string): Promise<FactorRecord | null> {
    try {
      const response = await this.docClient.send(
        new GetCommand({
          TableName: this.tableName,
          Key: {
            PK: 'SYSTEM#FACTORS',
            SK: `FAC#${factorId}`,
          },
        })
      );

      if (!response.Item) {
        // Fall back to verified constants catalog if not yet seeded
        const fallback = VERIFIED_FACTORS.find(f => f.factorId === factorId);
        return fallback || null;
      }

      const parsed = FactorRecordSchema.safeParse(response.Item);
      return parsed.success ? parsed.data : null;
    } catch (err) {
      throw new DynamoStorageError(`Failed to get factor '${factorId}' from DynamoDB`, err);
    }
  }

  async listFactors(): Promise<FactorRecord[]> {
    try {
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': 'SYSTEM#FACTORS',
            ':skPrefix': 'FAC#',
          },
        })
      );

      const items = response.Items || [];
      if (items.length === 0) {
        // Return default constants catalog if table has not been initialized
        return [...VERIFIED_FACTORS];
      }

      const result: FactorRecord[] = [];
      for (const item of items) {
        const parsed = FactorRecordSchema.safeParse(item);
        if (parsed.success) {
          result.push(parsed.data);
        }
      }
      return result.length > 0 ? result : [...VERIFIED_FACTORS];
    } catch (err) {
      throw new DynamoStorageError(`Failed to list factors from DynamoDB`, err);
    }
  }

  async saveFactor(factor: FactorRecord): Promise<FactorRecord> {
    const validated = FactorRecordSchema.parse(factor);
    const pk = 'SYSTEM#FACTORS';
    const sk = `FAC#${validated.factorId}`;

    const item = {
      PK: pk,
      SK: sk,
      entityType: 'FactorRecord',
      ...validated,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );
      return validated;
    } catch (err) {
      throw new DynamoStorageError(`Failed to save factor '${factor.factorId}' in DynamoDB`, err);
    }
  }
}

// ============================================================================
// 3. DynamoAnalysisRepository
// Single-table keys: PK = SITE#<siteId>, SK = ANA#<createdAt>#<analysisId>
// ============================================================================
export class DynamoAnalysisRepository implements IAnalysisRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string, docClient?: DynamoDBDocumentClient) {
    this.tableName = tableName;
    this.docClient = docClient || createDynamoDocClient();
  }

  async createAnalysis(analysis: AnalysisResult): Promise<AnalysisResult> {
    const validated = AnalysisResultSchema.parse(analysis);
    const pk = `SITE#${validated.siteId}`;
    const sk = `ANA#${validated.createdAt}#${validated.analysisId}`;

    const item = {
      PK: pk,
      SK: sk,
      entityType: 'AnalysisResult',
      analysisId: validated.analysisId,
      siteId: validated.siteId,
      createdAt: validated.createdAt,
      dateRange: validated.dateRange,
      recordCount: validated.recordCount,
      inputRecordIds: validated.inputRecordIds || [],
      totalMassKg: validated.totalMassKg,
      dailyAverageKg: validated.dailyAverageKg,
      predominantCategory: validated.predominantCategory,
      contaminationProfile: validated.contaminationProfile,
      metrics: validated.metrics || [],
      summary: validated.summary,
      recommendedNextStep: validated.recommendedNextStep,
      pathwayCandidates: validated.pathwayCandidates,
      factorSnapshot: validated.factorSnapshot || [],
      missingData: validated.missingData,
      uncertaintyNotes: validated.uncertaintyNotes,
      executionStatus: validated.executionStatus || 'completed',
      isAiAssisted: (analysis as any).isAiAssisted || false,
      modelIdentifier: (analysis as any).modelIdentifier || '',
      humanReviewRequired: validated.humanReviewRequired,
    };

    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );
      return validated;
    } catch (err) {
      throw new DynamoStorageError(`Failed to save analysis '${analysis.analysisId}' in DynamoDB`, err);
    }
  }

  async getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
    try {
      const response = await this.docClient.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'analysisId = :aid AND entityType = :type',
          ExpressionAttributeValues: {
            ':aid': analysisId,
            ':type': 'AnalysisResult',
          },
          Limit: 1,
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const parsed = AnalysisResultSchema.safeParse(response.Items[0]);
      if (!parsed.success) {
        throw new DynamoStorageError(`Stored analysis '${analysisId}' failed schema validation: ${parsed.error.message}`);
      }
      return parsed.data;
    } catch (err) {
      if (err instanceof DynamoStorageError) throw err;
      throw new DynamoStorageError(`Failed to get analysis '${analysisId}' from DynamoDB`, err);
    }
  }

  async listAnalysesBySite(siteId: string, limit?: number): Promise<AnalysisResult[]> {
    try {
      const pk = `SITE#${siteId}`;
      const response = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': pk,
            ':skPrefix': 'ANA#',
          },
          ScanIndexForward: false, // newest analyses first
          Limit: limit,
        })
      );

      const items = response.Items || [];
      const validAnalyses: AnalysisResult[] = [];
      for (const item of items) {
        const parsed = AnalysisResultSchema.safeParse(item);
        if (parsed.success) {
          validAnalyses.push(parsed.data);
        }
      }
      return validAnalyses;
    } catch (err) {
      throw new DynamoStorageError(`Failed to list analyses for site '${siteId}' from DynamoDB`, err);
    }
  }
}
