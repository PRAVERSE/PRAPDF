/**
 * PRA PDF — Cloudflare Worker: Delete PDF Annotations Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Strips /Annots dictionary arrays from all pages, removing highlights,
 * sticky notes, strikeouts, comments, and stamps while preserving all text and graphics.
 */

import { PDFDocument, PDFName } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processDeletePdfAnnotationsWorker(
  inputBuffer: Uint8Array,
  options?: {
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  let totalAnnotationsRemoved = 0;
  const annotsKey = PDFName.of('Annots');

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const existingAnnots = page.node.lookup(annotsKey);
    if (existingAnnots) {
      if (typeof (existingAnnots as any).size === 'function') {
        totalAnnotationsRemoved += (existingAnnots as any).size();
      } else {
        totalAnnotationsRemoved += 1;
      }
      page.node.delete(annotsKey);
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  const baseName = options?.outputFileName
    ? options.outputFileName.replace(/\.pdf$/i, '')
    : 'document';

  return {
    service: 'delete-pdf-annotations',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `${baseName}_annotations_deleted.pdf`,
    metadata: {
      totalPages,
      totalAnnotationsRemoved,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
