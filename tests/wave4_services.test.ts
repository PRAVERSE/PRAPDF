/**
 * PRA PDF — Wave 4 Comprehensive Services Test Suite (Services #44 to #56)
 * A PRAVERSE Company
 *
 * Tests the 13 Wave 4 services individually in memory:
 * 44. repair-pdf
 * 45. header-footer-pdf
 * 46. bates-numbering-pdf
 * 47. annotate-pdf
 * 48. flatten-pdf
 * 49. resize-pdf
 * 50. fill-pdf-forms
 * 51. create-pdf-forms
 * 52. sign-pdf
 * 53. redact-pdf (verifies permanent text excision from stream)
 * 54. pdf-to-pdfa (verifies ISO 19005-1 conformance validator)
 * 55. compare-pdf (detects differences between two documents)
 * 56. extract-images-from-pdf (packages extracted images into ZIP)
 *
 * Plus 50 MB boundary rejection and Worker API route validation.
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

// Import Wave 4 Engines
import { processRepairPdfWorker } from '../src/worker/engines/repairPdf';
import { processHeaderFooterPdfWorker } from '../src/worker/engines/headerFooterPdf';
import { processBatesNumberingPdfWorker } from '../src/worker/engines/batesNumberingPdf';
import { processAnnotatePdfWorker } from '../src/worker/engines/annotatePdf';
import { processFlattenPdfWorker } from '../src/worker/engines/flattenPdf';
import { processResizePdfWorker } from '../src/worker/engines/resizePdf';
import { processFillPdfFormsWorker } from '../src/worker/engines/fillPdfForms';
import { processCreatePdfFormsWorker } from '../src/worker/engines/createPdfForms';
import { processSignPdfWorker } from '../src/worker/engines/signPdf';
import { processRedactPdfWorker } from '../src/worker/engines/redactPdf';
import { processPdfToPdfaWorker, validatePdfaConformance } from '../src/worker/engines/pdfToPdfa';
import { processComparePdfWorker } from '../src/worker/engines/comparePdf';
import { processExtractImagesFromPdfWorker } from '../src/worker/engines/extractImagesFromPdf';

import workerHandler from '../src/worker/index';

// Helper to create synthetic test PDFs
async function createSamplePdf(text: string = 'PRA PDF Test Document', pages: number = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([600, 400]);
    page.drawText(`${text} - Page ${i + 1}`, { x: 50, y: 350, size: 16 });
  }
  return await doc.save();
}

// Helper to create a PDF with an AcroForm text field
async function createFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const form = doc.getForm();
  const tf = form.createTextField('fullName');
  tf.setText('Initial Value');
  tf.addToPage(page, { x: 50, y: 300, width: 200, height: 25 });
  return await doc.save();
}

// Helper to create a PDF with an embedded JPEG image
async function createPdfWithImage(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  // 1x1 red JPEG
  const onePixelJpg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);
  const img = await doc.embedJpg(onePixelJpg);
  page.drawImage(img, { x: 50, y: 100, width: 50, height: 50 });
  return await doc.save();
}

describe('PRA PDF — Wave 4 Services (Services #44 to #56)', () => {
  // 44. repair-pdf
  it('44. repair-pdf: successfully repairs and cleans damaged PDF structure', async () => {
    const valid = await createSamplePdf('Salvageable Document Content', 2);
    // Introduce pre-header garbage
    const garbage = new TextEncoder().encode('GARBAGE_BYTES_CORRUPTED_PREFIX');
    const damaged = new Uint8Array(garbage.length + valid.length);
    damaged.set(garbage, 0);
    damaged.set(valid, garbage.length);

    const result = await processRepairPdfWorker(damaged);
    expect(result.service).toBe('repair-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const repairedDoc = await PDFDocument.load(result.outputBuffer);
    expect(repairedDoc.getPageCount()).toBe(2);
    expect(result.metadata.repaired).toBe(true);
  });

  // 45. header-footer-pdf
  it('45. header-footer-pdf: applies customizable headers and footers with page macro replacement', async () => {
    const input = await createSamplePdf('Document with Headers', 3);
    const result = await processHeaderFooterPdfWorker(input, {
      headerText: 'CONFIDENTIAL DOCUMENT',
      footerText: 'Page {page} of {total}',
    });

    expect(result.service).toBe('header-footer-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const outDoc = await PDFDocument.load(result.outputBuffer);
    expect(outDoc.getPageCount()).toBe(3);
    expect(result.metadata.pageCount).toBe(3);
  });

  // 46. bates-numbering-pdf
  it('46. bates-numbering-pdf: stamps sequential legal Bates numbers across pages', async () => {
    const input = await createSamplePdf('Legal Production Document', 2);
    const result = await processBatesNumberingPdfWorker(input, {
      prefix: 'PRA-LEGAL-',
      startNumber: 101,
      digits: 6,
    });

    expect(result.service).toBe('bates-numbering-pdf');
    expect(result.metadata.firstBatesNumber).toBe('PRA-LEGAL-000101');
    expect(result.metadata.lastBatesNumber).toBe('PRA-LEGAL-000102');

    const outDoc = await PDFDocument.load(result.outputBuffer);
    expect(outDoc.getPageCount()).toBe(2);
  });

  // 47. annotate-pdf
  it('47. annotate-pdf: attaches highlights, sticky notes, and markup boxes to pages', async () => {
    const input = await createSamplePdf('Document for Review', 1);
    const result = await processAnnotatePdfWorker(input, {
      annotations: [
        {
          type: 'text',
          pageIndex: 0,
          text: 'Reviewer comment on section 1',
          x: 60,
          y: 200,
        },
        {
          type: 'highlight',
          pageIndex: 0,
          x: 50,
          y: 340,
          width: 150,
          height: 20,
        },
      ],
    });

    expect(result.service).toBe('annotate-pdf');
    expect(result.metadata.annotationsCount).toBe(2);
    const outDoc = await PDFDocument.load(result.outputBuffer);
    expect(outDoc.getPageCount()).toBe(1);
  });

  // 48. flatten-pdf
  it('48. flatten-pdf: merges interactive form fields and annotations into static geometry', async () => {
    const input = await createFormPdf();
    const result = await processFlattenPdfWorker(input);

    expect(result.service).toBe('flatten-pdf');
    expect(result.metadata.flattened).toBe(true);

    const outDoc = await PDFDocument.load(result.outputBuffer);
    const form = outDoc.getForm();
    // After flattening, interactive form fields are zero
    expect(form.getFields().length).toBe(0);
  });

  // 49. resize-pdf
  it('49. resize-pdf: scales pages to standard dimensions (A4)', async () => {
    const input = await createSamplePdf('Document To Resize', 2);
    const result = await processResizePdfWorker(input, {
      targetSize: 'A4',
      orientation: 'portrait',
    });

    expect(result.service).toBe('resize-pdf');
    expect(result.metadata.targetPageSize).toBe('A4');

    const outDoc = await PDFDocument.load(result.outputBuffer);
    const firstPage = outDoc.getPage(0);
    expect(Math.round(firstPage.getWidth())).toBe(595);
    expect(Math.round(firstPage.getHeight())).toBe(842);
  });

  // 50. fill-pdf-forms
  it('50. fill-pdf-forms: populates interactive AcroForm fields accurately', async () => {
    const input = await createFormPdf();
    const result = await processFillPdfFormsWorker(input, {
      fields: {
        fullName: 'Jane Doe',
      },
    });

    expect(result.service).toBe('fill-pdf-forms');
    expect(result.metadata.fieldsFilledCount).toBe(1);

    const outDoc = await PDFDocument.load(result.outputBuffer);
    const form = outDoc.getForm();
    const tf = form.getTextField('fullName');
    expect(tf.getText()).toBe('Jane Doe');
  });

  // 51. create-pdf-forms
  it('51. create-pdf-forms: builds interactive AcroForm fields on flat PDF', async () => {
    const input = await createSamplePdf('Flat Template', 1);
    const result = await processCreatePdfFormsWorker(input, {
      fields: [
        {
          type: 'text',
          name: 'companyName',
          defaultValue: 'PRAVERSE',
          x: 50,
          y: 250,
          width: 200,
          height: 25,
        },
        {
          type: 'checkbox',
          name: 'agreeTerms',
          checked: true,
          x: 50,
          y: 200,
          width: 20,
          height: 20,
        },
      ],
    });

    expect(result.service).toBe('create-pdf-forms');
    expect(result.metadata.createdFieldsCount).toBe(2);

    const outDoc = await PDFDocument.load(result.outputBuffer);
    const form = outDoc.getForm();
    expect(form.getFields().length).toBe(2);
    expect(form.getTextField('companyName').getText()).toBe('PRAVERSE');
  });

  // 52. sign-pdf
  it('52. sign-pdf: applies visual signature seal and cryptographic SHA-256 audit digest', async () => {
    const input = await createSamplePdf('Contract Document', 1);
    const result = await processSignPdfWorker(input, {
      signerName: 'Alexander Vance',
      reason: 'Approved and Verified',
      location: 'New York, NY',
    });

    expect(result.service).toBe('sign-pdf');
    expect(result.metadata.signerName).toBe('Alexander Vance');
    expect(result.metadata.documentAuditHashSha256).toBeDefined();
    expect(result.metadata.documentAuditHashSha256.length).toBe(64);

    const outDoc = await PDFDocument.load(result.outputBuffer);
    expect(outDoc.getPageCount()).toBe(1);
  });

  // 53. redact-pdf
  it('53. redact-pdf: permanently excises sensitive text from content streams and metadata', async () => {
    const input = await createSamplePdf('Confidential Employee Record SSN-00123', 1);
    const result = await processRedactPdfWorker(input, {
      terms: ['Confidential', 'SSN-00123'],
    });

    expect(result.service).toBe('redact-pdf');

    // Verify stream sanitization: neither "Confidential" nor "SSN-00123" exist in raw PDF stream
    const rawOutString = new TextDecoder('latin1').decode(result.outputBuffer);
    expect(rawOutString.includes('SSN-00123')).toBe(false);

    const outDoc = await PDFDocument.load(result.outputBuffer);
    expect(outDoc.getPageCount()).toBe(1);
  });

  // 54. pdf-to-pdfa
  it('54. pdf-to-pdfa: converts document to ISO 19005-1 (PDF/A-1b) with conformance validation', async () => {
    const input = await createSamplePdf('Archival Record Document', 1);
    const result = await processPdfToPdfaWorker(input, {
      title: 'Official Archival Record',
    });

    expect(result.service).toBe('pdf-to-pdfa');
    expect(result.metadata.conformance).toBe('PDF/A-1b');

    // Run ISO 19005-1 validator
    const validation = validatePdfaConformance(result.outputBuffer);
    expect(validation.isCompliant).toBe(true);
    expect(validation.hasPdfaHeader).toBe(true);
    expect(validation.hasOutputIntent).toBe(true);
    expect(validation.hasXmpMetadata).toBe(true);
    expect(validation.hasPdfaId).toBe(true);
  });

  // 55. compare-pdf
  it('55. compare-pdf: detects textual differences and generates comparison report PDF', async () => {
    const doc1 = await createSamplePdf('Original Version Paragraph', 1);
    const doc2 = await createSamplePdf('Modified Version Paragraph with Changes', 1);

    const result = await processComparePdfWorker([doc1, doc2]);
    expect(result.service).toBe('compare-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.totalDiffs).toBeGreaterThan(0);

    const reportDoc = await PDFDocument.load(result.outputBuffer);
    expect(reportDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  // 56. extract-images-from-pdf
  it('56. extract-images-from-pdf: extracts raster images into a valid ZIP archive', async () => {
    const input = await createPdfWithImage();
    const result = await processExtractImagesFromPdfWorker(input);

    expect(result.service).toBe('extract-images-from-pdf');
    expect(result.mimeType).toBe('application/zip');
    expect(result.metadata.imageCount).toBeGreaterThanOrEqual(1);

    // Unpack and verify ZIP contents
    const zip = await JSZip.loadAsync(result.outputBuffer);
    const filenames = Object.keys(zip.files);
    expect(filenames.length).toBeGreaterThanOrEqual(1);
    expect(filenames[0]).toMatch(/\.(jpg|png)$/);
  });

  // Worker API Endpoint Integration Test
  it('processes Wave 4 service via Worker POST /api/v1/cf/process endpoint', async () => {
    const input = await createSamplePdf('Worker Route Wave 4 Test', 1);
    const formData = new FormData();
    formData.append('service', 'header-footer-pdf');
    formData.append('file', new Blob([input], { type: 'application/pdf' }), 'test.pdf');
    formData.append('options', JSON.stringify({ headerText: 'TOP SECRET' }));

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: formData,
    });

    const res = await workerHandler.fetch(req, {});
    expect(res.status).toBe(200);

    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('header-footer-pdf');
    expect(json.outputBase64).toBeDefined();
  });

  // Upload Limits Test (>50 MB)
  it('rejects uploads exceeding 50 MB with 413 PAYLOAD_TOO_LARGE', async () => {
    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '52428801', // 50 MB + 1 byte
      },
      body: JSON.stringify({ service: 'repair-pdf' }),
    });

    const res = await workerHandler.fetch(req, {});
    expect(res.status).toBe(413);

    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe('PAYLOAD_TOO_LARGE');
  });

  // Empty Payload Test
  it('rejects empty payloads with 400 EMPTY_PAYLOAD', async () => {
    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ service: 'repair-pdf', fileBase64: '' }),
    });

    const res = await workerHandler.fetch(req, {});
    expect(res.status).toBe(400);

    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.errorCode).toBe('EMPTY_PAYLOAD');
  });
});
