/**
 * PRA PDF — Cloudflare Worker: Password Protect PDF Engine
 * Pure in-memory execution using @cantoo/pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument } from '@cantoo/pdf-lib';
import { WorkerEngineResult } from './types';

export async function processProtectPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    password?: string;
    userPassword?: string;
    ownerPassword?: string;
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const userPassword = options?.password || options?.userPassword || 'protected';
  const ownerPassword = options?.ownerPassword || userPassword;

  const outBytes = await (doc as any).save({
    userPassword,
    ownerPassword,
  });

  return {
    service: 'password-protect-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'protected.pdf',
    metadata: {
      pageCount: totalPages,
      encrypted: true,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
