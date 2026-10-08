/**
 * PRA PDF — Real OCR PDF Engine
 * A PRAVERSE Company
 * Performs Optical Character Recognition on PDF pages using Tesseract.js and renders a searchable PDF.
 */

import fs from 'fs';
import crypto from 'crypto';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { procLogger } from '../logger';

export interface OcrPdfResult {
  service: 'ocr-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  wordsDetected: number;
}

function createAdaptedCanvasContext(canvas: any) {
  const ctx = canvas.getContext('2d');
  const originalFill = ctx.fill.bind(ctx);
  const originalStroke = ctx.stroke.bind(ctx);

  ctx.fill = function (...args: any[]) {
    if (args.length > 0 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Path2D)) {
      if (typeof args[0].toSVGString === 'function') {
        const svgStr = args[0].toSVGString();
        const path = new Path2D(svgStr);
        return originalFill(path, args[1]);
      }
      return originalFill();
    }
    return originalFill(...args);
  };

  ctx.stroke = function (...args: any[]) {
    if (args.length > 0 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Path2D)) {
      if (typeof args[0].toSVGString === 'function') {
        const svgStr = args[0].toSVGString();
        const path = new Path2D(svgStr);
        return originalStroke(path);
      }
      return originalStroke();
    }
    return originalStroke(...args);
  };

  return ctx;
}

export async function processOcrPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    language?: string;
  }
): Promise<OcrPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_OCR_PDF_STARTED', {
    jobId,
    service: 'ocr-pdf',
    inputSizeBytes: inputSize,
  });

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(rawInput),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  if (numPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const lang = options?.language || 'eng';
  const worker = await createWorker(lang);

  const outDoc = await PDFDocument.create();
  const font = await outDoc.embedFont(StandardFonts.Helvetica);
  let totalWords = 0;

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const ctx = createAdaptedCanvasContext(canvas);

      // Render white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      await (page.render(renderContext) as any).promise;

      const imgBuffer = canvas.toBuffer('image/jpeg', 85);
      const ocrResult = await worker.recognize(imgBuffer);

      const words = (ocrResult.data as any).words || [];
      totalWords += words.length;

      // Create page in output PDF matching original dimensions
      const originalViewport = page.getViewport({ scale: 1.0 });
      const outPage = outDoc.addPage([originalViewport.width, originalViewport.height]);

      // Embed background raster image
      const embeddedJpg = await outDoc.embedJpg(new Uint8Array(imgBuffer));
      outPage.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: originalViewport.width,
        height: originalViewport.height,
      });

      // Overlay recognized text with opacity 0 (searchable text layer)
      const scaleX = originalViewport.width / canvas.width;
      const scaleY = originalViewport.height / canvas.height;

      for (const w of words) {
        if (!w.text || !w.bbox) continue;
        const bbox = w.bbox;
        const x = bbox.x0 * scaleX;
        // In PDF coordinates, Y starts from bottom
        const y = originalViewport.height - bbox.y1 * scaleY;
        const fontSize = Math.max(6, (bbox.y1 - bbox.y0) * scaleY * 0.9);

        try {
          outPage.drawText(w.text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            opacity: 0.0, // Invisible searchable overlay
          });
        } catch {
          // Ignore unsupported glyphs in standard font
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  const outBytes = await outDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_OCR_PDF_COMPLETED', {
    jobId,
    service: 'ocr-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: numPages,
    wordsDetected: totalWords,
  });

  return {
    service: 'ocr-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: numPages,
    wordsDetected: totalWords,
  };
}
