/**
 * PRA PDF — Cloudflare Worker: Organize PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export interface PageOrderItem {
  pageIndex: number;
  rotation?: number;
}

export async function processOrganizePdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    pageOrder?: (number | PageOrderItem)[];
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

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

  return {
    service: 'organize-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'organized.pdf',
    metadata: {
      sourcePageCount: totalPages,
      outputPageCount: newDoc.getPageCount(),
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
