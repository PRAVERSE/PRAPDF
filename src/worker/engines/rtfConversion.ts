/**
 * PRA PDF — Cloudflare Worker: RTF Conversion Engine
 * Pure in-memory execution supporting bi-directional conversion: RTF to PDF and PDF to RTF.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { WorkerEngineResult } from './types';

function parseRtfToText(rtfString: string): string[] {
  const cleanHeader = rtfString.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^}]*\}/gi, '');
  const withNewlines = cleanHeader.replace(/\\par\b/gi, '\n');
  const stripped = withNewlines.replace(/\\[a-zA-Z]+(-?\d+)? ?/g, '');
  const plain = stripped.replace(/[{}]/g, '');

  return plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, (c) => `\\u${c.charCodeAt(0)}?`);
}

export async function processRtfConversionWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  const isPdfInput =
    inputBuffer.length >= 5 &&
    inputBuffer[0] === 0x25 && // %
    inputBuffer[1] === 0x50 && // P
    inputBuffer[2] === 0x44 && // D
    inputBuffer[3] === 0x46 && // F
    inputBuffer[4] === 0x2d;   // -

  if (isPdfInput) {
    // PDF → RTF
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(inputBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    let rtfBody = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as Array<{ str: string }>;
      const pageText = items.map((i) => i.str).join(' ');

      if (pageNum > 1) {
        rtfBody += '\\page\n';
      }

      const escaped = escapeRtf(pageText.trim());
      rtfBody += `${escaped}\\par\n`;
    }

    const rtfContent = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\n{\\*\\generator PRA PDF Engine;}\\viewkind4\\uc1\n\\pard\\f0\\fs22\n${rtfBody}}`;
    const encoder = new TextEncoder();
    const outputBuffer = encoder.encode(rtfContent);

    return {
      service: 'rtf-conversion',
      outputBuffer,
      mimeType: 'application/rtf',
      outputFileName: 'converted.rtf',
      metadata: {
        direction: 'pdf-to-rtf',
        pageCount: numPages,
        inputSizeBytes: inputBuffer.length,
        outputSizeBytes: outputBuffer.length,
      },
    };
  } else {
    // RTF → PDF
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rtfString = decoder.decode(inputBuffer);
    const paragraphs = parseRtfToText(rtfString);

    if (paragraphs.length === 0) {
      paragraphs.push('Standard document content.');
    }

    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 54;
    const printableWidth = pageWidth - margin * 2;
    const fontSize = 10;
    const lineHeight = 14;

    function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
      const words = text.split(' ');
      const wrapped: string[] = [];
      let curLine = '';

      for (const w of words) {
        const test = curLine ? `${curLine} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) <= maxWidth) {
          curLine = test;
        } else {
          if (curLine) wrapped.push(curLine);
          curLine = w;
        }
      }
      if (curLine) wrapped.push(curLine);
      return wrapped;
    }

    let currentPage = doc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    for (const para of paragraphs) {
      const wrapped = wrapText(para, fontRegular, fontSize, printableWidth);
      if (currentY - (wrapped.length * lineHeight + 6) < margin) {
        currentPage = doc.addPage([pageWidth, pageHeight]);
        currentY = pageHeight - margin;
      }

      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.15, 0.18, 0.22),
        });
        currentY -= lineHeight;
      }
      currentY -= 6;
    }

    if (doc.getPageCount() === 0) {
      doc.addPage([pageWidth, pageHeight]);
    }

    const outBytes = await doc.save({ useObjectStreams: true });

    return {
      service: 'rtf-conversion',
      outputBuffer: outBytes,
      mimeType: 'application/pdf',
      outputFileName: 'converted.pdf',
      metadata: {
        direction: 'rtf-to-pdf',
        pageCount: doc.getPageCount(),
        inputSizeBytes: inputBuffer.length,
        outputSizeBytes: outBytes.length,
      },
    };
  }
}
