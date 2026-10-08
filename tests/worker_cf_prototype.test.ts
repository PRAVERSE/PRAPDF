/**
 * PRA PDF — Cloudflare Worker Processing Prototype Test Suite
 * A PRAVERSE Company
 * Tests the Worker entrypoint (/api/cf-test/*) directly in the test runner.
 */

import { describe, it, expect } from 'vitest';
import worker from '../src/worker/index';
import { PDFDocument, rgb } from 'pdf-lib';
import JSZip from 'jszip';

describe('PRA PDF — Cloudflare Worker Phase 1 Prototype Suite', () => {
  it('GET /api/cf-test/health returns healthy status and supported services', async () => {
    const req = new Request('http://localhost/api/cf-test/health', { method: 'GET' });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.supportedServices).toContain('jpg-to-pdf');
    expect(data.supportedServices).toContain('merge-pdf');
    expect(data.supportedServices).toContain('split-pdf');
    expect(data.supportedServices).toContain('compress-pdf');
    expect(data.supportedServices).toContain('word-to-pdf');
    expect(data.supportedServices).toContain('pdf-to-word');
    expect(data.supportedServices).toContain('watermark-pdf');
    expect(data.supportedServices).toContain('full-pdf-editing');
  });

  it('POST /api/cf-test/process executes jpg-to-pdf via FormData in pure memory', async () => {
    // Generate valid 1x1 JPEG buffer
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(0x10),
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xc4, 0x00, 0x1f, 0x00, ...new Array(27).fill(0x01),
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x7f, 0xff, 0x00, 0x55, 0xff, 0xd9,
    ]);

    const form = new FormData();
    form.append('service', 'jpg-to-pdf');
    form.append('file', new Blob([jpegBytes as any]), 'sample.jpg');

    const req = new Request('http://localhost/api/cf-test/process', {
      method: 'POST',
      body: form,
    });

    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.service).toBe('jpg-to-pdf');
    expect(data.outputSizeBytes).toBeGreaterThan(0);
    expect(data.metadata.pageCount).toBe(1);

    const pdfBuffer = Buffer.from(data.outputBase64, 'base64');
    const doc = await PDFDocument.load(pdfBuffer);
    expect(doc.getPageCount()).toBe(1);
  });

  it('POST /api/cf-test/process executes watermark-pdf strictly adhering to zero PRA branding', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([500, 500]);
    page.drawText('Original content');
    const pdfBytes = await doc.save();

    const form = new FormData();
    form.append('service', 'watermark-pdf');
    form.append('file', new Blob([pdfBytes as any]), 'doc.pdf');
    form.append('options', JSON.stringify({ text: 'STRICTLY PRIVATE', opacity: 0.3 }));

    const req = new Request('http://localhost/api/cf-test/process', {
      method: 'POST',
      body: form,
    });

    const res = await worker.fetch(req, {});
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.metadata.watermarkText).toBe('STRICTLY PRIVATE');

    const resultPdf = Buffer.from(data.outputBase64, 'base64');
    const loaded = await PDFDocument.load(resultPdf);
    expect(loaded.getPageCount()).toBe(1);
  });

  it('POST /api/cf-test/process rejects unsupported service cleanly with 400', async () => {
    const form = new FormData();
    form.append('service', 'unsupported-service-xyz');
    form.append('file', new Blob([new Uint8Array([1, 2, 3])]), 'test.dat');

    const req = new Request('http://localhost/api/cf-test/process', {
      method: 'POST',
      body: form,
    });

    const res = await worker.fetch(req, {});
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('UNSUPPORTED_SERVICE');
  });

  // =========================================================================
  // Phase 3A: Production Endpoint Tests (/api/v1/cf/*)
  // =========================================================================
  describe('Phase 3A: Production Worker Routes (/api/v1/cf/*)', () => {
    const validJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(0x10),
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xc4, 0x00, 0x1f, 0x00, ...new Array(27).fill(0x01),
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x7f, 0xff, 0x00, 0x55, 0xff, 0xd9,
    ]);

    it('GET /api/v1/cf/health returns production health status', async () => {
      const req = new Request('http://localhost/api/v1/cf/health', { method: 'GET' });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.phase).toContain('Phase 3A');
      expect(json.activeProductionServices).toEqual(['jpg-to-pdf']);
      expect(json.maxUploadBytes).toBe(52428800);
    });

    it('POST /api/v1/cf/process converts JPEG to valid PDF in pure memory', async () => {
      const form = new FormData();
      form.append('service', 'jpg-to-pdf');
      form.append('file', new Blob([validJpeg as any]), 'image.jpg');

      const req = new Request('http://localhost/api/v1/cf/process', {
        method: 'POST',
        body: form,
      });

      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service).toBe('jpg-to-pdf');
      expect(json.mimeType).toBe('application/pdf');
      expect(json.outputFileName).toBe('converted.pdf');
      expect(json.metadata.pageCount).toBe(1);

      const pdfBytes = Buffer.from(json.outputBase64, 'base64');
      const doc = await PDFDocument.load(pdfBytes);
      expect(doc.getPageCount()).toBe(1);
    });

    it('POST /api/v1/cf/process rejects any service other than jpg-to-pdf with 400 UNSUPPORTED_SERVICE', async () => {
      const form = new FormData();
      form.append('service', 'merge-pdf');
      form.append('file', new Blob([new Uint8Array([1, 2, 3])]), 'test.pdf');

      const req = new Request('http://localhost/api/v1/cf/process', {
        method: 'POST',
        body: form,
      });

      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('UNSUPPORTED_SERVICE');
      expect(json.message).toContain('Only \'jpg-to-pdf\' is active');
    });

    it('POST /api/v1/cf/process rejects non-JPEG file with 400 INVALID_FILE_TYPE', async () => {
      const form = new FormData();
      form.append('service', 'jpg-to-pdf');
      form.append('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]), 'fake.jpg');

      const req = new Request('http://localhost/api/v1/cf/process', {
        method: 'POST',
        body: form,
      });

      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('INVALID_FILE_TYPE');
    });

    it('POST /api/v1/cf/process rejects payload exceeding 50 MB with 413 PAYLOAD_TOO_LARGE', async () => {
      const req = new Request('http://localhost/api/v1/cf/process', {
        method: 'POST',
        headers: {
          'content-length': '55000000',
          'content-type': 'multipart/form-data; boundary=test',
        },
        body: 'dummy',
      });

      const res = await worker.fetch(req, {});
      expect(res.status).toBe(413);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});
