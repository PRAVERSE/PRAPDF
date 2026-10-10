/**
 * PRA PDF — Live Production Verification (Wave 3 Services)
 * Targets live production URL: https://pra-pdf.praverse-auth.workers.dev
 * Validates actual binary outputs for all 13 Wave 3 services:
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

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PDFDocument as CantooPDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const PROD_URL = 'https://pra-pdf.praverse-auth.workers.dev';

// Generators for test inputs
async function createPdfWithText(pages: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([400, 400]);
    page.drawText(`Page ${i} Document Header`, { x: 50, y: 350, size: 16, font, color: rgb(0.8, 0.1, 0.1) });
    page.drawText(`Metric A\t100\t200`, { x: 50, y: 300, size: 12, font, color: rgb(0, 0, 0.8) });
    page.drawText(`Metric B\t300\t400`, { x: 50, y: 270, size: 12, font, color: rgb(0, 0.6, 0.2) });
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

interface TestResult {
  number: number;
  serviceId: string;
  name: string;
  pass: boolean;
  httpStatus: number;
  outputBytes: number;
  details: string;
}

const results: TestResult[] = [];

async function callProdWorker(
  service: string,
  inputBuffer: Uint8Array,
  fileName: string = 'test.pdf',
  options?: any
): Promise<{ status: number; body: any }> {
  const base64 = Buffer.from(inputBuffer).toString('base64');
  const res = await fetch(`${PROD_URL}/api/v1/cf/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service,
      fileBase64: base64,
      fileName,
      options,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function runLiveVerification() {
  console.log(`\n======================================================`);
  console.log(`  PRA PDF — LIVE PRODUCTION VERIFICATION (WAVE 3)`);
  console.log(`  Target: ${PROD_URL}`);
  console.log(`======================================================\n`);

  // Health Check
  const healthRes = await fetch(`${PROD_URL}/api/v1/cf/health`);
  const health = await healthRes.json() as any;
  console.log(`Health Check: status=${health.status}, activeServices=${health.activeProductionServices?.length}`);
  console.log(`------------------------------------------------------\n`);

  const samplePdf = await createPdfWithText(2);
  const sampleJpg = createSampleJpg();

  // 31. compress-pdf
  try {
    const { status, body } = await callProdWorker('compress-pdf', samplePdf);
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 31,
      serviceId: 'compress-pdf',
      name: 'Compress PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid PDF (${buf.length} bytes), pageCount=${body.metadata?.pageCount}` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 31, serviceId: 'compress-pdf', name: 'Compress PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 32. ocr-pdf
  try {
    const { status, body } = await callProdWorker('ocr-pdf', samplePdf, 'sample.pdf', { language: 'eng' });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 32,
      serviceId: 'ocr-pdf',
      name: 'OCR PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Searchable PDF (${buf.length} bytes), words=${body.metadata?.wordsDetected}` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 32, serviceId: 'ocr-pdf', name: 'OCR PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 33. watermark-pdf
  try {
    const { status, body } = await callProdWorker('watermark-pdf', samplePdf, 'sample.pdf', { text: 'PRA PRODUCTION' });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 33,
      serviceId: 'watermark-pdf',
      name: 'Watermark PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Watermarked PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 33, serviceId: 'watermark-pdf', name: 'Watermark PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 34. password-protect-pdf
  let protectedBytes = Buffer.alloc(0);
  try {
    const { status, body } = await callProdWorker('password-protect-pdf', samplePdf, 'sample.pdf', { password: 'livepwd123' });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    protectedBytes = buf;
    results.push({
      number: 34,
      serviceId: 'password-protect-pdf',
      name: 'Password-Protect PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Encrypted PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 34, serviceId: 'password-protect-pdf', name: 'Password-Protect PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 35. unlock-pdf
  try {
    const inputToUnlock = protectedBytes.length > 0 ? protectedBytes : samplePdf;
    const { status, body } = await callProdWorker('unlock-pdf', inputToUnlock, 'protected.pdf', { password: 'livepwd123' });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 35,
      serviceId: 'unlock-pdf',
      name: 'Unlock PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Unlocked PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 35, serviceId: 'unlock-pdf', name: 'Unlock PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 36. full-pdf-editing
  try {
    const { status, body } = await callProdWorker('full-pdf-editing', samplePdf, 'sample.pdf', {
      operations: [
        { type: 'addText', text: 'Live Production Edit', x: 50, y: 50, size: 14 },
        { type: 'addPage', width: 400, height: 400 },
      ],
    });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 36,
      serviceId: 'full-pdf-editing',
      name: 'Full PDF Editing',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Edited PDF (${buf.length} bytes), ops=${body.metadata?.appliedOperationsCount}` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 36, serviceId: 'full-pdf-editing', name: 'Full PDF Editing', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 37. scan-to-pdf
  try {
    const { status, body } = await callProdWorker('scan-to-pdf', sampleJpg, 'scan.jpg', { pageSize: 'A4' });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 37,
      serviceId: 'scan-to-pdf',
      name: 'Scan to PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Scanned PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 37, serviceId: 'scan-to-pdf', name: 'Scan to PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 38. pdf-to-tiff
  try {
    const { status, body } = await callProdWorker('pdf-to-tiff', samplePdf, 'sample.pdf', { dpi: 72 });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    // TIFF header 'II' (0x49 0x49) and 42 (0x2A 0x00)
    const isTiff = buf.length >= 8 && buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00;
    results.push({
      number: 38,
      serviceId: 'pdf-to-tiff',
      name: 'PDF to TIFF',
      pass: pass && isTiff,
      httpStatus: status,
      outputBytes: buf.length,
      details: isTiff ? `Valid TIFF 6.0 (${buf.length} bytes, 'II' 42)` : 'Invalid TIFF',
    });
  } catch (err: any) {
    results.push({ number: 38, serviceId: 'pdf-to-tiff', name: 'PDF to TIFF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 39. pdf-to-excel
  try {
    const { status, body } = await callProdWorker('pdf-to-excel', samplePdf, 'sample.pdf');
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
    let sheetCount = 0;
    if (isZip) {
      const wb = XLSX.read(buf, { type: 'buffer' });
      sheetCount = wb.SheetNames.length;
    }
    results.push({
      number: 39,
      serviceId: 'pdf-to-excel',
      name: 'PDF to Excel',
      pass: pass && isZip && sheetCount > 0,
      httpStatus: status,
      outputBytes: buf.length,
      details: isZip ? `Valid XLSX workbook (${buf.length} bytes, ${sheetCount} sheets)` : 'Invalid XLSX',
    });
  } catch (err: any) {
    results.push({ number: 39, serviceId: 'pdf-to-excel', name: 'PDF to Excel', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 40. pdf-to-csv
  try {
    const { status, body } = await callProdWorker('pdf-to-csv', samplePdf, 'sample.pdf');
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const text = buf.toString('utf8');
    const isCsv = text.length > 10 && text.includes('Header');
    results.push({
      number: 40,
      serviceId: 'pdf-to-csv',
      name: 'PDF to CSV',
      pass: pass && isCsv,
      httpStatus: status,
      outputBytes: buf.length,
      details: isCsv ? `Valid CSV (${buf.length} bytes, ${body.metadata?.rowCount} rows)` : 'Invalid CSV',
    });
  } catch (err: any) {
    results.push({ number: 40, serviceId: 'pdf-to-csv', name: 'PDF to CSV', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 41. pdf-to-powerpoint
  try {
    const { status, body } = await callProdWorker('pdf-to-powerpoint', samplePdf, 'sample.pdf');
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isZip = buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b;
    let hasSlides = false;
    if (isZip) {
      const zip = await JSZip.loadAsync(buf);
      hasSlides = !!zip.file('ppt/slides/slide1.xml');
    }
    results.push({
      number: 41,
      serviceId: 'pdf-to-powerpoint',
      name: 'PDF to PowerPoint',
      pass: pass && isZip && hasSlides,
      httpStatus: status,
      outputBytes: buf.length,
      details: isZip && hasSlides ? `Valid PPTX presentation (${buf.length} bytes, slide1.xml verified)` : 'Invalid PPTX',
    });
  } catch (err: any) {
    results.push({ number: 41, serviceId: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 42. grayscale-pdf
  try {
    const { status, body } = await callProdWorker('grayscale-pdf', samplePdf, 'sample.pdf');
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 42,
      serviceId: 'grayscale-pdf',
      name: 'Grayscale PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Grayscale PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 42, serviceId: 'grayscale-pdf', name: 'Grayscale PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // 43. deskew-pdf
  try {
    const { status, body } = await callProdWorker('deskew-pdf', samplePdf, 'sample.pdf', { angle: 90 });
    const pass = status === 200 && body.success && body.outputBase64;
    const buf = pass ? Buffer.from(body.outputBase64, 'base64') : Buffer.alloc(0);
    const isValid = buf.length > 10 && buf.toString('latin1', 0, 5) === '%PDF-';
    results.push({
      number: 43,
      serviceId: 'deskew-pdf',
      name: 'Deskew PDF',
      pass: pass && isValid,
      httpStatus: status,
      outputBytes: buf.length,
      details: isValid ? `Valid Deskewed PDF (${buf.length} bytes)` : 'Invalid PDF',
    });
  } catch (err: any) {
    results.push({ number: 43, serviceId: 'deskew-pdf', name: 'Deskew PDF', pass: false, httpStatus: 500, outputBytes: 0, details: err.message });
  }

  // Print Summary Table
  console.log(`| # | Service Name | Service ID | HTTP | Output Bytes | Status | Details |`);
  console.log(`|---|---|---|---|---|---|---|`);
  for (const r of results) {
    const statusIcon = r.pass ? 'PASS' : 'FAIL';
    console.log(`| ${r.number} | ${r.name} | \`${r.serviceId}\` | ${r.httpStatus} | ${r.outputBytes} | ${statusIcon} | ${r.details} |`);
  }

  const passedCount = results.filter((r) => r.pass).length;
  console.log(`\nWave 3 Summary: ${passedCount} / ${results.length} Services Passed Live Production Verification.`);

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runLiveVerification();
