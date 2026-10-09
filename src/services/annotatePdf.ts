/**
 * PRA PDF — Annotate PDF Services
 * 23. Add Page Numbers
 * 24. Watermark PDF
 * A PRAVERSE Company
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { validateFileSize } from './core/fileValidator';

import { postFormDataWithProgress } from './core/networkClient';

export interface AddPageNumbersOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format?: string;
  startNumber?: number;
  startFromPage?: number;
  startPage?: number;
  endAtPage?: number;
  pageRangeSpec?: string;
  pagesToNumber?: string;
  fontSize?: number;
  margin?: number;
  fontName?: 'Helvetica' | 'Times' | 'Courier';
  font?: 'Helvetica' | 'Times' | 'Courier';
  color?: { r: number; g: number; b: number };
  onProgress?: (percent: number | null, status: string, detail?: string) => void;
}

export interface WatermarkPdfOptions {
  type?: 'text' | 'image';
  text?: string;
  opacity?: number;
  rotation?: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 23: Add Page Numbers
 */
export async function addPageNumbersToPdf(
  file: File,
  options: AddPageNumbersOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(5, 'Validating documents…');

  // Try Worker first
  const formData = new FormData();
  formData.append('service', 'add-page-numbers');
  formData.append('file', file);
  formData.append('options', JSON.stringify(options));

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress: options.onProgress,
      serviceName: 'add-page-numbers',
    });

    if (json.success && json.outputBase64) {
      options.onProgress?.(95, 'Preparing download…');
      const binaryString = atob(json.outputBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      options.onProgress?.(100, 'Completed successfully!');
      return bytes;
    }
  } catch (workerErr: any) {
    console.warn('[ADD_NUMBERS] Worker route unavailable, using client engine:', workerErr);
  }

  // Graceful client fallback
  options.onProgress?.(15, 'Preparing files…', 'Loading PDF in browser…');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  options.onProgress?.(45, 'Processing PDF…', 'Rendering page numbers…');
  const fontChoice = options.fontName || options.font || 'Helvetica';
  let font;
  if (fontChoice === 'Times') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  } else if (fontChoice === 'Courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  const position = options.position || 'bottom-center';
  const formatTemplate = options.format || '{n}';
  const startNumberValue = options.startNumber ?? 1;
  const startFromPage = Math.max(1, options.startFromPage ?? options.startPage ?? 1);
  const endAtPage = Math.min(totalPages, options.endAtPage ?? totalPages);
  const fontSize = options.fontSize || 9;
  const margin = options.margin || 30;
  const textColor = options.color || { r: 0.25, g: 0.28, b: 0.35 };

  // Parse custom range if provided
  const rangeSpec = (options.pagesToNumber || options.pageRangeSpec)?.trim();
  let selectedPagesSet: Set<number> | null = null;
  if (rangeSpec) {
    selectedPagesSet = new Set<number>();
    const parts = rangeSpec.split(',').map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('-')) {
        const [sStr, eStr] = part.split('-');
        const s = parseInt(sStr.trim(), 10);
        const e = parseInt(eStr.trim(), 10);
        if (!isNaN(s) && !isNaN(e)) {
          for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
            if (i >= 1 && i <= totalPages) selectedPagesSet.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          selectedPagesSet.add(num);
        }
      }
    }
  }

  let pagesCountToNumber = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (selectedPagesSet) {
      if (selectedPagesSet.has(p)) pagesCountToNumber++;
    } else {
      if (p >= startFromPage && p <= endAtPage) pagesCountToNumber++;
    }
  }

  let numberedCount = 0;
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (selectedPagesSet) {
      if (!selectedPagesSet.has(pageNum)) continue;
    } else {
      if (pageNum < startFromPage || pageNum > endAtPage) continue;
    }

    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const currentNumber = startNumberValue + numberedCount;

    let pageText = formatTemplate;
    if (pageText === '{n}' || pageText === 'n') {
      pageText = String(currentNumber);
    } else if (pageText.includes('{n}') || pageText.includes('{total}')) {
      pageText = pageText
        .replace(/\{n\}/g, String(currentNumber))
        .replace(/\{total\}/g, String(pagesCountToNumber + startNumberValue - 1));
    } else if (formatTemplate === 'Page n of total') {
      pageText = `Page ${currentNumber} of ${pagesCountToNumber + startNumberValue - 1}`;
    } else if (formatTemplate === 'Page n') {
      pageText = `Page ${currentNumber}`;
    } else if (formatTemplate === 'n/total' || formatTemplate === 'n / total') {
      pageText = `${currentNumber} / ${pagesCountToNumber + startNumberValue - 1}`;
    } else if (formatTemplate === 'n of total') {
      pageText = `${currentNumber} of ${pagesCountToNumber + startNumberValue - 1}`;
    } else {
      pageText = String(currentNumber);
    }

    const textWidth = font.widthOfTextAtSize(pageText, fontSize);
    let x = (width - textWidth) / 2;
    let y = margin;

    switch (position) {
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-right':
        x = width - margin - textWidth;
        y = margin;
        break;
      case 'bottom-center':
        x = (width - textWidth) / 2;
        y = margin;
        break;
      case 'top-left':
        x = margin;
        y = height - margin - fontSize;
        break;
      case 'top-right':
        x = width - margin - textWidth;
        y = height - margin - fontSize;
        break;
      case 'top-center':
        x = (width - textWidth) / 2;
        y = height - margin - fontSize;
        break;
    }

    page.drawText(pageText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });

    numberedCount++;
  }

  options.onProgress?.(85, 'Generating output…', 'Saving numbered document…');
  const outBytes = await doc.save({ useObjectStreams: true });
  options.onProgress?.(100, 'Completed successfully!');
  return outBytes;
}

