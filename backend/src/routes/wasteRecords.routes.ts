import { Router } from 'express';
import type { IWasteRecordRepository } from '../../../frontend/src/domain/repositories/IWasteRecordRepository';
import { 
  CreateWasteRecordRequestSchema, 
  GetWasteRecordsQuerySchema 
} from '../../../frontend/src/domain/contracts/apiContracts';
import type { WasteRecord } from '../../../frontend/src/domain/schemas/wasteRecord.schema';
import { exportWasteRecordsToCsv } from '../../../frontend/src/domain/services/csvExportService';
import { requireSiteAuthorization } from '../middleware/authorization';

export function createWasteRecordsRouter(repo: IWasteRecordRepository): Router {
  const router = Router();

  // GET /waste-records/export/csv
  router.get(
    '/export/csv',
    requireSiteAuthorization(req => (req.query.siteId as string) || (GetWasteRecordsQuerySchema.safeParse(req.query).data?.siteId)),
    async (req, res, next) => {
      try {
        const query = GetWasteRecordsQuerySchema.parse(req.query);

        const result = await repo.listRecords({
          siteId: query.siteId,
          startDate: query.startDate,
          endDate: query.endDate,
          category: query.category,
          source: query.source,
          provenance: query.provenance,
          limit: 5000,
          offset: 0,
        });

        const csv = exportWasteRecordsToCsv(result.records);
        const filename = `waste-records-${query.siteId}-${new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send('\uFEFF' + csv);
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /waste-records
  router.post(
    '/',
    requireSiteAuthorization(req => req.body?.siteId),
    async (req, res, next) => {
      try {
        const validated = CreateWasteRecordRequestSchema.parse(req.body);

        const record: WasteRecord = {
          ...validated,
          id: validated.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          massUnit: validated.massUnit || 'kg',
          createdAt: new Date().toISOString(),
        };

        const saved = await repo.createRecord(record);

        res.status(201).json({
          success: true,
          record: saved,
          message: 'Waste record created successfully.',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /waste-records
  router.get(
    '/',
    requireSiteAuthorization(req => (req.query.siteId as string) || (GetWasteRecordsQuerySchema.safeParse(req.query).data?.siteId)),
    async (req, res, next) => {
    try {
      const query = GetWasteRecordsQuerySchema.parse(req.query);

      const result = await repo.listRecords({
        siteId: query.siteId,
        startDate: query.startDate,
        endDate: query.endDate,
        category: query.category,
        source: query.source,
        provenance: query.provenance,
        limit: query.limit,
        offset: query.offset,
      });

      res.status(200).json({
        records: result.records,
        totalCount: result.totalCount,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
