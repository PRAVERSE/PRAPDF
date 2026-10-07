/**
 * PRA PDF — Core PDF Engine Abstractions
 * Wraps pdf-lib and PDF.js with memory-efficient methods and error resilience.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using unpkg or local cdn worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  pageCount: number;
}

/**
 * Safely loads a PDFDocument from bytes
 */
export async function loadPDF(bytes: Uint8Array | ArrayBuffer): Promise<PDFDocument> {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return await PDFDocument.load(input, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });
}

/**
 * Reads document metadata and page count
 */
export async function getPDFMetadata(bytes: Uint8Array | ArrayBuffer): Promise<PDFMetadata> {
  const doc = await loadPDF(bytes);
  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: Array.isArray(doc.getKeywords()) ? (doc.getKeywords() as any).join(', ') : (doc.getKeywords() || ''),
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    pageCount: doc.getPageCount(),
  };
}

/**
 * Renders a PDF page to an HTML Canvas element
 */
export async function renderPageToCanvas(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number }> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
  });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageIndex + 1);

  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return { width: viewport.width, height: viewport.height };
}

/**
 * Extracts plain text from all pages of a PDF
 */
export async function extractTextFromPDF(
  pdfBytes: Uint8Array | ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    fullText += `--- Page ${i} ---\n` + pageText + '\n\n';

    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return fullText.trim();
}

export { PDFDocument, rgb, degrees, StandardFonts };
