/**
 * PRA PDF — Cloudflare Worker: Grayscale PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Converts document colors (text, strokes, fills, and default color spaces) to DeviceGray.
 */

import { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream } from 'pdf-lib';
import { WorkerEngineResult } from './types';

function convertContentStreamToGrayscale(content: string): string {
  // Convert RGB fill: 'r g b rg' -> 'gray g'
  content = content.replace(
    /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+rg\b/g,
    (_, r, g, b) => {
      const red = parseFloat(r);
      const green = parseFloat(g);
      const blue = parseFloat(b);
      const gray = (0.299 * red + 0.587 * green + 0.114 * blue).toFixed(3);
      return `${gray} g`;
    }
  );

  // Convert RGB stroke: 'r g b RG' -> 'gray G'
  content = content.replace(
    /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+RG\b/g,
    (_, r, g, b) => {
      const red = parseFloat(r);
      const green = parseFloat(g);
      const blue = parseFloat(b);
      const gray = (0.299 * red + 0.587 * green + 0.114 * blue).toFixed(3);
      return `${gray} G`;
    }
  );

  // Convert CMYK fill: 'c m y k k' -> 'gray g'
  content = content.replace(
    /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+k\b/g,
    (_, c, m, y, k) => {
      const cyan = parseFloat(c);
      const magenta = parseFloat(m);
      const yellow = parseFloat(y);
      const black = parseFloat(k);
      const r = (1 - cyan) * (1 - black);
      const g = (1 - magenta) * (1 - black);
      const b = (1 - yellow) * (1 - black);
      const gray = (0.299 * r + 0.587 * g + 0.114 * b).toFixed(3);
      return `${gray} g`;
    }
  );

  // Convert CMYK stroke: 'c m y k K' -> 'gray G'
  content = content.replace(
    /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+K\b/g,
    (_, c, m, y, k) => {
      const cyan = parseFloat(c);
      const magenta = parseFloat(m);
      const yellow = parseFloat(y);
      const black = parseFloat(k);
      const r = (1 - cyan) * (1 - black);
      const g = (1 - magenta) * (1 - black);
      const b = (1 - yellow) * (1 - black);
      const gray = (0.299 * r + 0.587 * g + 0.114 * b).toFixed(3);
      return `${gray} G`;
    }
  );

  return content;
}

export async function processGrayscalePdfWorker(
  inputBuffer: Uint8Array,
  options?: any
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

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const context = doc.context;

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const pageNode = page.node;

    // 1. Map default color space to DeviceGray in Resources
    let resources = pageNode.Resources();
    if (!resources) {
      resources = context.obj({});
      pageNode.set(PDFName.of('Resources'), resources);
    }
    if (resources instanceof PDFDict) {
      let colorSpace = resources.get(PDFName.of('ColorSpace'));
      if (!colorSpace || !(colorSpace instanceof PDFDict)) {
        colorSpace = context.obj({});
        resources.set(PDFName.of('ColorSpace'), colorSpace);
      }
      (colorSpace as PDFDict).set(PDFName.of('DefaultRGB'), PDFName.of('DeviceGray'));
      (colorSpace as PDFDict).set(PDFName.of('DefaultCMYK'), PDFName.of('DeviceGray'));
    }

    // 2. Transform page content streams
    const contentsObj = pageNode.Contents();
    if (contentsObj) {
      const streams: any[] = Array.isArray(contentsObj) ? contentsObj : [contentsObj];
      for (const s of streams) {
        if (s instanceof PDFStream || s instanceof PDFRawStream) {
          try {
            const rawBytes = s.getContents();
            const textContent = new TextDecoder('latin1').decode(rawBytes);
            const converted = convertContentStreamToGrayscale(textContent);
            const newBytes = new TextEncoder().encode(converted);
            // Re-encode or update contents
            (s as any).contents = newBytes;
          } catch {
            // If binary stream cannot be decoded directly, color space mapping still applies
          }
        }
      }
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'grayscale-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'grayscale.pdf',
    metadata: {
      pageCount: totalPages,
      grayscale: true,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
