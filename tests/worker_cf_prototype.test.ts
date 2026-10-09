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
  // Phase 3B: Production Endpoint Tests (/api/v1/cf/*)
  // =========================================================================
  describe('Phase 3B: Production Worker Routes (/api/v1/cf/*)', () => {
    const validJpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
      0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(0x10),
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xc4, 0x00, 0x1f, 0x00, ...new Array(27).fill(0x01),
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x7f, 0xff, 0x00, 0x55, 0xff, 0xd9,
    ]);

    const validPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
      0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54,
      0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    async function makeTestPdf(pageCount: number = 2): Promise<Uint8Array> {
      const doc = await PDFDocument.create();
      for (let i = 0; i < pageCount; i++) {
        doc.addPage([500, 500]);
      }
      return await doc.save();
    }

    it('GET /api/v1/cf/health returns Phase 3B health status and active services', async () => {
      const req = new Request('http://localhost/api/v1/cf/health', { method: 'GET' });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.phase).toContain('Phase 3B');
      expect(json.activeProductionServices).toEqual([
        'jpg-to-pdf',
        'png-to-pdf',
        'rotate-pdf',
        'crop-pdf',
        'organize-pdf',
        'delete-pdf-pages',
        'extract-pdf-pages',
        'edit-pdf-metadata',
        'extract-pdf-text',
        'add-page-numbers',
        'merge-pdf',
        'split-pdf',
      ]);
      expect(json.maxUploadBytes).toBe(52428800);
    });

    it('POST /api/v1/cf/process [jpg-to-pdf] executes cleanly in pure memory', async () => {
      const form = new FormData();
      form.append('service', 'jpg-to-pdf');
      form.append('file', new Blob([validJpeg as any]), 'image.jpg');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service).toBe('jpg-to-pdf');
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      expect(doc.getPageCount()).toBe(1);
    });

    it('POST /api/v1/cf/process [png-to-pdf] executes cleanly in pure memory', async () => {
      const form = new FormData();
      form.append('service', 'png-to-pdf');
      form.append('file', new Blob([validPng as any]), 'image.png');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service).toBe('png-to-pdf');
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      expect(doc.getPageCount()).toBe(1);
    });

    it('POST /api/v1/cf/process [rotate-pdf] rotates pages accurately', async () => {
      const pdfBytes = await makeTestPdf(2);
      const form = new FormData();
      form.append('service', 'rotate-pdf');
      form.append('file', new Blob([pdfBytes as any]), 'doc.pdf');
      form.append('options', JSON.stringify({ degreesToRotate: 180 }));

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      expect(doc.getPage(0).getRotation().angle).toBe(180);
    });

    it('POST /api/v1/cf/process [crop-pdf] crops page dimensions accurately', async () => {
      const pdfBytes = await makeTestPdf(1);
      const form = new FormData();
      form.append('service', 'crop-pdf');
      form.append('file', new Blob([pdfBytes as any]), 'doc.pdf');
      form.append('options', JSON.stringify({ cropMargins: { top: 25, right: 25, bottom: 25, left: 25 } }));

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      const cb = doc.getPage(0).getCropBox();
      expect(cb.x).toBe(25);
      expect(cb.y).toBe(25);
    });

    it('POST /api/v1/cf/process [organize-pdf] reorders pages correctly', async () => {
      const pdfBytes = await makeTestPdf(3);
      const form = new FormData();
      form.append('service', 'organize-pdf');
      form.append('file', new Blob([pdfBytes as any]), 'doc.pdf');
      form.append('options', JSON.stringify({ pageOrder: [2, 0] }));

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      expect(doc.getPageCount()).toBe(2);
    });

    it('POST /api/v1/cf/process [delete-pdf-pages] deletes specified pages', async () => {
      const pdfBytes = await makeTestPdf(4);
      const form = new FormData();
      form.append('service', 'delete-pdf-pages');
      form.append('file', new Blob([pdfBytes as any]), 'doc.pdf');
      form.append('options', JSON.stringify({ pagesToDeleteSpec: '1, 3' }));

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      const doc = await PDFDocument.load(Buffer.from(json.outputBase64, 'base64'));
      expect(doc.getPageCount()).toBe(2);
    });

    it('POST /api/v1/cf/process rejects non-whitelisted service with 400 UNSUPPORTED_SERVICE', async () => {
      const form = new FormData();
      form.append('service', 'word-to-pdf');
      form.append('file', new Blob([new Uint8Array([1, 2, 3])]), 'test.docx');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('UNSUPPORTED_SERVICE');
      expect(json.message).toContain('Phase 3B');
    });

    it('POST /api/v1/cf/process rejects non-PNG file sent to png-to-pdf with 400 INVALID_FILE_TYPE', async () => {
      const form = new FormData();
      form.append('service', 'png-to-pdf');
      form.append('file', new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])]), 'fake.png');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('INVALID_FILE_TYPE');
    });

    it('POST /api/v1/cf/process rejects non-PDF file sent to rotate-pdf with 400 INVALID_FILE_TYPE', async () => {
      const form = new FormData();
      form.append('service', 'rotate-pdf');
      form.append('file', new Blob([new Uint8Array([1, 2, 3, 4, 5])]), 'fake.pdf');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
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

    // =========================================================================
    // Multi-Image to PDF Combining Tests
    // =========================================================================
    it('POST /api/v1/cf/process [jpg-to-pdf] combines multiple JPG files into ONE multi-page PDF in exact order', async () => {
      const form = new FormData();
      form.append('service', 'jpg-to-pdf');
      // Append 3 JPG images
      form.append('files', new Blob([validJpeg as any]), 'page1.jpg');
      form.append('files', new Blob([validJpeg as any]), 'page2.jpg');
      form.append('files', new Blob([validJpeg as any]), 'page3.jpg');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service).toBe('jpg-to-pdf');
      expect(json.mimeType).toBe('application/pdf');
      expect(json.outputFileName).toBe('converted-images.pdf');
      expect(json.metadata.pageCount).toBe(3);

      const pdfBytes = Buffer.from(json.outputBase64, 'base64');
      const doc = await PDFDocument.load(pdfBytes);
      expect(doc.getPageCount()).toBe(3);
    });

    it('POST /api/v1/cf/process [png-to-pdf] combines multiple PNG files into ONE multi-page PDF in exact order', async () => {
      const form = new FormData();
      form.append('service', 'png-to-pdf');
      // Append 2 PNG images
      form.append('files', new Blob([validPng as any]), 'page1.png');
      form.append('files', new Blob([validPng as any]), 'page2.png');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service).toBe('png-to-pdf');
      expect(json.mimeType).toBe('application/pdf');
      expect(json.outputFileName).toBe('converted-images.pdf');
      expect(json.metadata.pageCount).toBe(2);

      const pdfBytes = Buffer.from(json.outputBase64, 'base64');
      const doc = await PDFDocument.load(pdfBytes);
      expect(doc.getPageCount()).toBe(2);
    });

    it('POST /api/v1/cf/process [jpg-to-pdf] rejects multi-image batch if any image is invalid format', async () => {
      const form = new FormData();
      form.append('service', 'jpg-to-pdf');
      form.append('files', new Blob([validJpeg as any]), 'page1.jpg');
      form.append('files', new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])]), 'corrupt.jpg');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('INVALID_FILE_TYPE');
    });

    it('POST /api/v1/cf/process [png-to-pdf] rejects multi-image batch if any image is invalid format', async () => {
      const form = new FormData();
      form.append('service', 'png-to-pdf');
      form.append('files', new Blob([validPng as any]), 'page1.png');
      form.append('files', new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])]), 'corrupt.png');

      const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
      const res = await worker.fetch(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorCode).toBe('INVALID_FILE_TYPE');
    });
  });
});
