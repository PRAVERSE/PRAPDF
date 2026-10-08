/**
 * PRA PDF — Real TXT to PDF Engine
 * A PRAVERSE Company
 * Converts raw plain text files into paginated, cleanly formatted PDF documents.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { procLogger } from '../logger';

export interface TxtToPdfResult {
  service: 'txt-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  lineCount: number;
}

export async function processTxtToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    fontSize?: number;
    fontFamily?: 'Courier' | 'Helvetica' | 'TimesRoman';
    margin?: number;
  }
): Promise<TxtToPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;
  const textContent = rawInput.toString('utf-8');

  procLogger.info('ENGINE_TXT_TO_PDF_STARTED', {
    jobId,
    service: 'txt-to-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.create();

  const fontSize = options?.fontSize || 10;
  const margin = options?.margin || 50;
  const pageHeight = 792; // Standard Letter height in points
  const pageWidth = 612;  // Standard Letter width in points
  const lineHeight = fontSize * 1.35;

  let font = await doc.embedFont(StandardFonts.Helvetica);
  if (options?.fontFamily === 'Courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else if (options?.fontFamily === 'TimesRoman') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  }

  const printableWidth = pageWidth - (margin * 2);
  const maxLinesPerPage = Math.floor((pageHeight - (margin * 2)) / lineHeight);

  // Split content into lines and wrap lines that exceed printableWidth
  const rawLines = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine) {
      wrappedLines.push('');
      continue;
    }

    // Word wrap
    const words = rawLine.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= printableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself is longer than printable width - character wrap
          let partial = '';
          for (const char of word) {
            if (font.widthOfTextAtSize(partial + char, fontSize) <= printableWidth) {
              partial += char;
            } else {
              wrappedLines.push(partial);
              partial = char;
            }
          }
          currentLine = partial;
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  // Paginate wrapped lines
  let page = doc.addPage([pageWidth, pageHeight]);
  let lineOnPage = 0;

  for (const line of wrappedLines) {
    if (lineOnPage >= maxLinesPerPage) {
      page = doc.addPage([pageWidth, pageHeight]);
      lineOnPage = 0;
    }

    const y = pageHeight - margin - (lineOnPage * lineHeight) - fontSize;
    if (line.length > 0) {
      page.drawText(line, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.12, 0.14, 0.17),
      });
    }

    lineOnPage++;
  }

  // Ensure at least one page exists
  if (doc.getPageCount() === 0) {
    doc.addPage([pageWidth, pageHeight]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_TXT_TO_PDF_COMPLETED', {
    jobId,
    service: 'txt-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: doc.getPageCount(),
    lineCount: wrappedLines.length,
  });

  return {
    service: 'txt-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: doc.getPageCount(),
    lineCount: wrappedLines.length,
  };
}
