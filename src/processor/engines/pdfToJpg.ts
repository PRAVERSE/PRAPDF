/**
 * PRA PDF — Real PDF to JPG Engine
 * A PRAVERSE Company
 * Renders PDF pages into high-resolution JPG images using pdfjs-dist and @napi-rs/canvas.
 * Bundles multi-page outputs into clean ZIP archives with zero loss or faking.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { procLogger } from '../logger';

export interface PdfToJpgResult {
  service: 'pdf-to-jpg';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  imageCount: number;
  isZip: boolean;
}

/**
 * Creates an adapted 2D rendering context that bridges pdfjs-dist vector paths to @napi-rs/canvas
 */
function createAdaptedCanvasContext(canvas: any): any {
  const ctx = canvas.getContext('2d');
  const origFill = ctx.fill.bind(ctx);
  const origStroke = ctx.stroke.bind(ctx);

  ctx.fill = function (...args: any[]) {
    if (args[0] && typeof args[0].toSVGString === 'function') {
      const svg = args[0].toSVGString();
      if (!svg) return;
      return origFill(svg, ...args.slice(1));
    }
    return origFill(...args);
  };

  ctx.stroke = function (...args: any[]) {
    if (args[0] && typeof args[0].toSVGString === 'function') {
      const svg = args[0].toSVGString();
      if (!svg) return;
      return origStroke(svg, ...args.slice(1));
    }
    return origStroke(...args);
  };

  return ctx;
}

export async function processPdfToJpg(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    dpi?: number;
    quality?: number;
  }
): Promise<PdfToJpgResult> {
  const inputBuffer = fs.readFileSync(inputPath);
  const inputSize = inputBuffer.length;

  procLogger.info('ENGINE_PDF_TO_JPG_STARTED', {
    jobId,
    service: 'pdf-to-jpg',
    inputSizeBytes: inputSize,
  });

  // Verify %PDF- header
  if (inputBuffer.slice(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('Input file does not contain a valid PDF signature (%PDF-).');
  }

  const dpi = options?.dpi || 150;
  const quality = Math.min(Math.max((options?.quality || 90), 10), 100);
  const scale = dpi / 72;

  const fontDir = path.resolve('node_modules/pdfjs-dist/standard_fonts').split(path.sep).join('/') + '/';
  const standardFontDataUrl = `file:///${fontDir}`;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(inputBuffer),
    useSystemFonts: true,
    standardFontDataUrl,
    verbosity: 0,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages === 0) {
    throw new Error('PDF document contains zero pages.');
  }

  const isZipOutput = outputPath.toLowerCase().endsWith('.zip');
  const zip = isZipOutput ? new JSZip() : null;
  let singleJpgBuffer: Buffer | null = null;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = createAdaptedCanvasContext(canvas);

    // Fill white background for JPEG rendering (JPEG does not support alpha)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const jpgBuf = canvas.toBuffer('image/jpeg', quality);

    if (isZipOutput && zip) {
      const padNum = String(pageNum).padStart(3, '0');
      zip.file(`page_${padNum}.jpg`, jpgBuf);
    } else {
      singleJpgBuffer = jpgBuf;
    }
  }

  let outputBuffer: Buffer;
  if (isZipOutput && zip) {
    outputBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  } else if (singleJpgBuffer) {
    outputBuffer = singleJpgBuffer;
  } else {
    throw new Error('Failed to generate JPG output.');
  }

  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_PDF_TO_JPG_COMPLETED', {
    jobId,
    service: 'pdf-to-jpg',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: numPages,
    imageCount: numPages,
    isZip: isZipOutput,
  });

  return {
    service: 'pdf-to-jpg',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: numPages,
    imageCount: numPages,
    isZip: isZipOutput,
  };
}
