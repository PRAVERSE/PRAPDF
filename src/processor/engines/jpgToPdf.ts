/**
 * PRA PDF — Real JPG to PDF Engine
 * A PRAVERSE Company
 * Converts JPG/JPEG images into compliant PDF documents using pdf-lib.
 * Real binary embedding; preserves full resolution and color data.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface JpgToPdfResult {
  service: 'jpg-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  imageWidth: number;
  imageHeight: number;
}

export async function processJpgToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<JpgToPdfResult> {
  const rawBuffer = fs.readFileSync(inputPath);
  const inputSize = rawBuffer.length;

  procLogger.info('ENGINE_JPG_TO_PDF_STARTED', {
    jobId,
    service: 'jpg-to-pdf',
    inputSizeBytes: inputSize,
  });

  // Basic JPEG signature check (FF D8 FF)
  if (
    rawBuffer.length < 4 ||
    rawBuffer[0] !== 0xff ||
    rawBuffer[1] !== 0xd8 ||
    rawBuffer[2] !== 0xff
  ) {
    throw new Error('Input file does not contain a valid JPEG header.');
  }

  // Ensure isolated Uint8Array copy with byteOffset = 0 for pdf-lib JpegEmbedder
  const inputBuffer = new Uint8Array(rawBuffer);

  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(inputBuffer);
  const { width, height } = jpgImage.scale(1);

  // Set page dimensions matching image dimensions (1:1 pixel/pt fit)
  const page = pdfDoc.addPage([width, height]);
  page.drawImage(jpgImage, {
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

  procLogger.info('ENGINE_JPG_TO_PDF_COMPLETED', {
    jobId,
    service: 'jpg-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: 1,
    dimensions: `${width}x${height}`,
  });

  return {
    service: 'jpg-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: 1,
    imageWidth: width,
    imageHeight: height,
  };
}