/**
 * Tool 24: Watermark PDF
 */
export async function watermarkPdf(
  file: File,
  options: WatermarkPdfOptions = {}
): Promise<Blob> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(15, 'Loading PDF document...');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  options.onProgress?.(45, 'Applying watermark...');
  const text = (options.text && options.text.trim()) || 'CONFIDENTIAL';
  const opacity = Math.min(1.0, Math.max(0.05, options.opacity ?? 0.22));
  const fontSize = options.fontSize || 52;
  const rotationDegrees = options.rotation ?? 45;
  const customColor = options.color || { r: 0.8, g: 0.1, b: 0.1 };

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    const centerX = width / 2;
    const centerY = height / 2;

    const rad = (rotationDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const x = centerX - (textWidth / 2) * cos + (textHeight / 4) * sin;
    const y = centerY - (textWidth / 2) * sin - (textHeight / 4) * cos;

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(customColor.r, customColor.g, customColor.b),
      opacity,
      rotate: degrees(rotationDegrees),
    });
  }

  options.onProgress?.(85, 'Saving watermarked document...');
  const outBytes = await doc.save({ useObjectStreams: true });
  options.onProgress?.(100, 'Complete');
  return new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
}

export interface FullPdfEditOptions {
  operations?: Array<{
    type: string;
    text?: string;
    x?: number;
    y?: number;
    size?: number;
    color?: { r: number; g: number; b: number };
    width?: number;
    height?: number;
    opacity?: number;
    pageIndex?: number;
  }>;
  onProgress?: (percent: number | null, status: string, detail?: string) => void;
}

/**
 * Tool 25: Full PDF Editing (Studio)
 */
export async function fullPdfEdit(
  file: File,
  options: FullPdfEditOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(15, 'Preparing files…', 'Loading document into PDF Studio…');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const operations = options.operations || [];

  options.onProgress?.(55, 'Processing PDF…', 'Applying edits and annotations…');
  for (const op of operations) {
    const pageCount = doc.getPageCount();
    if (op.type === 'addPage') {
      doc.addPage([op.width || 612, op.height || 792]);
      continue;
    }
    const targetIdx = op.pageIndex ?? 0;
    if (targetIdx < 0 || targetIdx >= pageCount) continue;
    const page = doc.getPage(targetIdx);
    const { height: pHeight } = page.getSize();

    if (op.type === 'addText' && op.text) {
      const fontSize = op.size || 14;
      const c = op.color || { r: 0.1, g: 0.1, b: 0.1 };
      page.drawText(op.text, {
        x: op.x ?? 50,
        y: op.y ?? pHeight - 50,
        size: fontSize,
        font: fontRegular,
        color: rgb(c.r, c.g, c.b),
      });
    } else if (op.type === 'addHighlight') {
      page.drawRectangle({
        x: op.x ?? 50,
        y: op.y ?? pHeight - 70,
        width: op.width || 150,
        height: op.height || 20,
        color: rgb(1, 0.95, 0.2),
        opacity: op.opacity ?? 0.4,
      });
    }
  }

  options.onProgress?.(85, 'Generating output…', 'Saving updated document…');
  const outBytes = await doc.save({ useObjectStreams: true });
  options.onProgress?.(100, 'Completed successfully!');
  return outBytes;
}

