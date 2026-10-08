/**
 * PRA PDF — Real Extract PDF Text Engine
 * A PRAVERSE Company
 * Extracts clean, raw plain text from PDF documents with spatial line reconstruction.
 */

import fs from 'fs';
import crypto from 'crypto';
import { procLogger } from '../logger';

export interface ExtractPdfTextResult {
  service: 'extract-pdf-text';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  characterCount: number;
  wordCount: number;
}

export async function processExtractPdfText(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<ExtractPdfTextResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_EXTRACT_PDF_TEXT_STARTED', {
    jobId,
    service: 'extract-pdf-text',
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

  const pageTexts: string[] = [];
  let totalCharacters = 0;
  let totalWords = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items into lines based on Y coordinate
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    // Filter out items without string content
    const validItems = items.filter((item) => typeof item.str === 'string' && item.str.trim().length > 0);

    // Sort items by Y (descending, top-to-bottom), then X (ascending, left-to-right)
    validItems.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const diffY = yB - yA;
      if (Math.abs(diffY) > 4) {
        return diffY;
      }
      return a.transform[4] - b.transform[4];
    });

    let currentY: number | null = null;
    let currentLine: string[] = [];
    const lines: string[] = [];

    for (const item of validItems) {
      const y = item.transform[5];
      if (currentY === null || Math.abs(currentY - y) > 4) {
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }
        currentLine = [item.str.trim()];
        currentY = y;
      } else {
        currentLine.push(item.str.trim());
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }

    const pageBody = lines.join('\n');
    const header = numPages > 1 ? `--- Page ${pageNum} of ${numPages} ---\n` : '';
    const fullPageContent = `${header}${pageBody}\n`;

    pageTexts.push(fullPageContent);

    totalCharacters += pageBody.length;
    const wordsOnPage = pageBody.split(/\s+/).filter(Boolean).length;
    totalWords += wordsOnPage;
  }

  const combinedText = pageTexts.join('\n').trim() + '\n';
  const outputBuffer = Buffer.from(combinedText, 'utf-8');
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_EXTRACT_PDF_TEXT_COMPLETED', {
    jobId,
    service: 'extract-pdf-text',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: numPages,
    characterCount: totalCharacters,
    wordCount: totalWords,
  });

  return {
    service: 'extract-pdf-text',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: numPages,
    characterCount: totalCharacters,
    wordCount: totalWords,
  };
}
