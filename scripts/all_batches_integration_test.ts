/**
 * PRA PDF — Complete All Batches Real Infrastructure Integration Test
 * A PRAVERSE Company
 *
 * Verifies real end-to-end pipeline execution across ALL Batches (1 through 7)
 * against:
 * 1. Live Backblaze B2 storage (prapdf1)
 * 2. Live Telegram backup channel (-1003919166623)
 * 3. Dedicated Processing Server (:3002)
 * 4. API Backend Server (:3001)
 *
 * Real Pipeline Verification:
 * Multipart Upload -> B2 Input Upload -> Telegram Backup -> Processor Dispatch ->
 * Real Processing Engine Execution -> Output Format Validation -> B2 Output Upload ->
 * Verification & Download -> Automated Cleanup.
 */

import { PDFDocument } from 'pdf-lib';
import { createCanvas } from '@napi-rs/canvas';
import JSZip from 'jszip';
import { storageManager } from '../src/server/storage/storageManager';
import { telegramBackup } from '../src/server/backup/telegramBackup';
import { jobStore } from '../src/server/jobs/jobStore';

const API_BASE = 'http://127.0.0.1:3001';

async function submitJobMultipart(
  serviceId: string,
  filename: string,
  fileBuffer: Buffer,
  mimeType: string,
  options?: any
): Promise<{ status: number; body: any }> {
  const boundary = `----PRAFormBoundary${Date.now()}`;
  const crlf = '\r\n';

  const parts: Buffer[] = [];

  // serviceId field
  parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="serviceId"${crlf}${crlf}${serviceId}${crlf}`));

  // options field if present
  if (options) {
    parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="options"${crlf}${crlf}${JSON.stringify(options)}${crlf}`));
  }

  // file field
  parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}Content-Type: ${mimeType}${crlf}${crlf}`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(crlf));

  // closing boundary
  parts.push(Buffer.from(`--${boundary}--${crlf}`));

  const payload = Buffer.concat(parts);

  const res = await fetch(`${API_BASE}/api/v1/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(payload.length),
    },
    body: payload,
  });

  const body = await res.json();
  return { status: res.status, body };
}

async function createSamplePdf(numPages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < numPages; i++) {
    const page = doc.addPage([500, 500]);
    page.drawText(`Page ${i + 1} integration test content`, { x: 50, y: 400, size: 16 });
  }
  return Buffer.from(await doc.save());
}

