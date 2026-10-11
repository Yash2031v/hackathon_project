import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { 
  InMemoryWasteRecordRepository, 
  InMemoryFactorRepository, 
  InMemoryAnalysisRepository 
} from '../../frontend/src/domain/repositories/InMemoryRepositories';

describe('Global Error Handling, Health & Security', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const wasteRepo = new InMemoryWasteRecordRepository();
    const factorRepo = new InMemoryFactorRepository();
    const analysisRepo = new InMemoryAnalysisRepository();
    app = createApp({ 
      wasteRepo, 
      factorRepo, 
      analysisRepo, 
      allowedOrigins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      storageType: 'file',
    });
  });

  describe('GET /health', () => {
    it('returns 200 OK with operational service status and storageType', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.service).toMatch(/Waste2Watt/);
      expect(res.body.storageType).toBe('file');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling Middleware', () => {
    it('returns 400 INVALID_JSON on malformed JSON payload', async () => {
      const res = await request(app)
        .post('/waste-records')
        .set('Content-Type', 'application/json')
        .send('{"siteId": "campus", "brokenJson":') // malformed JSON
        .expect(400);

      expect(res.body.errorCode).toBe('INVALID_JSON');
      expect(res.body.message).toMatch(/Malformed JSON/);
      expect(res.body.timestamp).toBeDefined();
    });

    it('returns 404 NOT_FOUND for unknown routes', async () => {
      const res = await request(app)
        .get('/unknown-route-endpoint')
        .expect(404);

      expect(res.body.errorCode).toBe('NOT_FOUND');
      expect(res.body.message).toMatch(/Route not found/);
    });
  });
});
