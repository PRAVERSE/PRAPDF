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
 * Renders a PDF page to a compact data URL for instant UI preview
 */
export async function renderPageThumbnail(
  pdfBytes: Uint8Array | ArrayBuffer,
  pageIndex: number = 0,
  targetWidth: number = 180
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
  });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageIndex + 1);

  const naturalViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / naturalViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Renders all pages of a document into visual thumbnails for page-level tools
 */
export async function renderDocumentPages(
  pdfBytes: Uint8Array | ArrayBuffer,
  maxPages: number = 50,
  targetWidth: number = 160
): Promise<Array<{ pageNumber: number; dataUrl: string; width: number; height: number }>> {
  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
  });
  const pdfDoc = await loadingTask.promise;
  const total = Math.min(pdfDoc.numPages, maxPages);
  const results: Array<{ pageNumber: number; dataUrl: string; width: number; height: number }> = [];

  for (let i = 1; i <= total; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const naturalViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / naturalViewport.width;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;
        results.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/jpeg', 0.8),
          width: canvas.width,
          height: canvas.height,
        });
      }
    } catch (e) {
      console.warn(`Failed to render page thumbnail ${i}:`, e);
    }
  }

  return results;
}

/**
 * Gets page count quickly
 */
export async function getPageCountFast(pdfBytes: Uint8Array | ArrayBuffer): Promise<number> {
  try {
    const doc = await loadPDF(pdfBytes);
    return doc.getPageCount();
  } catch {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
    });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc.numPages;
  }
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

