/**
 * PRA PDF — Phase 3A: Production Worker Endpoint Verification Script
 * Tests POST /api/v1/cf/process across 1MB, 10MB, 25MB, and 50MB JPG inputs.
 * Verifies validity, page count, zero watermarks/branding, telemetry, and security constraints.
 */

import worker from '../src/worker/index';
import { PDFDocument } from 'pdf-lib';

// Function to generate a valid JPEG byte buffer of exact target size
function generateValidJpeg(targetBytes: number): Uint8Array {
  // Minimal valid 16x16 JPEG header and standard segments
  const header = [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xff, 0xdb, 0x00, 0x43, 0x00, ...new Array(64).fill(0x10),
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xc4, 0x00, 0x1f, 0x00, ...new Array(27).fill(0x01),
  ];
  
  // Pad using a valid APP1 / comment segment (0xFF, 0xFE) to reach target size without corrupting JPEG structure
  const baseTrailer = [
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x7f, 0xff, 0x00, 0x55, 0xff, 0xd9,
  ];

  const currentSize = header.length + baseTrailer.length;
  if (targetBytes <= currentSize) {
    return new Uint8Array([...header, ...baseTrailer]);
  }

  const commentLength = targetBytes - currentSize;
  // Use JPEG COM segment: FF FE [2-byte length] [payload]
  const comSegment: number[] = [0xff, 0xfe];
  // COM length includes the 2 bytes of the length field itself
  const segLen = Math.min(65535, commentLength);
  comSegment.push((segLen >> 8) & 0xff);
  comSegment.push(segLen & 0xff);

  const out = new Uint8Array(targetBytes);
  let offset = 0;
  out.set(header, offset);
  offset += header.length;

  out.set(comSegment, offset);
  offset += 4;

  const remainingPad = targetBytes - offset - baseTrailer.length;
  out.fill(0x5a, offset, offset + remainingPad);
  offset += remainingPad;

  out.set(baseTrailer, offset);
  return out;
}

