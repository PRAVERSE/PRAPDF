/**
 * PRA PDF — Real Delete PDF Pages Engine
 * A PRAVERSE Company
 * Removes specified pages from a PDF document and saves the remaining pages.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface DeletePdfPagesResult {
  service: 'delete-pdf-pages';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  sourcePageCount: number;
  deletedPageCount: number;
  remainingPageCount: number;
}

function parseRangeString(spec: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const chunks = spec.split(',').map((c) => c.trim());

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (chunk.includes('-')) {
      const [startStr, endStr] = chunk.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const page = parseInt(chunk, 10);
      if (page >= 1 && page <= totalPages) {
        indices.add(page - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

export async function processDeletePdfPages(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pagesToDeleteSpec?: string;
    pagesToDelete?: number[];
  }
): Promise<DeletePdfPagesResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_DELETE_PDF_PAGES_STARTED', {
    jobId,
    service: 'delete-pdf-pages',
    inputSizeBytes: inputSize,
  });

  const srcDoc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages <= 1) {
    throw new Error('Cannot delete pages from a single-page document. Document must contain at least 2 pages.');
  }

  let toDeleteSet = new Set<number>();
  if (options?.pagesToDeleteSpec) {
    toDeleteSet = new Set(parseRangeString(options.pagesToDeleteSpec, totalPages));
  } else if (options?.pagesToDelete && options.pagesToDelete.length > 0) {
    toDeleteSet = new Set(options.pagesToDelete);
  } else {
    // Default: delete the last page
    toDeleteSet.add(totalPages - 1);
  }

  const pagesToKeep: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!toDeleteSet.has(i)) {
      pagesToKeep.push(i);
    }
  }

  if (pagesToKeep.length === 0) {
    throw new Error('Cannot delete all pages from the document. At least one page must remain.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
  copiedPages.forEach((p) => newDoc.addPage(p));

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_DELETE_PDF_PAGES_COMPLETED', {
    jobId,
    service: 'delete-pdf-pages',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sourcePageCount: totalPages,
    deletedPageCount: toDeleteSet.size,
    remainingPageCount: pagesToKeep.length,
  });

  return {
    service: 'delete-pdf-pages',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    sourcePageCount: totalPages,
    deletedPageCount: toDeleteSet.size,
    remainingPageCount: pagesToKeep.length,
  };
}
