/**
 * PRA PDF — Real Images to PDF Engine
 * A PRAVERSE Company
 * Compiles multiple images (JPG, PNG, WebP, BMP) or ZIP archives of images
 * into a single multi-page PDF document.
 * Preserves input ordering, aspect ratios, and resolution without distortion.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { procLogger } from '../logger';

export interface ImagesToPdfResult {
  service: 'images-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  imageCount: number;
}

interface ImageItem {
  filename: string;
  buffer: Buffer;
}

export async function processImagesToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<ImagesToPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_IMAGES_TO_PDF_STARTED', {
    jobId,
    service: 'images-to-pdf',
    inputSizeBytes: inputSize,
  });

  const images: ImageItem[] = [];

  // Check if the input is a ZIP archive (PK\x03\x04)
  const isZip =
    rawInput.length >= 4 &&
    rawInput[0] === 0x50 &&
    rawInput[1] === 0x4b &&
    rawInput[2] === 0x03 &&
    rawInput[3] === 0x04;

  if (isZip) {
    const zip = await JSZip.loadAsync(rawInput);
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

    // Sort files deterministically / naturally
    const fileEntries = Object.keys(zip.files)
      .filter((name) => !zip.files[name].dir && !name.startsWith('__MACOSX/'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    for (const filename of fileEntries) {
      const ext = path.extname(filename).toLowerCase();
      if (validExts.includes(ext)) {
        const fileData = await zip.files[filename].async('nodebuffer');
        images.push({ filename, buffer: fileData });
      }
    }
  } else {
    // Single image uploaded
    images.push({ filename: path.basename(inputPath), buffer: rawInput });
  }

  if (images.length === 0) {
    throw new Error('No valid image files found in input.');
  }

  const pdfDoc = await PDFDocument.create();
  let pagesAdded = 0;

  for (const item of images) {
    const buf = item.buffer;
    const isJpeg =
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;

    // Ensure byteOffset === 0 for pdf-lib image embedders
    const standaloneBytes = new Uint8Array(buf);

    let embeddedImage: any;
    if (isJpeg) {
      embeddedImage = await pdfDoc.embedJpg(standaloneBytes);
    } else if (isPng) {
      embeddedImage = await pdfDoc.embedPng(standaloneBytes);
    } else {
      // Normalize other image formats (WebP, BMP, etc.) to PNG via @napi-rs/canvas
      try {
        const loaded = await loadImage(buf);
        const canvas = createCanvas(loaded.width, loaded.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(loaded, 0, 0);
        const pngBuf = canvas.toBuffer('image/png');
        embeddedImage = await pdfDoc.embedPng(new Uint8Array(pngBuf));
      } catch (err: any) {
        procLogger.warn('IMAGE_DECODE_WARNING', {
          jobId,
          filename: item.filename,
          error: err?.message,
        });
        continue;
      }
    }

    const { width, height } = embeddedImage.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
    pagesAdded++;
  }

  if (pagesAdded === 0) {
    throw new Error('Failed to embed any valid images into PDF document.');
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(pdfBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_IMAGES_TO_PDF_COMPLETED', {
    jobId,
    service: 'images-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: pagesAdded,
    imageCount: images.length,
  });

  return {
    service: 'images-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: pagesAdded,
    imageCount: images.length,
  };
}
