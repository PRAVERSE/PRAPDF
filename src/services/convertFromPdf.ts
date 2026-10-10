/**
 * PRA PDF — Convert FROM PDF Services
 * Routes to the Node processor at /api/v1/process.
 * A PRAVERSE Company
 */

import { validateFileSize } from './core/fileValidator';
import { postFormDataWithProgress, NetworkProgressCallback } from './core/networkClient';

const CF_WORKER_API = '/api/v1/cf/process';
const NODE_API = '/api/v1/process';

async function sendToProcessor(
  service: string,
  file: File,
  extraFields: Record<string, string> = {},
  onProgress?: NetworkProgressCallback
): Promise<Blob> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  onProgress?.(5, 'Validating documents…');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('service', service);
  if (Object.keys(extraFields).length > 0) {
    formData.append('options', JSON.stringify(extraFields));
  }
  for (const [k, v] of Object.entries(extraFields)) formData.append(k, v);

  // 1. Try Cloudflare Worker route first
  try {
    const json = await postFormDataWithProgress<any>(CF_WORKER_API, formData, {
      onProgress,
      serviceName: service,
    });

    if (json.success && json.outputBase64) {
      const binaryString = atob(json.outputBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      onProgress?.(100, 'Completed successfully!');
      return new Blob([bytes as unknown as BlobPart], { type: json.mimeType || 'application/octet-stream' });
    }
  } catch (cfErr: any) {
    console.warn(`[${service}] Worker route unavailable, trying processor fallback:`, cfErr);
  }

  // 2. Fallback to Node processor endpoint
  const blob = await postFormDataWithProgress<Blob>(NODE_API, formData, {
    onProgress,
    serviceName: service,
    responseType: 'blob',
  });

  onProgress?.(100, 'Completed successfully!');
  return blob;
}

/**
 * Tool 22: PDF to JPG — returns a ZIP blob containing JPEG images
 */
export async function convertPdfToJpg(
  file: File,
  options: { dpi?: number; quality?: number; onProgress?: NetworkProgressCallback } = {}
): Promise<{ filename: string; data: Blob }> {
  const blob = await sendToProcessor(
    'pdf-to-jpg',
    file,
    { dpi: String(options.dpi ?? 150), quality: String(options.quality ?? 90) },
    options.onProgress
  );
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return { filename: `${baseName}-images.zip`, data: blob };
}

/**
 * Tool 23: PDF to PNG — returns a ZIP blob containing PNG images
 */
export async function convertPdfToPng(
  file: File,
  options: { dpi?: number; onProgress?: NetworkProgressCallback } = {}
): Promise<{ filename: string; data: Blob }> {
  const blob = await sendToProcessor('pdf-to-png', file, { dpi: String(options.dpi ?? 150) }, options.onProgress);
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return { filename: `${baseName}-images.zip`, data: blob };
}

/**
 * Tool 24: PDF to Markdown
 */
export async function convertPdfToMarkdown(
  file: File,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Blob> {
  return sendToProcessor('pdf-to-markdown', file, {}, options.onProgress);
}

/**
 * Tool 21: PDF to Word (.docx)
 */
export async function convertPdfToWord(
  file: File,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Blob> {
  return sendToProcessor('pdf-to-word', file, {}, options.onProgress);
}

export interface ConvertPdfToTextResult {
  text: string;
  pageCount: number;
  characterCount: number;
  wordCount: number;
  hasText: boolean;
  blob: Blob;
  filename: string;
}

/**
 * Tool 29: Extract PDF Text → .txt
 * Extracts genuine plain text in reading order, retaining page boundaries.
 */
export async function convertPdfToText(
  file: File,
  options: { onProgress?: (p: number | null, s: string, detail?: string) => void } = {}
): Promise<ConvertPdfToTextResult> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(5, 'Validating documents…');
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  // 1. Try Cloudflare Worker endpoint first
  const formData = new FormData();
  formData.append('service', 'extract-pdf-text');
  formData.append('file', file);

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress: options.onProgress,
      serviceName: 'extract-pdf-text',
    });

    if (json.success && (json.metadata?.extractedText !== undefined || json.outputBase64)) {
      let text = json.metadata?.extractedText;
      if (text === undefined && json.outputBase64) {
        text = atob(json.outputBase64);
      }
      text = text || '';
      const hasText = text.trim().length > 0;
      const charCount = json.metadata?.characterCount ?? text.length;
      const wordCount = json.metadata?.wordCount ?? text.split(/\s+/).filter(Boolean).length;
      const pageCount = json.metadata?.pageCount ?? 1;

      options.onProgress?.(100, 'Completed successfully!');
      return {
        text,
        pageCount,
        characterCount: charCount,
        wordCount,
        hasText,
        blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
        filename: `${baseName}.txt`,
      };
    }
  } catch (workerErr: any) {
    console.warn('[TEXT_EXTRACT] Worker route unavailable, using client-side engine:', workerErr);
  }

  // 2. Client-side fallback via pdfjs-dist
  options.onProgress?.(20, 'Preparing files…', 'Parsing PDF text structure in browser…');
  const buffer = await file.arrayBuffer();
  const { extractTextFromPDF, getPageCountFast } = await import('./core/pdfEngine');
  const totalPages = await getPageCountFast(buffer);

  options.onProgress?.(50, 'Processing PDF…', 'Extracting text across pages…');
  const text = await extractTextFromPDF(buffer, (pct) => {
    options.onProgress?.(pct, 'Processing PDF…', `Extracting page text (${pct}%)…`);
  });

  const textWithoutHeaders = text.replace(/--- Page \d+(?: of \d+)? ---\s*/g, '').trim();
  const hasText = textWithoutHeaders.length > 0;
  const displayText = hasText ? text : '';
  const charCount = displayText.length;
  const wordCount = displayText.split(/\s+/).filter(Boolean).length;

  options.onProgress?.(95, 'Generating output…', 'Preparing extracted text…');
  options.onProgress?.(100, 'Completed successfully!');

  return {
    text: displayText,
    pageCount: totalPages,
    characterCount: charCount,
    wordCount,
    hasText,
    blob: new Blob([displayText], { type: 'text/plain;charset=utf-8' }),
    filename: `${baseName}.txt`,
  };
}

/**
 * Tool 30a: RTF → PDF
 */
export async function convertRtfToPdf(
  file: File,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Blob> {
  return sendToProcessor('rtf-to-pdf', file, { direction: 'rtf-to-pdf' }, options.onProgress);
}

/**
 * Tool 30b: PDF → RTF
 */
export async function convertPdfToRtf(
  file: File,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Blob> {
  return sendToProcessor('pdf-to-rtf', file, { direction: 'pdf-to-rtf' }, options.onProgress);
}
