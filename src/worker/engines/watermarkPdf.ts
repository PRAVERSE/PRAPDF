/**
 * PRA PDF — Cloudflare Worker: Watermark PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * CRITICAL POLICY ENFORCEMENT:
 * Absolutely NO PRA PDF branding, logo, or promotional stamp is applied.
 * Only user-specified text or a neutral 'CONFIDENTIAL' default is used.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processWatermarkPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    text?: string;
    opacity?: number;
    fontSize?: number;
    rotationDegrees?: number;
    color?: { r: number; g: number; b: number };
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  // Strict user-configured text. Fallback to generic neutral 'CONFIDENTIAL'. Never PRA PDF branding!
  const text = (options?.text && options.text.trim()) || 'CONFIDENTIAL';
  const opacity = Math.min(1.0, Math.max(0.05, options?.opacity ?? 0.22));
  const fontSize = options?.fontSize || 52;
  const rotationDegrees = options?.rotationDegrees ?? 45;
  const customColor = options?.color || { r: 0.8, g: 0.1, b: 0.1 };

  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    // Center point of page
    const centerX = width / 2;
    const centerY = height / 2;

    // Adjust for rotation and string center offset
    const rad = (rotationDegrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const x = centerX - (textWidth / 2) * cos + (textHeight / 4) * sin;
    const y = centerY - (textWidth / 2) * sin - (textHeight / 4) * cos;

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(customColor.r, customColor.g, customColor.b),
      opacity,
      rotate: degrees(rotationDegrees),
    });
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'watermark-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'watermarked.pdf',
    metadata: {
      pageCount: totalPages,
      watermarkText: text,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
