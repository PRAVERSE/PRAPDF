/**
 * PRA PDF — Cloudflare Worker: Delete PDF Pages Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

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

export async function processDeletePdfPagesWorker(
  inputBuffer: Uint8Array,
  options?: {
    pagesToDeleteSpec?: string;
    pagesToDelete?: number[];
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
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

  return {
    service: 'delete-pdf-pages',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'pages_deleted.pdf',
    metadata: {
      sourcePageCount: totalPages,
      deletedPageCount: toDeleteSet.size,
      remainingPageCount: pagesToKeep.length,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
