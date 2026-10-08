/**
 * PRA PDF — Real Merge PDF Engine
 * A PRAVERSE Company
 * Merges multiple PDF documents from a ZIP bundle or multi-file input into a single compliant PDF.
 * Real page copying; preserves vector paths, text, images, and page dimensions.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { procLogger } from '../logger';

export interface MergePdfResult {
  service: 'merge-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  sourceDocCount: number;
  totalPageCount: number;
}

export async function processMergePdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<MergePdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_MERGE_PDF_STARTED', {
    jobId,
    service: 'merge-pdf',
    inputSizeBytes: inputSize,
  });

  const pdfBuffers: { filename: string; buffer: Uint8Array }[] = [];

  const isZip =
    rawInput.length >= 4 &&
    rawInput[0] === 0x50 &&
    rawInput[1] === 0x4b &&
    rawInput[2] === 0x03 &&
    rawInput[3] === 0x04;

  if (isZip) {
    const zip = await JSZip.loadAsync(rawInput);
    const files = Object.keys(zip.files)
      .filter((name) => !zip.files[name].dir && name.toLowerCase().endsWith('.pdf') && !name.startsWith('__MACOSX/'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const name of files) {
      const data = await zip.files[name].async('nodebuffer');
      pdfBuffers.push({ filename: name, buffer: new Uint8Array(data) });
    }
  } else {
    // If a single PDF is submitted for merge, load it directly
    pdfBuffers.push({ filename: path.basename(inputPath), buffer: new Uint8Array(rawInput) });
  }

  if (pdfBuffers.length === 0) {
    throw new Error('No valid PDF files found to merge.');
  }

  const mergedDoc = await PDFDocument.create();
  let totalPages = 0;

  for (const item of pdfBuffers) {
    try {
      const srcDoc = await PDFDocument.load(item.buffer, { ignoreEncryption: true });
      const indices = srcDoc.getPageIndices();
      const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
        totalPages++;
      }
    } catch (err: any) {
      procLogger.warn('MERGE_DOC_PARSE_WARNING', {
        jobId,
        filename: item.filename,
        error: err?.message,
      });
    }
  }

  if (totalPages === 0) {
    throw new Error('Failed to merge pages: all input documents were empty or unreadable.');
  }

  const outputBytes = await mergedDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outputBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_MERGE_PDF_COMPLETED', {
    jobId,
    service: 'merge-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sourceDocCount: pdfBuffers.length,
    totalPageCount: totalPages,
  });

  return {
    service: 'merge-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    sourceDocCount: pdfBuffers.length,
    totalPageCount: totalPages,
  };
}
