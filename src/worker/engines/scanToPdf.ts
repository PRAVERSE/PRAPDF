/**
 * PRA PDF — Cloudflare Worker: Scan to PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 *
 * Compiles scanned pages/images (JPG, PNG, ZIP archive of scans) into a clean,
 * standardized PDF document with proper aspect-ratio fitting and paper sizing.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { WorkerEngineResult } from './types';

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05);
}

export async function processScanToPdfWorker(
  inputBuffer: Uint8Array | Uint8Array[],
  options?: {
    pageSize?: 'A4' | 'Letter' | 'Fit';
    margin?: number;
    orientation?: 'portrait' | 'landscape' | 'auto';
  }
): Promise<WorkerEngineResult> {
  const images: Uint8Array[] = [];

  const addBuffer = async (buf: Uint8Array) => {
    if (isZip(buf)) {
      const zip = await JSZip.loadAsync(buf);
      const fileNames = Object.keys(zip.files).sort();
      for (const name of fileNames) {
        const file = zip.files[name];
        if (file.dir) continue;
        const lower = name.toLowerCase();
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) {
          const content = await file.async('uint8array');
          if (isJpeg(content) || isPng(content)) {
            images.push(content);
          }
        }
      }
    } else if (isJpeg(buf) || isPng(buf)) {
      images.push(buf);
    }
  };

  if (Array.isArray(inputBuffer)) {
    for (const b of inputBuffer) {
      await addBuffer(b);
    }
  } else {
    await addBuffer(inputBuffer);
  }

  if (images.length === 0) {
    throw new Error('No valid scanned images (JPEG or PNG) detected in input.');
  }

  const pdfDoc = await PDFDocument.create();
  const targetPageSize = options?.pageSize || 'A4';
  const margin = options?.margin ?? 20;

  // Standard dimensions in points (72 DPI)
  const PAGE_SIZES: Record<string, [number, number]> = {
    A4: [595.28, 841.89],
    Letter: [612.0, 792.0],
  };

  for (const imgBytes of images) {
    let embeddedImg;
    let imgWidth = 0;
    let imgHeight = 0;

    if (isJpeg(imgBytes)) {
      embeddedImg = await pdfDoc.embedJpg(imgBytes);
      imgWidth = embeddedImg.width;
      imgHeight = embeddedImg.height;
    } else if (isPng(imgBytes)) {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
      imgWidth = embeddedImg.width;
      imgHeight = embeddedImg.height;
    } else {
      continue;
    }

    if (targetPageSize === 'Fit') {
      const page = pdfDoc.addPage([imgWidth, imgHeight]);
      page.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    } else {
      let [pWidth, pHeight] = PAGE_SIZES[targetPageSize] || PAGE_SIZES.A4;

      // Handle orientation
      const isImgLandscape = imgWidth > imgHeight;
      if (options?.orientation === 'landscape' || (options?.orientation === 'auto' && isImgLandscape)) {
        if (pWidth < pHeight) {
          const tmp = pWidth;
          pWidth = pHeight;
          pHeight = tmp;
        }
      }

      const availableWidth = Math.max(10, pWidth - margin * 2);
      const availableHeight = Math.max(10, pHeight - margin * 2);

      const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight, 1.0);
      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      const x = margin + (availableWidth - drawWidth) / 2;
      const y = margin + (availableHeight - drawHeight) / 2;

      const page = pdfDoc.addPage([pWidth, pHeight]);
      page.drawImage(embeddedImg, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  const outBytes = await pdfDoc.save({ useObjectStreams: true });
  const totalInputBytes = Array.isArray(inputBuffer)
    ? inputBuffer.reduce((acc, b) => acc + b.length, 0)
    : inputBuffer.length;

  return {
    service: 'scan-to-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'scanned.pdf',
    metadata: {
      pageCount: images.length,
      imageCount: images.length,
      pageSize: targetPageSize,
      inputSizeBytes: totalInputBytes,
      outputSizeBytes: outBytes.length,
    },
  };
}
