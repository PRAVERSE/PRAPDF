/**
 * PRA PDF — Cloudflare Worker: Add Page Numbers Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processAddPageNumbersWorker(
  inputBuffer: Uint8Array,
  options?: {
    position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
    format?: string;
    startNumber?: number;
    fontSize?: number;
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
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

  return {
    service: 'add-page-numbers',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'numbered.pdf',
    metadata: {
      pageCount: totalPages,
      format: formatTemplate,
      position,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
