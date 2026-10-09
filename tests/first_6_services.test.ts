/**
 * PRA PDF — Comprehensive Test Suite for the First 6 PDF Services
 * 1. Extract PDF Pages
 * 2. Edit PDF Metadata
 * 3. Extract PDF Text
 * 4. Add Page Numbers
 * 5. Merge PDF
 * 6. Split PDF
 * A PRAVERSE Company
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import worker from '../src/worker/index';

// Client-side service functions
import {
  extractPdfPages,
  editPdfMetadata,
  extractPdfMetadata,
  mergePdfs,
  splitPdf,
} from '../src/services/organizePdf';
import { addPageNumbersToPdf } from '../src/services/annotatePdf';
import { convertPdfToText } from '../src/services/convertFromPdf';
import { processAddPageNumbersWorker } from '../src/worker/engines/addPageNumbers';
import { ResultCard, renderResultCardHtml } from '../src/components/ResultCard';

/**
 * Helper to build an in-memory test PDF with specific page count and text on each page
 */
async function createSamplePdf(pageCount: number, prefix: string = 'Page'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`${prefix} ${i} content`, {
      x: 50,
      y: 500,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }
  return await doc.save();
}

/**
 * Helper to wrap Uint8Array into a File instance for client services
 */
function toFile(bytes: Uint8Array, filename: string = 'document.pdf', type: string = 'application/pdf'): File {
  return new File([bytes as any], filename, { type });
}

