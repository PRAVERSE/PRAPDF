/**
 * PRA PDF — Wave 2 Services Comprehensive Test Suite (13 Services)
 * Tests Services #18 to #30:
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

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { executeWorkerService } from '../src/worker/cfProcessor';
import workerEntrypoint from '../src/worker/index';

// Helpers to generate representative test files
async function createSampleJpg(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Valid 1x1 JPEG byte stream
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

async function createSamplePng(): Promise<Uint8Array> {
  // Valid 1x1 PNG byte stream
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x60,
    0x00, 0x00, 0x00, 0x05, 0x00, 0x01, 0xa7, 0x35, 0x17, 0xec, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

async function createSamplePdf(numPages: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= numPages; i++) {
    const page = doc.addPage([300, 300]);
    page.drawText(`PRA PDF Test Page ${i}`, { x: 30, y: 250, size: 14 });
    page.drawText(`Heading for section ${i}`, { x: 30, y: 220, size: 18 });
    page.drawText(`Paragraph text content for page ${i}.`, { x: 30, y: 180, size: 12 });
  }
  return await doc.save();
}

async function createSampleDocx(): Promise<Uint8Array> {
  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Document Main Heading</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>This is the first paragraph of the test Word document.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr>
      <w:r><w:t>List Item A</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;
  zip.file('word/document.xml', documentXml);
  return await zip.generateAsync({ type: 'uint8array' });
}

function createSampleXlsx(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Product', 'Q1 Sales', 'Q2 Sales', 'Revenue'],
    ['Widget Alpha', 120, 150, 2700],
    ['Widget Beta', 80, 110, 1900],
    ['Widget Gamma', 300, 350, 6500],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'SalesData');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

async function createSamplePptx(): Promise<Uint8Array> {
  const zip = new JSZip();
  const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Quarterly Business Review</a:t></a:r></a:p>
          <a:p><a:r><a:t>Key achievements in Q3</a:t></a:r></a:p>
          <a:p><a:r><a:t>Revenue growth targets</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  zip.file('ppt/slides/slide1.xml', slide1Xml);
  return await zip.generateAsync({ type: 'uint8array' });
}

describe('PRA PDF — Wave 2 Services (Services #18 to #30)', () => {
  // Service 18: Images to PDF
  it('18. images-to-pdf: converts mixed JPG and PNG images into a valid multi-page PDF', async () => {
    const jpg = await createSampleJpg();
    const png = await createSamplePng();

    const result = await executeWorkerService('images-to-pdf', [jpg, png]);

    expect(result.service).toBe('images-to-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.outputBuffer[0]).toBe(0x25); // '%'
    expect(result.outputBuffer[1]).toBe(0x50); // 'P'
    expect(result.outputBuffer[2]).toBe(0x44); // 'D'
    expect(result.outputBuffer[3]).toBe(0x46); // 'F'

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(2);
  });

  // Service 19: Word to PDF
  it('19. word-to-pdf: parses DOCX archive and generates a clean, readable PDF', async () => {
    const docx = await createSampleDocx();
    const result = await executeWorkerService('word-to-pdf', docx);

    expect(result.service).toBe('word-to-pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.outputBuffer.slice(0, 4)).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  // Service 20: Excel to PDF
  it('20. excel-to-pdf: converts spreadsheet tables into landscape paginated PDF', async () => {
    const xlsx = createSampleXlsx();
    const result = await executeWorkerService('excel-to-pdf', xlsx);

    expect(result.service).toBe('excel-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const p1 = doc.getPage(0);
    expect(p1.getWidth()).toBe(792); // Landscape Letter
    expect(p1.getHeight()).toBe(612);
  });

  // Service 21: PowerPoint to PDF
  it('21. powerpoint-to-pdf: renders PPTX slides into 16:9 widescreen presentation PDF', async () => {
    const pptx = await createSamplePptx();
    const result = await executeWorkerService('powerpoint-to-pdf', pptx);

    expect(result.service).toBe('powerpoint-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    const p1 = doc.getPage(0);
    expect(p1.getWidth()).toBe(960); // 16:9
    expect(p1.getHeight()).toBe(540);
  });

  // Service 22: HTML to PDF
  it('22. html-to-pdf: renders HTML markup into structured PDF pages', async () => {
    const htmlText = '<h1>PRA PDF HTML Engine</h1><p>Welcome to high-performance PDF tooling.</p><ul><li>Feature A</li><li>Feature B</li></ul>';
    const htmlBuf = new TextEncoder().encode(htmlText);

    const result = await executeWorkerService('html-to-pdf', htmlBuf);

    expect(result.service).toBe('html-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  // Service 23: TXT to PDF
  it('23. txt-to-pdf: typesets plain text with neat line-wrapping and page margins', async () => {
    const txt = 'Line 1: Plain text document.\nLine 2: Testing text to PDF conversion.\nLine 3: Clean page wrapping.';
    const txtBuf = new TextEncoder().encode(txt);

    const result = await executeWorkerService('txt-to-pdf', txtBuf);

    expect(result.service).toBe('txt-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
  });

  // Service 24: Markdown to PDF
  it('24. markdown-to-pdf: converts markdown headers, bullets, and code blocks to PDF', async () => {
    const md = '# Markdown Document\n\nParagraph explaining markdown features.\n\n- Feature 1\n- Feature 2\n\n```\nconst x = 42;\n```';
    const mdBuf = new TextEncoder().encode(md);

    const result = await executeWorkerService('markdown-to-pdf', mdBuf);

    expect(result.service).toBe('markdown-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
  });

  // Service 25: RTF to PDF
  it('25. rtf-to-pdf: converts RTF documents to formatted PDF', async () => {
    const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Courier;}}\\fs24 Hello from Rich Text Format!\\par This is a second paragraph.\\par}';
    const rtfBuf = new TextEncoder().encode(rtf);

    const result = await executeWorkerService('rtf-to-pdf', rtfBuf);

    expect(result.service).toBe('rtf-to-pdf');
    expect(result.mimeType).toBe('application/pdf');

    const doc = await PDFDocument.load(result.outputBuffer);
    expect(doc.getPageCount()).toBe(1);
  });

  // Service 26: PDF to JPG
  it('26. pdf-to-jpg: converts multi-page PDF into ZIP containing valid JPG page images', async () => {
    const pdf = await createSamplePdf(2);
    const result = await executeWorkerService('pdf-to-jpg', pdf);

    expect(result.service).toBe('pdf-to-jpg');
    expect(result.mimeType).toBe('application/zip');
    expect(result.outputFileName).toContain('.zip');

    const zip = await JSZip.loadAsync(result.outputBuffer);
    const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
    expect(entries.length).toBe(2);
    expect(entries).toContain('page_001.jpg');
    expect(entries).toContain('page_002.jpg');

    const page1 = await zip.files['page_001.jpg'].async('uint8array');
    expect(page1[0]).toBe(0xff);
    expect(page1[1]).toBe(0xd8);
    expect(page1[2]).toBe(0xff);
  });

  // Service 27: PDF to PNG
  it('27. pdf-to-png: converts multi-page PDF into ZIP containing valid PNG page images', async () => {
    const pdf = await createSamplePdf(2);
    const result = await executeWorkerService('pdf-to-png', pdf);

    expect(result.service).toBe('pdf-to-png');
    expect(result.mimeType).toBe('application/zip');

    const zip = await JSZip.loadAsync(result.outputBuffer);
    const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
    expect(entries.length).toBe(2);
    expect(entries).toContain('page_001.png');
    expect(entries).toContain('page_002.png');

    const page1 = await zip.files['page_001.png'].async('uint8array');
    expect(page1[0]).toBe(0x89);
    expect(page1[1]).toBe(0x50);
    expect(page1[2]).toBe(0x4e);
    expect(page1[3]).toBe(0x47);
  });

  // Service 28: PDF to Markdown
  it('28. pdf-to-markdown: extracts text and headings from PDF into formatted Markdown', async () => {
    const pdf = await createSamplePdf(1);
    const result = await executeWorkerService('pdf-to-markdown', pdf);

    expect(result.service).toBe('pdf-to-markdown');
    expect(result.mimeType).toBe('text/markdown; charset=utf-8');

    const mdText = new TextDecoder().decode(result.outputBuffer);
    expect(mdText).toContain('PRA PDF');
    expect(result.outputFileName).toContain('.md');
  });

  // Service 29: PDF to Word
  it('29. pdf-to-word: converts PDF into a fully valid OpenXML DOCX archive', async () => {
    const pdf = await createSamplePdf(1);
    const result = await executeWorkerService('pdf-to-word', pdf);

    expect(result.service).toBe('pdf-to-word');
    expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    const zip = await JSZip.loadAsync(result.outputBuffer);
    expect(zip.file('word/document.xml')).not.toBeNull();
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
  });

  // Service 30: PDF to RTF
  it('30. pdf-to-rtf: exports PDF text into compliant Rich Text Format document', async () => {
    const pdf = await createSamplePdf(1);
    const result = await executeWorkerService('pdf-to-rtf', pdf);

    expect(result.service).toBe('pdf-to-rtf');
    expect(result.mimeType).toBe('application/rtf');

    const rtfText = new TextDecoder().decode(result.outputBuffer);
    expect(rtfText.startsWith('{\\rtf1')).toBe(true);
    expect(rtfText).toContain('PRA PDF');
  });

  // End-to-end Worker HTTP Route execution for Wave 2
  it('processes Wave 2 service via Worker POST /api/v1/cf/process endpoint', async () => {
    const docx = await createSampleDocx();
    const formData = new FormData();
    formData.append('service', 'word-to-pdf');
    formData.append('file', new Blob([docx as any]), 'test.docx');

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: formData,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(200);

    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.service).toBe('word-to-pdf');
    expect(json.outputBase64).toBeDefined();

    const binary = atob(json.outputBase64);
    expect(binary.startsWith('%PDF-')).toBe(true);
  });

  // Edge Case: 50 MB strict upload limit enforcement
  it('rejects uploads exceeding 50 MB with 413 PAYLOAD_TOO_LARGE', async () => {
    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      headers: {
        'content-length': '52428801', // 50MB + 1 byte
      },
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(413);
    const json = (await res.json()) as any;
    expect(json.errorCode).toBe('PAYLOAD_TOO_LARGE');
  });

  // Edge Case: Empty payload rejection
  it('rejects empty payloads with 400 EMPTY_PAYLOAD', async () => {
    const formData = new FormData();
    formData.append('service', 'word-to-pdf');

    const req = new Request('http://localhost/api/v1/cf/process', {
      method: 'POST',
      body: formData,
    });

    const res = await workerEntrypoint.fetch(req, {});
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.errorCode).toBe('EMPTY_PAYLOAD');
  });

  // Edge Case: Invalid input signature for pdf-to-jpg
  it('rejects non-PDF input for pdf-to-jpg with clear error', async () => {
    const corruptBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await expect(executeWorkerService('pdf-to-jpg', corruptBuffer)).rejects.toThrow(/valid PDF document signature/i);
  });
});
