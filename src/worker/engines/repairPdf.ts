/**
 * PRA PDF — Cloudflare Worker: Repair PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Reconstructs damaged xref tables, repairs truncated headers/trailers,
 * recovers readable object streams, and safely reports unrecoverable files.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processRepairPdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error('Input buffer is empty. Cannot repair a zero-byte document.');
  }

  let cleanedBuffer = inputBuffer;

  // Step 1: Detect and recover offset PDF header if preambles or corrupt bytes precede %PDF-
  const pdfHeaderStr = '%PDF-';
  const rawStr = new TextDecoder('latin1').decode(inputBuffer.subarray(0, Math.min(2048, inputBuffer.length)));
  const headerIdx = rawStr.indexOf(pdfHeaderStr);

  if (headerIdx > 0) {
    cleanedBuffer = inputBuffer.subarray(headerIdx);
  } else if (headerIdx === -1) {
    // If header is completely missing, check if it's salvageable or irrevocably corrupt
    if (!rawStr.includes('obj') && !rawStr.includes('stream') && !rawStr.includes('xref')) {
      throw new Error('Unable to repair damaged PDF: Document structure is irrevocably corrupted or missing PDF header.');
    }
    // Prepend standard header if raw objects exist
    const headerBytes = new TextEncoder().encode('%PDF-1.4\n');
    const merged = new Uint8Array(headerBytes.length + inputBuffer.length);
    merged.set(headerBytes, 0);
    merged.set(inputBuffer, headerBytes.length);
    cleanedBuffer = merged;
  }

  // Step 2: Ensure EOF marker exists
  const tailStr = new TextDecoder('latin1').decode(
    cleanedBuffer.subarray(Math.max(0, cleanedBuffer.length - 256))
  );
  if (!tailStr.includes('%%EOF')) {
    const eofBytes = new TextEncoder().encode('\n%%EOF\n');
    const withEof = new Uint8Array(cleanedBuffer.length + eofBytes.length);
    withEof.set(cleanedBuffer, 0);
    withEof.set(eofBytes, cleanedBuffer.length);
    cleanedBuffer = withEof;
  }

  // Step 3: Load document with resilient recovery parameters
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(cleanedBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
  } catch (err: any) {
    throw new Error(
      `Unable to repair damaged PDF: Corrupted xref stream could not be reconstructed (${err?.message || 'invalid structure'}).`
    );
  }

  const pageCount = doc.getPageCount();
  if (pageCount === 0) {
    throw new Error('Unable to repair damaged PDF: No recoverable pages were found in the document stream.');
  }

  // Step 4: Re-index and rebuild clean xref table & normalized page trees
  const pages = doc.getPages();
  for (const page of pages) {
    try {
      page.node.normalize();
    } catch {
      // Continue if non-fatal node normalization warnings
    }
  }

  // Save with newly synthesized xref table and optimized object streams
  const repairedBytes = await doc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return {
    service: 'repair-pdf',
    outputBuffer: repairedBytes,
    mimeType: 'application/pdf',
    outputFileName: 'repaired.pdf',
    metadata: {
      pageCount,
      repaired: true,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: repairedBytes.length,
      recoveredObjectsCount: doc.context.enumerateIndirectObjects().length,
    },
  };
}
