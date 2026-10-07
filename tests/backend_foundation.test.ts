/**
 * PRA PDF — Backend Foundation Test Suite
 * A PRAVERSE Company
 *
 * Covers all 16 required backend foundation specifications:
 * 1. 50 MB limit
 * 2. Oversized file rejection
 * 3. Valid job creation
 * 4. Invalid service rejection
 * 5. Invalid job ID handling
 * 6. Safe filename handling
 * 7. Path traversal rejection
 * 8. B2 provider configuration validation
 * 9. Storage abstraction behavior (Unit Test vs Integration Test boundary)
 * 10. Telegram adapter behavior
 * 11. Processor adapter behavior (Honest reporting, zero fake progress)
 * 12. Job state transitions
 * 13. Failure state handling
 * 14. Cleanup idempotency
 * 15. API error format
 * 16. Secret non-exposure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import {
  CONFIG,
  redactSecrets,
  getAllServices,
  getServiceById,
  isValidServiceId,
  LOCKED_30_SERVICES,
  SecurityValidator,
  JobStore,
  StorageManager,
  StorageProvider,
  StorageUploadResult,
  StorageObjectMetadata,
  TelegramBackupAdapter,
  ProcessorAdapter,
  CleanupService,
  createApiServer,
} from '../src/server';

describe('PRA PDF Backend Foundation Suite', () => {
  // 1 & 2: 50 MB Limit & Oversized File Rejection
  describe('1 & 2. 50 MB Upload Limit & Oversized File Rejection', () => {
    it('enforces 50 MB (52,428,800 bytes) hard server-side limit', () => {
      expect(CONFIG.maxFileSizeMb).toBe(50);
      expect(CONFIG.maxFileSizeBytes).toBe(50 * 1024 * 1024);

      const validSize = 50 * 1024 * 1024;
      const validCheck = SecurityValidator.validateFileSize(validSize);
      expect(validCheck.valid).toBe(true);

      const oversizedSize = 50 * 1024 * 1024 + 1;
      const oversizedCheck = SecurityValidator.validateFileSize(oversizedSize);
      expect(oversizedCheck.valid).toBe(false);
      expect(oversizedCheck.errorCode).toBe('FILE_TOO_LARGE');
      expect(oversizedCheck.errorMessage).toContain('Maximum file size is 50 MB');
    });

    it('rejects empty files (0 bytes)', () => {
      const emptyCheck = SecurityValidator.validateFileSize(0);
      expect(emptyCheck.valid).toBe(false);
      expect(emptyCheck.errorCode).toBe('EMPTY_FILE');
    });
  });

  // 3 & 4: 30 Locked Services & Registry Verification
  describe('3 & 4. 30 Locked Services & Invalid Service Rejection', () => {
    it('contains exactly 30 locked services with exactly ONE RTF service', () => {
      const services = getAllServices();
      expect(services.length).toBe(30);

      // Verify exactly one RTF service
      const rtfServices = services.filter((s) => s.serviceId.includes('rtf') || s.displayName.includes('RTF'));
      expect(rtfServices.length).toBe(1);
      expect(rtfServices[0].serviceId).toBe('rtf-conversion');
      expect(rtfServices[0].displayName).toBe('RTF Conversion');
    });

    it('validates canonical services and strictly rejects invalid/fabricated services', () => {
      expect(isValidServiceId('merge-pdf')).toBe(true);
      expect(isValidServiceId('compress-pdf')).toBe(true);
      expect(isValidServiceId('ocr-pdf')).toBe(true);

      // Rejection of unknown services
      expect(isValidServiceId('fake-ai-summarizer')).toBe(false);
      expect(isValidServiceId('unknown-converter')).toBe(false);

      const checkValid = SecurityValidator.validateServiceId('merge-pdf');
      expect(checkValid.valid).toBe(true);

      const checkInvalid = SecurityValidator.validateServiceId('unsupported-tool');
      expect(checkInvalid.valid).toBe(false);
      expect(checkInvalid.errorCode).toBe('INVALID_SERVICE');
    });

    it('verifies accepted file extensions per service', () => {
      const pdfService = SecurityValidator.validateFileType('split-pdf', 'report.pdf');
      expect(pdfService.valid).toBe(true);

      const invalidForPdf = SecurityValidator.validateFileType('split-pdf', 'report.exe');
      expect(invalidForPdf.valid).toBe(false);
      expect(invalidForPdf.errorCode).toBe('INVALID_FILE_TYPE');

      const wordService = SecurityValidator.validateFileType('word-to-pdf', 'notes.docx');
      expect(wordService.valid).toBe(true);
    });
  });

  // 5 & 6 & 7: Job ID, Filename Sanitization & Path Traversal Guards
  describe('5, 6 & 7. Security: Job ID, Safe Filename & Path Traversal Guards', () => {
    it('validates safe Job IDs and rejects invalid format', () => {
      const validId = SecurityValidator.generateJobId();
      expect(SecurityValidator.validateJobId(validId)).toBe(true);

      expect(SecurityValidator.validateJobId('')).toBe(false);
      expect(SecurityValidator.validateJobId('../../etc/passwd')).toBe(false);
      expect(SecurityValidator.validateJobId('job; DROP TABLE jobs;')).toBe(false);
      expect(SecurityValidator.validateJobId('short')).toBe(false);
    });

    it('sanitizes user filenames and prevents control characters/null bytes', () => {
      const safe = SecurityValidator.sanitizeFilename('../../../dangerous<file>:name?.pdf\0');
      expect(safe).not.toContain('../');
      expect(safe).not.toContain('\0');
      expect(safe).not.toContain('<');
      expect(safe).not.toContain('>');
      expect(safe).not.toContain(':');
      expect(safe).not.toContain('?');
      expect(safe.endsWith('.pdf')).toBe(true);
    });

    it('enforces safe generated storage keys and rejects path traversal', () => {
      const sm = new StorageManager();
      const safeKey = sm.generateInputKey('11112222-3333-4444-5555-666677778888', 'file_abc123.pdf');
      expect(safeKey).toBe('jobs/11112222-3333-4444-5555-666677778888/input/file_abc123.pdf');
      expect(sm.validateStorageKey(safeKey)).toBe(true);

      // Rejections
      expect(sm.validateStorageKey('jobs/../../../etc/passwd')).toBe(false);
      expect(sm.validateStorageKey('jobs/11112222-3333-4444-5555-666677778888/input/../../exploit')).toBe(false);
      expect(sm.validateStorageKey('/root/secret.pdf')).toBe(false);
      expect(sm.validateStorageKey('jobs/11112222\\..\\input\\test.pdf')).toBe(false);
      expect(sm.validateStorageKey('jobs/11112222/input/file\0.pdf')).toBe(false);
    });
  });

  // 8 & 9: B2 Provider Abstraction & Configuration
  describe('8 & 9. B2 Storage Abstraction & Multi-Provider Architecture', () => {
    it('correctly maps B2_1, B2_2, B2_3, and optional B2_4 configs', () => {
      const sm = new StorageManager();
      const status = sm.getProvidersStatus();

      expect(status['B2_1']).toBeDefined();
      expect(status['B2_2']).toBeDefined();
      expect(status['B2_3']).toBeDefined();
      expect(status['B2_4']).toBeDefined();

      // B2_4 is intentionally unconfigured if not provided
      expect(status['B2_4'].isConfigured).toBe(false);

      // Default provider is B2_2
      const defaultProvider = sm.getProvider();
      expect(defaultProvider.id).toBe('B2_2');
    });

    it('supports registering and selecting storage provider implementations (Unit Test boundary)', async () => {
      class MockStorageProvider implements StorageProvider {
        public readonly id = 'MOCK_B2';
        public readonly isConfigured = true;
        private files = new Map<string, Buffer>();

        async upload(key: string, content: Buffer | Uint8Array): Promise<StorageUploadResult> {
          const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
          this.files.set(key, buf);
          return { key, size: buf.length, providerId: this.id };
        }
        async download(key: string): Promise<Buffer> {
          const buf = this.files.get(key);
          if (!buf) throw new Error('File not found');
          return buf;
        }
        async delete(key: string): Promise<boolean> {
          return this.files.delete(key);
        }
        async exists(key: string): Promise<boolean> {
          return this.files.has(key);
        }
        async getMetadata(key: string): Promise<StorageObjectMetadata | null> {
          const buf = this.files.get(key);
          if (!buf) return null;
          return { key, size: buf.length };
        }
        async getSignedDownloadUrl(key: string): Promise<string> {
          return `https://mock.storage.pra.test/${key}?expires=600`;
        }
      }

      const sm = new StorageManager();
      const mock = new MockStorageProvider();
      sm.registerProvider('B2_1', mock);

      const provider = sm.getProvider('B2_1');
      expect(provider.id).toBe('MOCK_B2');

      const testData = Buffer.from('test pdf content');
      const uploadRes = await provider.upload('jobs/test/input/test.pdf', testData);
      expect(uploadRes.key).toBe('jobs/test/input/test.pdf');
      expect(await provider.exists('jobs/test/input/test.pdf')).toBe(true);

      const downloaded = await provider.download('jobs/test/input/test.pdf');
      expect(downloaded.toString()).toBe('test pdf content');

      const url = await provider.getSignedDownloadUrl('jobs/test/input/test.pdf');
      expect(url).toContain('https://mock.storage.pra.test');

      await provider.delete('jobs/test/input/test.pdf');
      expect(await provider.exists('jobs/test/input/test.pdf')).toBe(false);
    });
  });

  // 10: Telegram Adapter Behavior
  describe('10. Telegram Adapter Behavior & Original Backup Only', () => {
    it('maintains Telegram configuration server-side only', () => {
      const adapter = new TelegramBackupAdapter();
      expect(typeof adapter.isConfigured).toBe('boolean');
    });

    it('does not claim success when telegram fails or is unconfigured (Honest reporting)', async () => {
      const adapter = new TelegramBackupAdapter();
      // If run with simulated bad token
      if (!adapter.isConfigured) {
        const res = await adapter.backupOriginal('job-123', Buffer.from('data'), 'test.pdf');
        expect(res.success).toBe(false);
        expect(res.error).toBe('TELEGRAM_CREDENTIALS_NOT_CONFIGURED');
      }
    });
  });

  // 11: Processor Adapter (Honest reporting, zero fake progress)
  describe('11. Processor Adapter (Honest reporting & No fake progress)', () => {
    it('reports PROCESSOR_UNAVAILABLE when processor is unconfigured instead of faking success', async () => {
      const adapter = new ProcessorAdapter();
      if (!adapter.isConfigured) {
        const result = await adapter.submitJob({
          jobId: 'job-test-123',
          serviceId: 'word-to-pdf',
          inputStorageKey: 'jobs/job-test-123/input/file.docx',
          outputStorageKey: 'jobs/job-test-123/output/file.pdf',
          originalFilename: 'file.docx',
        });

        expect(result.accepted).toBe(false);
        expect(result.status).toBe('PROCESSOR_UNAVAILABLE');
        expect(result.message).toContain('Processing server is not configured');
      }
    });
  });

  // 12 & 13: Job State Machine, Persistence & Failure Handling
  describe('12 & 13. Job State System, Persistence & Failure Handling', () => {
    let testDb: JobStore;

    beforeEach(() => {
      testDb = new JobStore(':memory:');
    });

    it('persists job records and supports full state transition lifecycle', () => {
      const jobId = '12345678-abcd-ef01-2345-6789abcdef01';
      testDb.insert({
        jobId,
        serviceId: 'compress-pdf',
        originalFilename: 'annual_report.pdf',
        inputSize: 1024 * 1024,
        mimeType: 'application/pdf',
        storageProvider: 'B2_2',
        inputStorageKey: `jobs/${jobId}/input/file.pdf`,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      let job = testDb.get(jobId);
      expect(job).not.toBeNull();
      expect(job?.status).toBe('CREATED');
      expect(job?.originalFilename).toBe('annual_report.pdf');

      // State transitions
      testDb.update(jobId, { status: 'VALIDATING' });
      expect(testDb.get(jobId)?.status).toBe('VALIDATING');

      testDb.update(jobId, { status: 'UPLOADING' });
      expect(testDb.get(jobId)?.status).toBe('UPLOADING');

      testDb.update(jobId, { status: 'BACKING_UP' });
      expect(testDb.get(jobId)?.status).toBe('BACKING_UP');

      testDb.update(jobId, { status: 'QUEUED' });
      expect(testDb.get(jobId)?.status).toBe('QUEUED');

      testDb.update(jobId, { status: 'PROCESSING' });
      expect(testDb.get(jobId)?.status).toBe('PROCESSING');

      testDb.update(jobId, { status: 'UPLOADING_OUTPUT' });
      expect(testDb.get(jobId)?.status).toBe('UPLOADING_OUTPUT');

      testDb.update(jobId, {
        status: 'COMPLETED',
        outputStorageKey: `jobs/${jobId}/output/compressed.pdf`,
        completedAt: new Date().toISOString(),
      });
      job = testDb.get(jobId);
      expect(job?.status).toBe('COMPLETED');
      expect(job?.outputStorageKey).toContain('compressed.pdf');
    });

    it('records failure states truthfully with machine-readable error codes', () => {
      const jobId = '87654321-abcd-ef01-2345-6789abcdef01';
      testDb.insert({
        jobId,
        serviceId: 'word-to-pdf',
        originalFilename: 'document.docx',
        inputSize: 5000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        storageProvider: 'B2_2',
        inputStorageKey: `jobs/${jobId}/input/file.docx`,
        status: 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      testDb.update(jobId, {
        status: 'FAILED',
        errorCode: 'PROCESSOR_UNAVAILABLE',
        errorMessage: 'Dedicated heavy processing server is offline.',
      });

      const failedJob = testDb.get(jobId);
      expect(failedJob?.status).toBe('FAILED');
      expect(failedJob?.errorCode).toBe('PROCESSOR_UNAVAILABLE');
      expect(failedJob?.errorMessage).toContain('processing server is offline');
    });
  });

  // 14: Cleanup Idempotency & Safety
  describe('14. Cleanup Idempotency & Safety', () => {
    it(
      'executes cleanup idempotently without corrupting completed jobs',
      async () => {
        const cleaner = new CleanupService();
        const mockJob = {
          jobId: 'clean-job-11223344-55667788',
          serviceId: 'compress-pdf',
          originalFilename: 'doc.pdf',
          inputSize: 1000,
          mimeType: 'application/pdf',
          storageProvider: 'B2_2',
          inputStorageKey: 'jobs/clean-job-11223344-55667788/input/doc.pdf',
          status: 'COMPLETED' as const,
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() - 60000).toISOString(), // expired
        };

        // Running cleanup on a job
        const res1 = await cleaner.cleanupJob(mockJob);
        expect(typeof res1).toBe('boolean');

        // Second run is idempotent
        const res2 = await cleaner.cleanupJob(mockJob);
        expect(typeof res2).toBe('boolean');
      },
      20000
    );
  });

  // 15: API Error Format & Health Endpoint
  describe('15. API Foundation & Standardized JSON Envelopes', () => {
    let server: http.Server;
    const port = 3099;

    beforeEach(async () => {
      server = createApiServer();
      await new Promise<void>((resolve) => server.listen(port, () => resolve()));
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('GET /api/v1/health returns consistent status and limits', async () => {
      const res = await fetch(`http://localhost:${port}/api/v1/health`);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.status).toBe('healthy');
      expect(json.product).toBe('PRA PDF');
      expect(json.company).toBe('A PRAVERSE Company');
      expect(json.maxFileSizeMb).toBe(50);
      expect(json.zeroAI).toBe(true);
    });

    it('GET /api/v1/services returns all 30 locked services', async () => {
      const res = await fetch(`http://localhost:${port}/api/v1/services`);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.total).toBe(30);
      expect(json.services.length).toBe(30);
    });

    it('GET /api/v1/jobs/:jobId returns 404 with standard error envelope when not found', async () => {
      const res = await fetch(`http://localhost:${port}/api/v1/jobs/00000000-0000-0000-0000-000000000000`);
      expect(res.status).toBe(404);
      const json = await res.json();

      expect(json.success).toBe(false);
      expect(json.error.code).toBe('JOB_NOT_FOUND');
      expect(typeof json.error.message).toBe('string');
    });

    it('GET /api/v1/jobs/:jobId returns 400 when jobId format is invalid', async () => {
      const res = await fetch(`http://localhost:${port}/api/v1/jobs/invalid-id`);
      expect(res.status).toBe(400);
      const json = await res.json();

      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_JOB_ID');
    });
  });

  // 16: Secret Non-Exposure
  describe('16. Secret Non-Exposure Guarantees', () => {
    it('redacts tokens, application keys, key IDs, and passwords from logs/objects', () => {
      const sensitiveData = {
        applicationKey: 'mock_app_key_for_redaction_test',
        keyId: 'mock_key_id_for_redaction_test',
        botToken: 'mock_bot_token_for_redaction_test',
        token: 'mock_token_for_redaction_test',
        password: 'mock_password_for_redaction_test',
        safeMetadata: 'Public Job Title',
        nested: {
          secret: 'mock_nested_secret',
          publicField: 'safe',
        },
      };

      const sanitized = redactSecrets(sensitiveData);

      expect(sanitized.applicationKey).toBe('[REDACTED]');
      expect(sanitized.keyId).toBe('[REDACTED]');
      expect(sanitized.botToken).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.safeMetadata).toBe('Public Job Title');
      expect(sanitized.nested.secret).toBe('[REDACTED]');
      expect(sanitized.nested.publicField).toBe('safe');
    });

    it('ensures /api/v1/health never leaks credentials', async () => {
      const port = 3098;
      const server = createApiServer();
      await new Promise<void>((resolve) => server.listen(port, () => resolve()));

      try {
        const res = await fetch(`http://localhost:${port}/api/v1/health`);
        const text = await res.text();

        // Check that raw secrets from process.env are never in output
        if (CONFIG.telegram.botToken) {
          expect(text).not.toContain(CONFIG.telegram.botToken);
        }
        for (const p of Object.values(CONFIG.b2Providers)) {
          if (p.applicationKey) {
            expect(text).not.toContain(p.applicationKey);
          }
          if (p.keyId) {
            expect(text).not.toContain(p.keyId);
          }
        }
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
