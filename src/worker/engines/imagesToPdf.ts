/**
 * PRA PDF — Cloudflare Worker: Images to PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 * Compiles multiple images (JPG, PNG) or a ZIP archive of images into a single multi-page PDF document.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { WorkerEngineResult } from './types';

interface ImageItem {
  filename: string;
  buffer: Uint8Array;
}

export async function processImagesToPdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    pageSize?: 'FIT' | 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  const imageItems: ImageItem[] = [];

  const buffers = Array.isArray(inputBuffer) ? inputBuffer : [inputBuffer];

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    // Check if buffer is a ZIP archive (PK\x03\x04)
    const isZip =
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04;

    if (isZip) {
      const zip = await JSZip.loadAsync(buf);
      const validExts = ['.jpg', '.jpeg', '.png'];
      const fileEntries = Object.keys(zip.files)
        .filter((name) => !zip.files[name].dir && !name.startsWith('__MACOSX/'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      for (const name of fileEntries) {
        const lower = name.toLowerCase();
        if (validExts.some((ext) => lower.endsWith(ext))) {
          const fileData = await zip.files[name].async('uint8array');
          imageItems.push({ filename: name, buffer: fileData });
        }
      }
    } else {
      imageItems.push({ filename: `image_${i + 1}`, buffer: buf });
    }
  }

  if (imageItems.length === 0) {
    throw new Error('No valid image files found in input.');
  }

  const pdfDoc = await PDFDocument.create();
  let pagesAdded = 0;
  let totalInputSizeBytes = 0;

  for (let idx = 0; idx < imageItems.length; idx++) {
    const item = imageItems[idx];
    const buf = item.buffer;
    totalInputSizeBytes += buf.length;

    const isJpeg =
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng =
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;

    if (!isJpeg && !isPng) {
      continue; // Skip unsupported image streams safely
    }

    const isolatedBuffer = new Uint8Array(buf);
    let embeddedImage;
    if (isJpeg) {
      embeddedImage = await pdfDoc.embedJpg(isolatedBuffer);
    } else {
      embeddedImage = await pdfDoc.embedPng(isolatedBuffer);
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
    throw new Error('Failed to embed any valid JPEG or PNG images into the PDF document.');
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

  return {
    service: 'images-to-pdf',
    outputBuffer: pdfBytes,
    mimeType: 'application/pdf',
    outputFileName: pagesAdded > 1 ? 'converted-images.pdf' : 'converted.pdf',
    metadata: {
      pageCount: pagesAdded,
      imageCount: pagesAdded,
      inputSizeBytes: totalInputSizeBytes,
      outputSizeBytes: pdfBytes.length,
    },
  };
}