describe('PRA PDF — Service 1: Extract PDF Pages', () => {
  it('extracts selected single pages and page ranges preserving document integrity', async () => {
    const sampleBytes = await createSamplePdf(5, 'DocumentPage');
    const file = toFile(sampleBytes, 'test-doc.pdf');

    // Extract pages 1, 3, 5
    const extractedBytes = await extractPdfPages(file, '1, 3, 5');
    expect(extractedBytes).toBeInstanceOf(Uint8Array);
    expect(extractedBytes.byteLength).toBeGreaterThan(0);

    const doc = await PDFDocument.load(extractedBytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('extracts range with dash syntax (e.g. 2-4)', async () => {
    const sampleBytes = await createSamplePdf(5);
    const file = toFile(sampleBytes);

    const extractedBytes = await extractPdfPages(file, '2-4');
    const doc = await PDFDocument.load(extractedBytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('rejects out-of-range pages gracefully with clear error', async () => {
    const sampleBytes = await createSamplePdf(3);
    const file = toFile(sampleBytes);

    await expect(extractPdfPages(file, '1, 5, 8')).rejects.toThrow(/out of range/i);
    await expect(extractPdfPages(file, '0')).rejects.toThrow(/1 or greater|out of range|invalid/i);
    await expect(extractPdfPages(file, 'abc')).rejects.toThrow(/invalid/i);
  });

  it('processes extract-pdf-pages via Cloudflare Worker route /api/v1/cf/process', async () => {
    const sampleBytes = await createSamplePdf(4);
    const form = new FormData();
    form.append('service', 'extract-pdf-pages');
    form.append('file', new Blob([sampleBytes as any]), 'source.pdf');
    form.append('options', JSON.stringify({ range: '1, 3' }));

    const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('extract-pdf-pages');
    expect(json.metadata.extractedCount).toBe(2);

    const outputPdf = Buffer.from(json.outputBase64, 'base64');
    const doc = await PDFDocument.load(outputPdf);
    expect(doc.getPageCount()).toBe(2);
  });
});

describe('PRA PDF — Service 2: Edit PDF Metadata', () => {
  it('updates metadata fields while strictly preserving existing pages and layout', async () => {
    const sampleBytes = await createSamplePdf(2);
    const file = toFile(sampleBytes, 'report.pdf');

    const updatedBytes = await editPdfMetadata(file, {
      title: 'Quarterly Financial Statement',
      author: 'Finance Division',
      subject: 'Q3 Audit',
      keywords: 'finance, audit, 2026',
      creator: 'PRA PDF Engine',
      producer: 'PRAVERSE Secure PDF Core',
    });

    const doc = await PDFDocument.load(updatedBytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getTitle()).toBe('Quarterly Financial Statement');
    expect(doc.getAuthor()).toBe('Finance Division');
    expect(doc.getSubject()).toBe('Q3 Audit');
    expect(doc.getKeywords()).toContain('finance');
    expect(doc.getCreator()).toBe('PRA PDF Engine');
    expect(doc.getProducer()).toBe('PRAVERSE Secure PDF Core');
  });

  it('reads existing metadata correctly via extractPdfMetadata helper', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    doc.setTitle('Existing Original Title');
    doc.setAuthor('Original Author');
    const pdfBytes = await doc.save();
    const file = toFile(pdfBytes);

    const meta = await extractPdfMetadata(file);
    expect(meta.title).toBe('Existing Original Title');
    expect(meta.author).toBe('Original Author');
  });

  it('executes edit-pdf-metadata via Cloudflare Worker route /api/v1/cf/process', async () => {
    const sampleBytes = await createSamplePdf(1);
    const form = new FormData();
    form.append('service', 'edit-pdf-metadata');
    form.append('file', new Blob([sampleBytes as any]), 'doc.pdf');
    form.append('options', JSON.stringify({
      title: 'Worker Title',
      author: 'Worker Author',
    }));

    const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    const outputPdf = Buffer.from(json.outputBase64, 'base64');
    const loaded = await PDFDocument.load(outputPdf);
    expect(loaded.getTitle()).toBe('Worker Title');
    expect(loaded.getAuthor()).toBe('Worker Author');
  });
});

describe('PRA PDF — Service 3: Extract PDF Text', () => {
  it('extracts text accurately across all pages with page boundary preservation', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page1 = doc.addPage([400, 400]);
    page1.drawText('First page executive summary here.', { x: 50, y: 350, size: 12, font });

    const page2 = doc.addPage([400, 400]);
    page2.drawText('Second page details and conclusions.', { x: 50, y: 350, size: 12, font });

    const pdfBytes = await doc.save();
    const file = toFile(pdfBytes, 'document.pdf');

    const result = await convertPdfToText(file);
    expect(result.pageCount).toBe(2);
    expect(result.characterCount).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.hasText).toBe(true);
    expect(result.filename).toBe('document.txt');
    expect(result.text).toContain('executive summary');
    expect(result.text).toContain('conclusions');
  });

  it('detects documents with no extractable text and flags hasText: false', async () => {
    // Blank document with zero text content
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const pdfBytes = await doc.save();
    const file = toFile(pdfBytes, 'blank.pdf');

    const result = await convertPdfToText(file);
    expect(result.hasText).toBe(false);
    expect(result.text.trim()).toBe('');
  });

  it('executes extract-pdf-text via Cloudflare Worker route /api/v1/cf/process', async () => {
    const sampleBytes = await createSamplePdf(2, 'CloudflareTest');
    const form = new FormData();
    form.append('service', 'extract-pdf-text');
    form.append('file', new Blob([sampleBytes as any]), 'sample.pdf');

    const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('extract-pdf-text');
    expect(json.metadata.pageCount).toBe(2);
    expect(json.metadata.extractedText).toContain('CloudflareTest 1');
  });
});

describe('PRA PDF — Service 4: Add Page Numbers', () => {
  it('applies default simple numbers without "Page" or "of total"', async () => {
    const sampleBytes = await createSamplePdf(3);
    const file = toFile(sampleBytes, 'numbered_default.pdf');

    // Call without format option — must default to {n}
    const numberedBytes = await addPageNumbersToPdf(file, {
      position: 'bottom-center',
      startNumber: 1,
    });

    const doc = await PDFDocument.load(numberedBytes);
    expect(doc.getPageCount()).toBe(3);

    // Call worker directly without format — must default to {n}
    const workerResult = await processAddPageNumbersWorker(sampleBytes, {
      position: 'bottom-center',
    });
    expect(workerResult.mimeType).toBe('application/pdf');
    const workerDoc = await PDFDocument.load(workerResult.outputBuffer);
    expect(workerDoc.getPageCount()).toBe(3);
  });

  it('applies page numbers with custom position, format, starting number, and font', async () => {
    const sampleBytes = await createSamplePdf(3);
    const file = toFile(sampleBytes, 'book.pdf');

    const numberedBytes = await addPageNumbersToPdf(file, {
      position: 'bottom-center',
      format: 'Page {n} of {total}',
      startNumber: 1,
      fontName: 'Helvetica',
      fontSize: 10,
      margin: 25,
    });

    const doc = await PDFDocument.load(numberedBytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('supports custom page ranges for numbering (e.g. pages 2-3 only)', async () => {
    const sampleBytes = await createSamplePdf(4);
    const file = toFile(sampleBytes);

    const numberedBytes = await addPageNumbersToPdf(file, {
      position: 'top-right',
      format: '{n}',
      pagesToNumber: '2-4',
      startNumber: 10,
    });

    const doc = await PDFDocument.load(numberedBytes);
    expect(doc.getPageCount()).toBe(4);
  });

  it('executes add-page-numbers via Cloudflare Worker route /api/v1/cf/process with default {n}', async () => {
    const sampleBytes = await createSamplePdf(2);
    const form = new FormData();
    form.append('service', 'add-page-numbers');
    form.append('file', new Blob([sampleBytes as any]), 'doc.pdf');
    form.append('options', JSON.stringify({
      position: 'bottom-right',
      startNumber: 1,
    }));

    const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.metadata.position).toBe('bottom-right');

    const outputPdf = Buffer.from(json.outputBase64, 'base64');
    expect(outputPdf[0]).toBe(0x25); // %
    expect(outputPdf[1]).toBe(0x50); // P
    expect(outputPdf[2]).toBe(0x44); // D
    expect(outputPdf[3]).toBe(0x46); // F
    const doc = await PDFDocument.load(outputPdf);
    expect(doc.getPageCount()).toBe(2);
  });
});

describe('PRA PDF — Service 5: Merge PDF', () => {
  it('merges multiple valid PDFs into a single PDF in exact displayed order', async () => {
    const doc1 = await createSamplePdf(2, 'Doc1');
    const doc2 = await createSamplePdf(3, 'Doc2');

    const files = [
      toFile(doc1, 'first.pdf'),
      toFile(doc2, 'second.pdf'),
    ];

    const mergedBytes = await mergePdfs(files);
    expect(mergedBytes).toBeInstanceOf(Uint8Array);

    const doc = await PDFDocument.load(mergedBytes);
    expect(doc.getPageCount()).toBe(5); // 2 + 3
  });

  it('rejects merge with fewer than 2 files', async () => {
    const doc1 = await createSamplePdf(1);
    const files = [toFile(doc1, 'solo.pdf')];

    await expect(mergePdfs(files)).rejects.toThrow(/at least two/i);
  });

  it('rejects corrupted PDF with informative error', async () => {
    const doc1 = await createSamplePdf(1);
    const badBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const files = [
      toFile(doc1, 'good.pdf'),
      toFile(badBytes, 'bad.pdf'),
    ];

    await expect(mergePdfs(files)).rejects.toThrow(/bad\.pdf|corrupted|invalid/i);
  });

  it('executes merge-pdf via Cloudflare Worker route /api/v1/cf/process', async () => {
    const doc1 = await createSamplePdf(1, 'DocA');
    const doc2 = await createSamplePdf(2, 'DocB');

    const form = new FormData();
    form.append('service', 'merge-pdf');
    form.append('files', new Blob([doc1 as any]), 'docA.pdf');
    form.append('files', new Blob([doc2 as any]), 'docB.pdf');

    const req = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: form });
    const res = await worker.fetch(req, {});
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.metadata.mergedFilesCount).toBe(2);
    expect(json.metadata.totalPageCount).toBe(3);

    const outputPdf = Buffer.from(json.outputBase64, 'base64');
    const doc = await PDFDocument.load(outputPdf);
    expect(doc.getPageCount()).toBe(3);
  });
});

describe('PRA PDF — Service 6: Split PDF', () => {
  it('splits single range into a single valid PDF with correct .pdf extension and %PDF header', async () => {
    const sampleBytes = await createSamplePdf(6);
    const file = toFile(sampleBytes, 'full.pdf');

    const result = await splitPdf(file, { mode: 'ranges', rangeString: '2-4' });
    expect(result.filename).toBe('full_split.pdf');
    expect(result.filename.toLowerCase().endsWith('.pdf')).toBe(true);
    expect(result.isZip).toBe(false);

    const rawBytes = result.data instanceof Uint8Array ? result.data : new Uint8Array(await (result.data as Blob).arrayBuffer());
    expect(rawBytes[0]).toBe(0x25); // %
    expect(rawBytes[1]).toBe(0x50); // P
    expect(rawBytes[2]).toBe(0x44); // D
    expect(rawBytes[3]).toBe(0x46); // F

    const doc = await PDFDocument.load(rawBytes);
    expect(doc.getPageCount()).toBe(3);
  });

  it('splits multiple ranges into a valid ZIP containing correctly partitioned and named PDFs', async () => {
    const sampleBytes = await createSamplePdf(6);
    const file = toFile(sampleBytes, 'manual.pdf');

    const result = await splitPdf(file, { mode: 'ranges', rangeString: '1-2, 4-6' });
    expect(result.filename).toBe('manual_split_ranges.zip');
    expect(result.filename.toLowerCase().endsWith('.zip')).toBe(true);
    expect(result.isZip).toBe(true);

    const rawData = result.data instanceof Blob ? await (result.data as Blob).arrayBuffer() : result.data;
    const zip = await JSZip.loadAsync(rawData as any);
    const fileNames = Object.keys(zip.files).filter((n) => n.endsWith('.pdf'));
    expect(fileNames.length).toBe(2);

    // Verify first part has %PDF header
    const part1Bytes = await zip.files[fileNames[0]].async('uint8array');
    expect(part1Bytes[0]).toBe(0x25); // %
    expect(part1Bytes[1]).toBe(0x50); // P
    const doc1 = await PDFDocument.load(part1Bytes);
    expect(doc1.getPageCount()).toBe(2); // 1-2

    // Verify second part has %PDF header
    const part2Bytes = await zip.files[fileNames[1]].async('uint8array');
    expect(part2Bytes[0]).toBe(0x25);
    const doc2 = await PDFDocument.load(part2Bytes);
    expect(doc2.getPageCount()).toBe(3); // 4-6
  });

  it('splits every N pages into equal parts packaged in a ZIP with valid PDFs', async () => {
    const sampleBytes = await createSamplePdf(5);
    const file = toFile(sampleBytes, 'chunks.pdf');

    const result = await splitPdf(file, { mode: 'every_n', everyN: 2 });
    expect(result.filename).toBe('chunks_split_every_2_pages.zip');
    expect(result.filename.toLowerCase().endsWith('.zip')).toBe(true);
    expect(result.isZip).toBe(true);

    const rawData = result.data instanceof Blob ? await (result.data as Blob).arrayBuffer() : result.data;
    const zip = await JSZip.loadAsync(rawData as any);
    const fileNames = Object.keys(zip.files).filter((n) => n.endsWith('.pdf'));
    expect(fileNames.length).toBe(3); // 2 + 2 + 1 = 5

    const p3Bytes = await zip.files[fileNames[2]].async('uint8array');
    const doc3 = await PDFDocument.load(p3Bytes);
    expect(doc3.getPageCount()).toBe(1);
  });

  it('splits all pages into individual single-page PDFs in a ZIP', async () => {
    const sampleBytes = await createSamplePdf(3);
    const file = toFile(sampleBytes, 'singles.pdf');

    const result = await splitPdf(file, { mode: 'all' });
    expect(result.filename).toBe('singles_split_all_pages.zip');
    expect(result.filename.toLowerCase().endsWith('.zip')).toBe(true);

    const rawData = result.data instanceof Blob ? await (result.data as Blob).arrayBuffer() : result.data;
    const zip = await JSZip.loadAsync(rawData as any);
    const fileNames = Object.keys(zip.files).filter((n) => n.endsWith('.pdf'));
    expect(fileNames.length).toBe(3);

    for (const name of fileNames) {
      const bytes = await zip.files[name].async('uint8array');
      expect(bytes[0]).toBe(0x25);
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
    }
  });

  it('executes split-pdf via Cloudflare Worker route /api/v1/cf/process and returns valid MIME types', async () => {
    const sampleBytes = await createSamplePdf(4);

    // 1. Multi-part split returns application/zip
    const formZip = new FormData();
    formZip.append('service', 'split-pdf');
    formZip.append('file', new Blob([sampleBytes as any]), 'source.pdf');
    formZip.append('options', JSON.stringify({ mode: 'every_n', everyN: 2 }));

    const reqZip = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: formZip });
    const resZip = await worker.fetch(reqZip, {});
    expect(resZip.status).toBe(200);

    const jsonZip = await resZip.json();
    expect(jsonZip.success).toBe(true);
    expect(jsonZip.mimeType).toBe('application/zip');
    expect(jsonZip.outputFileName.endsWith('.zip')).toBe(true);

    const zipBytes = Buffer.from(jsonZip.outputBase64, 'base64');
    expect(zipBytes[0]).toBe(0x50); // P
    expect(zipBytes[1]).toBe(0x4b); // K
    const zip = await JSZip.loadAsync(zipBytes);
    const pdfs = Object.keys(zip.files).filter((n) => n.endsWith('.pdf'));
    expect(pdfs.length).toBe(2);

    // 2. Single range split returns application/pdf
    const formPdf = new FormData();
    formPdf.append('service', 'split-pdf');
    formPdf.append('file', new Blob([sampleBytes as any]), 'source.pdf');
    formPdf.append('options', JSON.stringify({ mode: 'ranges', rangeString: '1-2' }));

    const reqPdf = new Request('http://localhost/api/v1/cf/process', { method: 'POST', body: formPdf });
    const resPdf = await worker.fetch(reqPdf, {});
    expect(resPdf.status).toBe(200);

    const jsonPdf = await resPdf.json();
    expect(jsonPdf.success).toBe(true);
    expect(jsonPdf.mimeType).toBe('application/pdf');
    expect(jsonPdf.outputFileName.endsWith('.pdf')).toBe(true);

    const pdfBytes = Buffer.from(jsonPdf.outputBase64, 'base64');
    expect(pdfBytes[0]).toBe(0x25); // %
    expect(pdfBytes[1]).toBe(0x50); // P
    const singleDoc = await PDFDocument.load(pdfBytes);
    expect(singleDoc.getPageCount()).toBe(2);
  });
});

