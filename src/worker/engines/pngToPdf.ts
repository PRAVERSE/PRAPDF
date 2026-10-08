/**
 * PRA PDF — Cloudflare Worker: PNG to PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processPngToPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  // Validate PNG signature (89 50 4E 47 0D 0A 1A 0A)
  if (
    inputBuffer.length < 8 ||
    inputBuffer[0] !== 0x89 ||
    inputBuffer[1] !== 0x50 ||
    inputBuffer[2] !== 0x4e ||
    inputBuffer[3] !== 0x47
  ) {
    throw new Error('Input file does not contain a valid PNG header.');
  }

  const isolatedBuffer = new Uint8Array(inputBuffer);
  const pdfDoc = await PDFDocument.create();
  const pngImage = await pdfDoc.embedPng(isolatedBuffer);
  const { width, height } = pngImage.scale(1);

  const page = pdfDoc.addPage([width, height]);
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    service: 'png-to-pdf',
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
