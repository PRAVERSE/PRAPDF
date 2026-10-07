/**
 * PRA PDF — Convert From PDF & Text Services
 * 10. PDF to JPG
 * 11. PDF to PNG
 * 12. PDF to Markdown
 * 13. PDF to Word (.docx)
 * 29. Extract PDF Text (.txt)
 * 30. RTF Conversion (RTF <-> PDF)
 */

import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import { validateFileSize } from './core/fileValidator';
import { PDFDocument, PageSizes, StandardFonts, rgb } from 'pdf-lib';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ImageExportResult {
  isZip: boolean;
  data: Blob;
  filename: string;
}

/**
 * Tool 10: PDF to JPG
 */
export async function convertPdfToJpg(
  file: File,
  options: {
    dpi?: number;
    quality?: number;
    onProgress?: (percent: number, status: string) => void;
  } = {}
): Promise<ImageExportResult> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const quality = options.quality || 0.92;
  const scale = (options.dpi || 150) / 72;
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (numPages === 1) {
    options.onProgress?.(50, 'Rendering single JPG page...');
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
    options.onProgress?.(100, 'JPG ready!');
    return { isZip: false, data: blob, filename: `${baseName}.jpg` };
  }

  // Multi-page: bundle into ZIP archive
  const zip = new JSZip();
  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(
      Math.round((i / numPages) * 85),
      `Rendering page ${i} of ${numPages} to JPG...`
    );
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
    zip.file(`${baseName}-page-${String(i).padStart(3, '0')}.jpg`, blob);
  }

  options.onProgress?.(95, 'Compressing ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { isZip: true, data: zipBlob, filename: `${baseName}-images.zip` };
}

/**
 * Tool 11: PDF to PNG
 */
export async function convertPdfToPng(
  file: File,
  options: {
    dpi?: number;
    onProgress?: (percent: number, status: string) => void;
  } = {}
): Promise<ImageExportResult> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const scale = (options.dpi || 150) / 72;
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (numPages === 1) {
    options.onProgress?.(50, 'Rendering single PNG page...');
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    options.onProgress?.(100, 'PNG ready!');
    return { isZip: false, data: blob, filename: `${baseName}.png` };
  }

  const zip = new JSZip();
  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(
      Math.round((i / numPages) * 85),
      `Rendering page ${i} of ${numPages} to PNG...`
    );
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
    zip.file(`${baseName}-page-${String(i).padStart(3, '0')}.png`, blob);
  }

  options.onProgress?.(95, 'Compressing ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { isZip: true, data: zipBlob, filename: `${baseName}-images.zip` };
}

/**
 * Tool 12: PDF to Markdown
 */
export async function convertPdfToMarkdown(
  file: File,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<string> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let markdown = `# ${file.name.replace(/\.[^/.]+$/, '')}\n\n`;

  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(Math.round((i / numPages) * 90), `Extracting text from page ${i}...`);
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    markdown += `\n## Page ${i}\n\n`;
    let lastY: number | null = null;
    let paragraph = '';

    for (const item of textContent.items as any[]) {
      const str = item.str || '';
      if (!str.trim()) continue;

      const y = item.transform ? item.transform[5] : 0;
      if (lastY !== null && Math.abs(lastY - y) > 14) {
        // Line break
        if (paragraph.trim()) {
          markdown += paragraph.trim() + '\n\n';
          paragraph = '';
        }
      }
      paragraph += str + ' ';
      lastY = y;
    }

    if (paragraph.trim()) {
      markdown += paragraph.trim() + '\n\n';
    }
  }

  options.onProgress?.(100, 'Markdown generated successfully!');
  return markdown.trim();
}

/**
 * Tool 13: PDF to Word (.docx)
 */
export async function convertPdfToWord(
  file: File,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Blob> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(25, 'Extracting document text hierarchy...');
  const text = await convertPdfToText(file, options);

  options.onProgress?.(60, 'Assembling Word .docx package...');
  // Construct genuine OpenXML docx container
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`
  );

  // word/document.xml
  const paragraphs = text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map(
      (line) =>
        `<w:p><w:r><w:t>${escapeXml(line.trim())}</w:t></w:r></w:p>`
    )
    .join('');

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
  </w:body>
</w:document>`
  );

  options.onProgress?.(90, 'Finalizing .docx file...');
  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Tool 29: Extract PDF Text
 */
export async function convertPdfToText(
  file: File,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<string> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  let extracted = '';
  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(Math.round((i / numPages) * 95), `Extracting text: Page ${i} of ${numPages}...`);
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').join(' ');
    extracted += `[Page ${i}]\n` + pageText.trim() + '\n\n';
  }

  options.onProgress?.(100, 'Text extraction complete!');
  return extracted.trim();
}

/**
 * Tool 30: RTF Conversion (Bidirectional RTF to PDF & PDF to RTF)
 */
export async function convertRtfToPdf(
  file: File,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(30, 'Parsing RTF control words...');
  const rtfContent = await file.text();

  // Strip RTF control codes to extract readable plaintext
  const cleanText = rtfContent
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-zA-Z]+(-?\d+)?/g, '')
    .replace(/[{}]/g, '')
    .trim();

  options.onProgress?.(70, 'Compiling PDF...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage(PageSizes.A4);
  let y = page.getHeight() - 60;

  for (const line of cleanText.split('\n')) {
    if (y < 60) {
      page = doc.addPage(PageSizes.A4);
      y = page.getHeight() - 60;
    }
    const safeLine = line.substring(0, 90);
    page.drawText(safeLine, { x: 50, y, size: 11, font, color: rgb(0.1, 0.15, 0.2) });
    y -= 18;
  }

  return await doc.save();
}

export async function convertPdfToRtf(
  file: File,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<string> {
  const text = await convertPdfToText(file, options);
  // Wrap into valid Rich Text Format document
  const rtfBody = text
    .split('\n')
    .map((line) => line.trim() + '\\par\n')
    .join('');

  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fswiss Helvetica;}}\n\\f0\\fs22\n${rtfBody}}`;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
