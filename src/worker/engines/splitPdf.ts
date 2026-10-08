/**
 * PRA PDF — Cloudflare Worker: Split PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
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

export async function processSplitPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    mode?: 'ranges' | 'all';
    rangeString?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  if (options?.rangeString && options?.mode !== 'all') {
    const indices = parseRangeString(options.rangeString, totalPages);
    if (indices.length === 0) {
      throw new Error(`No valid pages matched the specified range: ${options.rangeString}`);
    }

    const splitDoc = await PDFDocument.create();
    const copiedPages = await splitDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((p) => splitDoc.addPage(p));

    const outBytes = await splitDoc.save({ useObjectStreams: true });

    return {
      service: 'split-pdf',
      outputBuffer: outBytes,
      mimeType: 'application/pdf',
      outputFileName: 'split.pdf',
      metadata: {
        sourcePageCount: totalPages,
        outputPageCount: indices.length,
        isZip: false,
        inputSizeBytes: inputBuffer.length,
        outputSizeBytes: outBytes.length,
      },
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
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  return {
    service: 'split-pdf',
    outputBuffer: zipBytes,
    mimeType: 'application/zip',
    outputFileName: 'split_pages.zip',
    metadata: {
      sourcePageCount: totalPages,
      outputPageCount: totalPages,
      isZip: true,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: zipBytes.length,
    },
  };
}
