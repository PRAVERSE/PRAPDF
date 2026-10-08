/**
 * PRA PDF — Real RTF Conversion Engine
 * A PRAVERSE Company
 * Supports bi-directional conversion: RTF to PDF and PDF to RTF.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { procLogger } from '../logger';

export interface RtfConversionResult {
  service: 'rtf-conversion';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  direction: 'rtf-to-pdf' | 'pdf-to-rtf';
  pageCount?: number;
}

function parseRtfToText(rtfString: string): string[] {
  // Strip RTF control words and groups
  // Groups like {\fonttbl ...}, {\colortbl ...}, {\stylesheet ...}
  const cleanHeader = rtfString.replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^}]*\}/gi, '');

  // Replace \par with newline
  const withNewlines = cleanHeader.replace(/\\par\b/gi, '\n');

  // Strip remaining control words like \b, \i, \fs20, etc.
  const stripped = withNewlines.replace(/\\[a-zA-Z]+(-?\d+)? ?/g, '');

  // Strip remaining braces
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

export async function processRtfConversion(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<RtfConversionResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_RTF_CONVERSION_STARTED', {
    jobId,
    service: 'rtf-conversion',
    inputSizeBytes: inputSize,
  });

  const ext = path.extname(inputPath).toLowerCase();
  const isPdfInput = ext === '.pdf' || (rawInput.length >= 5 && rawInput.slice(0, 5).toString('ascii') === '%PDF-');

  if (isPdfInput) {
    // PDF → RTF
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(rawInput),
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
    const outputBuffer = Buffer.from(rtfContent, 'utf-8');
    const outputSize = outputBuffer.length;
    const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

    fs.writeFileSync(outputPath, outputBuffer);

    procLogger.info('ENGINE_RTF_CONVERSION_COMPLETED', {
      jobId,
      direction: 'pdf-to-rtf',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      pageCount: numPages,
    });

    return {
      service: 'rtf-conversion',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      sha256,
      direction: 'pdf-to-rtf',
      pageCount: numPages,
    };
  } else {
    // RTF → PDF
    const rtfString = rawInput.toString('utf-8');
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
    const outputBuffer = Buffer.from(outBytes);
    const outputSize = outputBuffer.length;
    const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

    fs.writeFileSync(outputPath, outputBuffer);

    procLogger.info('ENGINE_RTF_CONVERSION_COMPLETED', {
      jobId,
      direction: 'rtf-to-pdf',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      pageCount: doc.getPageCount(),
    });

    return {
      service: 'rtf-conversion',
      inputSizeBytes: inputSize,
      outputSizeBytes: outputSize,
      sha256,
      direction: 'rtf-to-pdf',
      pageCount: doc.getPageCount(),
    };
  }
}
