/**
 * PRA PDF — Real PDF to Markdown Engine
 * A PRAVERSE Company
 * Extracts text, headings, and structure from PDF documents into standard Markdown (.md).
 */

import fs from 'fs';
import crypto from 'crypto';
import { procLogger } from '../logger';

export interface PdfToMarkdownResult {
  service: 'pdf-to-markdown';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  sectionCount: number;
}

export async function processPdfToMarkdown(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<PdfToMarkdownResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_PDF_TO_MARKDOWN_STARTED', {
    jobId,
    service: 'pdf-to-markdown',
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

  const markdownSections: string[] = [];
  let totalSections = 0;

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

    // Calculate median font height to detect headings
    const heights = validItems.map((i) => Math.abs(i.transform[0] || i.height || 10)).filter((h) => h > 0);
    const avgHeight = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 12;

    // Sort items by Y (descending), X (ascending)
    validItems.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      const diffY = yB - yA;
      if (Math.abs(diffY) > 4) {
        return diffY;
      }
      return a.transform[4] - b.transform[4];
    });

    interface LineInfo {
      text: string;
      fontSize: number;
      isBullet: boolean;
    }

    const lines: LineInfo[] = [];
    let currentY: number | null = null;
    let currentWords: string[] = [];
    let currentMaxFont = 0;

    for (const item of validItems) {
      const y = item.transform[5];
      const fontH = Math.abs(item.transform[0] || item.height || 10);

      if (currentY === null || Math.abs(currentY - y) > 4) {
        if (currentWords.length > 0) {
          const lineStr = currentWords.join(' ');
          lines.push({
            text: lineStr,
            fontSize: currentMaxFont,
            isBullet: /^[-*•]\s+/.test(lineStr) || /^\d+\.\s+/.test(lineStr),
          });
        }
        currentWords = [item.str.trim()];
        currentMaxFont = fontH;
        currentY = y;
      } else {
        currentWords.push(item.str.trim());
        if (fontH > currentMaxFont) currentMaxFont = fontH;
      }
    }

    if (currentWords.length > 0) {
      const lineStr = currentWords.join(' ');
      lines.push({
        text: lineStr,
        fontSize: currentMaxFont,
        isBullet: /^[-*•]\s+/.test(lineStr) || /^\d+\.\s+/.test(lineStr),
      });
    }

    const pageMdLines: string[] = [];
    if (numPages > 1) {
      pageMdLines.push(`\n<!-- Page ${pageNum} -->\n`);
    }

    for (const line of lines) {
      const trimmed = line.text.trim();
      if (!trimmed) continue;

      if (line.fontSize > avgHeight * 1.5) {
        // Main title / Heading 1
        pageMdLines.push(`\n# ${trimmed}\n`);
        totalSections++;
      } else if (line.fontSize > avgHeight * 1.2) {
        // Heading 2
        pageMdLines.push(`\n## ${trimmed}\n`);
        totalSections++;
      } else if (line.fontSize > avgHeight * 1.08) {
        // Heading 3
        pageMdLines.push(`\n### ${trimmed}\n`);
        totalSections++;
      } else if (line.isBullet) {
        const cleanBullet = trimmed.replace(/^[-*•]\s+/, '');
        pageMdLines.push(`- ${cleanBullet}`);
      } else {
        pageMdLines.push(trimmed);
      }
    }

    markdownSections.push(pageMdLines.join('\n'));
  }

  const fullMarkdown = markdownSections.join('\n\n').trim() + '\n';
  const outputBuffer = Buffer.from(fullMarkdown, 'utf-8');
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_PDF_TO_MARKDOWN_COMPLETED', {
    jobId,
    service: 'pdf-to-markdown',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: numPages,
    sectionCount: totalSections,
  });

  return {
    service: 'pdf-to-markdown',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: numPages,
    sectionCount: totalSections,
  };
}
