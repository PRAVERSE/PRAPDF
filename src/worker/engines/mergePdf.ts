/**
 * PRA PDF — Cloudflare Worker: Merge PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { WorkerEngineResult } from './types';

export async function processMergePdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const pdfBuffers: { filename: string; buffer: Uint8Array }[] = [];

  if (Array.isArray(inputBuffer)) {
    // Array of files passed directly
    inputBuffer.forEach((buf, idx) => {
      pdfBuffers.push({ filename: `document_${idx + 1}.pdf`, buffer: buf });
    });
  } else {
    // Single buffer: check if ZIP archive
    const isZip =
      inputBuffer.length >= 4 &&
      inputBuffer[0] === 0x50 &&
      inputBuffer[1] === 0x4b &&
      inputBuffer[2] === 0x03 &&
      inputBuffer[3] === 0x04;

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
  }

  if (pdfBuffers.length < 1) {
    throw new Error('No PDF files provided to merge.');
  }

  const mergedDoc = await PDFDocument.create();
  let totalPages = 0;
  const mergedDocsInfo: { filename: string; pageCount: number }[] = [];

  for (let i = 0; i < pdfBuffers.length; i++) {
    const item = pdfBuffers[i];
    try {
      const srcDoc = await PDFDocument.load(item.buffer, { ignoreEncryption: true });
      const indices = srcDoc.getPageIndices();
      if (indices.length === 0) {
        throw new Error('Document contains 0 pages.');
      }
      const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
        totalPages++;
      }
      mergedDocsInfo.push({ filename: item.filename, pageCount: indices.length });
    } catch (err: any) {
      throw new Error(
        `Failed to parse document ${i + 1} (${item.filename}): ${err?.message || 'Invalid or corrupted PDF document.'}`
      );
    }
  }

  if (totalPages === 0) {
    throw new Error('Failed to merge pages: all input documents were empty or unreadable.');
  }

  const outputBytes = await mergedDoc.save({ useObjectStreams: true });
  const totalInputBytes = Array.isArray(inputBuffer)
    ? inputBuffer.reduce((sum, b) => sum + b.length, 0)
    : inputBuffer.length;

  return {
    service: 'merge-pdf',
    outputBuffer: outputBytes,
    mimeType: 'application/pdf',
    outputFileName: options?.outputFileName || 'merged.pdf',
    metadata: {
      sourceDocCount: pdfBuffers.length,
      mergedFilesCount: pdfBuffers.length,
      totalPageCount: totalPages,
      documentsMerged: mergedDocsInfo,
      inputSizeBytes: totalInputBytes,
      outputSizeBytes: outputBytes.length,
    },
  };
}
