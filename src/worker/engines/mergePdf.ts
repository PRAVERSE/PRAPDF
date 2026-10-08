/**
 * PRA PDF — Cloudflare Worker: Merge PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { WorkerEngineResult } from './types';

export async function processMergePdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  const isZip =
    inputBuffer.length >= 4 &&
    inputBuffer[0] === 0x50 &&
    inputBuffer[1] === 0x4b &&
    inputBuffer[2] === 0x03 &&
    inputBuffer[3] === 0x04;

  const pdfBuffers: { filename: string; buffer: Uint8Array }[] = [];

  if (isZip) {
    const zip = await JSZip.loadAsync(inputBuffer);
    const files = Object.keys(zip.files)
      .filter((name) => !zip.files[name].dir && name.toLowerCase().endsWith('.pdf') && !name.startsWith('__MACOSX/'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const name of files) {
      const data = await zip.files[name].async('uint8array');
      pdfBuffers.push({ filename: name, buffer: data });
    }
  } else {
    // Single PDF supplied
    pdfBuffers.push({ filename: 'document.pdf', buffer: inputBuffer });
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
      console.warn(`[MERGE_WORKER] Failed to parse document ${item.filename}: ${err?.message}`);
    }
  }

  if (totalPages === 0) {
    throw new Error('Failed to merge pages: all input documents were empty or unreadable.');
  }

  const outputBytes = await mergedDoc.save({ useObjectStreams: true });

  return {
    service: 'merge-pdf',
    outputBuffer: outputBytes,
    mimeType: 'application/pdf',
    outputFileName: 'merged.pdf',
    metadata: {
      sourceDocCount: pdfBuffers.length,
      totalPageCount: totalPages,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outputBytes.length,
    },
  };
}