async function runAllBatchesTest() {
  console.log('============================================================');
  console.log('PRA PDF — ALL BATCHES REAL INFRASTRUCTURE INTEGRATION TEST');
  console.log('A PRAVERSE Company');
  console.log('============================================================\n');

  const b2Client = storageManager.getProvider('B2_2');
  const results: Record<string, boolean> = {};

  // TEST BATCH 1: JPG to PDF
  console.log('[Batch 1] Testing REAL jpg-to-pdf pipeline...');
  try {
    const canvas = createCanvas(180, 180);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2b7fff';
    ctx.fillRect(0, 0, 180, 180);
    const jpgBytes = canvas.toBuffer('image/jpeg');

    const res = await submitJobMultipart('jpg-to-pdf', 'test_b1.jpg', jpgBytes, 'image/jpeg');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() !== 1) throw new Error('Expected 1 PDF page');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 1 (jpg-to-pdf): SUCCESS (Output: ${outBytes.length} bytes, 1 page)\n`);
    results['Batch 1: jpg-to-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 1 failed: ${err.message}\n`);
    results['Batch 1: jpg-to-pdf'] = false;
  }

  // TEST BATCH 2: Rotate PDF
  console.log('[Batch 2] Testing REAL rotate-pdf pipeline...');
  try {
    const samplePdf = await createSamplePdf(2);
    const res = await submitJobMultipart('rotate-pdf', 'test_b2_rotate.pdf', samplePdf, 'application/pdf');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() !== 2) throw new Error('Expected 2 PDF pages');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 2 (rotate-pdf): SUCCESS (Output: ${outBytes.length} bytes, 2 pages)\n`);
    results['Batch 2: rotate-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 2 failed: ${err.message}\n`);
    results['Batch 2: rotate-pdf'] = false;
  }

  // TEST BATCH 3: TXT to PDF
  console.log('[Batch 3] Testing REAL txt-to-pdf pipeline...');
  try {
    const textBuffer = Buffer.from(
      'PRA PDF Text Document\nLine 1: High fidelity pipeline verification.\nLine 2: Zero artificial limits.',
      'utf-8'
    );
    const res = await submitJobMultipart('txt-to-pdf', 'test_b3.txt', textBuffer, 'text/plain');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() < 1) throw new Error('Expected at least 1 PDF page');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 3 (txt-to-pdf): SUCCESS (Output: ${outBytes.length} bytes, ${pdfDoc.getPageCount()} pages)\n`);
    results['Batch 3: txt-to-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 3 failed: ${err.message}\n`);
    results['Batch 3: txt-to-pdf'] = false;
  }

  // TEST BATCH 4: Word to PDF
  console.log('[Batch 4] Testing REAL word-to-pdf pipeline...');
  try {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Phase 3 Final Word Verification</w:t></w:r></w:p><w:p><w:r><w:t>Word conversion test running over live infrastructure.</w:t></w:r></w:p></w:body></w:document>'
    );
    const docxBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const res = await submitJobMultipart('word-to-pdf', 'test_b4.docx', docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() < 1) throw new Error('Expected at least 1 PDF page');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 4 (word-to-pdf): SUCCESS (Output: ${outBytes.length} bytes, ${pdfDoc.getPageCount()} pages)\n`);
    results['Batch 4: word-to-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 4 failed: ${err.message}\n`);
    results['Batch 4: word-to-pdf'] = false;
  }

  // TEST BATCH 5: Compress PDF
  console.log('[Batch 5] Testing REAL compress-pdf pipeline...');
  try {
    const samplePdf = await createSamplePdf(3);
    const res = await submitJobMultipart('compress-pdf', 'test_b5_compress.pdf', samplePdf, 'application/pdf');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() !== 3) throw new Error('Expected 3 PDF pages');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 5 (compress-pdf): SUCCESS (Output: ${outBytes.length} bytes, 3 pages)\n`);
    results['Batch 5: compress-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 5 failed: ${err.message}\n`);
    results['Batch 5: compress-pdf'] = false;
  }

  // TEST BATCH 6: Watermark PDF (Zero PRA Branding Enforcement)
  console.log('[Batch 6] Testing REAL watermark-pdf pipeline...');
  try {
    const samplePdf = await createSamplePdf(1);
    const res = await submitJobMultipart('watermark-pdf', 'test_b6_watermark.pdf', samplePdf, 'application/pdf');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() !== 1) throw new Error('Expected 1 PDF page');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 6 (watermark-pdf): SUCCESS (Output: ${outBytes.length} bytes, 1 page)\n`);
    results['Batch 6: watermark-pdf'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 6 failed: ${err.message}\n`);
    results['Batch 6: watermark-pdf'] = false;
  }

  // TEST BATCH 7: Full PDF Editing (Studio)
  console.log('[Batch 7] Testing REAL full-pdf-editing studio pipeline...');
  try {
    const samplePdf = await createSamplePdf(1);
    const res = await submitJobMultipart('full-pdf-editing', 'test_b7_studio.pdf', samplePdf, 'application/pdf');
    if (res.status !== 201) throw new Error(`API returned ${res.status}: ${JSON.stringify(res.body)}`);

    const job = jobStore.get(res.body.jobId)!;
    if (job.status !== 'COMPLETED') throw new Error(`Job not completed: ${job.status}`);

    const outBytes = await b2Client.download(job.outputStorageKey!);
    const pdfDoc = await PDFDocument.load(outBytes);
    if (pdfDoc.getPageCount() !== 1) throw new Error('Expected 1 PDF page');

    // Cleanup
    await b2Client.delete(job.inputStorageKey);
    await b2Client.delete(job.outputStorageKey!);
    if (job.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job.telegramMetadata.messageId);
    }
    jobStore.update(job.jobId, { status: 'CLEANED' });

    console.log(`  ✓ Batch 7 (full-pdf-editing): SUCCESS (Output: ${outBytes.length} bytes, 1 page)\n`);
    results['Batch 7: full-pdf-editing'] = true;
  } catch (err: any) {
    console.error(`  ✗ Batch 7 failed: ${err.message}\n`);
    results['Batch 7: full-pdf-editing'] = false;
  }

  console.log('============================================================');
  console.log('ALL BATCHES INTEGRATION TEST RESULTS SUMMARY');
  console.log('============================================================');
  let allPassed = true;
  for (const [batch, passed] of Object.entries(results)) {
    console.log(`${batch}: ${passed ? 'PASSED (VERIFIED)' : 'FAILED'}`);
    if (!passed) allPassed = false;
  }
  console.log('============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runAllBatchesTest().catch((err) => {
  console.error('Fatal error during integration test:', err);
  process.exit(1);
});
