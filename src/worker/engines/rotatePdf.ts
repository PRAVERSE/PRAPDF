/**
 * PRA PDF — Cloudflare Worker: Rotate PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processRotatePdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    degreesToRotate?: 90 | 180 | 270;
    pageIndices?: number[];
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const deg = (options?.degreesToRotate || 90) as 90 | 180 | 270;
  const targetIndices =
    options?.pageIndices && options.pageIndices.length > 0
      ? options.pageIndices
      : Array.from({ length: totalPages }, (_, i) => i);

  let rotatedCount = 0;
  for (const idx of targetIndices) {
    if (idx >= 0 && idx < totalPages) {
      const page = doc.getPage(idx);
      const curAngle = page.getRotation().angle;
      page.setRotation(degrees((curAngle + deg) % 360));
      rotatedCount++;
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'rotate-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'rotated.pdf',
    metadata: {
      totalPages,
      rotatedPagesCount: rotatedCount,
      rotationDegrees: deg,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
