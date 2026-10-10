import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';
import { processDeletePdfAnnotationsWorker } from '../src/worker/engines/deletePdfAnnotations';
import { processFlipPdfWorker } from '../src/worker/engines/flipPdf';
import { processSplitPdfInHalfWorker } from '../src/worker/engines/splitPdfInHalf';
import { processAlternateMixPdfWorker } from '../src/worker/engines/alternateMixPdf';
import { processNUpPdfWorker } from '../src/worker/engines/nUpPdf';
import workerEntrypoint from '../src/worker/index';

async function createTestPdfWithPages(pageCount: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`Page Content ${i}`, {
      x: 50,
      y: 700,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  }
  return await doc.save();
}

async function createPdfWithAnnotations(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 800]);
  page.drawText('Document with annotations', { x: 50, y: 700, size: 18, font });

  // Add dummy annotation dictionary
  const annotDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [50, 650, 100, 680],
    Contents: 'Sample Note',
  });
  const annotRef = doc.context.register(annotDict);
  page.node.set(PDFName.of('Annots'), doc.context.obj([annotRef]));

  return await doc.save();
}

describe('Wave 1 — Service: Delete Annotations (delete-pdf-annotations)', () => {
  it('strips /Annots dictionary arrays and preserves text and structure', async () => {
    const annotPdfBytes = await createPdfWithAnnotations();
    const result = await processDeletePdfAnnotationsWorker(annotPdfBytes);

    expect(result.service).toBe('delete-pdf-annotations');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.outputFileName).toContain('_annotations_deleted.pdf');

    // Verify %PDF- signature
    const header = Buffer.from(result.outputBuffer.subarray(0, 5)).toString('ascii');
    expect(header).toBe('%PDF-');

    // Verify reading with pdf-lib and check annotations are removed
    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
    const annots = doc.getPage(0).node.lookup(PDFName.of('Annots'));
    expect(annots).toBeUndefined();
    expect(result.metadata.totalAnnotationsRemoved).toBeGreaterThan(0);
  });
});

