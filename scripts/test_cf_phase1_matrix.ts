/**
 * PRA PDF — Phase 1 Cloudflare Worker Processing Benchmark & Verification Matrix
 * A PRAVERSE Company
 *
 * Tests the real Worker entrypoint (worker.fetch) across:
 * - 8 Phase 1 Services
 * - 1 MB, 10 MB, 25 MB, and 50 MB file payloads
 * Records exact execution time, memory usage, output validation, and error states.
 */

import worker from '../src/worker/index';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

interface TestResult {
  service: string;
  targetSizeMb: number;
  actualInputSizeBytes: number;
  success: boolean;
  executionTimeMs: number;
  outputSizeBytes: number;
  outputValid: boolean;
  memoryDeltaMb: number;
  error?: string;
}

// Generates a valid PDF with real vector/stream content of approximately targetBytes
async function generateTestPdf(targetBytes: number, pageCount: number = 5): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`PRA PDF Test Page ${i + 1} of ${pageCount}`, {
      x: 50,
      y: 740,
      size: 16,
      font,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawRectangle({
      x: 50,
      y: 100,
      width: 512,
      height: 600,
      borderColor: rgb(0.3, 0.4, 0.8),
      borderWidth: 1,
    });
  }

  // Initial save
  let currentBytes = await doc.save();
  if (currentBytes.length >= targetBytes) {
    return currentBytes;
  }

  // Pad to targetBytes using an uncompressed PDF comment / stream
  const paddingNeeded = targetBytes - currentBytes.length;
  if (paddingNeeded > 0) {
    const paddingStr = '\n% PRA_PAD_' + 'A'.repeat(Math.max(0, paddingNeeded - 15)) + '\n';
    const combined = new Uint8Array(currentBytes.length + paddingStr.length);
    combined.set(currentBytes, 0);
    for (let j = 0; j < paddingStr.length; j++) {
      combined[currentBytes.length + j] = paddingStr.charCodeAt(j);
    }
    return combined;
  }

  return currentBytes;
}

// Generates a valid JPEG file of approximately targetBytes
function generateTestJpg(targetBytes: number): Uint8Array {
  // Minimal valid 1x1 JPEG baseline header
  const header = [
    0xff, 0xd8, // SOI
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, // APP0 JFIF
    0xff, 0xdb, 0x00, 0x43, 0x00, // DQT
  ];
  // 64 quantization table values
  const qtable = new Array(64).fill(0x10);
  const sof = [
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x10, 0x00, 0x10, 0x01, 0x01, 0x11, 0x00, // SOF0 (16x16)
    0xff, 0xc4, 0x00, 0x1f, 0x00, // DHT
  ];
  const dht = new Array(27).fill(0x01);
  const sos = [
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, // SOS
  ];
  const scanData = [0x7f, 0xff, 0x00, 0x55];
  const eoi = [0xff, 0xd9];

  // Base JPEG
  const baseJpg = Buffer.from([...header, ...qtable, ...sof, ...dht, ...sos, ...scanData, ...eoi]);

  if (baseJpg.length >= targetBytes) {
    return new Uint8Array(baseJpg);
  }

  // To make a valid JPEG of arbitrary size, embed a COM (Comment) marker: 0xFF 0xFE [length 2 bytes] [comment data]
  const comMarker = [0xff, 0xfe];
  const neededPadding = targetBytes - baseJpg.length;
  // COM marker max size is 65535, so we can chain multiple COM segments if needed
  const chunks: Buffer[] = [];
  // Write header up to before EOI
  chunks.push(baseJpg.subarray(0, baseJpg.length - 2));

  let remaining = neededPadding;
  while (remaining > 4) {
    const chunkLen = Math.min(65530, remaining);
    const lenHigh = (chunkLen >> 8) & 0xff;
    const lenLow = chunkLen & 0xff;
    const padChunk = Buffer.alloc(chunkLen - 2, 0x58); // filler 'X'
    chunks.push(Buffer.from([0xff, 0xfe, lenHigh, lenLow]));
    chunks.push(padChunk);
    remaining -= (chunkLen + 2);
  }

  chunks.push(baseJpg.subarray(baseJpg.length - 2)); // EOI
  const total = Buffer.concat(chunks);
  return new Uint8Array(total);
}

