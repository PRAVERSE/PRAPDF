/**
 * PRA PDF — Real PNG to PDF Engine
 * A PRAVERSE Company
 * Converts PNG images into compliant PDF documents using pdf-lib.
 * Real binary embedding; preserves alpha transparency and full resolution.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface PngToPdfResult {
  service: 'png-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  imageWidth: number;
  imageHeight: number;
}

export async function processPngToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<PngToPdfResult> {
  const rawBuffer = fs.readFileSync(inputPath);
  const inputSize = rawBuffer.length;

  procLogger.info('ENGINE_PNG_TO_PDF_STARTED', {
    jobId,
    service: 'png-to-pdf',
    inputSizeBytes: inputSize,
  });

  // PNG signature check (89 50 4E 47 0D 0A 1A 0A)
  if (
    rawBuffer.length < 8 ||
    rawBuffer[0] !== 0x89 ||
    rawBuffer[1] !== 0x50 ||
    rawBuffer[2] !== 0x4e ||
    rawBuffer[3] !== 0x47
  ) {
    throw new Error('Input file does not contain a valid PNG header.');
  }

  // Ensure isolated Uint8Array copy with byteOffset = 0
  const inputBuffer = new Uint8Array(rawBuffer);

  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(inputBuffer);
  const { width, height } = pngImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_PNG_TO_PDF_COMPLETED', {
    jobId,
    service: 'png-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: 1,
    dimensions: `${width}x${height}`,
  });

  return {
    service: 'png-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: 1,
    imageWidth: width,
    imageHeight: height,
  };
}
