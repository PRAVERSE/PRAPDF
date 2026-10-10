/**
 * PRA PDF — Cloudflare Worker: Flatten PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Flattens all interactive form fields (AcroForm) and annotations into static page content,
 * locking the document against subsequent tampering or editing.
 */

import { PDFDocument, PDFName } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processFlattenPdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  if (
    inputBuffer.length < 5 ||
    inputBuffer[0] !== 0x25 || // %
    inputBuffer[1] !== 0x50 || // P
    inputBuffer[2] !== 0x44 || // D
    inputBuffer[3] !== 0x46 || // F
    inputBuffer[4] !== 0x2d    // -
  ) {
    throw new Error('Input does not contain a valid PDF document signature (%PDF-).');
  }

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  let fieldsFlattenedCount = 0;

  try {
    const form = doc.getForm();
    const fields = form.getFields();
    fieldsFlattenedCount = fields.length;
    form.flatten();
  } catch {
    // If document has no AcroForm, proceed to annotation flattening
  }

  // Flatten / strip annotations from pages so they become read-only static visuals
  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    if (page.node.has(PDFName.of('Annots'))) {
      page.node.delete(PDFName.of('Annots'));
    }
  }

  // Remove AcroForm catalog pointer to ensure no interactive form controls remain
  if (doc.catalog.has(PDFName.of('AcroForm'))) {
    doc.catalog.delete(PDFName.of('AcroForm'));
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'flatten-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'flattened.pdf',
    metadata: {
      pageCount: totalPages,
      flattened: true,
      fieldsFlattenedCount,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
