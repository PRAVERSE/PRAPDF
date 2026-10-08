/**
 * PRA PDF — Convert To PDF Services (Tools 1–9)
 * 1. JPG to PDF
 * 2. PNG to PDF
 * 3. Images to PDF
 * 4. Word to PDF
 * 5. Excel to PDF
 * 6. PowerPoint to PDF
 * 7. HTML to PDF
 * 8. TXT to PDF
 * 9. Markdown to PDF
 */

import { PDFDocument, PageSizes, rgb, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import MarkdownIt from 'markdown-it';
import JSZip from 'jszip';
import { validateFileSize } from './core/fileValidator';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

export interface ConvertOptions {
  pageSize?: 'A4' | 'LETTER' | 'FIT';
  orientation?: 'portrait' | 'landscape';
  margin?: number;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 1: JPG to PDF
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
 */
export async function convertJpgToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(15, 'Uploading JPG to Cloudflare Worker...');

  const formData = new FormData();
  formData.append('service', 'jpg-to-pdf');
  formData.append('file', file);
  if (options.pageSize || options.orientation || options.margin) {
    formData.append(
      'options',
      JSON.stringify({
        pageSize: options.pageSize,
        orientation: options.orientation,
        margin: options.margin,
      })
    );
  }

  options.onProgress?.(45, 'Processing in Cloudflare Worker runtime...');
  const response = await fetch('/api/v1/cf/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Processing failed with HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Cloudflare Worker error: ${errorDetail}`);
  }

  options.onProgress?.(85, 'Receiving generated PDF...');
  const json = await response.json();
  if (!json.success || !json.outputBase64) {
    throw new Error(json.message || 'Worker processing failed to return valid PDF data.');
  }

  // Convert Base64 to Uint8Array
  const binaryString = atob(json.outputBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  options.onProgress?.(100, 'Complete');
  return bytes;
}

/**
 * Tool 2: PNG to PDF
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
 */
export async function convertPngToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(15, 'Uploading PNG to Cloudflare Worker...');

  const formData = new FormData();
  formData.append('service', 'png-to-pdf');
  formData.append('file', file);
  if (options.pageSize || options.orientation || options.margin) {
    formData.append(
      'options',
      JSON.stringify({
        pageSize: options.pageSize,
        orientation: options.orientation,
        margin: options.margin,
      })
    );
  }

  options.onProgress?.(45, 'Processing PNG in Cloudflare Worker runtime...');
  const response = await fetch('/api/v1/cf/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Processing failed with HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Cloudflare Worker error: ${errorDetail}`);
  }

  options.onProgress?.(85, 'Receiving generated PDF...');
  const json = await response.json();
  if (!json.success || !json.outputBase64) {
    throw new Error(json.message || 'Worker processing failed to return valid PDF data.');
  }

  const binaryString = atob(json.outputBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  options.onProgress?.(100, 'Complete');
  return bytes;
}

/**
 * Tool 3: Images to PDF (Batch multi-image)
 */
export async function convertImagesToPdf(
  files: File[],
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  if (!files || files.length === 0) throw new Error('No image files provided.');
  for (const f of files) {
    const check = validateFileSize(f);
    if (!check.valid) throw new Error(`${f.name}: ${check.error}`);
  }

  const doc = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    options.onProgress?.(Math.round(((i + 1) / total) * 80), `Processing image ${i + 1} of ${total}...`);
    const buffer = await file.arrayBuffer();
    const isPng = file.name.toLowerCase().endsWith('.png');

    try {
      const image = isPng ? await doc.embedPng(buffer) : await doc.embedJpg(buffer);
      const dims = image.scale(1);
      const page = doc.addPage([dims.width, dims.height]);
      page.drawImage(image, { x: 0, y: 0, width: dims.width, height: dims.height });
    } catch {
      // Fallback: load through canvas for webp / bmp
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = blobUrl;
      });
      URL.revokeObjectURL(blobUrl);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const jpegBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95));
      const fallbackBytes = await jpegBlob.arrayBuffer();
      const image = await doc.embedJpg(fallbackBytes);
      const dims = image.scale(1);
      const page = doc.addPage([dims.width, dims.height]);
      page.drawImage(image, { x: 0, y: 0, width: dims.width, height: dims.height });
    }
  }

  options.onProgress?.(95, 'Compiling multi-page PDF...');
  return await doc.save();
}

