/**
 * PRA PDF — Batch 1 Real Infrastructure Integration Test
 * A PRAVERSE Company
 * Tests real end-to-end execution of:
 * 1. JPG to PDF (jpg-to-pdf)
 * 2. PNG to PDF (png-to-pdf)
 * 3. Images to PDF (images-to-pdf)
 * 4. PDF to JPG (pdf-to-jpg)
 * 5. PDF to PNG (pdf-to-png)
 *
 * Pipeline:
 * Real Input -> API :3001 -> B2 Upload -> Telegram Backup -> Processor :3002 -> Output Validation -> B2 Output Upload -> Download & Verify -> Safe Cleanup
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
  mimeType: string
): Promise<{ status: number; body: any }> {
  const boundary = `----PRAFormBoundary${Date.now()}`;
  const crlf = '\r\n';

  const parts: Buffer[] = [];

  // serviceId field
  parts.push(Buffer.from(`--${boundary}${crlf}Content-Disposition: form-data; name="serviceId"${crlf}${crlf}${serviceId}${crlf}`));

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

async function runBatch1Test() {
  console.log('============================================================');
  console.log('PRA PDF — BATCH 1 REAL INFRASTRUCTURE INTEGRATION TEST');
  console.log('============================================================\n');

  const b2Client = storageManager.getProvider('B2_2');
  const results: Record<string, boolean> = {};

  // TEST 1: JPG to PDF
  console.log('[1/5] Testing REAL jpg-to-pdf pipeline...');
  try {
    const c1 = createCanvas(200, 150);
    const ctx1 = c1.getContext('2d');
    ctx1.fillStyle = '#ff4444';
    ctx1.fillRect(0, 0, 200, 150);
    const jpgBytes = c1.toBuffer('image/jpeg');

    const res1 = await submitJobMultipart('jpg-to-pdf', 'sample_test.jpg', jpgBytes, 'image/jpeg');
    console.log(`  API Response: ${res1.status}, JobId: ${res1.body.jobId}`);
    if (res1.status !== 201) throw new Error(`API failed: ${JSON.stringify(res1.body)}`);

    const job1 = jobStore.get(res1.body.jobId)!;
    console.log(`  Job Status: ${job1.status}, Output Key: ${job1.outputStorageKey}`);
    if (job1.status !== 'COMPLETED') throw new Error(`Job not completed: ${job1.status}`);

    const outBytes1 = await b2Client.download(job1.outputStorageKey!);
    const pdf1 = await PDFDocument.load(outBytes1);
    console.log(`  Downloaded Output PDF: ${outBytes1.length} bytes, Pages: ${pdf1.getPageCount()}`);
    if (pdf1.getPageCount() !== 1) throw new Error('Expected 1 PDF page');

    // Clean up
    await b2Client.delete(job1.inputStorageKey);
    await b2Client.delete(job1.outputStorageKey!);
    if (job1.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job1.telegramMetadata.messageId);
    }
    jobStore.update(job1.jobId, { status: 'CLEANED' });
    console.log('  ✓ jpg-to-pdf: VERIFIED\n');
    results['jpg-to-pdf'] = true;
  } catch (err: any) {
    console.error('  ✗ jpg-to-pdf FAILED:', err.message, '\n');
    results['jpg-to-pdf'] = false;
  }

  // TEST 2: PNG to PDF
  console.log('[2/5] Testing REAL png-to-pdf pipeline...');
  try {
    const c2 = createCanvas(180, 180);
    const ctx2 = c2.getContext('2d');
    ctx2.fillStyle = 'rgba(0, 128, 255, 0.8)';
    ctx2.fillRect(10, 10, 160, 160);
    const pngBytes = c2.toBuffer('image/png');

    const res2 = await submitJobMultipart('png-to-pdf', 'sample_test.png', pngBytes, 'image/png');
    console.log(`  API Response: ${res2.status}, JobId: ${res2.body.jobId}`);
    if (res2.status !== 201) throw new Error(`API failed: ${JSON.stringify(res2.body)}`);

    const job2 = jobStore.get(res2.body.jobId)!;
    console.log(`  Job Status: ${job2.status}, Output Key: ${job2.outputStorageKey}`);
    if (job2.status !== 'COMPLETED') throw new Error(`Job not completed: ${job2.status}`);

    const outBytes2 = await b2Client.download(job2.outputStorageKey!);
    const pdf2 = await PDFDocument.load(outBytes2);
    console.log(`  Downloaded Output PDF: ${outBytes2.length} bytes, Pages: ${pdf2.getPageCount()}`);
    if (pdf2.getPageCount() !== 1) throw new Error('Expected 1 PDF page');

    // Clean up
    await b2Client.delete(job2.inputStorageKey);
    await b2Client.delete(job2.outputStorageKey!);
    if (job2.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job2.telegramMetadata.messageId);
    }
    jobStore.update(job2.jobId, { status: 'CLEANED' });
    console.log('  ✓ png-to-pdf: VERIFIED\n');
    results['png-to-pdf'] = true;
  } catch (err: any) {
    console.error('  ✗ png-to-pdf FAILED:', err.message, '\n');
    results['png-to-pdf'] = false;
  }

  // TEST 3: Images to PDF (multi-image bundle)
  console.log('[3/5] Testing REAL images-to-pdf pipeline...');
  try {
    const c3a = createCanvas(100, 100);
    c3a.getContext('2d').fillRect(0, 0, 100, 100);
    const imgA = c3a.toBuffer('image/jpeg');

    const c3b = createCanvas(120, 120);
    c3b.getContext('2d').fillRect(0, 0, 120, 120);
    const imgB = c3b.toBuffer('image/png');

    const zip3 = new JSZip();
    zip3.file('01_page.jpg', imgA);
    zip3.file('02_page.png', imgB);
    const zipBytes = await zip3.generateAsync({ type: 'nodebuffer' });

    const res3 = await submitJobMultipart('images-to-pdf', 'bundle.zip', zipBytes, 'application/zip');
    console.log(`  API Response: ${res3.status}, JobId: ${res3.body.jobId}`);
    if (res3.status !== 201) throw new Error(`API failed: ${JSON.stringify(res3.body)}`);

    const job3 = jobStore.get(res3.body.jobId)!;
    console.log(`  Job Status: ${job3.status}, Output Key: ${job3.outputStorageKey}`);
    if (job3.status !== 'COMPLETED') throw new Error(`Job not completed: ${job3.status}`);

    const outBytes3 = await b2Client.download(job3.outputStorageKey!);
    const pdf3 = await PDFDocument.load(outBytes3);
    console.log(`  Downloaded Output PDF: ${outBytes3.length} bytes, Pages: ${pdf3.getPageCount()}`);
    if (pdf3.getPageCount() !== 2) throw new Error(`Expected 2 PDF pages, got ${pdf3.getPageCount()}`);

    // Clean up
    await b2Client.delete(job3.inputStorageKey);
    await b2Client.delete(job3.outputStorageKey!);
    if (job3.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job3.telegramMetadata.messageId);
    }
    jobStore.update(job3.jobId, { status: 'CLEANED' });
    console.log('  ✓ images-to-pdf: VERIFIED\n');
    results['images-to-pdf'] = true;
  } catch (err: any) {
    console.error('  ✗ images-to-pdf FAILED:', err.message, '\n');
    results['images-to-pdf'] = false;
  }

  // TEST 4: PDF to JPG
  console.log('[4/5] Testing REAL pdf-to-jpg pipeline...');
  try {
    const doc4 = await PDFDocument.create();
    doc4.addPage([200, 200]).drawText('PDF to JPG Page 1', { x: 20, y: 150, size: 14 });
    doc4.addPage([200, 200]).drawText('PDF to JPG Page 2', { x: 20, y: 150, size: 14 });
    const pdfBytes4 = Buffer.from(await doc4.save());

    const res4 = await submitJobMultipart('pdf-to-jpg', 'doc_to_jpg.pdf', pdfBytes4, 'application/pdf');
    console.log(`  API Response: ${res4.status}, JobId: ${res4.body.jobId}`);
    if (res4.status !== 201) throw new Error(`API failed: ${JSON.stringify(res4.body)}`);

    const job4 = jobStore.get(res4.body.jobId)!;
    console.log(`  Job Status: ${job4.status}, Output Key: ${job4.outputStorageKey}`);
    if (job4.status !== 'COMPLETED') throw new Error(`Job not completed: ${job4.status}`);

    const outBytes4 = await b2Client.download(job4.outputStorageKey!);
    const zip4 = await JSZip.loadAsync(outBytes4);
    const files4 = Object.keys(zip4.files).filter((k) => !zip4.files[k].dir);
    console.log(`  Downloaded Output ZIP: ${outBytes4.length} bytes, Files: ${JSON.stringify(files4)}`);
    if (files4.length !== 2) throw new Error(`Expected 2 image files in ZIP, got ${files4.length}`);

    // Clean up
    await b2Client.delete(job4.inputStorageKey);
    await b2Client.delete(job4.outputStorageKey!);
    if (job4.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job4.telegramMetadata.messageId);
    }
    jobStore.update(job4.jobId, { status: 'CLEANED' });
    console.log('  ✓ pdf-to-jpg: VERIFIED\n');
    results['pdf-to-jpg'] = true;
  } catch (err: any) {
    console.error('  ✗ pdf-to-jpg FAILED:', err.message, '\n');
    results['pdf-to-jpg'] = false;
  }

  // TEST 5: PDF to PNG
  console.log('[5/5] Testing REAL pdf-to-png pipeline...');
  try {
    const doc5 = await PDFDocument.create();
    doc5.addPage([200, 200]).drawText('PDF to PNG Page 1', { x: 20, y: 150, size: 14 });
    doc5.addPage([200, 200]).drawText('PDF to PNG Page 2', { x: 20, y: 150, size: 14 });
    const pdfBytes5 = Buffer.from(await doc5.save());

    const res5 = await submitJobMultipart('pdf-to-png', 'doc_to_png.pdf', pdfBytes5, 'application/pdf');
    console.log(`  API Response: ${res5.status}, JobId: ${res5.body.jobId}`);
    if (res5.status !== 201) throw new Error(`API failed: ${JSON.stringify(res5.body)}`);

    const job5 = jobStore.get(res5.body.jobId)!;
    console.log(`  Job Status: ${job5.status}, Output Key: ${job5.outputStorageKey}`);
    if (job5.status !== 'COMPLETED') throw new Error(`Job not completed: ${job5.status}`);

    const outBytes5 = await b2Client.download(job5.outputStorageKey!);
    const zip5 = await JSZip.loadAsync(outBytes5);
    const files5 = Object.keys(zip5.files).filter((k) => !zip5.files[k].dir);
    console.log(`  Downloaded Output ZIP: ${outBytes5.length} bytes, Files: ${JSON.stringify(files5)}`);
    if (files5.length !== 2) throw new Error(`Expected 2 image files in ZIP, got ${files5.length}`);

    // Clean up
    await b2Client.delete(job5.inputStorageKey);
    await b2Client.delete(job5.outputStorageKey!);
    if (job5.telegramMetadata?.messageId) {
      await telegramBackup.deleteBackupMessage(job5.telegramMetadata.messageId);
    }
    jobStore.update(job5.jobId, { status: 'CLEANED' });
    console.log('  ✓ pdf-to-png: VERIFIED\n');
    results['pdf-to-png'] = true;
  } catch (err: any) {
    console.error('  ✗ pdf-to-png FAILED:', err.message, '\n');
    results['pdf-to-png'] = false;
  }

  console.log('============================================================');
  console.log('BATCH 1 REAL INTEGRATION TEST SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('============================================================');

  const allPassed = Object.values(results).every(Boolean);
  process.exitCode = allPassed ? 0 : 1;
}

runBatch1Test().catch((err) => {
  console.error('Fatal batch 1 test error:', err);
  process.exitCode = 1;
});
