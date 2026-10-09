/**
 * PRA PDF — Cloudflare Worker Processing Controller
 * A PRAVERSE Company
 *
 * Coordinates execution of 26 Worker-compatible engines in pure memory.
 * Provides structured JSON responses, timing telemetry, and strict error handling.
 */

import { WorkerServiceName, WorkerEngineResult } from './engines/types';
export type { WorkerServiceName };

// Phase 1 Engines (8)
import { processJpgToPdfWorker } from './engines/jpgToPdf';
import { processMergePdfWorker } from './engines/mergePdf';
import { processSplitPdfWorker } from './engines/splitPdf';
import { processCompressPdfWorker } from './engines/compressPdf';
import { processWordToPdfWorker } from './engines/wordToPdf';
import { processPdfToWordWorker } from './engines/pdfToWord';
import { processWatermarkPdfWorker } from './engines/watermarkPdf';
import { processFullPdfEditingWorker } from './engines/fullPdfEditor';

// Phase 2 Engines (18)
import { processPngToPdfWorker } from './engines/pngToPdf';
import { processRotatePdfWorker } from './engines/rotatePdf';
import { processCropPdfWorker } from './engines/cropPdf';
import { processOrganizePdfWorker } from './engines/organizePdf';
import { processDeletePdfPagesWorker } from './engines/deletePdfPages';
import { processExtractPdfPagesWorker } from './engines/extractPdfPages';
import { processAddPageNumbersWorker } from './engines/addPageNumbers';
import { processProtectPdfWorker } from './engines/protectPdf';
import { processUnlockPdfWorker } from './engines/unlockPdf';
import { processExtractPdfTextWorker } from './engines/extractPdfText';
import { processPdfToMarkdownWorker } from './engines/pdfToMarkdown';
import { processEditPdfMetadataWorker } from './engines/editPdfMetadata';
import { processRtfConversionWorker } from './engines/rtfConversion';
import { processExcelToPdfWorker } from './engines/excelToPdf';
import { processPowerpointToPdfWorker } from './engines/powerpointToPdf';
import { processHtmlToPdfWorker } from './engines/htmlToPdf';
import { processTxtToPdfWorker } from './engines/txtToPdf';
import { processMarkdownToPdfWorker } from './engines/markdownToPdf';

export const SUPPORTED_WORKER_SERVICES: WorkerServiceName[] = [
  // Phase 1 (8)
  'jpg-to-pdf',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'word-to-pdf',
  'pdf-to-word',
  'watermark-pdf',
  'full-pdf-editing',
  // Phase 2 (18)
  'png-to-pdf',
  'rotate-pdf',
  'crop-pdf',
  'organize-pdf',
  'delete-pdf-pages',
  'extract-pdf-pages',
  'add-page-numbers',
  'password-protect-pdf',
  'unlock-pdf',
  'extract-pdf-text',
  'pdf-to-markdown',
  'edit-pdf-metadata',
  'rtf-conversion',
  'excel-to-pdf',
  'powerpoint-to-pdf',
  'html-to-pdf',
  'txt-to-pdf',
  'markdown-to-pdf',
];

export interface WorkerJobSuccessResponse {
  success: true;
  service: WorkerServiceName;
  outputBase64: string;
  outputSizeBytes: number;
  mimeType: string;
  outputFileName: string;
  metadata: Record<string, any>;
  executionTimeMs: number;
}

export interface WorkerJobErrorResponse {
  success: false;
  service?: string;
  errorCode: string;
  message: string;
  executionTimeMs: number;
}

export type WorkerJobResponse = WorkerJobSuccessResponse | WorkerJobErrorResponse;

// Convert Uint8Array to base64 safely without call stack overflow for large files
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

// Convert base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function executeWorkerService(
  service: WorkerServiceName,
  inputBuffer: Uint8Array | Uint8Array[],
  options?: any
): Promise<WorkerEngineResult> {
  const singleBuffer = Array.isArray(inputBuffer) ? inputBuffer[0] : inputBuffer;

  switch (service) {
    // Phase 1 (8)
    case 'jpg-to-pdf':
      return await processJpgToPdfWorker(inputBuffer, options);
    case 'merge-pdf':
      return await processMergePdfWorker(inputBuffer, options);
    case 'split-pdf':
      return await processSplitPdfWorker(singleBuffer, options);
    case 'compress-pdf':
      return await processCompressPdfWorker(singleBuffer, options);
    case 'word-to-pdf':
      return await processWordToPdfWorker(singleBuffer, options);
    case 'pdf-to-word':
      return await processPdfToWordWorker(singleBuffer, options);
    case 'watermark-pdf':
      return await processWatermarkPdfWorker(singleBuffer, options);
    case 'full-pdf-editing':
      return await processFullPdfEditingWorker(singleBuffer, options);

    // Phase 2 (18)
    case 'png-to-pdf':
      return await processPngToPdfWorker(inputBuffer, options);
    case 'rotate-pdf':
      return await processRotatePdfWorker(singleBuffer, options);
    case 'crop-pdf':
      return await processCropPdfWorker(singleBuffer, options);
    case 'organize-pdf':
      return await processOrganizePdfWorker(singleBuffer, options);
    case 'delete-pdf-pages':
      return await processDeletePdfPagesWorker(singleBuffer, options);
    case 'extract-pdf-pages':
      return await processExtractPdfPagesWorker(singleBuffer, options);
    case 'add-page-numbers':
      return await processAddPageNumbersWorker(singleBuffer, options);
    case 'password-protect-pdf':
      return await processProtectPdfWorker(singleBuffer, options);
    case 'unlock-pdf':
      return await processUnlockPdfWorker(singleBuffer, options);
    case 'extract-pdf-text':
      return await processExtractPdfTextWorker(singleBuffer, options);
    case 'pdf-to-markdown':
      return await processPdfToMarkdownWorker(singleBuffer, options);
    case 'edit-pdf-metadata':
      return await processEditPdfMetadataWorker(singleBuffer, options);
    case 'rtf-conversion':
      return await processRtfConversionWorker(singleBuffer, options);
    case 'excel-to-pdf':
      return await processExcelToPdfWorker(singleBuffer, options);
    case 'powerpoint-to-pdf':
      return await processPowerpointToPdfWorker(singleBuffer, options);
    case 'html-to-pdf':
      return await processHtmlToPdfWorker(singleBuffer, options);
    case 'txt-to-pdf':
      return await processTxtToPdfWorker(singleBuffer, options);
    case 'markdown-to-pdf':
      return await processMarkdownToPdfWorker(singleBuffer, options);

    default:
      throw new Error(`Unsupported service: ${service}`);
  }
}
