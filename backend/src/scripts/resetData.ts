import path from 'path';
import { fileURLToPath } from 'url';
import { 
  FileWasteRecordRepository, 
  FileFactorRepository, 
  FileAnalysisRepository 
} from '../repositories/FileRepositories';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.WASTE2WATT_DATA_DIR || path.join(__dirname, '../../data');

console.log(`[Waste2Watt] Resetting local data in: ${DATA_DIR}`);

const wasteRepo = new FileWasteRecordRepository(DATA_DIR);
const factorRepo = new FileFactorRepository(DATA_DIR);
const analysisRepo = new FileAnalysisRepository(DATA_DIR);

wasteRepo.resetToInitialSeed();
factorRepo.resetToInitialSeed();
analysisRepo.resetToInitialSeed();

console.log('[Waste2Watt] Successfully reset local data to baseline demo records and verified factors.');
