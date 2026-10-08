/**
 * PRA PDF — Real Excel to PDF Engine
 * A PRAVERSE Company
 * Converts Excel spreadsheets (.xlsx, .xls, .csv) into paginated PDF tables.
 */

import fs from 'fs';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { procLogger } from '../logger';

export interface ExcelToPdfResult {
  service: 'excel-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  sheetCount: number;
  rowCount: number;
}

export async function processExcelToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<ExcelToPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_EXCEL_TO_PDF_STARTED', {
    jobId,
    service: 'excel-to-pdf',
    inputSizeBytes: inputSize,
  });

  const workbook = XLSX.read(rawInput, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('Workbook contains zero sheets.');
  }

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Use Landscape Letter for spreadsheets (792 width, 612 height)
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 40;
  const printableWidth = pageWidth - margin * 2;
  const rowHeight = 20;

  let totalRowCount = 0;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (data.length === 0) continue;

    // Filter rows with at least one non-empty value
    const cleanRows = data.filter((row) => Array.isArray(row) && row.some((cell) => cell !== ''));
    if (cleanRows.length === 0) continue;

    totalRowCount += cleanRows.length;

    // Determine maximum columns (cap at 10 columns for readable layout)
    const maxCols = Math.min(10, Math.max(...cleanRows.map((r) => r.length)));
    if (maxCols === 0) continue;

    const colWidth = printableWidth / maxCols;

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // Sheet Title
    currentPage.drawText(`Sheet: ${sheetName}`, {
      x: margin,
      y: currentY - 14,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    currentY -= 28;

    for (let rIdx = 0; rIdx < cleanRows.length; rIdx++) {
      if (currentY - rowHeight < margin) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin - 15;
      }

      const row = cleanRows[rIdx];
      const isHeader = rIdx === 0;

      // Draw row background
      if (isHeader) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: printableWidth,
          height: rowHeight,
          color: rgb(0.9, 0.93, 0.96),
        });
      } else if (rIdx % 2 === 0) {
        currentPage.drawRectangle({
          x: margin,
          y: currentY - rowHeight,
          width: printableWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.99),
        });
      }

      // Draw cells
      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const cellVal = row[cIdx] !== undefined ? String(row[cIdx]).trim() : '';
        const cellX = margin + cIdx * colWidth;

        // Truncate cell text to fit cell width
        let displayStr = cellVal;
        const maxChars = Math.floor(colWidth / 6);
        if (displayStr.length > maxChars) {
          displayStr = displayStr.slice(0, maxChars - 1) + '…';
        }

        if (displayStr) {
          currentPage.drawText(displayStr, {
            x: cellX + 4,
            y: currentY - 14,
            size: 8.5,
            font: isHeader ? fontBold : fontRegular,
            color: isHeader ? rgb(0.08, 0.1, 0.15) : rgb(0.18, 0.2, 0.24),
          });
        }

        // Draw light column border
        currentPage.drawLine({
          start: { x: cellX, y: currentY },
          end: { x: cellX, y: currentY - rowHeight },
          thickness: 0.35,
          color: rgb(0.85, 0.88, 0.9),
        });
      }

      // Right boundary
      currentPage.drawLine({
        start: { x: margin + printableWidth, y: currentY },
        end: { x: margin + printableWidth, y: currentY - rowHeight },
        thickness: 0.35,
        color: rgb(0.85, 0.88, 0.9),
      });

      // Bottom row line
      currentPage.drawLine({
        start: { x: margin, y: currentY - rowHeight },
        end: { x: margin + printableWidth, y: currentY - rowHeight },
        thickness: 0.35,
        color: rgb(0.85, 0.88, 0.9),
      });

      currentY -= rowHeight;
    }
  }

  if (doc.getPageCount() === 0) {
    doc.addPage([pageWidth, pageHeight]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_EXCEL_TO_PDF_COMPLETED', {
    jobId,
    service: 'excel-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: doc.getPageCount(),
    sheetCount: sheetNames.length,
    rowCount: totalRowCount,
  });

  return {
    service: 'excel-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: doc.getPageCount(),
    sheetCount: sheetNames.length,
    rowCount: totalRowCount,
  };
}
