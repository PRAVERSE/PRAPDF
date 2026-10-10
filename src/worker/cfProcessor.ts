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

// Wave 1 Engines (5)
import { processDeletePdfAnnotationsWorker } from './engines/deletePdfAnnotations';
import { processFlipPdfWorker } from './engines/flipPdf';
import { processSplitPdfInHalfWorker } from './engines/splitPdfInHalf';
import { processAlternateMixPdfWorker } from './engines/alternateMixPdf';
import { processNUpPdfWorker } from './engines/nUpPdf';

// Wave 2 Engines (3 new files, 13 total services)
import { processImagesToPdfWorker } from './engines/imagesToPdf';
import { processPdfToJpgWorker, processPdfToPngWorker } from './engines/pdfToImages';

// Wave 3 Engines (8 new files, 13 total services)
import { processOcrPdfWorker } from './engines/ocrPdf';
import { processScanToPdfWorker } from './engines/scanToPdf';
import { processPdfToTiffWorker } from './engines/pdfToTiff';
import { processPdfToExcelWorker } from './engines/pdfToExcel';
import { processPdfToCsvWorker } from './engines/pdfToCsv';
import { processPdfToPowerpointWorker } from './engines/pdfToPowerpoint';
import { processGrayscalePdfWorker } from './engines/grayscalePdf';
import { processDeskewPdfWorker } from './engines/deskewPdf';

// Wave 4 Engines (13 services #44 to #56)
import { processRepairPdfWorker } from './engines/repairPdf';
import { processHeaderFooterPdfWorker } from './engines/headerFooterPdf';
import { processBatesNumberingPdfWorker } from './engines/batesNumberingPdf';
import { processAnnotatePdfWorker } from './engines/annotatePdf';
import { processFlattenPdfWorker } from './engines/flattenPdf';
import { processResizePdfWorker } from './engines/resizePdf';
import { processFillPdfFormsWorker } from './engines/fillPdfForms';
import { processCreatePdfFormsWorker } from './engines/createPdfForms';
import { processSignPdfWorker } from './engines/signPdf';
import { processRedactPdfWorker } from './engines/redactPdf';
import { processPdfToPdfaWorker } from './engines/pdfToPdfa';
import { processComparePdfWorker } from './engines/comparePdf';
import { processExtractImagesFromPdfWorker } from './engines/extractImagesFromPdf';

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
  // Wave 1 (5)
  'delete-pdf-annotations',
  'flip-pdf',
  'split-pdf-in-half',
  'alternate-mix-pdf',
  'n-up-pdf',
  // Wave 2 (13 services & aliases)
  'images-to-pdf',
  'rtf-to-pdf',
  'pdf-to-rtf',
  'pdf-to-jpg',
  'pdf-to-png',
  'organize-pdf-pages',
  // Wave 3 (13 services)
  'ocr-pdf',
  'scan-to-pdf',
  'pdf-to-tiff',
  'pdf-to-excel',
  'pdf-to-csv',
  'pdf-to-powerpoint',
  'grayscale-pdf',
  'deskew-pdf',
  // Wave 4 (13 services #44 to #56)
  'repair-pdf',
  'header-footer-pdf',
  'bates-numbering-pdf',
  'annotate-pdf',
  'flatten-pdf',
  'resize-pdf',
  'fill-pdf-forms',
  'create-pdf-forms',
  'sign-pdf',
  'redact-pdf',
  'pdf-to-pdfa',
  'compare-pdf',
  'extract-images-from-pdf',
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

    // Wave 1 (5)
    case 'delete-pdf-annotations':
      return await processDeletePdfAnnotationsWorker(singleBuffer, options);
    case 'flip-pdf':
      return await processFlipPdfWorker(singleBuffer, options);
    case 'split-pdf-in-half':
      return await processSplitPdfInHalfWorker(singleBuffer, options);
    case 'alternate-mix-pdf':
      return await processAlternateMixPdfWorker(inputBuffer, options);
    case 'n-up-pdf':
      return await processNUpPdfWorker(singleBuffer, options);

    // Wave 2 (13 services & aliases)
    case 'images-to-pdf':
      return await processImagesToPdfWorker(inputBuffer, options);
    case 'rtf-to-pdf':
      return await processRtfConversionWorker(singleBuffer, { ...options, serviceName: 'rtf-to-pdf' });
    case 'pdf-to-rtf':
      return await processRtfConversionWorker(singleBuffer, { ...options, serviceName: 'pdf-to-rtf' });
    case 'pdf-to-jpg':
      return await processPdfToJpgWorker(singleBuffer, options);
    case 'pdf-to-png':
      return await processPdfToPngWorker(singleBuffer, options);
    case 'organize-pdf-pages':
      return await processOrganizePdfWorker(singleBuffer, options);

    // Wave 3 (13 services)
    case 'ocr-pdf':
      return await processOcrPdfWorker(singleBuffer, options);
    case 'scan-to-pdf':
      return await processScanToPdfWorker(inputBuffer, options);
    case 'pdf-to-tiff':
      return await processPdfToTiffWorker(singleBuffer, options);
    case 'pdf-to-excel':
      return await processPdfToExcelWorker(singleBuffer, options);
    case 'pdf-to-csv':
      return await processPdfToCsvWorker(singleBuffer, options);
    case 'pdf-to-powerpoint':
      return await processPdfToPowerpointWorker(singleBuffer, options);
    case 'grayscale-pdf':
      return await processGrayscalePdfWorker(singleBuffer, options);
    case 'deskew-pdf':
      return await processDeskewPdfWorker(singleBuffer, options);

    // Wave 4 (13 services #44 to #56)
    case 'repair-pdf':
      return await processRepairPdfWorker(singleBuffer, options);
    case 'header-footer-pdf':
      return await processHeaderFooterPdfWorker(singleBuffer, options);
    case 'bates-numbering-pdf':
      return await processBatesNumberingPdfWorker(singleBuffer, options);
    case 'annotate-pdf':
      return await processAnnotatePdfWorker(singleBuffer, options);
    case 'flatten-pdf':
      return await processFlattenPdfWorker(singleBuffer, options);
    case 'resize-pdf':
      return await processResizePdfWorker(singleBuffer, options);
    case 'fill-pdf-forms':
      return await processFillPdfFormsWorker(singleBuffer, options);
    case 'create-pdf-forms':
      return await processCreatePdfFormsWorker(singleBuffer, options);
    case 'sign-pdf':
      return await processSignPdfWorker(singleBuffer, options);
    case 'redact-pdf':
      return await processRedactPdfWorker(singleBuffer, options);
    case 'pdf-to-pdfa':
      return await processPdfToPdfaWorker(singleBuffer, options);
    case 'compare-pdf':
      return await processComparePdfWorker(inputBuffer, options);
    case 'extract-images-from-pdf':
      return await processExtractImagesFromPdfWorker(singleBuffer, options);

    default:
      throw new Error(`Unsupported service: ${service}`);
  }
}
