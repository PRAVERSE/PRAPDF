/**
 * PRA PDF — Cloudflare Worker: Add Page Numbers Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * CRITICAL POLICY ENFORCEMENT:
 * Zero unsolicited branding or promotional stamps added.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export interface AddPageNumbersWorkerOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format?: string;
  startNumber?: number; // Starting counter value (default 1)
  startFromPage?: number; // 1-indexed document page to begin numbering (default 1)
  endAtPage?: number; // 1-indexed document page to end numbering
  pageRangeSpec?: string; // Optional custom range e.g. "1-5, 8"
  fontSize?: number;
  margin?: number;
  fontName?: 'Helvetica' | 'Times' | 'Courier';
  color?: { r: number; g: number; b: number };
  outputFileName?: string;
}

export function parsePageRangeToSet(spec: string, totalPages: number): Set<number> {
  const result = new Set<number>();
  const chunks = spec.split(',').map((c) => c.trim()).filter(Boolean);

  for (const chunk of chunks) {
    if (chunk.includes('-')) {
      const [startStr, endStr] = chunk.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        result.add(i);
      }
    } else {
      const page = parseInt(chunk, 10);
      if (page >= 1 && page <= totalPages) {
        result.add(page);
      }
    }
  }

  return result;
}

export async function processAddPageNumbersWorker(
  inputBuffer: Uint8Array,
  options?: AddPageNumbersWorkerOptions
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  // Supported standard fonts
  let font: PDFFont;
  const fontChoice = options?.fontName || 'Helvetica';
  if (fontChoice === 'Times') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  } else if (fontChoice === 'Courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
  }

  const position = options?.position || 'bottom-center';
  const formatTemplate = options?.format || '{n}';
  const startNumberValue = options?.startNumber ?? 1;
  const startFromPage = Math.max(1, options?.startFromPage ?? 1);
  const endAtPage = Math.min(totalPages, options?.endAtPage ?? totalPages);
  const fontSize = options?.fontSize || 9;
  const margin = options?.margin || 30;
  const textColor = options?.color || { r: 0.25, g: 0.28, b: 0.35 };

  // Calculate target pages
  const targetPagesSet = options?.pageRangeSpec
    ? parsePageRangeToSet(options.pageRangeSpec, totalPages)
    : null;

  // Count how many pages will actually receive numbers
  let pagesCountToNumber = 0;
  for (let p = 1; p <= totalPages; p++) {
    if (targetPagesSet) {
      if (targetPagesSet.has(p)) pagesCountToNumber++;
    } else {
      if (p >= startFromPage && p <= endAtPage) pagesCountToNumber++;
    }
  }

  let numberedCount = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const isTarget = targetPagesSet
      ? targetPagesSet.has(pageNum)
      : pageNum >= startFromPage && pageNum <= endAtPage;

    if (!isTarget) continue;

    const page = doc.getPage(pageNum - 1);
    const { width, height } = page.getSize();
    const currentNumber = startNumberValue + numberedCount;

    // Format page number string:
    // Default must be simple number {n} (1, 2, 3...). Never prepend "Page " or append " of X" unless explicitly formatted.
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

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'add-page-numbers',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: options?.outputFileName || 'numbered.pdf',
    metadata: {
      pageCount: totalPages,
      numberedPagesCount: numberedCount,
      format: formatTemplate,
      position,
      font: fontChoice,
      fontSize,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