/**
 * Tool 4: Word (.docx) to PDF
 */
export async function convertWordToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Unpacking Word document structure...');
  const zip = new JSZip();
  const unzipped = await zip.loadAsync(file);

  options.onProgress?.(45, 'Parsing document text & paragraphs...');
  let documentText = '';
  const docXml = unzipped.file('word/document.xml');

  if (docXml) {
    const xmlContent = await docXml.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
    const paragraphs = xmlDoc.getElementsByTagName('w:p');

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      let pText = '';
      const textNodes = p.getElementsByTagName('w:t');
      for (let j = 0; j < textNodes.length; j++) {
        pText += textNodes[j].textContent || '';
      }
      if (pText.trim()) {
        documentText += pText + '\n\n';
      }
    }
  } else {
    documentText = 'Unable to extract document text. Empty Word document.';
  }

  options.onProgress?.(75, 'Typesetting into PDF...');
  return await renderPlainTextToPdf(documentText, file.name.replace(/\.[^/.]+$/, ''));
}

/**
 * Tool 5: Excel (.xlsx, .xls, .csv) to PDF
 */
export async function convertExcelToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading spreadsheet worksheets...');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  options.onProgress?.(50, 'Generating structured tables...');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const sheetNames = workbook.SheetNames;
  sheetNames.forEach((sheetName, index) => {
    if (index > 0) pdf.addPage('a4', 'landscape');

    pdf.setFontSize(16);
    pdf.setTextColor(30, 41, 59);
    pdf.text(sheetName, 40, 40);

    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length > 0) {
      const headers = jsonData[0].map((h) => String(h || ''));
      const rows = jsonData.slice(1).map((row) => row.map((cell) => String(cell !== undefined ? cell : '')));

      autoTable(pdf, {
        head: [headers],
        body: rows,
        startY: 55,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      });
    }
  });

  options.onProgress?.(90, 'Exporting spreadsheet PDF...');
  const arrayBuffer = pdf.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

/**
 * Tool 6: PowerPoint (.pptx) to PDF
 */
export async function convertPowerPointToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Unpacking PowerPoint presentation...');
  const zip = new JSZip();
  const unzipped = await zip.loadAsync(file);

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Read slide files: ppt/slides/slide1.xml, slide2.xml...
  const slideFiles = Object.keys(unzipped.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0], 10);
      const numB = parseInt(b.match(/\d+/)![0], 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    const page = doc.addPage(PageSizes.A4);
    page.drawText('Presentation has no readable slides.', { x: 50, y: 700, font, size: 14 });
  } else {
    for (let i = 0; i < slideFiles.length; i++) {
      options.onProgress?.(Math.round(((i + 1) / slideFiles.length) * 80), `Rendering slide ${i + 1} of ${slideFiles.length}...`);
      const slideXml = await unzipped.files[slideFiles[i]].async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(slideXml, 'application/xml');

      // Slide dimensions: 16:9 widescreen (960 x 540 pt)
      const page = doc.addPage([960, 540]);
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 960,
        height: 540,
        color: rgb(0.97, 0.98, 0.99),
      });

      // Slide header
      page.drawText(`Slide ${i + 1}`, {
        x: 40,
        y: 490,
        size: 14,
        font: fontBold,
        color: rgb(0.39, 0.4, 0.95), // Indigo
      });

      // Extract text runs
      const textNodes = xmlDoc.getElementsByTagName('a:t');
      let y = 430;
      let line = '';

      for (let j = 0; j < textNodes.length; j++) {
        const textChunk = textNodes[j].textContent || '';
        line += textChunk + ' ';
        if (line.length > 80 || j === textNodes.length - 1) {
          if (y > 60) {
            page.drawText(line.trim(), {
              x: 50,
              y,
              size: 16,
              font,
              color: rgb(0.1, 0.15, 0.25),
            });
            y -= 28;
          }
          line = '';
        }
      }
    }
  }

  options.onProgress?.(95, 'Finalizing slides PDF...');
  return await doc.save();
}

