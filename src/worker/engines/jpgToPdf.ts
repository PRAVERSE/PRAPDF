/**
 * PRA PDF — Cloudflare Worker: JPG to PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processJpgToPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  // Validate JPEG signature (FF D8 FF)
  if (
    inputBuffer.length < 4 ||
    inputBuffer[0] !== 0xff ||
    inputBuffer[1] !== 0xd8 ||
    inputBuffer[2] !== 0xff
  ) {
    throw new Error('Input file does not contain a valid JPEG header.');
  }

  // Ensure isolated Uint8Array copy with byteOffset = 0 for pdf-lib JpegEmbedder
  const isolatedBuffer = new Uint8Array(inputBuffer);

  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(isolatedBuffer);
  const { width, height } = jpgImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(jpgImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    service: 'jpg-to-pdf',
    outputBuffer: pdfBytes,
    mimeType: 'application/pdf',
    outputFileName: 'converted.pdf',
    metadata: {
      pageCount: 1,
      imageWidth: width,
      imageHeight: height,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: pdfBytes.length,
    },
  };
}
