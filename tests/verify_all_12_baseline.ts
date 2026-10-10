import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

const WORKER_URL = 'https://pra-pdf.praverse-auth.workers.dev';

// Minimal 1x1 transparent PNG
const MINIMAL_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
  0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
  0x42, 0x60, 0x82
]);

// Minimal 1x1 JPEG
const MINIMAL_JPG_BYTES = new Uint8Array([
  0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
  0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
  0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
  0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
  0x00, 0x7F, 0x00, 0xFF, 0xD9
]);

async function buildTestPdf(pageCount: number = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`PRA PDF Test Page ${i} Content`, {
      x: 50,
      y: 750,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
  }
  return await doc.save();
}

interface TestResult {
  service: string;
  success: boolean;
  httpStatus: number;
  mimeType?: string;
  outputFileName?: string;
  signatureValid: boolean;
  readabilityValid: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function callWorker(service: string, formData: FormData): Promise<any> {
  const res = await fetch(`${WORKER_URL}/api/v1/cf/process`, {
    method: 'POST',
    body: formData,
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function runBaselineTests() {
  console.log('====================================================');
  console.log('PRA PDF — Comprehensive Baseline Live Verification');
  console.log('Testing all 12 claimed active production services...');
  console.log('Target Worker:', WORKER_URL);
  console.log('====================================================\n');

  const samplePdfBytes = await buildTestPdf(3);

  // 1. jpg-to-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'jpg-to-pdf');
    fd.append('file', new Blob([MINIMAL_JPG_BYTES], { type: 'image/jpeg' }), 'test.jpg');
    const { status, json } = await callWorker('jpg-to-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 1;
    }
    results.push({
      service: 'jpg-to-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Pages: 1, size: ${buf.length} bytes`,
    });
  } catch (err: any) {
    results.push({
      service: 'jpg-to-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 2. png-to-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'png-to-pdf');
    fd.append('file', new Blob([MINIMAL_PNG_BYTES], { type: 'image/png' }), 'test.png');
    const { status, json } = await callWorker('png-to-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 1;
    }
    results.push({
      service: 'png-to-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Pages: 1, size: ${buf.length} bytes`,
    });
  } catch (err: any) {
    results.push({
      service: 'png-to-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 3. rotate-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'rotate-pdf');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ degreesToRotate: 90 }));
    const { status, json } = await callWorker('rotate-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      const angle = doc.getPage(0).getRotation().angle;
      readable = doc.getPageCount() === 3 && angle === 90;
    }
    results.push({
      service: 'rotate-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Rotation: 90 deg verified on Page 0`,
    });
  } catch (err: any) {
    results.push({
      service: 'rotate-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 4. crop-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'crop-pdf');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ cropMargins: { top: 20, right: 20, bottom: 20, left: 20 } }));
    const { status, json } = await callWorker('crop-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 3;
    }
    results.push({
      service: 'crop-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Cropped 3 pages with margins`,
    });
  } catch (err: any) {
    results.push({
      service: 'crop-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 5. organize-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'organize-pdf');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ pageOrder: [2, 0, 1] }));
    const { status, json } = await callWorker('organize-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 3;
    }
    results.push({
      service: 'organize-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Reordered pages [2, 0, 1]`,
    });
  } catch (err: any) {
    results.push({
      service: 'organize-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 6. delete-pdf-pages
  try {
    const fd = new FormData();
    fd.append('service', 'delete-pdf-pages');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ pagesToDelete: [1] })); // delete page 2 (0-indexed 1)
    const { status, json } = await callWorker('delete-pdf-pages', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 2;
    }
    results.push({
      service: 'delete-pdf-pages',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Deleted 1 page, remaining: 2`,
    });
  } catch (err: any) {
    results.push({
      service: 'delete-pdf-pages',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 7. extract-pdf-pages
  try {
    const fd = new FormData();
    fd.append('service', 'extract-pdf-pages');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ pagesToExtractSpec: '1,3' }));
    const { status, json } = await callWorker('extract-pdf-pages', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 2;
    }
    results.push({
      service: 'extract-pdf-pages',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Extracted pages 1 and 3, output: 2 pages`,
    });
  } catch (err: any) {
    results.push({
      service: 'extract-pdf-pages',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 8. edit-pdf-metadata
  try {
    const fd = new FormData();
    fd.append('service', 'edit-pdf-metadata');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ title: 'PRA PDF Live Verified Title', author: 'PRAVERSE QA' }));
    const { status, json } = await callWorker('edit-pdf-metadata', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getTitle() === 'PRA PDF Live Verified Title' && doc.getAuthor() === 'PRAVERSE QA';
    }
    results.push({
      service: 'edit-pdf-metadata',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Title & Author verified via PDFDocument reader`,
    });
  } catch (err: any) {
    results.push({
      service: 'edit-pdf-metadata',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 9. extract-pdf-text
  try {
    const fd = new FormData();
    fd.append('service', 'extract-pdf-text');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    const { status, json } = await callWorker('extract-pdf-text', fd);
    const text = Buffer.from(json.outputBase64 || '', 'base64').toString('utf-8');
    const hasText = text.includes('PRA PDF Test Page');
    results.push({
      service: 'extract-pdf-text',
      success: json.success && hasText,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: true, // text/plain
      readabilityValid: hasText,
      notes: `Extracted ${text.length} chars containing expected strings`,
    });
  } catch (err: any) {
    results.push({
      service: 'extract-pdf-text',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 10. add-page-numbers
  try {
    const fd = new FormData();
    fd.append('service', 'add-page-numbers');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ formatTemplate: '{n}', position: 'bottom-center' }));
    const { status, json } = await callWorker('add-page-numbers', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 3;
    }
    results.push({
      service: 'add-page-numbers',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Numbered 3 pages with default {n}`,
    });
  } catch (err: any) {
    results.push({
      service: 'add-page-numbers',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 11. merge-pdf
  try {
    const pdf1 = await buildTestPdf(2);
    const pdf2 = await buildTestPdf(2);
    const fd = new FormData();
    fd.append('service', 'merge-pdf');
    fd.append('files', new Blob([pdf1], { type: 'application/pdf' }), 'part1.pdf');
    fd.append('files', new Blob([pdf2], { type: 'application/pdf' }), 'part2.pdf');
    const { status, json } = await callWorker('merge-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 4;
    }
    results.push({
      service: 'merge-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Merged 2 + 2 = 4 pages verified`,
    });
  } catch (err: any) {
    results.push({
      service: 'merge-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  // 12. split-pdf
  try {
    const fd = new FormData();
    fd.append('service', 'split-pdf');
    fd.append('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ mode: 'ranges', rangeString: '1-2' }));
    const { status, json } = await callWorker('split-pdf', fd);
    const buf = Buffer.from(json.outputBase64 || '', 'base64');
    const isPdf = buf.subarray(0, 5).toString('ascii').startsWith('%PDF-');
    let readable = false;
    if (isPdf) {
      const doc = await PDFDocument.load(buf);
      readable = doc.getPageCount() === 2;
    }
    results.push({
      service: 'split-pdf',
      success: json.success && isPdf && readable,
      httpStatus: status,
      mimeType: json.mimeType,
      outputFileName: json.outputFileName,
      signatureValid: isPdf,
      readabilityValid: readable,
      notes: `Split range 1-2, 2 pages verified`,
    });
  } catch (err: any) {
    results.push({
      service: 'split-pdf',
      success: false,
      httpStatus: 500,
      signatureValid: false,
      readabilityValid: false,
      notes: err.message,
    });
  }

  console.log('\n====================================================');
  console.log('RESULTS SUMMARY:');
  console.log('====================================================');
  let passCount = 0;
  for (const r of results) {
    const statusLabel = r.success ? 'PASS [Verified Live]' : 'FAIL';
    if (r.success) passCount++;
    console.log(`${r.service.padEnd(20)} | ${statusLabel.padEnd(22)} | HTTP ${r.httpStatus} | ${r.mimeType || ''} | ${r.outputFileName || ''} | ${r.notes}`);
  }
  console.log('====================================================');
  console.log(`Total: ${passCount} / ${results.length} PASSED`);
  console.log('====================================================\n');
}

runBaselineTests().catch(console.error);
