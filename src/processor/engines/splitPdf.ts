/**
 * PRA PDF — Real Split PDF Engine
 * A PRAVERSE Company
 * Splits PDF documents by page ranges into an extracted PDF or bundles all pages into a ZIP archive.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { procLogger } from '../logger';

export interface SplitPdfResult {
  service: 'split-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  sourcePageCount: number;
  outputPageCount: number;
  isZip: boolean;
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

export async function processSplitPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    mode?: 'ranges' | 'all';
    rangeString?: string;
  }
): Promise<SplitPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_SPLIT_PDF_STARTED', {
    jobId,
    service: 'split-pdf',
    inputSizeBytes: inputSize,
  });

  const srcDoc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const isZipOutput = outputPath.toLowerCase().endsWith('.zip') || options?.mode === 'all';

  if (!isZipOutput && options?.rangeString) {
    const indices = parseRangeString(options.rangeString, totalPages);
    if (indices.length === 0) {
      throw new Error(`No valid pages matched the specified range: ${options.rangeString}`);
    }

    const splitDoc = await PDFDocument.create();
    const copiedPages = await splitDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => splitDoc.addPage(p));

    const outBytes = await splitDoc.save({ useObjectStreams: true });
    const outputBuffer = Buffer.from(outBytes);
    const outputSize = outputBuffer.length;
    const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

    fs.writeFileSync(outputPath, outputBuffer);

    procLogger.info('ENGINE_SPLIT_PDF_COMPLETED', {
      jobId,
      service: 'split-pdf',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      outputPageCount: indices.length,
      isZip: false,
    });

    return {
      service: 'split-pdf',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      sha256,
      sourcePageCount: totalPages,
      outputPageCount: indices.length,
      isZip: false,
    };
  }

  // Split all pages into individual single-page PDFs in a ZIP archive
  const zip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const singleBytes = await singleDoc.save({ useObjectStreams: true });
    const pad = String(i + 1).padStart(3, '0');
    zip.file(`page_${pad}.pdf`, singleBytes);
  }

  const zipBytes = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  const outputSize = zipBytes.length;
  const sha256 = crypto.createHash('sha256').update(zipBytes).digest('hex');

  fs.writeFileSync(outputPath, zipBytes);

  procLogger.info('ENGINE_SPLIT_PDF_COMPLETED', {
    jobId,
    service: 'split-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    outputPageCount: totalPages,
    isZip: true,
  });

  return {
    service: 'split-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    sourcePageCount: totalPages,
    outputPageCount: totalPages,
    isZip: true,
  };
}
