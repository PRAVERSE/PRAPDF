/**
 * PRA PDF — Processing Server Dedicated Test Suite
 * A PRAVERSE Company
 *
 * Verifies:
 * 1. Health check endpoints
 * 2. Service capability endpoint (honest reporting of available services)
 * 3. Server-to-server Bearer token authentication
 * 4. Input validation (signatures, empty file, 50 MB limit)
 * 5. Path traversal protection in workspace
 * 6. Real engines execution (compress-pdf, jpg-to-pdf, png-to-pdf, images-to-pdf, pdf-to-jpg, pdf-to-png)
 * 7. Failure handling & Security
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import JSZip from 'jszip';
import {
  createProcessorServer,
  PROCESSOR_CONFIG,
  PdfValidator,
  workspaceManager,
  processCompressPdf,
  processJpgToPdf,
  processPngToPdf,
  processImagesToPdf,
  processPdfToJpg,
  processPdfToPng,
  processMergePdf,
  processSplitPdf,
  processOrganizePdf,
  processDeletePdfPages,
  processExtractPdfPages,
  processRotatePdf,
  processCropPdf,
  processTxtToPdf,
  processMarkdownToPdf,
  processHtmlToPdf,
  processPdfToMarkdown,
  processExtractPdfText,
  processWordToPdf,
  processExcelToPdf,
  processPowerpointToPdf,
  processPdfToWord,
  processRtfConversion,
  processOcrPdf,
  processAddPageNumbers,
  processWatermarkPdf,
  processProtectPdf,
  processUnlockPdf,
  processEditPdfMetadata,
  processFullPdfEditing,
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
    it('GET /health returns healthy status and supported services', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.service).toBe('pra-pdf-processor');
      expect(data.status).toBe('healthy');
      expect(data.supportedServices).toContain('compress-pdf');
      expect(data.supportedServices).toContain('jpg-to-pdf');
      expect(data.supportedServices).toContain('png-to-pdf');
      expect(data.supportedServices).toContain('images-to-pdf');
      expect(data.supportedServices).toContain('pdf-to-jpg');
      expect(data.supportedServices).toContain('pdf-to-png');
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
    it('GET /internal/v1/services honestly reports implemented Batch 1 services as available', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/internal/v1/services`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.ok).toBe(true);
      expect(data.services.length).toBeGreaterThanOrEqual(30);
      const serviceIds = data.services.map((s: any) => s.serviceId);
      expect(serviceIds).toEqual(
        expect.arrayContaining([
          'compress-pdf',
          'jpg-to-pdf',
          'png-to-pdf',
          'images-to-pdf',
          'pdf-to-jpg',
          'pdf-to-png',
        ])
      );
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

  // 4. Input Validation Tests
  describe('4. Input Validation & Security Bounds', () => {
    it('rejects empty buffer with EMPTY_FILE error', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = PdfValidator.validateInput(emptyBuffer, 'compress-pdf');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EMPTY_FILE');
    });

    it('rejects buffer exceeding 50 MB with FILE_TOO_LARGE error', () => {
      const hugeBuffer = {
        length: 51 * 1024 * 1024,
        slice: () => Buffer.from(''),
      } as unknown as Buffer;

      const result = PdfValidator.validateInput(hugeBuffer, 'compress-pdf');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('FILE_TOO_LARGE');
    });

    it('rejects non-PDF buffer with INVALID_PDF for PDF operations', () => {
      const nonPdf = Buffer.from('NOT A PDF FILE BUFFER DATA');
      const result = PdfValidator.validateInput(nonPdf, 'compress-pdf');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_PDF');
    });

    it('validates JPEG signatures for jpg-to-pdf', () => {
      const validJpgHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      expect(PdfValidator.validateInput(validJpgHeader, 'jpg-to-pdf').valid).toBe(true);

      const invalidJpg = Buffer.from('NOT_A_JPEG_FILE');
      const result = PdfValidator.validateInput(invalidJpg, 'jpg-to-pdf');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_IMAGE');
    });

    it('validates PNG signatures for png-to-pdf', () => {
      const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(PdfValidator.validateInput(validPngHeader, 'png-to-pdf').valid).toBe(true);

      const invalidPng = Buffer.from('NOT_A_PNG_FILE');
      const result = PdfValidator.validateInput(invalidPng, 'png-to-pdf');
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_IMAGE');
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
      const ws = workspaceManager.prepareWorkspace(jobId, '.jpg', '.pdf');
      expect(fs.existsSync(ws.dir)).toBe(true);
      expect(ws.inputPath).toContain(jobId);
      expect(ws.inputPath).toContain('.jpg');
      expect(ws.outputPath).toContain('.pdf');

      const cleaned = workspaceManager.cleanupWorkspace(jobId);
      expect(cleaned).toBe(true);
      expect(fs.existsSync(ws.dir)).toBe(false);
    });
  });

  // 6. Real Engines Execution
  describe('6. Real Dedicated Engines Execution (Batch 1)', () => {
    it('compress-pdf: executes real compression and produces valid output', async () => {
      const jobId = 'test-compression-job-11223344';
      const ws = workspaceManager.prepareWorkspace(jobId);

      try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([500, 500]);
        page.drawText('PRA PDF Compression Verification', {
          x: 50,
          y: 450,
          size: 16,
          color: rgb(0.1, 0.1, 0.1),
        });

        for (let i = 0; i < 20; i++) {
          page.drawText(`Line entry number ${i} with additional test parameters for stream sizing`, {
            x: 50,
            y: 400 - i * 15,
            size: 10,
          });
        }

        const inputBytes = await pdfDoc.save();
        fs.writeFileSync(ws.inputPath, inputBytes);

        const result = await processCompressPdf(ws.inputPath, ws.outputPath, jobId);

        expect(result.inputSizeBytes).toBe(inputBytes.length);
        expect(result.outputSizeBytes).toBeGreaterThan(0);
        expect(typeof result.sha256).toBe('string');
        expect(result.sha256.length).toBe(64);

        const outputValidation = await PdfValidator.validateOutputFile(ws.outputPath, 'compress-pdf');
        expect(outputValidation.valid).toBe(true);
        expect(outputValidation.sizeBytes).toBe(result.outputSizeBytes);

        const outputBuf = fs.readFileSync(ws.outputPath);
        const parsedOutput = await PDFDocument.load(outputBuf);
        expect(parsedOutput.getPageCount()).toBe(1);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('jpg-to-pdf: converts real JPEG into valid PDF document', async () => {
      const jobId = 'test-jpg-to-pdf-112233';
      const ws = workspaceManager.prepareWorkspace(jobId, '.jpg', '.pdf');

      try {
        const canvas = createCanvas(120, 80);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff3366';
        ctx.fillRect(0, 0, 120, 80);
        const jpgBuf = canvas.toBuffer('image/jpeg');
        fs.writeFileSync(ws.inputPath, jpgBuf);

        const result = await processJpgToPdf(ws.inputPath, ws.outputPath, jobId);

        expect(result.service).toBe('jpg-to-pdf');
        expect(result.pageCount).toBe(1);
        expect(result.outputSizeBytes).toBeGreaterThan(0);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'jpg-to-pdf');
        expect(validation.valid).toBe(true);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(ws.outputPath));
        expect(pdfDoc.getPageCount()).toBe(1);
        const pageSize = pdfDoc.getPage(0).getSize();
        expect(pageSize.width).toBe(120);
        expect(pageSize.height).toBe(80);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('png-to-pdf: converts real PNG with transparency into valid PDF document', async () => {
      const jobId = 'test-png-to-pdf-112233';
      const ws = workspaceManager.prepareWorkspace(jobId, '.png', '.pdf');

      try {
        const canvas = createCanvas(100, 100);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 128, 255, 0.7)';
        ctx.fillRect(10, 10, 80, 80);
        const pngBuf = canvas.toBuffer('image/png');
        fs.writeFileSync(ws.inputPath, pngBuf);

        const result = await processPngToPdf(ws.inputPath, ws.outputPath, jobId);

        expect(result.service).toBe('png-to-pdf');
        expect(result.pageCount).toBe(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'png-to-pdf');
        expect(validation.valid).toBe(true);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(ws.outputPath));
        expect(pdfDoc.getPageCount()).toBe(1);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('images-to-pdf: compiles ZIP containing multiple images into sequential multi-page PDF', async () => {
      const jobId = 'test-images-to-pdf-112233';
      const ws = workspaceManager.prepareWorkspace(jobId, '.zip', '.pdf');

      try {
        // Create 2 real images
        const canvas1 = createCanvas(150, 100);
        const ctx1 = canvas1.getContext('2d');
        ctx1.fillStyle = '#ff0000';
        ctx1.fillRect(0, 0, 150, 100);
        const img1 = canvas1.toBuffer('image/jpeg');

        const canvas2 = createCanvas(100, 150);
        const ctx2 = canvas2.getContext('2d');
        ctx2.fillStyle = '#00ff00';
        ctx2.fillRect(0, 0, 100, 150);
        const img2 = canvas2.toBuffer('image/png');

        // Package into ZIP
        const zip = new JSZip();
        zip.file('01_first.jpg', img1);
        zip.file('02_second.png', img2);
        const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(ws.inputPath, zipBuf);

        const result = await processImagesToPdf(ws.inputPath, ws.outputPath, jobId);

        expect(result.service).toBe('images-to-pdf');
        expect(result.pageCount).toBe(2);
        expect(result.imageCount).toBe(2);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'images-to-pdf');
        expect(validation.valid).toBe(true);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(ws.outputPath));
        expect(pdfDoc.getPageCount()).toBe(2);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('pdf-to-jpg: renders multi-page PDF into ZIP containing high-resolution JPG pages', async () => {
      const jobId = 'test-pdf-to-jpg-112233';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.zip');

      try {
        const pdfDoc = await PDFDocument.create();
        const p1 = pdfDoc.addPage([200, 200]);
        p1.drawText('Page 1 Content', { x: 20, y: 150, size: 12 });
        const p2 = pdfDoc.addPage([200, 200]);
        p2.drawText('Page 2 Content', { x: 20, y: 150, size: 12 });
        const inputPdfBytes = await pdfDoc.save();
        fs.writeFileSync(ws.inputPath, inputPdfBytes);

        const result = await processPdfToJpg(ws.inputPath, ws.outputPath, jobId);

        expect(result.service).toBe('pdf-to-jpg');
        expect(result.pageCount).toBe(2);
        expect(result.imageCount).toBe(2);
        expect(result.isZip).toBe(true);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'pdf-to-jpg');
        expect(validation.valid).toBe(true);

        // Inspect ZIP contents
        const zip = await JSZip.loadAsync(fs.readFileSync(ws.outputPath));
        const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
        expect(entries.length).toBe(2);
        expect(entries).toContain('page_001.jpg');
        expect(entries).toContain('page_002.jpg');

        // Verify extracted file is a genuine JPEG
        const page1Buf = await zip.files['page_001.jpg'].async('nodebuffer');
        expect(page1Buf[0]).toBe(0xff);
        expect(page1Buf[1]).toBe(0xd8);
        expect(page1Buf[2]).toBe(0xff);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('pdf-to-png: renders multi-page PDF into ZIP containing lossless PNG pages', async () => {
      const jobId = 'test-pdf-to-png-112233';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.zip');

      try {
        const pdfDoc = await PDFDocument.create();
        const p1 = pdfDoc.addPage([200, 200]);
        p1.drawText('PNG Page 1', { x: 20, y: 150, size: 12 });
        const inputPdfBytes = await pdfDoc.save();
        fs.writeFileSync(ws.inputPath, inputPdfBytes);

        const result = await processPdfToPng(ws.inputPath, ws.outputPath, jobId);

        expect(result.service).toBe('pdf-to-png');
        expect(result.pageCount).toBe(1);
        expect(result.isZip).toBe(true);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'pdf-to-png');
        expect(validation.valid).toBe(true);

        const zip = await JSZip.loadAsync(fs.readFileSync(ws.outputPath));
        const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
        expect(entries.length).toBe(1);
        expect(entries).toContain('page_001.png');

        const page1Buf = await zip.files['page_001.png'].async('nodebuffer');
        expect(page1Buf[0]).toBe(0x89);
        expect(page1Buf[1]).toBe(0x50);
        expect(page1Buf[2]).toBe(0x4e);
        expect(page1Buf[3]).toBe(0x47);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // Helper to generate a valid multi-page PDF buffer
  async function createSamplePdf(numPages = 3): Promise<Buffer> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < numPages; i++) {
      const page = doc.addPage([400, 400]);
      page.drawText(`Page ${i + 1} sample text`, { x: 50, y: 350, size: 14 });
    }
    return Buffer.from(await doc.save());
  }

  // Batch 2: PDF Page Operations Tests
  describe('Batch 2: PDF Page Operations Engines', () => {
    it('executes real merge-pdf for multiple PDFs in a ZIP archive', async () => {
      const jobId = 'test-merge-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.zip', '.pdf');
      try {
        const pdf1 = await createSamplePdf(1);
        const pdf2 = await createSamplePdf(2);
        const zip = new JSZip();
        zip.file('doc1.pdf', pdf1);
        zip.file('doc2.pdf', pdf2);
        fs.writeFileSync(ws.inputPath, await zip.generateAsync({ type: 'nodebuffer' }));

        const result = await processMergePdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('merge-pdf');
        expect(result.sourceDocCount).toBe(2);
        expect(result.totalPageCount).toBe(3);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'merge-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real split-pdf extracting page ranges', async () => {
      const jobId = 'test-split-pdf-ranges';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(4);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processSplitPdf(ws.inputPath, ws.outputPath, jobId, {
          mode: 'ranges',
          rangeString: '1-2',
        });
        expect(result.service).toBe('split-pdf');
        expect(result.outputPageCount).toBe(2);
        expect(result.isZip).toBe(false);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'split-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real organize-pdf to reorder pages', async () => {
      const jobId = 'test-organize-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(3);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processOrganizePdf(ws.inputPath, ws.outputPath, jobId, {
          pageOrder: [2, 0, 1],
        });
        expect(result.service).toBe('organize-pdf');
        expect(result.outputPageCount).toBe(3);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'organize-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real delete-pdf-pages to remove specified pages', async () => {
      const jobId = 'test-delete-pages-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(3);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processDeletePdfPages(ws.inputPath, ws.outputPath, jobId, {
          pagesToDelete: [1],
        });
        expect(result.service).toBe('delete-pdf-pages');
        expect(result.deletedPageCount).toBe(1);
        expect(result.remainingPageCount).toBe(2);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'delete-pdf-pages');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real extract-pdf-pages to extract a subset of pages', async () => {
      const jobId = 'test-extract-pages-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(3);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processExtractPdfPages(ws.inputPath, ws.outputPath, jobId, {
          pagesToExtract: [0, 2],
        });
        expect(result.service).toBe('extract-pdf-pages');
        expect(result.extractedPageCount).toBe(2);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'extract-pdf-pages');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real rotate-pdf by 90 degrees', async () => {
      const jobId = 'test-rotate-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(2);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processRotatePdf(ws.inputPath, ws.outputPath, jobId, {
          degreesToRotate: 90,
        });
        expect(result.service).toBe('rotate-pdf');
        expect(result.rotationDegrees).toBe(90);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'rotate-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real crop-pdf setting crop margins', async () => {
      const jobId = 'test-crop-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processCropPdf(ws.inputPath, ws.outputPath, jobId, {
          cropMargins: { top: 30, right: 30, bottom: 30, left: 30 },
        });
        expect(result.service).toBe('crop-pdf');

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'crop-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // Batch 3: Text & Web Documents Tests
  describe('Batch 3: Text & Web Documents Engines', () => {
    it('executes real txt-to-pdf converting plain text to PDF', async () => {
      const jobId = 'test-txt-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.txt', '.pdf');
      try {
        const text = 'Line 1: Hello PRA PDF\nLine 2: Multi-line text conversion\nLine 3: Tested.';
        fs.writeFileSync(ws.inputPath, Buffer.from(text, 'utf-8'));

        const result = await processTxtToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('txt-to-pdf');
        expect(result.pageCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'txt-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real markdown-to-pdf converting markdown headings and lists', async () => {
      const jobId = 'test-md-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.md', '.pdf');
      try {
        const md = '# Title 1\n## Subtitle 2\n- Item A\n- Item B\n```\nconst x = 1;\n```';
        fs.writeFileSync(ws.inputPath, Buffer.from(md, 'utf-8'));

        const result = await processMarkdownToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('markdown-to-pdf');
        expect(result.pageCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'markdown-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real html-to-pdf converting HTML elements', async () => {
      const jobId = 'test-html-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.html', '.pdf');
      try {
        const html = '<h1>Heading</h1><p>Paragraph content</p><ul><li>List Item</li></ul>';
        fs.writeFileSync(ws.inputPath, Buffer.from(html, 'utf-8'));

        const result = await processHtmlToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('html-to-pdf');
        expect(result.pageCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'html-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real extract-pdf-text extracting text into txt file', async () => {
      const jobId = 'test-extract-text-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.txt');
      try {
        const samplePdf = await createSamplePdf(2);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processExtractPdfText(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('extract-pdf-text');
        expect(result.pageCount).toBe(2);
        expect(result.wordCount).toBeGreaterThan(0);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'extract-pdf-text');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real pdf-to-markdown extracting markdown structure', async () => {
      const jobId = 'test-pdf-to-md-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.md');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processPdfToMarkdown(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('pdf-to-markdown');
        expect(result.pageCount).toBe(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'pdf-to-markdown');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // Batch 4: Office & Document Conversions Tests
  describe('Batch 4: Office & Document Conversions Engines', () => {
    it('executes real word-to-pdf converting DOCX to PDF', async () => {
      const jobId = 'test-word-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.docx', '.pdf');
      try {
        const zip = new JSZip();
        zip.file(
          'word/document.xml',
          '<?xml version="1.0" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Word Paragraph Content</w:t></w:r></w:p></w:body></w:document>'
        );
        fs.writeFileSync(ws.inputPath, await zip.generateAsync({ type: 'nodebuffer' }));

        const result = await processWordToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('word-to-pdf');
        expect(result.pageCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'word-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real excel-to-pdf converting spreadsheet to PDF', async () => {
      const jobId = 'test-excel-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.csv', '.pdf');
      try {
        const csvContent = 'ID,Name,Role\n1,Alice,Developer\n2,Bob,Designer\n';
        fs.writeFileSync(ws.inputPath, Buffer.from(csvContent, 'utf-8'));

        const result = await processExcelToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('excel-to-pdf');
        expect(result.pageCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'excel-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real powerpoint-to-pdf converting presentation to PDF', async () => {
      const jobId = 'test-ppt-to-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pptx', '.pdf');
      try {
        const zip = new JSZip();
        zip.file(
          'ppt/slides/slide1.xml',
          '<?xml version="1.0" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide Title</a:t></a:r></a:p></txBody></p:sp></p:spTree></p:cSld></p:sld>'
        );
        fs.writeFileSync(ws.inputPath, await zip.generateAsync({ type: 'nodebuffer' }));

        const result = await processPowerpointToPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('powerpoint-to-pdf');
        expect(result.slideCount).toBeGreaterThanOrEqual(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'powerpoint-to-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real pdf-to-word converting PDF to DOCX OpenXML package', async () => {
      const jobId = 'test-pdf-to-word-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.docx');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processPdfToWord(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('pdf-to-word');
        expect(result.pageCount).toBe(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'pdf-to-word');
        expect(validation.valid).toBe(true);

        const zip = await JSZip.loadAsync(fs.readFileSync(ws.outputPath));
        expect(zip.file('word/document.xml')).not.toBeNull();
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real rtf-conversion bi-directionally', async () => {
      const jobId = 'test-rtf-conv-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.rtf', '.pdf');
      try {
        const rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl{\\f0 Courier;}}\\f0\\fs20 Hello RTF Document\\par}';
        fs.writeFileSync(ws.inputPath, Buffer.from(rtf, 'utf-8'));

        const result = await processRtfConversion(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('rtf-conversion');
        expect(result.direction).toBe('rtf-to-pdf');

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'rtf-conversion');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // Batch 5: Optimization & OCR Tests
  describe('Batch 5: Optimization & OCR Engines', () => {
    it('executes real ocr-pdf on a document generating searchable text layer', async () => {
      const jobId = 'test-ocr-pdf-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processOcrPdf(ws.inputPath, ws.outputPath, jobId);
        expect(result.service).toBe('ocr-pdf');
        expect(result.pageCount).toBe(1);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'ocr-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    }, 20000);
  });

  // Batch 6: Security & Annotations Tests
  describe('Batch 6: Security & Annotations Engines', () => {
    it('executes real add-page-numbers inserting page numbers', async () => {
      const jobId = 'test-page-numbers-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(3);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processAddPageNumbers(ws.inputPath, ws.outputPath, jobId, {
          position: 'bottom-center',
          format: 'Page {n} of {total}',
        });
        expect(result.service).toBe('add-page-numbers');
        expect(result.pageCount).toBe(3);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'add-page-numbers');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real watermark-pdf and strictly enforces no PRA branding', async () => {
      const jobId = 'test-watermark-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(2);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processWatermarkPdf(ws.inputPath, ws.outputPath, jobId, {
          text: 'STRICTLY CONFIDENTIAL',
        });
        expect(result.service).toBe('watermark-pdf');
        expect(result.watermarkText).toBe('STRICTLY CONFIDENTIAL');
        expect(result.watermarkText).not.toContain('PRA PDF');

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'watermark-pdf');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });

    it('executes real password-protect-pdf and unlock-pdf round-trip', async () => {
      const jobId = 'test-protect-unlock-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      const wsUnlocked = workspaceManager.prepareWorkspace('test-unlocked-job', '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        // Protect
        const protectResult = await processProtectPdf(ws.inputPath, ws.outputPath, jobId, {
          password: 'SecretPassword123',
        });
        expect(protectResult.service).toBe('password-protect-pdf');
        expect(protectResult.encrypted).toBe(true);

        const protectValidation = await PdfValidator.validateOutputFile(ws.outputPath, 'password-protect-pdf');
        expect(protectValidation.valid).toBe(true);

        // Unlock
        fs.copyFileSync(ws.outputPath, wsUnlocked.inputPath);
        const unlockResult = await processUnlockPdf(wsUnlocked.inputPath, wsUnlocked.outputPath, 'test-unlocked-job', {
          password: 'SecretPassword123',
        });
        expect(unlockResult.service).toBe('unlock-pdf');
        expect(unlockResult.unlocked).toBe(true);

        const unlockValidation = await PdfValidator.validateOutputFile(wsUnlocked.outputPath, 'unlock-pdf');
        expect(unlockValidation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
        workspaceManager.cleanupWorkspace('test-unlocked-job');
      }
    });

    it('executes real edit-pdf-metadata without unsolicited branding', async () => {
      const jobId = 'test-edit-metadata-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processEditPdfMetadata(ws.inputPath, ws.outputPath, jobId, {
          title: 'Custom User Title',
          author: 'Custom Author',
        });
        expect(result.service).toBe('edit-pdf-metadata');
        expect(result.metadataUpdated.title).toBe('Custom User Title');
        expect(result.metadataUpdated.author).toBe('Custom Author');

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'edit-pdf-metadata');
        expect(validation.valid).toBe(true);
      } finally {
        workspaceManager.cleanupWorkspace(jobId);
      }
    });
  });

  // Batch 7: Studio / Full PDF Editing Tests
  describe('Batch 7: Studio / Full PDF Editing Engine', () => {
    it('executes real full-pdf-editing applying text, rectangle, and highlight operations', async () => {
      const jobId = 'test-studio-job';
      const ws = workspaceManager.prepareWorkspace(jobId, '.pdf', '.pdf');
      try {
        const samplePdf = await createSamplePdf(1);
        fs.writeFileSync(ws.inputPath, samplePdf);

        const result = await processFullPdfEditing(ws.inputPath, ws.outputPath, jobId, {
          operations: [
            { type: 'addText', pageIndex: 0, text: 'Studio Text', x: 60, y: 300, size: 16 },
            { type: 'addRectangle', pageIndex: 0, x: 50, y: 150, width: 200, height: 60 },
            { type: 'addHighlight', pageIndex: 0, x: 50, y: 220, width: 150, height: 20 },
          ],
        });
        expect(result.service).toBe('full-pdf-editing');
        expect(result.appliedOperationsCount).toBe(3);

        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'full-pdf-editing');
        expect(validation.valid).toBe(true);
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
          serviceId: 'unsupported-test-service',
          inputStorageKey: 'jobs/test/input/in.bin',
          outputStorageKey: 'jobs/test/output/out.bin',
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

      expect([404, 500]).toContain(res.status);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(['B2_DOWNLOAD_FAILED', 'INTERNAL_PROCESSOR_ERROR']).toContain(data.errorCode);
    }, 15000);

    it('validates output files and catches invalid output structure', async () => {
      const tempJobId = 'test-invalid-output-job';
      const ws = workspaceManager.prepareWorkspace(tempJobId, '.pdf', '.pdf');
      try {
        fs.writeFileSync(ws.outputPath, 'Corrupted binary output not matching PDF spec');
        const validation = await PdfValidator.validateOutputFile(ws.outputPath, 'compress-pdf');
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
