/**
 * PRA PDF — Cloudflare Worker: Bates Numbering PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Stretches sequential legal Bates stamps across document pages with zero-padding,
 * custom prefix/suffix, and exact margin coordinate placement.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processBatesNumberingPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    prefix?: string;
    suffix?: string;
    startNumber?: number;
    digits?: number;
    position?: 'bottom-right' | 'bottom-center' | 'bottom-left' | 'top-right';
    fontSize?: number;
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  if (
    inputBuffer.length < 5 ||
    inputBuffer[0] !== 0x25 || // %
    inputBuffer[1] !== 0x50 || // P
    inputBuffer[2] !== 0x44 || // D
    inputBuffer[3] !== 0x46 || // F
    inputBuffer[4] !== 0x2d    // -
  ) {
    throw new Error('Input does not contain a valid PDF document signature (%PDF-).');
  }

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const font = await doc.embedFont(StandardFonts.CourierBold);
  const prefix = options?.prefix ?? 'CONF-';
  const suffix = options?.suffix ?? '';
  const startNumber = options?.startNumber ?? 1;
  const digits = options?.digits ?? 6;
  const position = options?.position ?? 'bottom-right';
  const fontSize = options?.fontSize ?? 10;
  const margin = options?.margin ?? 25;
  const color = rgb(0.1, 0.1, 0.1);

  const batesNumbers: string[] = [];

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const currentSeq = startNumber + i;
    const batesSeq = String(currentSeq).padStart(digits, '0');
    const batesText = `${prefix}${batesSeq}${suffix}`;
    batesNumbers.push(batesText);

    const textWidth = font.widthOfTextAtSize(batesText, fontSize);
    let x = width - margin - textWidth;
    let y = margin;

    if (position === 'bottom-center') {
      x = (width - textWidth) / 2;
      y = margin;
    } else if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'top-right') {
      x = width - margin - textWidth;
      y = height - margin - fontSize;
    }

    page.drawText(batesText, {
      x: Math.max(margin, x),
      y,
      size: fontSize,
      font,
      color,
    });
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'bates-numbering-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'bates_numbered.pdf',
    metadata: {
      pageCount: totalPages,
      startNumber,
      firstBatesNumber: batesNumbers[0],
      lastBatesNumber: batesNumbers[batesNumbers.length - 1],
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
