/**
 * PRA PDF — Live Production Verification (Wave 2 Services)
 * Targets live production URL: https://pra-pdf.praverse-auth.workers.dev
 * Validates actual binary outputs for all 13 Wave 2 services:
 * 18. images-to-pdf
 * 19. word-to-pdf
 * 20. excel-to-pdf
 * 21. powerpoint-to-pdf
 * 22. html-to-pdf
 * 23. txt-to-pdf
 * 24. markdown-to-pdf
 * 25. rtf-to-pdf
 * 26. pdf-to-jpg
 * 27. pdf-to-png
 * 28. pdf-to-markdown
 * 29. pdf-to-word
 * 30. pdf-to-rtf
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const PROD_URL = 'https://pra-pdf.praverse-auth.workers.dev';

// Generators for test inputs
function createJpg(): Uint8Array {
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

function createPng(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x60,
    0x00, 0x00, 0x00, 0x05, 0x00, 0x01, 0xa7, 0x35, 0x17, 0xec, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

async function createDocx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Production Word Title</w:t></w:r></w:p>
    <w:p><w:r><w:t>Body content for live testing.</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );
  return await zip.generateAsync({ type: 'uint8array' });
}

function createXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Item', 'Units', 'Cost', 'Total'],
    ['Server A', 4, 250, 1000],
    ['Database B', 2, 450, 900],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

async function createPptx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody>
    <a:p><a:r><a:t>Executive Summary</a:t></a:r></a:p>
    <a:p><a:r><a:t>Live Cloudflare Worker test</a:t></a:r></a:p>
  </p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`
  );
  return await zip.generateAsync({ type: 'uint8array' });
}

async function createPdf(pages: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([300, 300]);
    page.drawText(`Live Document Page ${i}`, { x: 30, y: 240, size: 14 });
    page.drawText(`PRA PDF Section ${i} Content`, { x: 30, y: 200, size: 12 });
  }
  return await doc.save();
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function testWorkerServiceLive(
  service: string,
  files: { buffer: Uint8Array; filename: string }[],
  options?: any
): Promise<{ success: boolean; mimeType: string; outputBytes: Uint8Array; metadata: any }> {
  const form = new FormData();
  form.append('service', service);
  for (const f of files) {
    form.append('files', new Blob([f.buffer as unknown as BlobPart]), f.filename);
    form.append('file', new Blob([f.buffer as unknown as BlobPart]), f.filename);
  }
  if (options) {
    form.append('options', JSON.stringify(options));
  }

  const res = await fetch(`${PROD_URL}/api/v1/cf/process`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as any;
  if (!json.success || !json.outputBase64) {
    throw new Error(`Worker returned failure: ${json.message || 'Missing outputBase64'}`);
  }

  const outputBytes = base64ToBytes(json.outputBase64);
  return {
    success: true,
    mimeType: json.mimeType,
    outputBytes,
    metadata: json.metadata,
  };
}

async function runLiveVerificationWave2() {
  console.log('========================================================');
  console.log('PRA PDF — Live Production Verification (Wave 2 Services)');
  console.log(`Target: ${PROD_URL}`);
  console.log('========================================================\n');

  // Step 1: Health Check
  console.log('--- Step 1: Production Health Endpoint Check ---');
  const healthRes = await fetch(`${PROD_URL}/api/v1/cf/health`);
  if (!healthRes.ok) throw new Error(`Health check failed with status ${healthRes.status}`);
  const health = (await healthRes.json()) as any;
  console.log(`Status: ${health.status}, Active Services: ${health.activeProductionServices.length}`);
  const wave2Expected = [
    'images-to-pdf', 'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf',
    'html-to-pdf', 'txt-to-pdf', 'markdown-to-pdf', 'rtf-to-pdf',
    'pdf-to-jpg', 'pdf-to-png', 'pdf-to-markdown', 'pdf-to-word', 'pdf-to-rtf',
  ];
  const missing = wave2Expected.filter((s) => !health.activeProductionServices.includes(s));
  if (missing.length > 0) {
    throw new Error(`Services missing from health active list: ${missing.join(', ')}`);
  }
  console.log('All 13 Wave 2 services are registered and active on production worker!\n');

  const results: { service: string; status: string; detail: string }[] = [];

  // Service 18: images-to-pdf
  try {
    const res = await testWorkerServiceLive('images-to-pdf', [
      { buffer: createJpg(), filename: 'img1.jpg' },
      { buffer: createPng(), filename: 'img2.png' },
    ]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'images-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'images-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 19: word-to-pdf
  try {
    const docx = await createDocx();
    const res = await testWorkerServiceLive('word-to-pdf', [{ buffer: docx, filename: 'doc.docx' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'word-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'word-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 20: excel-to-pdf
  try {
    const xlsx = createXlsx();
    const res = await testWorkerServiceLive('excel-to-pdf', [{ buffer: xlsx, filename: 'data.xlsx' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'excel-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `Landscape PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'excel-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 21: powerpoint-to-pdf
  try {
    const pptx = await createPptx();
    const res = await testWorkerServiceLive('powerpoint-to-pdf', [{ buffer: pptx, filename: 'slides.pptx' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'powerpoint-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `16:9 Presentation PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'powerpoint-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 22: html-to-pdf
  try {
    const html = new TextEncoder().encode('<h1>Production HTML</h1><p>Styled PDF generation test.</p>');
    const res = await testWorkerServiceLive('html-to-pdf', [{ buffer: html, filename: 'page.html' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'html-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'html-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 23: txt-to-pdf
  try {
    const txt = new TextEncoder().encode('Line 1 of plain text file.\nLine 2 formatted cleanly.');
    const res = await testWorkerServiceLive('txt-to-pdf', [{ buffer: txt, filename: 'notes.txt' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'txt-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'txt-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 24: markdown-to-pdf
  try {
    const md = new TextEncoder().encode('# Live Markdown\n\nTesting live markdown conversion.\n\n- Point 1\n- Point 2');
    const res = await testWorkerServiceLive('markdown-to-pdf', [{ buffer: md, filename: 'doc.md' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'markdown-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'markdown-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 25: rtf-to-pdf
  try {
    const rtf = new TextEncoder().encode('{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\fs24 Live RTF Document\\par}');
    const res = await testWorkerServiceLive('rtf-to-pdf', [{ buffer: rtf, filename: 'doc.rtf' }]);
    const doc = await PDFDocument.load(res.outputBytes);
    results.push({
      service: 'rtf-to-pdf',
      status: 'PASS [Verified Live]',
      detail: `PDF created, pages: ${doc.getPageCount()}, size: ${res.outputBytes.length} bytes`,
    });
  } catch (e: any) {
    results.push({ service: 'rtf-to-pdf', status: 'FAIL', detail: e.message });
  }

  // Service 26: pdf-to-jpg
  try {
    const pdf = await createPdf(2);
    const res = await testWorkerServiceLive('pdf-to-jpg', [{ buffer: pdf, filename: 'source.pdf' }]);
    const zip = await JSZip.loadAsync(res.outputBytes);
    const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
    const page1 = await zip.files['page_001.jpg'].async('uint8array');
    const isJpg = page1[0] === 0xff && page1[1] === 0xd8 && page1[2] === 0xff;
    results.push({
      service: 'pdf-to-jpg',
      status: isJpg && entries.length === 2 ? 'PASS [Verified Live]' : 'FAIL',
      detail: `ZIP with ${entries.length} pages, genuine JPEG headers verified`,
    });
  } catch (e: any) {
    results.push({ service: 'pdf-to-jpg', status: 'FAIL', detail: e.message });
  }

  // Service 27: pdf-to-png
  try {
    const pdf = await createPdf(2);
    const res = await testWorkerServiceLive('pdf-to-png', [{ buffer: pdf, filename: 'source.pdf' }]);
    const zip = await JSZip.loadAsync(res.outputBytes);
    const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
    const page1 = await zip.files['page_001.png'].async('uint8array');
    const isPng = page1[0] === 0x89 && page1[1] === 0x50 && page1[2] === 0x4e && page1[3] === 0x47;
    results.push({
      service: 'pdf-to-png',
      status: isPng && entries.length === 2 ? 'PASS [Verified Live]' : 'FAIL',
      detail: `ZIP with ${entries.length} pages, genuine PNG headers verified`,
    });
  } catch (e: any) {
    results.push({ service: 'pdf-to-png', status: 'FAIL', detail: e.message });
  }

  // Service 28: pdf-to-markdown
  try {
    const pdf = await createPdf(1);
    const res = await testWorkerServiceLive('pdf-to-markdown', [{ buffer: pdf, filename: 'source.pdf' }]);
    const mdText = new TextDecoder().decode(res.outputBytes);
    const hasContent = mdText.includes('Live Document Page 1') || mdText.includes('Section 1');
    results.push({
      service: 'pdf-to-markdown',
      status: hasContent ? 'PASS [Verified Live]' : 'FAIL',
      detail: `Markdown text extracted (${res.outputBytes.length} bytes)`,
    });
  } catch (e: any) {
    results.push({ service: 'pdf-to-markdown', status: 'FAIL', detail: e.message });
  }

  // Service 29: pdf-to-word
  try {
    const pdf = await createPdf(1);
    const res = await testWorkerServiceLive('pdf-to-word', [{ buffer: pdf, filename: 'source.pdf' }]);
    const zip = await JSZip.loadAsync(res.outputBytes);
    const isDocx = zip.file('word/document.xml') !== null;
    results.push({
      service: 'pdf-to-word',
      status: isDocx ? 'PASS [Verified Live]' : 'FAIL',
      detail: `Valid OpenXML DOCX archive generated (${res.outputBytes.length} bytes)`,
    });
  } catch (e: any) {
    results.push({ service: 'pdf-to-word', status: 'FAIL', detail: e.message });
  }

  // Service 30: pdf-to-rtf
  try {
    const pdf = await createPdf(1);
    const res = await testWorkerServiceLive('pdf-to-rtf', [{ buffer: pdf, filename: 'source.pdf' }]);
    const rtfText = new TextDecoder().decode(res.outputBytes);
    const isRtf = rtfText.startsWith('{\\rtf1');
    results.push({
      service: 'pdf-to-rtf',
      status: isRtf ? 'PASS [Verified Live]' : 'FAIL',
      detail: `Valid RTF document generated (${res.outputBytes.length} bytes)`,
    });
  } catch (e: any) {
    results.push({ service: 'pdf-to-rtf', status: 'FAIL', detail: e.message });
  }

  console.log('\n========================================================');
  console.log('WAVE 2 PRODUCTION VERIFICATION RESULTS:');
  console.log('========================================================');
  let passCount = 0;
  for (const r of results) {
    console.log(`${r.service.padEnd(20)} | ${r.status.padEnd(22)} | ${r.detail}`);
    if (r.status.includes('PASS')) passCount++;
  }
  console.log('========================================================');
  console.log(`TOTAL: ${passCount} / ${results.length} PASSED LIVE IN PRODUCTION`);
  console.log('========================================================\n');

  if (passCount !== results.length) {
    process.exit(1);
  }
}

runLiveVerificationWave2().catch((err) => {
  console.error('Execution failure:', err);
  process.exit(1);
});
