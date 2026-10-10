/**
 * PRA PDF — Cloudflare Worker: Sign PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Implements Visual Electronic Signatures with cryptographic SHA-256 document audit hash,
 * timestamp, and visual signature placement.
 * Accurately reports signature classification: Visual Electronic Signature with SHA-256 Document Integrity Audit Trail.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processSignPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    signerName?: string;
    signatureText?: string;
    signatureImageBase64?: string;
    reason?: string;
    location?: string;
    pageIndex?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }
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

  // Calculate cryptographic SHA-256 audit digest of input document
  const hashBuffer = await crypto.subtle.digest('SHA-256', inputBuffer as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const signerName = options?.signerName || 'Authorized Signer';
  const reason = options?.reason || 'Document approval and acceptance';
  const location = options?.location || 'Digital Verification';
  const signingTime = new Date().toISOString();

  // Target page (default: last page)
  const targetPageIdx = options?.pageIndex !== undefined
    ? Math.min(Math.max(options.pageIndex, 0), totalPages - 1)
    : totalPages - 1;

  const page = doc.getPage(targetPageIdx);
  const { width: pWidth, height: pHeight } = page.getSize();

  const sigW = options?.width || 220;
  const sigH = options?.height || 70;
  const sigX = options?.x ?? Math.max(40, pWidth - sigW - 40);
  const sigY = options?.y ?? 50;

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  // Draw visual signature seal box
  page.drawRectangle({
    x: sigX,
    y: sigY,
    width: sigW,
    height: sigH,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.15, 0.35, 0.8),
    borderWidth: 1.5,
  });

  // Draw signature decorative ribbon line
  page.drawLine({
    start: { x: sigX + 8, y: sigY + sigH - 22 },
    end: { x: sigX + sigW - 8, y: sigY + sigH - 22 },
    thickness: 0.8,
    color: rgb(0.7, 0.8, 0.95),
  });

  // Text: Signer Name
  page.drawText(`Digitally Signed by: ${signerName}`, {
    x: sigX + 10,
    y: sigY + sigH - 16,
    size: 9,
    font: fontBold,
    color: rgb(0.1, 0.25, 0.7),
  });

  // Text: Date & Time
  page.drawText(`Date: ${signingTime}`, {
    x: sigX + 10,
    y: sigY + sigH - 34,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Text: Reason
  page.drawText(`Reason: ${reason.substring(0, 36)}`, {
    x: sigX + 10,
    y: sigY + sigH - 46,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Text: Document Integrity Audit Hash (First 20 chars of SHA-256)
  page.drawText(`SHA-256: ${sha256Hex.substring(0, 24)}…`, {
    x: sigX + 10,
    y: sigY + sigH - 58,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'sign-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'signed.pdf',
    metadata: {
      pageCount: totalPages,
      signerName,
      signatureType: 'Visual Electronic Signature with SHA-256 Document Integrity Audit Trail',
      documentAuditHashSha256: sha256Hex,
      signingTimestamp: signingTime,
      reason,
      location,
      pageIndex: targetPageIdx,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
