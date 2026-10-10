/**
 * PRA PDF — Cloudflare Worker: Flip PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Flips PDF pages horizontally (mirror along Y-axis) or vertically (mirror along X-axis)
 * using lossless vector coordinate transformation.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processFlipPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    direction?: 'horizontal' | 'vertical' | 'both';
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const direction = options?.direction || 'horizontal';
  const newDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const srcPage = srcDoc.getPage(i);
    const { width, height } = srcPage.getSize();
    const newPage = newDoc.addPage([width, height]);
    const embeddedPage = await newDoc.embedPage(srcPage);

    if (direction === 'horizontal') {
      // Flip horizontally: reflection across Y axis at x = width
      newPage.drawPage(embeddedPage, {
        x: width,
        y: 0,
        xScale: -1,
        yScale: 1,
      });
    } else if (direction === 'vertical') {
      // Flip vertically: reflection across X axis at y = height
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: height,
        xScale: 1,
        yScale: -1,
      });
    } else {
      // Both (180 degree coordinate flip)
      newPage.drawPage(embeddedPage, {
        x: width,
        y: height,
        xScale: -1,
        yScale: -1,
      });
    }
  }

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const baseName = options?.outputFileName
    ? options.outputFileName.replace(/\.pdf$/i, '')
    : 'document';

  return {
    service: 'flip-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `${baseName}_flipped.pdf`,
    metadata: {
      totalPages,
      direction,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