/**
 * Tool 7: HTML to PDF
 */
export async function convertHtmlToPdf(
  fileOrHtml: File | string,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  let htmlString = '';
  if (fileOrHtml instanceof File) {
    const check = validateFileSize(fileOrHtml);
    if (!check.valid) throw new Error(check.error);
    htmlString = await fileOrHtml.text();
  } else {
    htmlString = fileOrHtml;
  }

  options.onProgress?.(30, 'Parsing HTML layout...');
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(htmlString, 'text/html');
  const plainText = parsedDoc.body.textContent || '';

  options.onProgress?.(70, 'Generating styled PDF...');
  return await renderPlainTextToPdf(plainText, 'HTML Document');
}

/**
 * Tool 8: TXT to PDF
 */
export async function convertTxtToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(30, 'Reading text document...');
  const text = await file.text();

  options.onProgress?.(60, 'Typesetting text pages...');
  return await renderPlainTextToPdf(text, file.name.replace(/\.[^/.]+$/, ''));
}

/**
 * Tool 9: Markdown to PDF
 */
export async function convertMarkdownToPdf(
  file: File,
  options: ConvertOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(25, 'Parsing Markdown syntax...');
  const rawMarkdown = await file.text();

  options.onProgress?.(50, 'Converting Markdown tokens...');
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines = rawMarkdown.split('\n');
  let page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  let y = height - 60;
  const margin = 50;
  const contentWidth = width - margin * 2;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (y < 60) {
      page = doc.addPage(PageSizes.A4);
      y = height - 60;
    }

    if (line.startsWith('# ')) {
      // H1 Heading
      page.drawText(line.replace('# ', ''), {
        x: margin,
        y,
        size: 22,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25),
      });
      y -= 34;
    } else if (line.startsWith('## ')) {
      // H2 Heading
      page.drawText(line.replace('## ', ''), {
        x: margin,
        y,
        size: 18,
        font: fontBold,
        color: rgb(0.25, 0.3, 0.45),
      });
      y -= 28;
    } else if (line.startsWith('### ')) {
      // H3 Heading
      page.drawText(line.replace('### ', ''), {
        x: margin,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.39, 0.4, 0.95), // Indigo
      });
      y -= 24;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet list
      page.drawText(`•  ${line.substring(2)}`, {
        x: margin + 12,
        y,
        size: 10.5,
        font,
        color: rgb(0.15, 0.2, 0.3),
      });
      y -= 18;
    } else if (line.length > 0) {
      // Paragraph line with word wrapping
      const words = line.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, 10.5);

        if (testWidth > contentWidth) {
          if (y < 60) {
            page = doc.addPage(PageSizes.A4);
            y = height - 60;
          }
          page.drawText(currentLine, { x: margin, y, size: 10.5, font, color: rgb(0.15, 0.2, 0.3) });
          y -= 16;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size: 10.5, font, color: rgb(0.15, 0.2, 0.3) });
        y -= 20;
      }
    } else {
      y -= 10; // Empty line spacing
    }
  }

  options.onProgress?.(95, 'Compiling Markdown PDF...');
  return await doc.save();
}

/**
 * Shared helper to layout and wrap plain text into paginated PDF
 */
async function renderPlainTextToPdf(text: string, title?: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const lines = text.split('\n');
  let page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  let y = height - 60;
  const margin = 50;
  const contentWidth = width - margin * 2;

  if (title) {
    page.drawText(title, {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 30;
  }

  for (const rawLine of lines) {
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, 10);

      if (testWidth > contentWidth) {
        if (y < 50) {
          page = doc.addPage(PageSizes.A4);
          y = height - 60;
        }
        page.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.15, 0.2, 0.3) });
        y -= 15;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (y < 50) {
        page = doc.addPage(PageSizes.A4);
        y = height - 60;
      }
      page.drawText(currentLine, { x: margin, y, size: 10, font, color: rgb(0.15, 0.2, 0.3) });
      y -= 18;
    } else {
      y -= 8;
    }
  }

  return await doc.save();
}
