/**
 * PRA PDF — Security & Password Services
 * 26. Password-Protect PDF (Encrypt)
 * 27. Unlock PDF (Decrypt / Remove Restrictions)
 */

import { PDFDocument } from '@cantoo/pdf-lib';
import { validateFileSize } from './core/fileValidator';

export interface SecurityOptions {
  userPassword?: string;
  ownerPassword?: string;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 26: Password-Protect PDF
 */
export async function passwordProtectPdf(
  file: File,
  options: SecurityOptions
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  if (!options.userPassword) {
    throw new Error('A password is required to protect the PDF document.');
  }

  options.onProgress?.(25, 'Loading source PDF...');
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  options.onProgress?.(60, 'Applying AES encryption and security dictionaries...');
  await (doc as any).encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword || options.userPassword,
  });

  options.onProgress?.(95, 'Saving password-protected PDF...');
  return await doc.save();
}

/**
 * Tool 27: Unlock PDF (Decrypt)
 */
export async function unlockPdf(
  file: File,
  password?: string,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(25, 'Reading encrypted PDF...');
  const buffer = await file.arrayBuffer();

  try {
    options.onProgress?.(50, 'Authenticating password & decrypting...');
    const loadedDoc = await PDFDocument.load(buffer, {
      password: password || '',
    });

    options.onProgress?.(75, 'Extracting unprotected page tree...');
    const unlockedDoc = await PDFDocument.create();
    const indices = loadedDoc.getPageIndices();
    const copiedPages = await unlockedDoc.copyPages(loadedDoc, indices);
    copiedPages.forEach((p) => unlockedDoc.addPage(p));

    options.onProgress?.(95, 'Saving permanently unlocked PDF...');
    return await unlockedDoc.save();
  } catch (error: any) {
    if (error?.message?.includes('Password') || error?.message?.includes('encrypted')) {
      throw new Error('Incorrect password. Please provide the valid password to unlock this PDF.');
    }
    throw error;
  }
}
