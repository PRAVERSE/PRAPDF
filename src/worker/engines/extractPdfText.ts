/**
 * PRA PDF — Cloudflare Worker: Extract PDF Text Engine
 * Pure in-memory execution using pdfjs-dist. Zero filesystem or native dependencies.
 */

import { WorkerEngineResult } from './types';

export async function processExtractPdfTextWorker(
  inputBuffer: Uint8Array,
  options?: {
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  // @ts-ignore
  const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  (globalThis as any).pdfjsWorker = pdfjsWorker;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(inputBuffer),
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

    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    const validItems = items.filter((item) => typeof item.str === 'string' && item.str.trim().length > 0);

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
    const fullPageContent = pageBody.length > 0 ? `${header}${pageBody}\n` : '';

    if (fullPageContent.length > 0) {
      pageTexts.push(fullPageContent);
    }
    totalCharacters += pageBody.length;
    const wordsOnPage = pageBody.split(/\s+/).filter(Boolean).length;
    totalWords += wordsOnPage;
  }

  const combinedText = pageTexts.length > 0 ? pageTexts.join('\n').trim() + '\n' : '';
  const encoder = new TextEncoder();
  const outputBuffer = encoder.encode(combinedText);
  const hasText = totalCharacters > 0 && combinedText.trim().length > 0;

  return {
    service: 'extract-pdf-text',
    outputBuffer,
    mimeType: 'text/plain; charset=utf-8',
    outputFileName: options?.outputFileName || 'extracted_text.txt',
    metadata: {
      pageCount: numPages,
      characterCount: totalCharacters,
      wordCount: totalWords,
      hasText,
      noExtractableText: !hasText,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outputBuffer.length,
      extractedText: combinedText,
    },
  };
}
