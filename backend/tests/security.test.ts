import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../src/app';
import {
  FileWasteRecordRepository,
  FileFactorRepository,
  FileAnalysisRepository,
  resolveSafeDataPath,
  FileStorageError,
} from '../src/repositories/FileRepositories';

describe('Security Hardening & Persistence Defenses', () => {
  let tempDir: string;
  let wasteRepo: FileWasteRecordRepository;
  let factorRepo: FileFactorRepository;
  let analysisRepo: FileAnalysisRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'w2w-sec-test-'));
    wasteRepo = new FileWasteRecordRepository(tempDir);
    factorRepo = new FileFactorRepository(tempDir);
    analysisRepo = new FileAnalysisRepository(tempDir);
    app = createApp({
      wasteRepo,
      factorRepo,
      analysisRepo,
      storageType: 'file',
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Path Traversal Defense in Persistence Layer', () => {
    it('rejects filenames containing relative directory traversal sequences (../)', () => {
      expect(() => {
        resolveSafeDataPath(tempDir, '../etc/passwd');
      }).toThrow(FileStorageError);

      expect(() => {
        resolveSafeDataPath(tempDir, '..\\windows\\system32');
      }).toThrow(FileStorageError);
    });

    it('rejects filenames containing slashes or subpath navigation', () => {
      expect(() => {
        resolveSafeDataPath(tempDir, 'sub/folder/file.json');
      }).toThrow(FileStorageError);

      expect(() => {
        resolveSafeDataPath(tempDir, 'sub\\folder\\file.json');
      }).toThrow(FileStorageError);
    });

    it('resolves safe, canonical filenames strictly within base directory', () => {
      const safePath = resolveSafeDataPath(tempDir, 'records.json');
      expect(safePath).toContain('records.json');
      expect(safePath.startsWith(path.resolve(tempDir))).toBe(true);
    });
  });

  describe('Corrupted File Recovery', () => {
    it('backs up corrupted JSON file and recovers with default records without crashing', async () => {
      const recordsPath = path.join(tempDir, 'records.json');
      // Intentionally corrupt the file on disk
      fs.writeFileSync(recordsPath, '{ malformed: json truncated', 'utf-8');

      // Instantiating repository should catch the corruption, create backup, and recover safely
      const recoveredRepo = new FileWasteRecordRepository(tempDir);
      const res = await recoveredRepo.getRecordById('any-id');
      expect(res).toBeNull();

      // Verify a .bak backup file was created
      const files = fs.readdirSync(tempDir);
      const backupFound = files.some(f => f.includes('records.json.corrupted'));
      expect(backupFound).toBe(true);
    });
  });

  describe('Request Body Limits & Error Stack Leakage', () => {
    it('rejects oversized JSON payload exceeding 1MB with 413 Payload Too Large', async () => {
      // Generate a string exceeding 1MB
      const hugeString = 'X'.repeat(1024 * 1024 * 1.2);

      const res = await request(app)
        .post('/waste-records')
        .send({ huge: hugeString })
        .expect(413);

      expect(res.status).toBe(413);
    });

    it('ensures API errors never expose internal stack traces or filesystem paths', async () => {
      const res = await request(app)
        .post('/waste-records')
        .send({ invalid: 'data' })
        .expect(400);

      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.requestId).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
      // Ensure stack trace property is strictly undefined
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('CSV Export Route with Formula Injection Neutralization', () => {
    it('exports CSV and neutralizes formula injection cells', async () => {
      // Create a record with a weaponized formula in field notes
      await wasteRepo.createRecord({
        id: 'rec-formula-1',
        siteId: 'site-campus-sec',
        date: '2026-03-25',
        source: 'canteen_kitchen',
        category: 'prepared_food',
        massKg: 400,
        massUnit: 'kg',
        contamination: 'clean',
        provenance: 'measured',
        createdAt: '2026-03-25T10:00:00Z',
        notes: '=cmd|"/C calc"!A0',
      });

      const res = await request(app)
        .get('/waste-records/export/csv?siteId=site-campus-sec')
        .expect(200);

      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.text).toContain('"Record ID","Site ID"');
      // Formula must be neutralized with leading single quote
      expect(res.text).toContain("\"'=cmd|\"\"/C calc\"\"!A0\"");
    });
  });

  describe('Defensive HTTP Security Headers', () => {
    it('enforces defensive security headers on all responses', async () => {
      const res = await request(app).get('/health').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('X-Request-Id Sanitization & CRLF Defense', () => {
    it('preserves valid alphanumeric request IDs', async () => {
      const res = await request(app)
        .get('/health')
        .set('X-Request-Id', 'client-trace-123_abc')
        .expect(200);

      expect(res.headers['x-request-id']).toBe('client-trace-123_abc');
    });

    it('sanitizes and replaces unsafe request IDs with malicious special characters', async () => {
      const res = await request(app)
        .get('/health')
        .set('X-Request-Id', 'malicious;InjectedHeader=evil<script>')
        .expect(200);

      expect(res.headers['x-request-id']).not.toContain('evil');
      expect(res.headers['x-request-id']).not.toContain('<script>');
      expect(res.headers['x-request-id'].startsWith('req-')).toBe(true);
    });
  });

  describe('In-Memory Rate Limiting & Abuse Prevention', () => {
    it('returns 429 Too Many Requests when request threshold is exceeded', async () => {
      const rateLimitedApp = createApp({
        wasteRepo,
        factorRepo,
        analysisRepo,
        storageType: 'memory',
        rateLimiterOptions: {
          windowMs: 10_000,
          maxRequests: 3,
          disabled: false,
        },
      });

      // Requests 1-3 should succeed
      await request(rateLimitedApp).get('/health').expect(200);
      await request(rateLimitedApp).get('/health').expect(200);
      await request(rateLimitedApp).get('/health').expect(200);

      // Request 4 should be rejected with 429
      const res = await request(rateLimitedApp).get('/health').expect(429);
      expect(res.body.errorCode).toBe('TOO_MANY_REQUESTS');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
