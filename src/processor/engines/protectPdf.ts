/**
 * PRA PDF — Real Password Protect PDF Engine
 * A PRAVERSE Company
 * Encrypts PDF documents with user and owner passwords using standard PDF security algorithms.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from '@cantoo/pdf-lib';
import { procLogger } from '../logger';

export interface ProtectPdfResult {
  service: 'password-protect-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  encrypted: boolean;
}

export async function processProtectPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    password?: string;
    userPassword?: string;
    ownerPassword?: string;
  }
): Promise<ProtectPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_PROTECT_PDF_STARTED', {
    jobId,
    service: 'password-protect-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const userPassword = options?.password || options?.userPassword || 'protected';
  const ownerPassword = options?.ownerPassword || userPassword;

  // Save with standard user password protection
  const outBytes = await (doc as any).save({
    userPassword,
    ownerPassword,
  });

  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_PROTECT_PDF_COMPLETED', {
    jobId,
    service: 'password-protect-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: totalPages,
    encrypted: true,
  });

  return {
    service: 'password-protect-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: totalPages,
    encrypted: true,
  };
}
