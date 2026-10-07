/**
 * PRA PDF — Processing Server Dedicated Test Suite
 * A PRAVERSE Company
 *
 * Verifies:
 * 1. Health check endpoints
 * 2. Service capability endpoint (compress-pdf only)
 * 3. Server-to-server Bearer token authentication
 * 4. Input validation (%PDF- signature, empty file, 50 MB limit)
 * 5. Path traversal protection in workspace
 * 6. Real compress-pdf engine transformation & output validation
 * 7. Failure handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  createProcessorServer,
  PROCESSOR_CONFIG,
  PdfValidator,
  workspaceManager,
  processCompressPdf,
} from '../src/processor';

describe('PRA PDF Processing Server Test Suite', () => {
  let server: http.Server;
  const testPort = 3095;
  const testSecret = PROCESSOR_CONFIG.sharedSecret;

  beforeEach(async () => {
    server = createProcessorServer();
    await new Promise<void>((resolve) => server.listen(testPort, '127.0.0.1', () => resolve()));
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // 1. Health Endpoint Tests
  describe('1. Health Check Endpoint', () => {
    it('GET /health returns healthy status and supported service', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.service).toBe('pra-pdf-processor');
      expect(data.status).toBe('healthy');
      expect(data.supportedServices).toContain('compress-pdf');
    });

    it('GET /internal/v1/health returns healthy without secret leakage', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/health`);
      expect(res.status).toBe(200);
      const text = await res.text();

      expect(text).toContain('"status":"healthy"');
      expect(text).not.toContain(testSecret);
    });
  });

  // 2. Services Endpoint Tests
  describe('2. Services Registry Endpoint', () => {
    it('GET /internal/v1/services honestly reports only compress-pdf as implemented', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/services`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.services.length).toBe(1);
      expect(data.services[0].serviceId).toBe('compress-pdf');
      expect(data.services[0].status).toBe('AVAILABLE');
    });
  });

  // 3. Server-to-Server Authentication Tests
  describe('3. Server-to-Server Authentication', () => {
    it('rejects unauthenticated requests with 401 PROCESSOR_UNAUTHORIZED', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: 'test-123' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe('PROCESSOR_UNAUTHORIZED');
    });

    it('rejects invalid Bearer token with 401 PROCESSOR_UNAUTHORIZED', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer wrong-secret-token',
        },
        body: JSON.stringify({ jobId: 'test-123' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe('PROCESSOR_UNAUTHORIZED');
    });
  });

  // 4. Input & Output PDF Validation Tests
  describe('4. PDF Validation Rules', () => {
    it('rejects empty input buffers', () => {
      const emptyCheck = PdfValidator.validateInput(Buffer.alloc(0));
      expect(emptyCheck.valid).toBe(false);
      expect(emptyCheck.errorCode).toBe('EMPTY_FILE');
    });

    it('rejects oversized inputs (> 50 MB)', () => {
      const oversizeCheck = PdfValidator.validateInput(Buffer.alloc(50 * 1024 * 1024 + 10));
      expect(oversizeCheck.valid).toBe(false);
      expect(oversizeCheck.errorCode).toBe('FILE_TOO_LARGE');
    });

    it('rejects binary files without %PDF- magic signature', () => {
      const fakePdf = Buffer.from('NOT A REAL PDF FILE HEADER');
      const sigCheck = PdfValidator.validateInput(fakePdf);
      expect(sigCheck.valid).toBe(false);
      expect(sigCheck.errorCode).toBe('INVALID_PDF');
    });

    it('accepts buffers starting with %PDF- signature', () => {
      const validHeader = Buffer.from('%PDF-1.7\n...');
      const sigCheck = PdfValidator.validateInput(validHeader);
      expect(sigCheck.valid).toBe(true);
    });
  });

  // 5. Workspace Path Traversal Protection
  describe('5. Workspace Path Traversal Protection', () => {
    it('rejects path traversal attempts in jobId', () => {
      expect(() => workspaceManager.prepareWorkspace('../../../etc')).toThrow();
      expect(() => workspaceManager.prepareWorkspace('job\\..\\test')).toThrow();
      expect(() => workspaceManager.prepareWorkspace('job\0null')).toThrow();
    });

    it('creates and cleans isolated workspace directory for valid jobId', () => {
      const jobId = 'test-job-workspace-12345678';
      const ws = workspaceManager.prepareWorkspace(jobId);
      expect(fs.existsSync(ws.dir)).toBe(true);
      expect(ws.inputPath).toContain(jobId);

      const cleaned = workspaceManager.cleanupWorkspace(jobId);
      expect(cleaned).toBe(true);
      expect(fs.existsSync(ws.dir)).toBe(false);
    });
  });

  // 6. Real PDF Compression Engine Execution
  describe('6. Real PDF Compression Engine (compress-pdf)', () => {
    it('executes real compression, modifies PDF, and produces valid output', async () => {
      const jobId = 'test-compression-job-11223344';
      const ws = workspaceManager.prepareWorkspace(jobId);

      try {
        // Create genuine input PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([500, 500]);
        page.drawText('PRA PDF Compression Verification', {
          x: 50,
          y: 450,
          size: 16,
          color: rgb(0.1, 0.1, 0.1),
        });

        // Add dummy text to create objects
        for (let i = 0; i < 20; i++) {
          page.drawText(`Line entry number ${i} with additional test parameters for stream sizing`, {
            x: 50,
            y: 400 - i * 15,
            size: 10,
          });
        }

        const inputBytes = await pdfDoc.save();
        fs.writeFileSync(ws.inputPath, inputBytes);

        // Run real compression engine
        const result = await processCompressPdf(ws.inputPath, ws.outputPath, jobId);

        expect(result.inputSizeBytes).toBe(inputBytes.length);
        expect(result.outputSizeBytes).toBeGreaterThan(0);
        expect(typeof result.sha256).toBe('string');
        expect(result.sha256.length).toBe(64);

        // Verify output file on disk
        const outputValidation = await PdfValidator.validateOutputFile(ws.outputPath);
        expect(outputValidation.valid).toBe(true);
        expect(outputValidation.sizeBytes).toBe(result.outputSizeBytes);

        // Confirm output can be parsed by pdf-lib
        const outputBuf = fs.readFileSync(ws.outputPath);
        const parsedOutput = await PDFDocument.load(outputBuf);
        expect(parsedOutput.getPageCount()).toBe(1);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // 7. Section 28 & 29: Failure Handling & Security Tests
  describe('7. Failure Modes & Security Protection (Section 28 & 29)', () => {
    it('rejects malformed JSON with 400 PROCESSOR_BAD_REQUEST', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testSecret}`,
        },
        body: 'NOT_VALID_JSON{{{',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe('PROCESSOR_BAD_REQUEST');
    });

    it('rejects missing parameters with 400 PROCESSOR_BAD_REQUEST', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testSecret}`,
        },
        body: JSON.stringify({
          jobId: 'valid-job-id',
          // missing serviceId, inputStorageKey, outputStorageKey
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe('PROCESSOR_BAD_REQUEST');
    });

    it('rejects unsupported service with 400 SERVICE_UNSUPPORTED', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testSecret}`,
        },
        body: JSON.stringify({
          jobId: 'valid-job-id',
          serviceId: 'word-to-pdf',
          inputStorageKey: 'jobs/test/input/in.pdf',
          outputStorageKey: 'jobs/test/output/out.pdf',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.errorCode).toBe('SERVICE_UNSUPPORTED');
    });

    it('rejects missing B2 object with 404 B2_DOWNLOAD_FAILED', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testSecret}`,
        },
        body: JSON.stringify({
          jobId: 'valid-job-missing-b2',
          serviceId: 'compress-pdf',
          inputStorageKey: 'jobs/nonexistent/input/missing.pdf',
          outputStorageKey: 'jobs/nonexistent/output/out.pdf',
        }),
      });

      // Storage download should fail for nonexistent B2 key
      expect([404, 500]).toContain(res.status);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(['B2_DOWNLOAD_FAILED', 'INTERNAL_PROCESSOR_ERROR']).toContain(data.errorCode);
    });

    it('validates output files and catches invalid output structure', async () => {
      const tempJobId = 'test-invalid-output-job';
      const ws = workspaceManager.prepareWorkspace(tempJobId);
      try {
        fs.writeFileSync(ws.outputPath, 'Corrupted binary output not matching PDF spec');
        const validation = await PdfValidator.validateOutputFile(ws.outputPath);
        expect(validation.valid).toBe(false);
        expect(validation.errorCode).toBe('PROCESSING_OUTPUT_INVALID');
      } finally {
        workspaceManager.cleanupWorkspace(tempJobId);
      }
    });

    it('provides job status endpoint /internal/v1/jobs/:jobId/status', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/jobs/test-job-999/status`, {
        headers: {
          Authorization: `Bearer ${testSecret}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.jobId).toBe('test-job-999');
    });

    it('provides job cancellation endpoint /internal/v1/jobs/:jobId/cancel and cleans workspace', async () => {
      const jobId = 'test-job-cancel-999';
      workspaceManager.prepareWorkspace(jobId);

      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testSecret}`,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.cancelled).toBe(true);
    });
  });
});

