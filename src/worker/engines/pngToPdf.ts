/**
 * PRA PDF — Cloudflare Worker: PNG to PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processPngToPdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  const buffers = Array.isArray(inputBuffer) ? inputBuffer : [inputBuffer];
  if (buffers.length === 0) {
    throw new Error('No PNG image data received.');
  }

  const pdfDoc = await PDFDocument.create();
  let totalInputSizeBytes = 0;
  let firstWidth = 0;
  let firstHeight = 0;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    totalInputSizeBytes += buf.length;

    // Validate PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (
      buf.length < 8 ||
      buf[0] !== 0x89 ||
      buf[1] !== 0x50 ||
      buf[2] !== 0x4e ||
      buf[3] !== 0x47
    ) {
      throw new Error(`Input file at position ${i + 1} does not contain a valid PNG header.`);
    }

    const isolatedBuffer = new Uint8Array(buf);
    const pngImage = await pdfDoc.embedPng(isolatedBuffer);
    const { width, height } = pngImage.scale(1);

    if (i === 0) {
      firstWidth = width;
      firstHeight = height;
    }

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    service: 'png-to-pdf',
    outputBuffer: pdfBytes,
    mimeType: 'application/pdf',
    outputFileName: buffers.length > 1 ? 'converted-images.pdf' : 'converted.pdf',
    metadata: {
      pageCount: buffers.length,
      imageCount: buffers.length,
      imageWidth: firstWidth,
      imageHeight: firstHeight,
      inputSizeBytes: totalInputSizeBytes,
      outputSizeBytes: pdfBytes.length,
    },
  };
}
