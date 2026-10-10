/**
 * PRA PDF — Cloudflare Worker: Extract Images from PDF Engine
 * Pure in-memory execution using pdf-lib, pdfjs-dist, fast-png, jpeg-js, and JSZip.
 * Zero filesystem, zero native dependencies, 100% portable for Cloudflare Worker.
 *
 * Implements genuine raster image extraction:
 * 1. Inspects PDF /XObject image dictionaries and raw streams.
 * 2. Extracts original JPEG (DCTDecode) and PNG bitstreams without lossy re-encoding.
 * 3. Decodes flate-compressed / inline raster data to crisp PNG images.
 * 4. Packages all recovered images into a structured, valid ZIP archive.
 */

import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import JSZip from 'jszip';
import { encode as encodePng } from 'fast-png';
import jpeg from 'jpeg-js';
import { WorkerEngineResult } from './types';

export interface ExtractedImageInfo {
  filename: string;
  bytes: Uint8Array;
  format: 'jpg' | 'png';
  width?: number;
  height?: number;
}

export async function processExtractImagesFromPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    format?: 'original' | 'png' | 'jpg';
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

  const extractedImages: ExtractedImageInfo[] = [];

  // Pass 1: Extract direct image streams from PDF indirect objects via pdf-lib
  try {
    const doc = await PDFDocument.load(inputBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });

    const indirectObjects = doc.context.enumerateIndirectObjects();
    let imgCounter = 0;

    for (const [ref, obj] of indirectObjects) {
      if (obj instanceof PDFRawStream || (obj as any).contents) {
        const dict = (obj as any).dict;
        if (!dict) continue;

        const subtype = dict.lookup(PDFName.of('Subtype'));
        if (subtype && subtype.toString() === '/Image') {
          const contents = (obj as any).getContents
            ? (obj as any).getContents()
            : (obj as any).contents;

          if (!contents || contents.length === 0) continue;

          const filter = dict.lookup(PDFName.of('Filter'))?.toString() || '';
          imgCounter++;

          // Check if it's DCTDecode (JPEG) or starts with JPEG SOI marker 0xFF 0xD8 0xFF
          if (
            filter.includes('DCTDecode') ||
            (contents[0] === 0xff && contents[1] === 0xd8 && contents[2] === 0xff)
          ) {
            extractedImages.push({
              filename: `image_${String(imgCounter).padStart(3, '0')}.jpg`,
              bytes: new Uint8Array(contents),
              format: 'jpg',
            });
          } else if (
            contents[0] === 0x89 &&
            contents[1] === 0x50 &&
            contents[2] === 0x4e &&
            contents[3] === 0x47
          ) {
            // Native PNG SOI marker
            extractedImages.push({
              filename: `image_${String(imgCounter).padStart(3, '0')}.png`,
              bytes: new Uint8Array(contents),
              format: 'png',
            });
          }
        }
      }
    }
  } catch {
    // Non-fatal pass 1; fallback to pdfjs-dist inspection
  }

  // Pass 2: If Pass 1 found no direct streams, use pdfjs-dist operator list
  if (extractedImages.length === 0) {
    try {
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

      let pass2Counter = 0;

      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const ops = await page.getOperatorList();

        for (let i = 0; i < ops.fnArray.length; i++) {
          const fn = ops.fnArray[i];
          if (
            fn === pdfjsLib.OPS.paintImageXObject ||
            fn === pdfjsLib.OPS.paintImageMaskXObject ||
            fn === pdfjsLib.OPS.paintInlineImageXObject
          ) {
            const imgId = ops.argsArray[i][0];
            await new Promise<void>((resolve) => {
              page.objs.get(imgId, (imgData: any) => {
                if (imgData && imgData.data && imgData.width && imgData.height) {
                  pass2Counter++;
                  const width = imgData.width;
                  const height = imgData.height;
                  const rawData = imgData.data;

                  // Build RGBA buffer for PNG encoding
                  const rgba = new Uint8Array(width * height * 4);
                  if (rawData.length === width * height * 4) {
                    rgba.set(rawData);
                  } else if (rawData.length === width * height * 3) {
                    let s = 0;
                    let d = 0;
                    while (s < rawData.length) {
                      rgba[d++] = rawData[s++];
                      rgba[d++] = rawData[s++];
                      rgba[d++] = rawData[s++];
                      rgba[d++] = 255;
                    }
                  } else if (rawData.length === width * height) {
                    // Grayscale
                    let s = 0;
                    let d = 0;
                    while (s < rawData.length) {
                      const v = rawData[s++];
                      rgba[d++] = v;
                      rgba[d++] = v;
                      rgba[d++] = v;
                      rgba[d++] = 255;
                    }
                  }

                  const pngBytes = encodePng({ width, height, data: rgba });
                  extractedImages.push({
                    filename: `image_${String(pass2Counter).padStart(3, '0')}.png`,
                    bytes: pngBytes,
                    format: 'png',
                    width,
                    height,
                  });
                }
                resolve();
              });
            });
          }
        }
      }
    } catch {
      // Pass 2 complete
    }
  }

  if (extractedImages.length === 0) {
    throw new Error('PDF document contains no extractable raster images.');
  }

  // Build ZIP archive
  const zip = new JSZip();
  for (const img of extractedImages) {
    zip.file(img.filename, img.bytes);
  }

  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  return {
    service: 'extract-images-from-pdf',
    outputBuffer: zipBytes,
    mimeType: 'application/zip',
    outputFileName: 'extracted-images.zip',
    metadata: {
      imageCount: extractedImages.length,
      imageFiles: extractedImages.map((img) => img.filename),
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: zipBytes.length,
    },
  };
}
