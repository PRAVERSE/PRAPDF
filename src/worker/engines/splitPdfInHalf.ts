/**
 * PRA PDF — Cloudflare Worker: Split PDF in Half Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Splits two-page book scans or double-wide spread pages in half (vertical or horizontal),
 * generating two separate pages from every input page (Left half then Right half).
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processSplitPdfInHalfWorker(
  inputBuffer: Uint8Array,
  options?: {
    splitDirection?: 'vertical' | 'horizontal';
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const splitDirection = options?.splitDirection || 'vertical';
  const newDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const srcPage = srcDoc.getPage(i);
    const { width, height } = srcPage.getSize();

    if (splitDirection === 'vertical') {
      const halfWidth = width / 2;

      // Left Half
      const [leftPage] = await newDoc.copyPages(srcDoc, [i]);
      leftPage.setCropBox(0, 0, halfWidth, height);
      leftPage.setMediaBox(0, 0, halfWidth, height);
      newDoc.addPage(leftPage);

      // Right Half
      const [rightPage] = await newDoc.copyPages(srcDoc, [i]);
      rightPage.setCropBox(halfWidth, 0, halfWidth, height);
      rightPage.setMediaBox(halfWidth, 0, halfWidth, height);
      newDoc.addPage(rightPage);
    } else {
      const halfHeight = height / 2;

      // Top Half
      const [topPage] = await newDoc.copyPages(srcDoc, [i]);
      topPage.setCropBox(0, halfHeight, width, halfHeight);
      topPage.setMediaBox(0, halfHeight, width, halfHeight);
      newDoc.addPage(topPage);

      // Bottom Half
      const [bottomPage] = await newDoc.copyPages(srcDoc, [i]);
      bottomPage.setCropBox(0, 0, width, halfHeight);
      bottomPage.setMediaBox(0, 0, width, halfHeight);
      newDoc.addPage(bottomPage);
    }
  }

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const baseName = options?.outputFileName
    ? options.outputFileName.replace(/\.pdf$/i, '')
    : 'document';

  return {
    service: 'split-pdf-in-half',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `${baseName}_split_in_half.pdf`,
    metadata: {
      originalPages: totalPages,
      resultingPages: newDoc.getPageCount(),
      splitDirection,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
