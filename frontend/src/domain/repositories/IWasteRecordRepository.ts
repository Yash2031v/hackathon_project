import type { WasteRecord } from '../schemas/wasteRecord.schema';

export interface WasteRecordFilter {
  siteId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  source?: string;
  provenance?: string;
  limit?: number;
  offset?: number;
}

export interface IWasteRecordRepository {
  createRecord(record: WasteRecord): Promise<WasteRecord>;
  getRecordById(recordId: string): Promise<WasteRecord | null>;
  listRecords(filter: WasteRecordFilter): Promise<{ records: WasteRecord[]; totalCount: number }>;
  deleteRecord(recordId: string): Promise<boolean>;
}