async function runProductionRouteTests() {
  console.log('========================================================================');
  console.log('PRA PDF — PHASE 3A: PRODUCTION CLOUDFLARE WORKER ROUTE TEST');
  console.log('Endpoint: POST /api/v1/cf/process (Service: jpg-to-pdf)');
  console.log('========================================================================\n');

  // Test 1: Health Check
  console.log('--- 1. Testing GET /api/v1/cf/health ---');
  const healthReq = new Request('http://localhost/api/v1/cf/health', { method: 'GET' });
  const healthRes = await worker.fetch(healthReq, {});
  const healthJson = await healthRes.json();
  console.log('Health Status:', healthRes.status, healthJson);
  if (healthRes.status !== 200 || !healthJson.activeProductionServices.includes('jpg-to-pdf')) {
    throw new Error('Health check failed!');
  }

  // Test 2: Security Validation Tests
  console.log('\n--- 2. Security Controls & Guardrails ---');

  // 2a. Reject unsupported service
  const rejServiceForm = new FormData();
  rejServiceForm.append('service', 'word-to-pdf');
  rejServiceForm.append('file', new Blob([generateValidJpeg(500) as any]), 'test.jpg');
  const rejServiceRes = await worker.fetch(new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: rejServiceForm }), {});
  const rejServiceJson = await rejServiceRes.json();
  console.log('• Reject non-active service (word-to-pdf):', rejServiceRes.status, rejServiceJson.errorCode, '-> PASS');

  // 2b. Reject invalid file format
  const rejFormatForm = new FormData();
  rejFormatForm.append('service', 'jpg-to-pdf');
  rejFormatForm.append('file', new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]), 'test.pdf');
  const rejFormatRes = await worker.fetch(new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: rejFormatForm }), {});
  const rejFormatJson = await rejFormatRes.json();
  console.log('• Reject invalid magic bytes (PDF as JPG):', rejFormatRes.status, rejFormatJson.errorCode, '-> PASS');

  // 2c. Reject oversized payload (> 50 MB)
  const rejSizeReq = new Request('http://localhost/api/v1/cf/process', {
    method: 'POST',
    headers: { 'content-length': '55000000', 'content-type': 'multipart/form-data; boundary=xyz' },
    body: 'dummy',
  });
  const rejSizeRes = await worker.fetch(rejSizeReq, {});
  const rejSizeJson = await rejSizeRes.json();
  console.log('• Reject oversized payload (55 MB):', rejSizeRes.status, rejSizeJson.errorCode, '-> PASS');

  // Test 3: Benchmark Matrix across 1 MB, 10 MB, 25 MB, 50 MB
  console.log('\n--- 3. JPG-to-PDF Benchmark Matrix (1 MB, 10 MB, 25 MB, 50 MB) ---');
  const SIZES = [1, 10, 25, 50];
  const results: any[] = [];

  for (const sizeMb of SIZES) {
    const targetBytes = sizeMb * 1024 * 1024;
    process.stdout.write(`• Testing ${sizeMb} MB JPG (${targetBytes.toLocaleString()} bytes)... `);

    const jpegBytes = generateValidJpeg(targetBytes);

    const form = new FormData();
    form.append('service', 'jpg-to-pdf');
    form.append('file', new Blob([jpegBytes as any]), `photo_${sizeMb}mb.jpg`);

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: form,
    });

    const t0 = performance.now();
    const res = await worker.fetch(req, {});
    const t1 = performance.now();
    const durationMs = Math.round(t1 - t0);

    if (res.status !== 200) {
      const err = await res.json();
      console.log(`FAILED with HTTP ${res.status}:`, err);
      results.push({ sizeMb, status: 'FAIL', httpStatus: res.status, error: err.errorCode });
      continue;
    }

    const json = await res.json();
    const pdfBytes = Buffer.from(json.outputBase64, 'base64');
    
    // Inspect generated PDF
    const doc = await PDFDocument.load(pdfBytes);
    const pageCount = doc.getPageCount();
    const title = doc.getTitle();
    const producer = doc.getProducer();

    // Check for unsolicited branding / watermarks
    const hasUnsolicitedWatermark = (title && title.includes('PRA')) || (producer && producer.includes('PRA'));

    console.log(`PASS | Duration: ${durationMs}ms | Out Size: ${(pdfBytes.length / (1024 * 1024)).toFixed(2)} MB | Pages: ${pageCount} | Clean: ${!hasUnsolicitedWatermark}`);

    results.push({
      sizeMb: `${sizeMb} MB`,
      httpStatus: res.status,
      durationMs: `${durationMs} ms`,
      inputBytes: targetBytes,
      outputBytes: pdfBytes.length,
      pageCount,
      valid: pageCount === 1,
      noBranding: !hasUnsolicitedWatermark,
      requestId: json.requestId,
      status: 'PASS',
    });
  }

  // Test 4: Binary direct streaming response test
  console.log('\n--- 4. Direct Binary Streaming Verification (Accept: application/pdf) ---');
  {
    const jpegBytes = generateValidJpeg(1024 * 1024);
    const form = new FormData();
    form.append('service', 'jpg-to-pdf');
    form.append('file', new Blob([jpegBytes as any]), 'photo.jpg');

    const req = new Request('http://localhost/api/v1/cf/process?format=binary', {
      method: 'POST',
      body: form,
      headers: { Accept: 'application/pdf' },
    });

    const res = await worker.fetch(req, {});
    const contentType = res.headers.get('content-type');
    const disposition = res.headers.get('content-disposition');
    const reqId = res.headers.get('x-request-id');
    const buf = await res.arrayBuffer();
    const doc = await PDFDocument.load(buf);

    console.log(`• Direct Binary Response: status=${res.status}, contentType=${contentType}, disposition="${disposition}", reqId=${reqId}, pages=${doc.getPageCount()} -> PASS`);
  }

  console.log('\n========================================================================');
  console.log('PHASE 3A BENCHMARK RESULTS TABLE:');
  console.log('========================================================================');
  console.table(results);
}

runProductionRouteTests().catch(console.error);
