/**
 * PRA PDF — Real Extract PDF Pages Engine
 * A PRAVERSE Company
 * Extracts specified pages from a PDF document into a new standalone PDF.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface ExtractPdfPagesResult {
  service: 'extract-pdf-pages';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  sourcePageCount: number;
  extractedPageCount: number;
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

export async function processExtractPdfPages(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pagesToExtractSpec?: string;
    pagesToExtract?: number[];
  }
): Promise<ExtractPdfPagesResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_EXTRACT_PDF_PAGES_STARTED', {
    jobId,
    service: 'extract-pdf-pages',
    inputSizeBytes: inputSize,
  });

  const srcDoc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
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
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_EXTRACT_PDF_PAGES_COMPLETED', {
    jobId,
    service: 'extract-pdf-pages',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sourcePageCount: totalPages,
    extractedPageCount: indices.length,
  });

  return {
    service: 'extract-pdf-pages',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    sourcePageCount: totalPages,
    extractedPageCount: indices.length,
  };
}