// Generates a valid DOCX file of approximately targetBytes
async function generateTestDocx(targetBytes: number, paragraphCount: number = 20): Promise<Uint8Array> {
  const zip = new JSZip();

  let paragraphsXml = '';
  for (let i = 1; i <= paragraphCount; i++) {
    const isHeading = i % 5 === 1;
    if (isHeading) {
      paragraphsXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Section ${Math.ceil(i / 5)}: PRA PDF Analysis</w:t></w:r></w:p>`;
    } else {
      paragraphsXml += `<w:p><w:r><w:t>This is paragraph ${i} containing realistic formatted text for document conversion benchmarking in the Cloudflare Worker runtime.</w:t></w:r></w:p>`;
    }
  }

  // If large targetBytes, pad paragraph text
  if (targetBytes > 500000) {
    const fillerSize = Math.min(targetBytes, 2000000);
    const filler = 'PRAVERSE '.repeat(Math.floor(fillerSize / 9));
    paragraphsXml += `<w:p><w:r><w:t>${filler}</w:t></w:r></w:p>`;
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', packageRelsXml);
  zip.file('word/document.xml', documentXml);

  // If even larger size requested, add dummy asset file inside zip
  const currentEst = 10000;
  if (targetBytes > currentEst) {
    const dummyBytes = Buffer.alloc(targetBytes - currentEst, 0x41);
    zip.file('word/media/filler.dat', dummyBytes);
  }

  const out = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return out;
}

// Validate whether a buffer is a valid readable PDF
async function validatePdfBuffer(buffer: Uint8Array): Promise<boolean> {
  try {
    if (buffer.length < 10) return false;
    const header = String.fromCharCode(...buffer.subarray(0, 5));
    if (!header.startsWith('%PDF-')) return false;
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount() > 0;
  } catch {
    return false;
  }
}

// Validate whether a buffer is a valid ZIP/DOCX
async function validateDocxBuffer(buffer: Uint8Array): Promise<boolean> {
  try {
    if (buffer.length < 10) return false;
    const zip = await JSZip.loadAsync(buffer);
    return zip.file('word/document.xml') !== null;
  } catch {
    return false;
  }
}

// Dispatches a request to the real Worker fetch handler
async function dispatchWorkerProcess(
  service: string,
  fileBytes: Uint8Array,
  options?: any
): Promise<{ status: number; body: any; executionTimeMs: number }> {
  const formData = new FormData();
  formData.append('service', service);
  formData.append('file', new Blob([fileBytes as any]), 'input_test_file');
  if (options) {
    formData.append('options', JSON.stringify(options));
  }

  const req = new Request('http://localhost/api/cf-test/process', {
    method: 'POST',
    body: formData,
  });

  const t0 = performance.now();
  const res = await worker.fetch(req, {});
  const t1 = performance.now();
  const totalMs = Math.round(t1 - t0);

  const json = await res.json();
  return { status: res.status, body: json, executionTimeMs: totalMs };
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('PRA PDF — PHASE 1 CLOUDFLARE WORKER BENCHMARK MATRIX');
  console.log('Testing 8 Services across 1MB, 10MB, 25MB, and 50MB File Payloads');
  console.log('================================================================\n');

  const SIZES_MB = [1, 10, 25, 50];
  const SERVICES = [
    'jpg-to-pdf',
    'merge-pdf',
    'split-pdf',
    'compress-pdf',
    'word-to-pdf',
    'pdf-to-word',
    'watermark-pdf',
    'full-pdf-editing',
  ];

  const results: TestResult[] = [];

  for (const service of SERVICES) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Testing Service: [${service}]`);
    console.log(`------------------------------------------------------------`);

    for (const sizeMb of SIZES_MB) {
      const targetBytes = sizeMb * 1024 * 1024;
      process.stdout.write(`  • Size: ${sizeMb} MB (${targetBytes.toLocaleString()} bytes)... `);

      let inputBuffer: Uint8Array;
      let options: any = undefined;

      try {
        if (service === 'jpg-to-pdf') {
          inputBuffer = generateTestJpg(targetBytes);
        } else if (service === 'word-to-pdf') {
          inputBuffer = await generateTestDocx(targetBytes, 25);
        } else if (service === 'merge-pdf') {
          // Merge input can be a ZIP of 2 PDFs
          const pdf1 = await generateTestPdf(Math.floor(targetBytes / 2), 2);
          const pdf2 = await generateTestPdf(Math.floor(targetBytes / 2), 2);
          const zip = new JSZip();
          zip.file('doc1.pdf', pdf1);
          zip.file('doc2.pdf', pdf2);
          inputBuffer = await zip.generateAsync({ type: 'uint8array' });
        } else if (service === 'split-pdf') {
          inputBuffer = await generateTestPdf(targetBytes, 10);
          options = { mode: 'ranges', rangeString: '1-3' };
        } else if (service === 'watermark-pdf') {
          inputBuffer = await generateTestPdf(targetBytes, 4);
          options = { text: 'HIGHLY CONFIDENTIAL', opacity: 0.25 };
        } else if (service === 'full-pdf-editing') {
          inputBuffer = await generateTestPdf(targetBytes, 4);
          options = {
            operations: [
              { type: 'addText', text: 'Cloudflare Worker Verified', x: 72, y: 700, size: 14 },
              { type: 'addHighlight', x: 70, y: 695, width: 220, height: 20 },
              { type: 'addRectangle', x: 70, y: 600, width: 150, height: 40 },
            ],
          };
        } else {
          // compress-pdf, pdf-to-word
          inputBuffer = await generateTestPdf(targetBytes, 5);
        }

        const memBefore = process.memoryUsage().heapUsed;
        const res = await dispatchWorkerProcess(service, inputBuffer, options);
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = Math.round(((memAfter - memBefore) / (1024 * 1024)) * 10) / 10;

        if (res.status === 200 && res.body.success) {
          const outBase64 = res.body.outputBase64;
          const outBytes = Buffer.from(outBase64, 'base64');
          let isValid = false;

          if (service === 'pdf-to-word') {
            isValid = await validateDocxBuffer(outBytes);
          } else {
            isValid = await validatePdfBuffer(outBytes);
          }

          console.log(`SUCCESS in ${res.executionTimeMs}ms | Out: ${(outBytes.length / (1024 * 1024)).toFixed(2)} MB | Valid: ${isValid}`);
          results.push({
            service,
            targetSizeMb: sizeMb,
            actualInputSizeBytes: inputBuffer.length,
            success: true,
            executionTimeMs: res.executionTimeMs,
            outputSizeBytes: outBytes.length,
            outputValid: isValid,
            memoryDeltaMb: memDeltaMb,
          });
        } else {
          const errMsg = res.body.message || `HTTP ${res.status}`;
          console.log(`FAILED (${res.executionTimeMs}ms): ${errMsg}`);
          results.push({
            service,
            targetSizeMb: sizeMb,
            actualInputSizeBytes: inputBuffer.length,
            success: false,
            executionTimeMs: res.executionTimeMs,
            outputSizeBytes: 0,
            outputValid: false,
            memoryDeltaMb: memDeltaMb,
            error: errMsg,
          });
        }
      } catch (err: any) {
        console.log(`EXCEPTION: ${err.message}`);
        results.push({
          service,
          targetSizeMb: sizeMb,
          actualInputSizeBytes: targetBytes,
          success: false,
          executionTimeMs: 0,
          outputSizeBytes: 0,
          outputValid: false,
          memoryDeltaMb: 0,
          error: err.message,
        });
      }
    }
  }

  console.log('\n================================================================');
  console.log('FINAL BENCHMARK MATRIX SUMMARY');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Service: r.service,
      'Target Size': `${r.targetSizeMb} MB`,
      Status: r.success ? 'PASS' : 'FAIL',
      'Time (ms)': r.executionTimeMs,
      'Out Size': `${(r.outputSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      Valid: r.outputValid ? 'YES' : 'NO',
      Error: r.error || 'None',
    }))
  );
}

runBenchmark().catch(console.error);
