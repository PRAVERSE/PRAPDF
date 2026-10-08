/**
 * PRA PDF — Cloudflare Worker: Unlock PDF Engine
 * Pure in-memory execution using @cantoo/pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from '@cantoo/pdf-lib';
import { WorkerEngineResult } from './types';

export async function processUnlockPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    password?: string;
  }
): Promise<WorkerEngineResult> {
  const pwd = options?.password || '';
  let doc: PDFDocument;

  try {
    doc = await PDFDocument.load(inputBuffer, {
      password: pwd,
      ignoreEncryption: !pwd,
    });
  } catch (err: any) {
    throw new Error(`Failed to unlock PDF: ${err?.message || 'Incorrect password or corrupt encryption.'}`);
  }

  const totalPages = doc.getPageCount();
  if (totalPages === 0) {
    throw new Error('Unlocked PDF document contains zero pages.');
  }

  const outBytes = await doc.save();

  return {
    service: 'unlock-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'unlocked.pdf',
    metadata: {
      pageCount: totalPages,
      unlocked: true,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