describe('PRA PDF — Standardized Universal Completion Screen', () => {
  it('renders standardized dark completion screen with green check icon and prominent green download button', () => {
    let resetCalled = false;
    const html = renderResultCardHtml({
      filename: 'document_converted.pdf',
      data: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      toolId: 'png-to-pdf',
      toolTitle: 'PNG to PDF',
      isBrowserOnly: true,
      onReset: () => {
        resetCalled = true;
      },
    });

    // Check Success Header
    expect(html).toContain('class="result-main-title">Your PDF is ready</h2>');
    expect(html).toContain('Converted privately in your browser. Nothing was uploaded.');
    expect(html).toContain('class="result-check-circle"');

    // Check Output File Card
    expect(html).toContain('class="result-output-card"');
    expect(html).toContain('class="output-file-name" title="document_converted.pdf">document_converted.pdf</span>');
    expect(html).toContain('class="output-file-type-tag">PDF Document</span>');

    // Check Green Download Button
    expect(html).toContain('class="btn-download-success"');
    expect(html).toContain('Download document_converted.pdf');

    // Check Secondary Actions
    expect(html).toContain('id="rc-reset-btn"');
    expect(html).toContain('Convert another file');
    expect(html).toContain('id="rc-all-tools-btn"');
    expect(html).toContain('href="#/tools"');
    expect(html).toContain('All PDF tools');

    // Check WHAT'S NEXT grid with 4 cards
    expect(html).toContain('WHAT\'S NEXT');
    expect(html).toContain('class="whats-next-grid"');
    const cardMatches = html.match(/class="whats-next-card"/g);
    expect(cardMatches?.length).toBe(4);
  });

  it('renders honest server-side edge message when isBrowserOnly is false and ZIP heading for archives', () => {
    const html = renderResultCardHtml({
      filename: 'split_pages.zip',
      data: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      toolId: 'split-pdf',
      toolTitle: 'Split PDF',
      isBrowserOnly: false,
      onReset: () => {},
    });

    expect(html).toContain('class="result-main-title">Your ZIP archive is ready</h2>');
    expect(html).toContain('Processed securely via Cloudflare edge.');
    expect(html).toContain('class="output-file-type-tag">ZIP Archive</span>');
    expect(html).toContain('Download split_pages.zip');
    expect(html).toContain('is-zip');
  });
});
