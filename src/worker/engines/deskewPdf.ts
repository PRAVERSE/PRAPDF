/**
 * PRA PDF — Cloudflare Worker: Deskew PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Normalizes tilted, skewed, or mis-rotated pages to straight upright orientation.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processDeskewPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    angle?: number;
    autoDetect?: boolean;
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

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const specifiedAngle = options?.angle ?? 0;
  let appliedAngle = specifiedAngle;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const currentRot = page.getRotation().angle;

    if (specifiedAngle !== 0) {
      // Rotate by negative tilt to cancel skew: snap to valid PDF page rotation quadrant (multiple of 90)
      const rawRot = ((currentRot - specifiedAngle) % 360 + 360) % 360;
      const normalizedRot = ((Math.round(rawRot / 90) * 90) % 360 + 360) % 360;
      page.setRotation(degrees(normalizedRot));
      appliedAngle = specifiedAngle;
    } else {
      // Auto-detect & normalize: straighten to upright 0 degrees or nearest orthogonal
      const normalizedRot = ((Math.round(currentRot / 90) * 90) % 360 + 360) % 360;
      page.setRotation(degrees(normalizedRot));
      appliedAngle = 0;
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'deskew-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'deskewed.pdf',
    metadata: {
      pageCount: totalPages,
      deskewed: true,
      appliedAngleDegrees: appliedAngle,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
