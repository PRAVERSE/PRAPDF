/**
 * PRA PDF — Real Organize PDF Engine
 * A PRAVERSE Company
 * Reorders, rotates, and duplicates PDF pages according to specified order.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, degrees } from 'pdf-lib';
import { procLogger } from '../logger';

export interface OrganizePdfResult {
  service: 'organize-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  sourcePageCount: number;
  outputPageCount: number;
}

export interface PageOrderItem {
  pageIndex: number;
  rotation?: number;
}

export async function processOrganizePdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pageOrder?: (number | PageOrderItem)[];
  }
): Promise<OrganizePdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_ORGANIZE_PDF_STARTED', {
    jobId,
    service: 'organize-pdf',
    inputSizeBytes: inputSize,
  });

  const srcDoc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  // Normalize order: if none specified, reverse the pages
  let normalizedOrder: PageOrderItem[] = [];
  if (options?.pageOrder && options.pageOrder.length > 0) {
    normalizedOrder = options.pageOrder.map((item) => {
      if (typeof item === 'number') {
        return { pageIndex: item };
      }
      return item;
    });
  } else {
    // Default to reverse order
    normalizedOrder = Array.from({ length: totalPages }, (_, i) => ({
      pageIndex: totalPages - 1 - i,
    }));
  }

  const newDoc = await PDFDocument.create();

  for (const item of normalizedOrder) {
    const idx = item.pageIndex;
    if (idx >= 0 && idx < totalPages) {
      const [copiedPage] = await newDoc.copyPages(srcDoc, [idx]);
      if (item.rotation) {
        const curAngle = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((curAngle + item.rotation) % 360));
      }
      newDoc.addPage(copiedPage);
    }
  }

  if (newDoc.getPageCount() === 0) {
    throw new Error('Organized PDF has zero pages.');
  }

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_ORGANIZE_PDF_COMPLETED', {
    jobId,
    service: 'organize-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sourcePageCount: totalPages,
    outputPageCount: newDoc.getPageCount(),
  });

  return {
    service: 'organize-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    sourcePageCount: totalPages,
    outputPageCount: newDoc.getPageCount(),
  };
}
