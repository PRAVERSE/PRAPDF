/**
 * PRA PDF — Optimization & Deterministic OCR Services
 * 21. Compress PDF
 * 22. OCR PDF (Pure WebAssembly Tesseract OCR — STRICTLY NON-AI)
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { validateFileSize } from './core/fileValidator';
import { loadPDF } from './core/pdfEngine';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface CompressOptions {
  level?: 'low' | 'medium' | 'high';
  onProgress?: (percent: number, status: string) => void;
}

export interface OcrOptions {
  language?: string;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 21: Compress PDF
 * Re-samples page canvas streams at optimized dimensions and quality
 */
export async function compressPdf(
  file: File,
  options: CompressOptions = {}
): Promise<{ data: Uint8Array; originalSize: number; newSize: number; ratio: string }> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  const originalSize = file.size;
  options.onProgress?.(15, 'Analyzing PDF streams...');

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const quality = options.level === 'high' ? 0.5 : options.level === 'low' ? 0.8 : 0.65;
  const scale = options.level === 'high' ? 1.0 : options.level === 'low' ? 1.5 : 1.2;

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(
      Math.round(20 + ((i / numPages) * 70)),
      `Compressing page ${i} of ${numPages}...`
    );

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpegBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality));
    const imgBuffer = await jpegBlob.arrayBuffer();
    const embeddedImage = await newDoc.embedJpg(imgBuffer);

    // Keep original page aspect ratio
    const newPage = newDoc.addPage([page.view[2], page.view[3]]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: page.view[2],
      height: page.view[3],
    });
  }

  options.onProgress?.(95, 'Building compressed PDF...');
  const compressedBytes = await newDoc.save({ useObjectStreams: true });
  const newSize = compressedBytes.byteLength;
  const savedPercent = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

  return {
    data: compressedBytes,
    originalSize,
    newSize,
    ratio: `${savedPercent}% reduction`,
  };
}

/**
 * Tool 22: OCR PDF
 * Uses 100% deterministic, open-source Tesseract.js WebAssembly engine.
 * Absolutely ZERO AI model calls or external AI APIs.
 */
export async function ocrPdf(
  file: File,
  options: OcrOptions = {}
): Promise<{ data: Uint8Array; recognizedText: string }> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(10, 'Initializing WebAssembly Tesseract OCR Engine (Non-AI)...');
  const worker = await createWorker(options.language || 'eng');

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const searchableDoc = await PDFDocument.create();
  const font = await searchableDoc.embedFont(StandardFonts.Helvetica);
  let totalRecognizedText = '';

  for (let i = 1; i <= numPages; i++) {
    options.onProgress?.(
      Math.round(20 + ((i / numPages) * 70)),
      `Running optical scan on page ${i} of ${numPages}...`
    );

    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Run local WASM character recognition
    const ret = await worker.recognize(canvas);
    const pageText = ret.data.text;
    totalRecognizedText += `--- Page ${i} OCR ---\n` + pageText + '\n\n';

    // Embed scanned page image into searchable PDF
    const jpegBlob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85));
    const imgBuffer = await jpegBlob.arrayBuffer();
    const embeddedImg = await searchableDoc.embedJpg(imgBuffer);

    const newPage = searchableDoc.addPage([page.view[2], page.view[3]]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: page.view[2],
      height: page.view[3],
    });

    // Inject invisible searchable text layer behind visual page
    const cleanLines = pageText.split('\n').filter((l) => l.trim().length > 0);
    let y = page.view[3] - 40;
    for (const line of cleanLines) {
      if (y > 30) {
        newPage.drawText(line.substring(0, 80), {
          x: 40,
          y,
          size: 9,
          font,
          color: rgb(0, 0, 0),
          opacity: 0.01, // Invisible searchable text overlay
        });
        y -= 14;
      }
    }
  }

  await worker.terminate();

  options.onProgress?.(95, 'Finalizing searchable PDF document...');
  const outputBytes = await searchableDoc.save();

  return {
    data: outputBytes,
    recognizedText: totalRecognizedText.trim(),
  };
}
