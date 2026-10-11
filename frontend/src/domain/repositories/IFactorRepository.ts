import type { FactorRecord } from '../schemas/factorRecord.schema';

export interface IFactorRepository {
  getFactorById(factorId: string): Promise<FactorRecord | null>;
  listFactors(): Promise<FactorRecord[]>;
  saveFactor(factor: FactorRecord): Promise<FactorRecord>;
}
