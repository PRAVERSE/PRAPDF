/**
 * PRA PDF — Cloudflare Worker: Resize PDF Pages Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Rescales PDF pages to ISO/ANSI standards (A3, A4, A5, Letter, Legal, Tabloid)
 * with proportional aspect-ratio fitting and centering.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export const STANDARD_PAGE_SIZES: Record<string, [number, number]> = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612.0, 792.0],
  Legal: [612.0, 1008.0],
  Tabloid: [792.0, 1224.0],
};

export async function processResizePdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid';
    orientation?: 'portrait' | 'landscape' | 'keep';
    fit?: 'contain' | 'cover' | 'stretch';
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

  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const targetFormat = options?.pageSize || 'A4';
  const targetDims = STANDARD_PAGE_SIZES[targetFormat] || STANDARD_PAGE_SIZES.A4;
  const orientation = options?.orientation || 'keep';

  const outDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const srcPage = srcDoc.getPage(i);
    const { width: srcWidth, height: srcHeight } = srcPage.getSize();
    const isSrcLandscape = srcWidth > srcHeight;

    let [targetW, targetH] = targetDims;

    if (orientation === 'landscape' || (orientation === 'keep' && isSrcLandscape)) {
      if (targetW < targetH) {
        const tmp = targetW;
        targetW = targetH;
        targetH = tmp;
      }
    } else if (orientation === 'portrait') {
      if (targetW > targetH) {
        const tmp = targetW;
        targetW = targetH;
        targetH = tmp;
      }
    }

    const embeddedPage = await outDoc.embedPage(srcPage);
    const scale = Math.min(targetW / srcWidth, targetH / srcHeight);
    const drawW = srcWidth * scale;
    const drawH = srcHeight * scale;
    const offsetX = (targetW - drawW) / 2;
    const offsetY = (targetH - drawH) / 2;

    const newPage = outDoc.addPage([targetW, targetH]);
    newPage.drawPage(embeddedPage, {
      x: offsetX,
      y: offsetY,
      width: drawW,
      height: drawH,
    });
  }

  const outBytes = await outDoc.save({ useObjectStreams: true });

  return {
    service: 'resize-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `resized_${targetFormat.toLowerCase()}.pdf`,
    metadata: {
      pageCount: totalPages,
      targetPageSize: targetFormat,
      targetDimensions: targetDims,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
