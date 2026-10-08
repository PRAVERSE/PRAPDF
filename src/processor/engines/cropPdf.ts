/**
 * PRA PDF — Real Crop PDF Engine
 * A PRAVERSE Company
 * Adjusts visible page boundaries using PDF CropBox geometry without data loss.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface CropPdfResult {
  service: 'crop-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  totalPages: number;
  marginsApplied: { top: number; right: number; bottom: number; left: number };
}

export async function processCropPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    cropMargins?: { top: number; right: number; bottom: number; left: number };
  }
): Promise<CropPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_CROP_PDF_STARTED', {
    jobId,
    service: 'crop-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
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
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_CROP_PDF_COMPLETED', {
    jobId,
    service: 'crop-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    totalPages,
  });

  return {
    service: 'crop-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    totalPages,
    marginsApplied: margins,
  };
}