describe('Wave 1 — Service: Flip PDF (flip-pdf)', () => {
  it('flips pages horizontally with lossless vector transformation', async () => {
    const pdfBytes = await createTestPdfWithPages(2);
    const result = await processFlipPdfWorker(pdfBytes, { direction: 'horizontal' });

    expect(result.service).toBe('flip-pdf');
    expect(result.mimeType).toBe('application/pdf');
    const header = Buffer.from(result.outputBuffer.subarray(0, 5)).toString('ascii');
    expect(header).toBe('%PDF-');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBe(600);
    expect(doc.getPage(0).getHeight()).toBe(800);
  });

  it('flips pages vertically', async () => {
    const pdfBytes = await createTestPdfWithPages(1);
    const result = await processFlipPdfWorker(pdfBytes, { direction: 'vertical' });

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe('Wave 1 — Service: Split PDF in Half (split-pdf-in-half)', () => {
  it('splits double-page spreads vertically, doubling the page count', async () => {
    const pdfBytes = await createTestPdfWithPages(2); // 2 pages, each 600 wide
    const result = await processSplitPdfInHalfWorker(pdfBytes, { splitDirection: 'vertical' });

    expect(result.service).toBe('split-pdf-in-half');
    expect(result.metadata.originalPages).toBe(2);
    expect(result.metadata.resultingPages).toBe(4); // 2 * 2 = 4 pages

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(4);

    // Verify left and right page widths are 300 (half of 600)
    const leftPage = doc.getPage(0);
    const rightPage = doc.getPage(1);
    expect(leftPage.getWidth()).toBe(300);
    expect(rightPage.getWidth()).toBe(300);
  });
});

describe('Wave 1 — Service: Alternate & Mix (alternate-mix-pdf)', () => {
  it('interleaves pages from two PDF documents', async () => {
    const docA = await createTestPdfWithPages(2);
    const docB = await createTestPdfWithPages(2);

    const result = await processAlternateMixPdfWorker([docA, docB], {
      reverseSecondDocument: false,
      step: 1,
    });

    expect(result.service).toBe('alternate-mix-pdf');
    expect(result.metadata.resultingTotalPages).toBe(4);

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(4);
  });

  it('interleaves pages with reverseSecondDocument option', async () => {
    const docA = await createTestPdfWithPages(2);
    const docB = await createTestPdfWithPages(3);

    const result = await processAlternateMixPdfWorker([docA, docB], {
      reverseSecondDocument: true,
      step: 1,
    });

    expect(result.metadata.resultingTotalPages).toBe(5);
    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(5);
  });

  it('rejects input with fewer than 2 documents', async () => {
    const docA = await createTestPdfWithPages(1);
    await expect(processAlternateMixPdfWorker([docA])).rejects.toThrow(
      'Alternate & Mix requires at least 2 PDF documents'
    );
  });
});

describe('Wave 1 — Service: N-up PDF (n-up-pdf)', () => {
  it('imposes 4 pages onto 2-up sheets (resulting in 2 sheets)', async () => {
    const pdfBytes = await createTestPdfWithPages(4);
    const result = await processNUpPdfWorker(pdfBytes, { pagesPerSheet: 2, sheetSize: 'A4' });

    expect(result.service).toBe('n-up-pdf');
    expect(result.metadata.originalPages).toBe(4);
    expect(result.metadata.resultingSheets).toBe(2); // 4 pages at 2 per sheet = 2 sheets

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(2);
  });

  it('imposes 4 pages onto a single 4-up sheet', async () => {
    const pdfBytes = await createTestPdfWithPages(4);
    const result = await processNUpPdfWorker(pdfBytes, { pagesPerSheet: 4, sheetSize: 'A4' });

    expect(result.metadata.resultingSheets).toBe(1); // 4 pages at 4 per sheet = 1 sheet
    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
  });
});

describe('Wave 1 — Cloudflare Worker Route Integration (/api/v1/cf/process)', () => {
  it('executes delete-pdf-annotations through worker request', async () => {
    const pdfBytes = await createPdfWithAnnotations();
    const fd = new FormData();
    fd.append('service', 'delete-pdf-annotations');
    fd.append('file', new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'test.pdf');

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: fd,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('delete-pdf-annotations');
    expect(json.mimeType).toBe('application/pdf');

    const buf = Buffer.from(json.outputBase64, 'base64');
    expect(buf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('executes flip-pdf through worker request', async () => {
    const pdfBytes = await createTestPdfWithPages(1);
    const fd = new FormData();
    fd.append('service', 'flip-pdf');
    fd.append('file', new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ direction: 'horizontal' }));

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: fd,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('flip-pdf');
  });

  it('executes split-pdf-in-half through worker request', async () => {
    const pdfBytes = await createTestPdfWithPages(1);
    const fd = new FormData();
    fd.append('service', 'split-pdf-in-half');
    fd.append('file', new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'spread.pdf');

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: fd,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('split-pdf-in-half');

    const buf = Buffer.from(json.outputBase64, 'base64');
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(2);
  });

  it('executes alternate-mix-pdf through worker request with multiple files', async () => {
    const docA = await createTestPdfWithPages(1);
    const docB = await createTestPdfWithPages(1);
    const fd = new FormData();
    fd.append('service', 'alternate-mix-pdf');
    fd.append('files', new Blob([docA as unknown as BlobPart], { type: 'application/pdf' }), 'docA.pdf');
    fd.append('files', new Blob([docB as unknown as BlobPart], { type: 'application/pdf' }), 'docB.pdf');

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: fd,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('alternate-mix-pdf');

    const buf = Buffer.from(json.outputBase64, 'base64');
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(2);
  });

  it('executes n-up-pdf through worker request', async () => {
    const pdfBytes = await createTestPdfWithPages(2);
    const fd = new FormData();
    fd.append('service', 'n-up-pdf');
    fd.append('file', new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'test.pdf');
    fd.append('options', JSON.stringify({ pagesPerSheet: 2 }));

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: fd,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.service).toBe('n-up-pdf');

    const buf = Buffer.from(json.outputBase64, 'base64');
    const doc = await PDFDocument.load(buf);
    expect(doc.getPageCount()).toBe(1);
  });
});
