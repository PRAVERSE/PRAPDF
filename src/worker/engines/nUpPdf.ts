/**
 * PRA PDF — Cloudflare Worker: N-up PDF Engine (Multiple Pages Per Sheet)
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Imposes multiple pages (2, 4, or 8) onto single output sheets using vector scaling.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processNUpPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    pagesPerSheet?: 2 | 4 | 8;
    sheetSize?: 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalSrcPages = srcDoc.getPageCount();

  if (totalSrcPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const n = options?.pagesPerSheet || 2;
  const sheetFormat = options?.sheetSize || 'A4';

  let cols = 2;
  let rows = 1;
  let defaultOrientation: 'portrait' | 'landscape' = 'landscape';

  if (n === 2) {
    cols = 2;
    rows = 1;
    defaultOrientation = 'landscape';
  } else if (n === 4) {
    cols = 2;
    rows = 2;
    defaultOrientation = 'portrait';
  } else if (n === 8) {
    cols = 4;
    rows = 2;
    defaultOrientation = 'landscape';
  }

  const orientation = options?.orientation || defaultOrientation;

  // Base dimensions (points)
  let sheetWidth = sheetFormat === 'LETTER' ? 612 : 595.28;
  let sheetHeight = sheetFormat === 'LETTER' ? 792 : 841.89;

  if (orientation === 'landscape') {
    const tmp = sheetWidth;
    sheetWidth = sheetHeight;
    sheetHeight = tmp;
  }

  const margin = 20; // 20pt margin around edges
  const availWidth = sheetWidth - margin * 2;
  const availHeight = sheetHeight - margin * 2;

  const cellWidth = availWidth / cols;
  const cellHeight = availHeight / rows;

  const newDoc = await PDFDocument.create();

  for (let i = 0; i < totalSrcPages; i += n) {
    const sheetPage = newDoc.addPage([sheetWidth, sheetHeight]);

    for (let slot = 0; slot < n; slot++) {
      const srcIdx = i + slot;
      if (srcIdx >= totalSrcPages) break;

      const srcPage = srcDoc.getPage(srcIdx);
      const { width: pWidth, height: pHeight } = srcPage.getSize();

      const col = slot % cols;
      const row = Math.floor(slot / cols);

      const cellX = margin + col * cellWidth;
      // In PDF, y=0 is at bottom, so row 0 is top of sheet
      const cellY = sheetHeight - margin - (row + 1) * cellHeight;

      const cellPadding = 8;
      const targetW = cellWidth - cellPadding * 2;
      const targetH = cellHeight - cellPadding * 2;

      const scale = Math.min(targetW / pWidth, targetH / pHeight);
      const drawW = pWidth * scale;
      const drawH = pHeight * scale;

      const drawX = cellX + cellPadding + (targetW - drawW) / 2;
      const drawY = cellY + cellPadding + (targetH - drawH) / 2;

      const embeddedPage = await newDoc.embedPage(srcPage);
      sheetPage.drawPage(embeddedPage, {
        x: drawX,
        y: drawY,
        xScale: scale,
        yScale: scale,
      });
    }
  }

  const outBytes = await newDoc.save({ useObjectStreams: true });
  const baseName = options?.outputFileName
    ? options.outputFileName.replace(/\.pdf$/i, '')
    : 'document';

  return {
    service: 'n-up-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: `${baseName}_${n}up.pdf`,
    metadata: {
      originalPages: totalSrcPages,
      resultingSheets: newDoc.getPageCount(),
      pagesPerSheet: n,
      sheetDimensions: { width: sheetWidth, height: sheetHeight },
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
