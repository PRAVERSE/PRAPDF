/**
 * PRA PDF — Real Add Page Numbers Engine
 * A PRAVERSE Company
 * Injects customizable page numbering into PDF pages at configurable positions.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { procLogger } from '../logger';

export interface AddPageNumbersResult {
  service: 'add-page-numbers';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  format: string;
  position: string;
}

export async function processAddPageNumbers(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    format?: string; // e.g. "Page {n} of {total}" or "{n}"
    startNumber?: number;
    fontSize?: number;
    margin?: number;
  }
): Promise<AddPageNumbersResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_ADD_PAGE_NUMBERS_STARTED', {
    jobId,
    service: 'add-page-numbers',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const position = options?.position || 'bottom-center';
  const formatTemplate = options?.format || 'Page {n} of {total}';
  const startNumber = options?.startNumber || 1;
  const fontSize = options?.fontSize || 9;
  const margin = options?.margin || 30;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const currentNumber = startNumber + i;

    const pageText = formatTemplate
      .replace(/\{n\}/g, String(currentNumber))
      .replace(/\{total\}/g, String(totalPages + startNumber - 1));

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
      color: rgb(0.25, 0.28, 0.35),
    });
  }

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_ADD_PAGE_NUMBERS_COMPLETED', {
    jobId,
    service: 'add-page-numbers',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: totalPages,
    position,
  });

  return {
    service: 'add-page-numbers',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: totalPages,
    format: formatTemplate,
    position,
  };
}
