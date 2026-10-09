/**
 * PRA PDF — Cloudflare Worker: Extract PDF Pages Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export function parseRangeString(
  spec: string,
  totalPages: number,
  preserveOrder: boolean = true
): number[] {
  const result: number[] = [];
  const seen = new Set<number>();
  const chunks = spec.split(',').map((c) => c.trim()).filter(Boolean);

  if (chunks.length === 0) {
    throw new Error('Please specify at least one page number or range to extract.');
  }

  for (const chunk of chunks) {
    if (chunk.includes('-')) {
      const parts = chunk.split('-');
      if (parts.length !== 2) {
        throw new Error(`Invalid range format: "${chunk}". Use format like 1-3.`);
      }
      const start = parseInt(parts[0].trim(), 10);
      const end = parseInt(parts[1].trim(), 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid page range: "${chunk}". Numbers are required.`);
      }
      if (start < 1) {
        throw new Error(`Page numbers must be 1 or greater. Received: ${start}.`);
      }
      if (end > totalPages) {
        throw new Error(
          `Page ${end} in range "${chunk}" is out of range. Document only has ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }
      if (start > end) {
        throw new Error(`Start page cannot be greater than end page in range: "${chunk}".`);
      }

      for (let i = start; i <= end; i++) {
        const idx = i - 1;
        if (!seen.has(idx)) {
          seen.add(idx);
          result.push(idx);
        }
      }
    } else {
      const page = parseInt(chunk, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${chunk}". Numbers are required.`);
      }
      if (page < 1) {
        throw new Error(`Page numbers must be 1 or greater. Received: ${page}.`);
      }
      if (page > totalPages) {
        throw new Error(
          `Page ${page} is out of range. Document only has ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }

      const idx = page - 1;
      if (!seen.has(idx)) {
        seen.add(idx);
        result.push(idx);
      }
    }
  }

  if (result.length === 0) {
    throw new Error('No valid pages found in extraction selection.');
  }

  return preserveOrder ? result : result.sort((a, b) => a - b);
}

export async function processExtractPdfPagesWorker(
  inputBuffer: Uint8Array,
  options?: {
    pagesToExtractSpec?: string;
    pagesToExtract?: number[];
    preserveOrder?: boolean;
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  let indices: number[] = [];
  const spec = options?.pagesToExtractSpec || (options as any)?.range || (options as any)?.ranges;
  if (spec) {
    indices = parseRangeString(
      spec,
      totalPages,
      options?.preserveOrder ?? true
    );
  } else if (options?.pagesToExtract && options.pagesToExtract.length > 0) {
    for (const idx of options.pagesToExtract) {
      if (idx < 0 || idx >= totalPages) {
        throw new Error(
          `Page index ${idx + 1} is out of range. Document only has ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }
    }
    indices = options.preserveOrder ? options.pagesToExtract : [...options.pagesToExtract].sort((a, b) => a - b);
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
    outputFileName: options?.outputFileName || 'extracted_pages.pdf',
    metadata: {
      sourcePageCount: totalPages,
      extractedPageCount: indices.length,
      extractedCount: indices.length,
      extractedIndices: indices,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
