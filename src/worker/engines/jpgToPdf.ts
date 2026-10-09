/**
 * PRA PDF — Cloudflare Worker: JPG to PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processJpgToPdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  const buffers = Array.isArray(inputBuffer) ? inputBuffer : [inputBuffer];
  if (buffers.length === 0) {
    throw new Error('No JPEG image data received.');
  }

  const pdfDoc = await PDFDocument.create();
  let totalInputSizeBytes = 0;
  let firstWidth = 0;
  let firstHeight = 0;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    totalInputSizeBytes += buf.length;

    // Validate JPEG signature (FF D8 FF)
    if (
      buf.length < 4 ||
      buf[0] !== 0xff ||
      buf[1] !== 0xd8 ||
      buf[2] !== 0xff
    ) {
      throw new Error(`Input file at position ${i + 1} does not contain a valid JPEG header.`);
    }

    // Ensure isolated Uint8Array copy with byteOffset = 0 for pdf-lib JpegEmbedder
    const isolatedBuffer = new Uint8Array(buf);
    const jpgImage = await pdfDoc.embedJpg(isolatedBuffer);
    const { width, height } = jpgImage.scale(1);

    if (i === 0) {
      firstWidth = width;
      firstHeight = height;
    }

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    service: 'jpg-to-pdf',
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
