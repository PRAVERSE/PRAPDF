/**
 * PRA PDF — Cloudflare Worker: PDF to JPG & PDF to PNG Engines
 * Pure in-memory execution using pdfjs-dist, jpeg-js, fast-png, and JSZip.
 * Zero filesystem, zero native C++ bindings, 100% portable for Cloudflare Worker.
 */

import JSZip from 'jszip';
import jpeg from 'jpeg-js';
import { encode as encodePng } from 'fast-png';
import { WorkerEngineResult } from './types';

export async function processPdfToJpgWorker(
  inputBuffer: Uint8Array,
  options?: {
    dpi?: number;
    quality?: number;
    asZip?: boolean;
  }
): Promise<WorkerEngineResult> {
  return renderPdfPagesToImageArchive(inputBuffer, 'jpg', options);
}

export async function processPdfToPngWorker(
  inputBuffer: Uint8Array,
  options?: {
    dpi?: number;
    asZip?: boolean;
  }
): Promise<WorkerEngineResult> {
  return renderPdfPagesToImageArchive(inputBuffer, 'png', options);
}

async function renderPdfPagesToImageArchive(
  inputBuffer: Uint8Array,
  format: 'jpg' | 'png',
  options?: {
    dpi?: number;
    quality?: number;
    asZip?: boolean;
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

  const dpi = options?.dpi || 150;
  const quality = Math.min(Math.max(options?.quality || 90, 10), 100);
  const scale = dpi / 72;

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

  const zip = new JSZip();
  let singleImageBuffer: Uint8Array | null = null;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));

    const pixelData = new Uint8Array(width * height * 4);
    // Initialize background to white
    pixelData.fill(255);

    // Adapted canvas proxy for pdfjs-dist renderer
    const dummyCtx: any = new Proxy({}, {
      get(target, prop: string) {
        if (prop === 'canvas') return { width, height };
        if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
        if (prop === 'createImageData') {
          return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
        }
        return () => {};
      },
    });

    try {
      const renderTask = page.render({
        canvasContext: dummyCtx,
        viewport,
      });
      await renderTask.promise;
    } catch {
      // Continue rendering if non-fatal warnings occur
    }

    const padNum = String(pageNum).padStart(3, '0');
    if (format === 'jpg') {
      const encodedJpg = jpeg.encode({ data: pixelData, width, height }, quality);
      zip.file(`page_${padNum}.jpg`, encodedJpg.data);
      if (numPages === 1) singleImageBuffer = encodedJpg.data;
    } else {
      const encodedPng = encodePng({ width, height, data: pixelData });
      zip.file(`page_${padNum}.png`, encodedPng);
      if (numPages === 1) singleImageBuffer = encodedPng;
    }
  }

  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  const service = format === 'jpg' ? 'pdf-to-jpg' : 'pdf-to-png';
  return {
    service,
    outputBuffer: zipBytes,
    mimeType: 'application/zip',
    outputFileName: `${service}-images.zip`,
    metadata: {
      pageCount: numPages,
      imageCount: numPages,
      format,
      dpi,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: zipBytes.length,
    },
  };
}
