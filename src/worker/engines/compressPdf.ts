/**
 * PRA PDF — Cloudflare Worker: Compress PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processCompressPdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.node.normalize();
  }

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  const inputSize = inputBuffer.length;
  const outputSize = compressedBytes.length;
  const reduction = inputSize - outputSize;
  const reductionPercent = inputSize > 0 ? (reduction / inputSize) * 100 : 0;

  return {
    service: 'compress-pdf',
    outputBuffer: compressedBytes,
    mimeType: 'application/pdf',
    outputFileName: 'compressed.pdf',
    metadata: {
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      reductionBytes: reduction,
      reductionPercentage: Number(reductionPercent.toFixed(2)),
      pageCount: pages.length,
    },
  };
}
