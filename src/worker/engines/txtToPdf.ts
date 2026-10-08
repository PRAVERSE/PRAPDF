/**
 * PRA PDF — Cloudflare Worker: TXT to PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processTxtToPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    fontSize?: number;
    fontFamily?: 'Courier' | 'Helvetica' | 'TimesRoman';
    margin?: number;
  }
): Promise<WorkerEngineResult> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const textContent = decoder.decode(inputBuffer);

  const doc = await PDFDocument.create();

  const fontSize = options?.fontSize || 10;
  const margin = options?.margin || 50;
  const pageHeight = 792;
  const pageWidth = 612;
  const lineHeight = fontSize * 1.35;

  let font = await doc.embedFont(StandardFonts.Helvetica);
  if (options?.fontFamily === 'Courier') {
    font = await doc.embedFont(StandardFonts.Courier);
  } else if (options?.fontFamily === 'TimesRoman') {
    font = await doc.embedFont(StandardFonts.TimesRoman);
  }

  const printableWidth = pageWidth - (margin * 2);
  const maxLinesPerPage = Math.floor((pageHeight - (margin * 2)) / lineHeight);

  const rawLines = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const wrappedLines: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine) {
      wrappedLines.push('');
      continue;
    }

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

  if (doc.getPageCount() === 0) {
    doc.addPage([pageWidth, pageHeight]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'txt-to-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'converted.pdf',
    metadata: {
      pageCount: doc.getPageCount(),
      lineCount: wrappedLines.length,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
