/**
 * PRA PDF — Real Unlock PDF Engine
 * A PRAVERSE Company
 * Removes encryption and security restrictions from an authorized password-protected PDF.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from '@cantoo/pdf-lib';
import { procLogger } from '../logger';

export interface UnlockPdfResult {
  service: 'unlock-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  unlocked: boolean;
}

export async function processUnlockPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    password?: string;
  }
): Promise<UnlockPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_UNLOCK_PDF_STARTED', {
    jobId,
    service: 'unlock-pdf',
    inputSizeBytes: inputSize,
  });

  const pwd = options?.password || '';
  let doc: PDFDocument;

  try {
    doc = await PDFDocument.load(new Uint8Array(rawInput), {
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

  // Save without any passwords or restriction flags
  const outBytes = await doc.save();
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_UNLOCK_PDF_COMPLETED', {
    jobId,
    service: 'unlock-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: totalPages,
    unlocked: true,
  });

  return {
    service: 'unlock-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: totalPages,
    unlocked: true,
  };
}
