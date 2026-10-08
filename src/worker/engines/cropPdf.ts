/**
 * PRA PDF — Cloudflare Worker: Crop PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processCropPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    cropMargins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const margins = options?.cropMargins || { top: 20, right: 20, bottom: 20, left: 20 };

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    const newX = margins.left;
    const newY = margins.bottom;
    const newWidth = Math.max(10, width - margins.left - margins.right);
    const newHeight = Math.max(10, height - margins.top - margins.bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'crop-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'cropped.pdf',
    metadata: {
      totalPages,
      marginsApplied: margins,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
