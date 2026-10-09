/**
 * PRA PDF — PDF Security Services
 * 26. Password Protect PDF
 * 27. Unlock PDF
 * A PRAVERSE Company
 */

import { PDFDocument } from '@cantoo/pdf-lib';
import { validateFileSize } from './core/fileValidator';

export interface ProtectOptions {
  userPassword?: string;
  ownerPassword?: string;
  onProgress?: (percent: number, status: string) => void;
}

export interface UnlockOptions {
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 26: Password Protect PDF
 */
export async function passwordProtectPdf(
  file: File,
  options: ProtectOptions = {}
): Promise<Blob> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const userPassword = options.userPassword || '';
  if (!userPassword) {
    throw new Error('Please enter a password to protect your document.');
  }

  options.onProgress?.(20, 'Reading PDF document...');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (doc.getPageCount() === 0) {
    throw new Error('PDF document has zero pages.');
  }

  options.onProgress?.(60, 'Encrypting PDF document...');
  const outBytes = await (doc as any).save({
    userPassword,
    ownerPassword: options.ownerPassword || userPassword,
  });

  options.onProgress?.(100, 'Complete');
  return new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
}

/**
 * Tool 27: Unlock PDF
 */
export async function unlockPdf(
  file: File,
  password?: string,
  options: UnlockOptions = {}
): Promise<Blob> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading protected PDF...');
  const buffer = await file.arrayBuffer();
  const pwd = password || '';

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buffer, {
      password: pwd,
      ignoreEncryption: !pwd,
    });
  } catch (err: any) {
    throw new Error(`Failed to unlock PDF: ${err?.message || 'Incorrect password or corrupt encryption.'}`);
  }

  if (doc.getPageCount() === 0) {
    throw new Error('Unlocked PDF document contains zero pages.');
  }

  options.onProgress?.(70, 'Removing password protection...');
  const outBytes = await doc.save();

  options.onProgress?.(100, 'Complete');
  return new Blob([outBytes as unknown as BlobPart], { type: 'application/pdf' });
}
