/**
 * PRA PDF — Cloudflare Worker: PDF to Excel Engine
 * Pure in-memory execution using pdfjs-dist and SheetJS (xlsx). Zero filesystem or native dependencies.
 *
 * Extracts text layouts and tabular data from PDF pages into a structured XLSX spreadsheet.
 */

import * as XLSX from 'xlsx';
import { WorkerEngineResult } from './types';

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function processPdfToExcelWorker(
  inputBuffer: Uint8Array,
  options?: {
    singleSheet?: boolean;
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

  // @ts-ignore
  const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as any).pdfjsWorker = pdfjsWorker;
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(inputBuffer),
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages === 0) {
    throw new Error('PDF document contains zero pages.');
  }

  const wb = XLSX.utils.book_new();
  let totalRowsCount = 0;
  const combinedRows: string[][] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItem[] = (textContent.items as any[])
      .map((item) => ({
        str: item.str,
        x: item.transform[4] || 0,
        y: item.transform[5] || 0,
        width: item.width || 0,
        height: item.height || 0,
      }))
      .filter((item) => item.str && item.str.trim().length > 0);

    // Group items into rows using vertical threshold (~8 points tolerance)
    const rowBuckets: { y: number; items: TextItem[] }[] = [];
    const ROW_TOLERANCE = 8;

    for (const it of items) {
      let matchedBucket = rowBuckets.find((b) => Math.abs(b.y - it.y) <= ROW_TOLERANCE);
      if (!matchedBucket) {
        matchedBucket = { y: it.y, items: [] };
        rowBuckets.push(matchedBucket);
      }
      matchedBucket.items.push(it);
    }

    // Sort rows descending by Y (PDF top is higher Y)
    rowBuckets.sort((a, b) => b.y - a.y);

    const pageRows: string[][] = [];

    for (const bucket of rowBuckets) {
      // Sort columns ascending by X
      bucket.items.sort((a, b) => a.x - b.x);

      // Split row into columns based on spacing or delimiters
      const rowCells: string[] = [];
      let currentCell = '';
      let lastX = -1;
      let lastWidth = 0;

      for (const it of bucket.items) {
        // If there is significant horizontal gap between items, treat as new column
        const gap = lastX >= 0 ? it.x - (lastX + lastWidth) : 0;
        if (gap > 18) {
          if (currentCell) {
            rowCells.push(currentCell.trim());
            currentCell = '';
          }
        }

        // Check if item contains comma or tab delimited data
        if (it.str.includes('\t')) {
          const parts = it.str.split('\t');
          for (let p = 0; p < parts.length; p++) {
            if (p > 0) {
              rowCells.push(currentCell.trim());
              currentCell = '';
            }
            currentCell += parts[p];
          }
        } else {
          currentCell += (currentCell.length > 0 ? ' ' : '') + it.str;
        }

        lastX = it.x;
        lastWidth = it.width;
      }

      if (currentCell.trim()) {
        rowCells.push(currentCell.trim());
      }

      if (rowCells.length > 0) {
        pageRows.push(rowCells);
      }
    }

    // Fallback if no text extracted: placeholder row
    if (pageRows.length === 0) {
      pageRows.push([`[Page ${pageNum} - No tabular text detected]`]);
    }

    totalRowsCount += pageRows.length;

    if (options?.singleSheet) {
      combinedRows.push(...pageRows);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(pageRows);
      XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
    }
  }

  if (options?.singleSheet) {
    const ws = XLSX.utils.aoa_to_sheet(combinedRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
  }

  const outBytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const outputBuffer = new Uint8Array(outBytes);

  return {
    service: 'pdf-to-excel',
    outputBuffer,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    outputFileName: 'converted.xlsx',
    metadata: {
      pageCount: numPages,
      sheetCount: wb.SheetNames.length,
      totalRows: totalRowsCount,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outputBuffer.length,
    },
  };
}
