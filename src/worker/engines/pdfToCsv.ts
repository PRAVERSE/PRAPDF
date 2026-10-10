/**
 * PRA PDF — Cloudflare Worker: PDF to CSV Engine
 * Pure in-memory execution using pdfjs-dist. Zero filesystem or native dependencies.
 *
 * Extracts text layouts and tabular data from PDF pages into standard RFC 4180 CSV.
 */

import { WorkerEngineResult } from './types';

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

export async function processPdfToCsvWorker(
  inputBuffer: Uint8Array,
  options?: {
    delimiter?: string;
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

  const delimiter = options?.delimiter || ',';
  const allRows: string[][] = [];
  let maxCols = 0;

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

    for (const bucket of rowBuckets) {
      // Sort columns ascending by X
      bucket.items.sort((a, b) => a.x - b.x);

      const rowCells: string[] = [];
      let currentCell = '';
      let lastX = -1;
      let lastWidth = 0;

      for (const it of bucket.items) {
        const gap = lastX >= 0 ? it.x - (lastX + lastWidth) : 0;
        if (gap > 18) {
          if (currentCell) {
            rowCells.push(currentCell.trim());
            currentCell = '';
          }
        }

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
        allRows.push(rowCells);
        if (rowCells.length > maxCols) maxCols = rowCells.length;
      }
    }
  }

  // Format as CSV lines
  const csvLines = allRows.map((row) => row.map(escapeCsvCell).join(delimiter));
  const csvContent = csvLines.join('\r\n') + '\r\n';
  const outputBuffer = new TextEncoder().encode(csvContent);

  return {
    service: 'pdf-to-csv',
    outputBuffer,
    mimeType: 'text/csv; charset=utf-8',
    outputFileName: 'converted.csv',
    metadata: {
      pageCount: numPages,
      rowCount: allRows.length,
      columnCount: maxCols,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outputBuffer.length,
    },
  };
}
