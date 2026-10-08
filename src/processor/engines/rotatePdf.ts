/**
 * PRA PDF — Real Rotate PDF Engine
 * A PRAVERSE Company
 * Rotates all or specified PDF pages by 90, 180, or 270 degrees.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, degrees } from 'pdf-lib';
import { procLogger } from '../logger';

export interface RotatePdfResult {
  service: 'rotate-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  totalPages: number;
  rotatedPagesCount: number;
  rotationDegrees: number;
}

export async function processRotatePdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    degreesToRotate?: 90 | 180 | 270;
    pageIndices?: number[];
  }
): Promise<RotatePdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_ROTATE_PDF_STARTED', {
    jobId,
    service: 'rotate-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
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
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_ROTATE_PDF_COMPLETED', {
    jobId,
    service: 'rotate-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    totalPages,
    rotatedPagesCount: rotatedCount,
    rotationDegrees: deg,
  });

  return {
    service: 'rotate-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    totalPages,
    rotatedPagesCount: rotatedCount,
    rotationDegrees: deg,
  };
}
