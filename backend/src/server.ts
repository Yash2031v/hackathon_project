import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app';
import { 
  FileWasteRecordRepository, 
  FileFactorRepository, 
  FileAnalysisRepository 
} from './repositories/FileRepositories';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3001', 10);
const DATA_DIR = process.env.WASTE2WATT_DATA_DIR || path.join(__dirname, '../data');

console.log(`[Waste2Watt] Initializing durable local storage in: ${DATA_DIR}`);

const wasteRepo = new FileWasteRecordRepository(DATA_DIR);
const factorRepo = new FileFactorRepository(DATA_DIR);
const analysisRepo = new FileAnalysisRepository(DATA_DIR);

const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map(s => s.trim())
  : undefined;

const app = createApp({
  wasteRepo,
  factorRepo,
  analysisRepo,
  storageType: 'file',
  allowedOrigins,
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Waste2Watt] Local API running at http://127.0.0.1:${PORT}`);
  console.log(`[Waste2Watt] Health check: http://127.0.0.1:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('[Waste2Watt] Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
