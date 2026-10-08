/**
 * PRA PDF — Cloudflare Worker: Extract PDF Pages Engine
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

export async function processExtractPdfPagesWorker(
  inputBuffer: Uint8Array,
  options?: {
    pagesToExtractSpec?: string;
    pagesToExtract?: number[];
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  let indices: number[] = [];
  if (options?.pagesToExtractSpec) {
    indices = parseRangeString(options.pagesToExtractSpec, totalPages);
  } else if (options?.pagesToExtract && options.pagesToExtract.length > 0) {
    indices = options.pagesToExtract.filter((idx) => idx >= 0 && idx < totalPages);
  } else {
    // Default: extract first page
    indices = [0];
  }

  if (indices.length === 0) {
    throw new Error('No valid pages found in extraction selection.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((p) => newDoc.addPage(p));

  const outBytes = await newDoc.save({ useObjectStreams: true });

  return {
    service: 'extract-pdf-pages',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'extracted_pages.pdf',
    metadata: {
      sourcePageCount: totalPages,
      extractedPageCount: indices.length,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
