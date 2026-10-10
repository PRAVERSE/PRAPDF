/**
 * PRA PDF — Cloudflare Worker: Alternate & Mix PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Interleaves pages from 2 or more PDF documents (e.g. Doc A odd pages, Doc B even pages).
 * Supports reverse ordering for the second document (ideal for scanning front then back pages).
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processAlternateMixPdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    reverseSecondDocument?: boolean;
    step?: number;
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const buffers = Array.isArray(inputBuffer) ? inputBuffer : [inputBuffer];

  if (buffers.length < 2) {
    throw new Error('Alternate & Mix requires at least 2 PDF documents.');
  }

  const docs: PDFDocument[] = [];
  let totalInputSizeBytes = 0;

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    totalInputSizeBytes += buf.length;
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    docs.push(doc);
  }

  const newDoc = await PDFDocument.create();
  const step = Math.max(1, options?.step || 1);
  const reverseDoc2 = options?.reverseSecondDocument ?? false;

  // Build page index lists for all documents
  const docPageQueues: number[][] = docs.map((doc, docIdx) => {
    const count = doc.getPageCount();
    const indices = Array.from({ length: count }, (_, i) => i);
    if (docIdx === 1 && reverseDoc2) {
      indices.reverse();
    }
    return indices;
  });

  let remaining = true;
  while (remaining) {
    remaining = false;

    for (let d = 0; d < docs.length; d++) {
      const queue = docPageQueues[d];
      const srcDoc = docs[d];

      for (let s = 0; s < step; s++) {
        if (queue.length > 0) {
          remaining = true;
          const pageIndex = queue.shift()!;
          const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
          newDoc.addPage(copiedPage);
        }
      }
    }
  }

  const totalPages = newDoc.getPageCount();
  if (totalPages === 0) {
    throw new Error('Alternate & Mix produced zero pages.');
  }

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const baseName = options?.outputFileName
    ? options.outputFileName.replace(/\.pdf$/i, '')
    : 'mixed_document';

  return {
    service: 'alternate-mix-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `${baseName}_alternate_mixed.pdf`,
    metadata: {
      inputDocumentsCount: docs.length,
      resultingTotalPages: totalPages,
      reverseSecondDocument: reverseDoc2,
      step,
      inputSizeBytes: totalInputSizeBytes,
      outputSizeBytes: outBytes.length,
    },
  };
}
