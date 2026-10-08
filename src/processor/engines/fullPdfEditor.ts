/**
 * PRA PDF — Real Full PDF Editing Engine (Studio)
 * A PRAVERSE Company
 * Applies studio modifications: text insertions, shapes, lines, highlights, and page management.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { procLogger } from '../logger';

export interface FullPdfEditorResult {
  service: 'full-pdf-editing';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  appliedOperationsCount: number;
}

export interface EditOperation {
  type: 'addText' | 'addRectangle' | 'addHighlight' | 'addLine' | 'addPage' | 'deletePage';
  pageIndex?: number;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  size?: number;
  color?: { r: number; g: number; b: number };
  borderColor?: { r: number; g: number; b: number };
  borderWidth?: number;
  thickness?: number;
  opacity?: number;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export async function processFullPdfEditing(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    operations?: EditOperation[];
  }
): Promise<FullPdfEditorResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_FULL_PDF_EDITING_STARTED', {
    jobId,
    service: 'full-pdf-editing',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const operations = options?.operations || [];

  let appliedCount = 0;

  for (const op of operations) {
    const pageCount = doc.getPageCount();

    if (op.type === 'addPage') {
      doc.addPage([op.width || 612, op.height || 792]);
      appliedCount++;
      continue;
    }

    if (op.type === 'deletePage') {
      const idx = op.pageIndex ?? pageCount - 1;
      if (idx >= 0 && idx < pageCount && pageCount > 1) {
        doc.removePage(idx);
        appliedCount++;
      }
      continue;
    }

    const targetIdx = op.pageIndex ?? 0;
    if (targetIdx < 0 || targetIdx >= pageCount) continue;

    const page = doc.getPage(targetIdx);
    const { width: pWidth, height: pHeight } = page.getSize();

    if (op.type === 'addText' && op.text) {
      const fontSize = op.size || 12;
      const c = op.color || { r: 0.1, g: 0.1, b: 0.1 };
      page.drawText(op.text, {
        x: op.x ?? 50,
        y: op.y ?? pHeight - 50,
        size: fontSize,
        font: fontRegular,
        color: rgb(c.r, c.g, c.b),
      });
      appliedCount++;
    } else if (op.type === 'addRectangle') {
      const c = op.color || { r: 0.9, g: 0.9, b: 0.9 };
      const bc = op.borderColor || { r: 0.2, g: 0.2, b: 0.2 };
      page.drawRectangle({
        x: op.x ?? 50,
        y: op.y ?? 50,
        width: op.width || 100,
        height: op.height || 50,
        color: rgb(c.r, c.g, c.b),
        borderColor: rgb(bc.r, bc.g, bc.b),
        borderWidth: op.borderWidth ?? 1,
      });
      appliedCount++;
    } else if (op.type === 'addHighlight') {
      // Semi-transparent yellow highlight
      page.drawRectangle({
        x: op.x ?? 50,
        y: op.y ?? 50,
        width: op.width || 120,
        height: op.height || 18,
        color: rgb(1, 0.95, 0.2),
        opacity: op.opacity ?? 0.4,
      });
      appliedCount++;
    } else if (op.type === 'addLine') {
      const c = op.color || { r: 0.2, g: 0.2, b: 0.2 };
      page.drawLine({
        start: op.start || { x: 50, y: 50 },
        end: op.end || { x: pWidth - 50, y: 50 },
        thickness: op.thickness ?? 1,
        color: rgb(c.r, c.g, c.b),
      });
      appliedCount++;
    }
  }

  // Ensure at least 1 page
  if (doc.getPageCount() === 0) {
    doc.addPage([612, 792]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_FULL_PDF_EDITING_COMPLETED', {
    jobId,
    service: 'full-pdf-editing',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: doc.getPageCount(),
    appliedOperationsCount: appliedCount,
  });

  return {
    service: 'full-pdf-editing',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: doc.getPageCount(),
    appliedOperationsCount: appliedCount,
  };
}
