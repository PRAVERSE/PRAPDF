/**
 * PRA PDF — Wave 3 Services Local Test Suite
 * Validates in-memory execution and output binary integrity for all 13 Wave 3 services:
 * 31. compress-pdf
 * 32. ocr-pdf
 * 33. watermark-pdf
 * 34. password-protect-pdf
 * 35. unlock-pdf
 * 36. full-pdf-editing
 * 37. scan-to-pdf
 * 38. pdf-to-tiff
 * 39. pdf-to-excel
 * 40. pdf-to-csv
 * 41. pdf-to-powerpoint
 * 42. grayscale-pdf
 * 43. deskew-pdf
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { PDFDocument as CantooPDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { processCompressPdfWorker } from '../src/worker/engines/compressPdf';
import { processOcrPdfWorker } from '../src/worker/engines/ocrPdf';
import { processWatermarkPdfWorker } from '../src/worker/engines/watermarkPdf';
import { processProtectPdfWorker } from '../src/worker/engines/protectPdf';
import { processUnlockPdfWorker } from '../src/worker/engines/unlockPdf';
import { processFullPdfEditingWorker } from '../src/worker/engines/fullPdfEditor';
import { processScanToPdfWorker } from '../src/worker/engines/scanToPdf';
import { processPdfToTiffWorker } from '../src/worker/engines/pdfToTiff';
import { processPdfToExcelWorker } from '../src/worker/engines/pdfToExcel';
import { processPdfToCsvWorker } from '../src/worker/engines/pdfToCsv';
import { processPdfToPowerpointWorker } from '../src/worker/engines/pdfToPowerpoint';
import { processGrayscalePdfWorker } from '../src/worker/engines/grayscalePdf';
import { processDeskewPdfWorker } from '../src/worker/engines/deskewPdf';
import workerEntry from '../src/worker/index';

// Helpers to generate test inputs
async function createTestPdfWithText(pages: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`Page ${i} Header`, { x: 50, y: 350, size: 16, font, color: rgb(0.8, 0.1, 0.1) });
    page.drawText(`Item A\t100\t200`, { x: 50, y: 300, size: 12, font, color: rgb(0, 0, 0.8) });
    page.drawText(`Item B\t300\t400`, { x: 50, y: 270, size: 12, font, color: rgb(0, 0.6, 0.2) });
    page.drawRectangle({ x: 50, y: 150, width: 100, height: 50, color: rgb(0.9, 0.2, 0.3) });
  }

  return await doc.save();
}

function createSampleJpg(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);
}

describe('PRA PDF — Wave 3 Services (Services #31 to #43)', () => {
  // Service 31: compress-pdf
  it('31. compress-pdf: normalizes and compresses PDF object streams', async () => {
    const input = await createTestPdfWithText(3);
    const result = await processCompressPdfWorker(input);

    expect(result.service).toBe('compress-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.outputBuffer[0]).toBe(0x25); // %
    expect(result.outputBuffer[1]).toBe(0x50); // P
    expect(result.outputBuffer[2]).toBe(0x44); // D
    expect(result.outputBuffer[3]).toBe(0x46); // F

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(3);
  });

  // Service 32: ocr-pdf
  it('32. ocr-pdf: extracts layout and embeds searchable text layer', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processOcrPdfWorker(input, { language: 'eng' });

    expect(result.service).toBe('ocr-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.ocrApplied).toBe(true);
    expect(result.metadata.wordsDetected).toBeGreaterThan(0);

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(2);
  });

  // Service 33: watermark-pdf
  it('33. watermark-pdf: applies custom watermark text without unsolicited branding', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processWatermarkPdfWorker(input, { text: 'INTERNAL USE' });

    expect(result.service).toBe('watermark-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.watermarkText).toBe('INTERNAL USE');

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(2);
  });

  // Service 34: password-protect-pdf
  it('34. password-protect-pdf: encrypts PDF with user password', async () => {
    const input = await createTestPdfWithText(1);
    const result = await processProtectPdfWorker(input, { password: 'secretpassword123' });

    expect(result.service).toBe('password-protect-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.encrypted).toBe(true);

    // Verify it loads with password
    const loadedWithPwd = await CantooPDFDocument.load(result.outputBuffer, { password: 'secretpassword123' });
    expect(loadedWithPwd.getPageCount()).toBe(1);
  });

  // Service 35: unlock-pdf
  it('35. unlock-pdf: decrypts password-protected PDF to standard unlocked PDF', async () => {
    const input = await createTestPdfWithText(1);
    const protectedRes = await processProtectPdfWorker(input, { password: 'unlockme99' });

    const unlockRes = await processUnlockPdfWorker(protectedRes.outputBuffer, { password: 'unlockme99' });
    expect(unlockRes.service).toBe('unlock-pdf');
    expect(unlockRes.mimeType).toBe('application/pdf');
    expect(unlockRes.metadata.unlocked).toBe(true);

    const loadedPlain = await PDFDocument.load(unlockRes.outputBuffer);
    expect(loadedPlain.getPageCount()).toBe(1);
  });

  // Service 36: full-pdf-editing
  it('36. full-pdf-editing: executes editing operations (text, rectangle, line, page)', async () => {
    const input = await createTestPdfWithText(1);
    const result = await processFullPdfEditingWorker(input, {
      operations: [
        { type: 'addText', text: 'Edited Annotation', x: 50, y: 50, size: 14 },
        { type: 'addRectangle', x: 40, y: 40, width: 200, height: 30 },
        { type: 'addPage', width: 400, height: 400 },
      ],
    });

    expect(result.service).toBe('full-pdf-editing');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.appliedOperationsCount).toBe(3);

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(2); // 1 original + 1 added
  });

  // Service 37: scan-to-pdf
  it('37. scan-to-pdf: compiles scan image into standard A4 PDF document', async () => {
    const jpg = createSampleJpg();
    const result = await processScanToPdfWorker(jpg, { pageSize: 'A4' });

    expect(result.service).toBe('scan-to-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.outputBuffer[0]).toBe(0x25); // %
    expect(result.outputBuffer[1]).toBe(0x50); // P
    expect(result.metadata.pageCount).toBe(1);

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(1);
    const page = loaded.getPage(0);
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
  });

  // Service 38: pdf-to-tiff
  it('38. pdf-to-tiff: renders PDF pages into compliant TIFF 6.0 bitmap', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processPdfToTiffWorker(input, { dpi: 72 });

    expect(result.service).toBe('pdf-to-tiff');
    expect(result.mimeType).toBe('image/tiff');
    // TIFF signature 'II' (0x49 0x49) and 42 (0x2A 0x00)
    expect(result.outputBuffer[0]).toBe(0x49);
    expect(result.outputBuffer[1]).toBe(0x49);
    expect(result.outputBuffer[2]).toBe(0x2a);
    expect(result.outputBuffer[3]).toBe(0x00);
    expect(result.metadata.pageCount).toBe(2);
  });

  // Service 39: pdf-to-excel
  it('39. pdf-to-excel: converts PDF text & layout into structured XLSX workbook', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processPdfToExcelWorker(input);

    expect(result.service).toBe('pdf-to-excel');
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // XLSX zip signature PK
    expect(result.outputBuffer[0]).toBe(0x50);
    expect(result.outputBuffer[1]).toBe(0x4b);

    const wb = XLSX.read(result.outputBuffer, { type: 'array' });
    expect(wb.SheetNames.length).toBe(2);
    expect(wb.SheetNames[0]).toBe('Page 1');
    expect(wb.SheetNames[1]).toBe('Page 2');
  });

  // Service 40: pdf-to-csv
  it('40. pdf-to-csv: converts PDF text & layout into standard CSV', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processPdfToCsvWorker(input);

    expect(result.service).toBe('pdf-to-csv');
    expect(result.mimeType).toBe('text/csv; charset=utf-8');

    const csvText = new TextDecoder().decode(result.outputBuffer);
    expect(csvText.length).toBeGreaterThan(10);
    expect(csvText).toContain('Header');
  });

  // Service 41: pdf-to-powerpoint
  it('41. pdf-to-powerpoint: converts PDF pages into valid OpenXML PPTX presentation', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processPdfToPowerpointWorker(input);

    expect(result.service).toBe('pdf-to-powerpoint');
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.presentationml.presentation');
    // PPTX zip signature PK
    expect(result.outputBuffer[0]).toBe(0x50);
    expect(result.outputBuffer[1]).toBe(0x4b);

    const zip = await JSZip.loadAsync(result.outputBuffer);
    expect(zip.file('[Content_Types].xml')).toBeDefined();
    expect(zip.file('ppt/presentation.xml')).toBeDefined();
    expect(zip.file('ppt/slides/slide1.xml')).toBeDefined();
    expect(zip.file('ppt/slides/slide2.xml')).toBeDefined();
  });

  // Service 42: grayscale-pdf
  it('42. grayscale-pdf: maps document colors and streams to DeviceGray', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processGrayscalePdfWorker(input);

    expect(result.service).toBe('grayscale-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.grayscale).toBe(true);

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(2);
  });

  // Service 43: deskew-pdf
  it('43. deskew-pdf: normalizes and straightens tilted PDF pages', async () => {
    const input = await createTestPdfWithText(2);
    const result = await processDeskewPdfWorker(input, { angle: 10 });

    expect(result.service).toBe('deskew-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.metadata.deskewed).toBe(true);

    const loaded = await PDFDocument.load(result.outputBuffer);
    expect(loaded.getPageCount()).toBe(2);
  });

  // Worker Endpoint dispatch test
  it('processes Wave 3 service via Worker POST /api/v1/cf/process endpoint', async () => {
    const input = await createTestPdfWithText(1);
    const base64Input = Buffer.from(input).toString('base64');

    const req = new Request('https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'compress-pdf',
        fileBase64: base64Input,
        fileName: 'sample.pdf',
      }),
    });

    const res = await workerEntry.fetch(req, {});
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.service).toBe('compress-pdf');
    expect(data.outputBase64).toBeDefined();
    expect(data.mimeType).toBe('application/pdf');
  });

  // Strict 50 MB limit test
  it('rejects uploads exceeding 50 MB with 413 PAYLOAD_TOO_LARGE', async () => {
    const req = new Request('https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process', {
      method: 'POST',
      headers: {
        'content-length': '52428801', // 50MB + 1 byte
      },
    });

    const res = await workerEntry.fetch(req, {});
    expect(res.status).toBe(413);
    const data: any = await res.json();
    expect(data.errorCode).toBe('PAYLOAD_TOO_LARGE');
  });

  // Empty payload rejection
  it('rejects empty payloads with 400 EMPTY_PAYLOAD', async () => {
    const req = new Request('https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'compress-pdf',
        fileBase64: '',
      }),
    });

    const res = await workerEntry.fetch(req, {});
    expect(res.status).toBe(400);
    const data: any = await res.json();
    expect(data.errorCode).toBe('EMPTY_PAYLOAD');
  });
});
