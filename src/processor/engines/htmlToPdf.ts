/**
 * PRA PDF — Real HTML to PDF Engine
 * A PRAVERSE Company
 * Parses HTML documents and structures them into paginated, styled PDF pages.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { procLogger } from '../logger';

export interface HtmlToPdfResult {
  service: 'html-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

interface HtmlBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'hr';
  text: string;
}

export async function processHtmlToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<HtmlToPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;
  const htmlContent = rawInput.toString('utf-8');

  procLogger.info('ENGINE_HTML_TO_PDF_STARTED', {
    jobId,
    service: 'html-to-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const printableWidth = pageWidth - (margin * 2);

  // Parse HTML tags into structural blocks
  // Remove script and style elements first
  const cleanHtml = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  const blocks: HtmlBlock[] = [];

  // Match headers, paragraphs, list items, and breaks
  const tagRegex = /<(h1|h2|h3|h4|h5|h6|p|li|hr|div|blockquote)[^>]*>(.*?)<\/\1>|<(hr|br)\s*\/?>/gis;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleanHtml)) !== null) {
    const tagName = (match[1] || match[3] || '').toLowerCase();
    const innerHtml = match[2] || '';
    const text = stripTags(innerHtml);

    if (tagName === 'hr') {
      blocks.push({ type: 'hr', text: '' });
    } else if (tagName === 'h1') {
      if (text) blocks.push({ type: 'h1', text });
    } else if (tagName === 'h2') {
      if (text) blocks.push({ type: 'h2', text });
    } else if (tagName === 'h3' || tagName === 'h4') {
      if (text) blocks.push({ type: 'h3', text });
    } else if (tagName === 'li') {
      if (text) blocks.push({ type: 'li', text: `•  ${text}` });
    } else {
      if (text) blocks.push({ type: 'p', text });
    }
  }

  // Fallback if no matched tags were found
  if (blocks.length === 0) {
    const fallbackText = stripTags(cleanHtml);
    if (fallbackText) {
      blocks.push({ type: 'p', text: fallbackText });
    }
  }

  let currentPage = doc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  function checkPageBreak(requiredHeight: number) {
    if (currentY - requiredHeight < margin) {
      currentPage = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }
  }

  function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const wrapped: string[] = [];
    let curLine = '';

    for (const w of words) {
      const test = curLine ? `${curLine} ${w}` : w;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        curLine = test;
      } else {
        if (curLine) wrapped.push(curLine);
        curLine = w;
      }
    }
    if (curLine) wrapped.push(curLine);
    return wrapped;
  }

  for (const block of blocks) {
    if (block.type === 'hr') {
      checkPageBreak(16);
      currentY -= 6;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      currentY -= 10;
      continue;
    }

    if (block.type === 'h1') {
      const fontSize = 18;
      const lineHeight = 24;
      const wrapped = wrapText(block.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 14);
      currentY -= 10;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontBold,
          color: rgb(0.1, 0.12, 0.16),
        });
        currentY -= lineHeight;
      }
      currentY -= 6;
      continue;
    }

    if (block.type === 'h2') {
      const fontSize = 14;
      const lineHeight = 18;
      const wrapped = wrapText(block.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 10);
      currentY -= 8;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontBold,
          color: rgb(0.12, 0.15, 0.2),
        });
        currentY -= lineHeight;
      }
      currentY -= 4;
      continue;
    }

    if (block.type === 'h3') {
      const fontSize = 12;
      const lineHeight = 16;
      const wrapped = wrapText(block.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 8);
      currentY -= 6;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontBold,
          color: rgb(0.15, 0.18, 0.22),
        });
        currentY -= lineHeight;
      }
      currentY -= 4;
      continue;
    }

    if (block.type === 'li') {
      const fontSize = 10;
      const lineHeight = 14;
      const wrapped = wrapText(block.text, fontRegular, fontSize, printableWidth - 12);
      checkPageBreak(wrapped.length * lineHeight + 4);
      for (let i = 0; i < wrapped.length; i++) {
        currentPage.drawText(wrapped[i], {
          x: margin + (i === 0 ? 0 : 12),
          y: currentY - fontSize,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.15, 0.17, 0.2),
        });
        currentY -= lineHeight;
      }
      currentY -= 2;
      continue;
    }

    // Paragraph
    const fontSize = 10;
    const lineHeight = 14;
    const wrapped = wrapText(block.text, fontRegular, fontSize, printableWidth);
    checkPageBreak(wrapped.length * lineHeight + 6);
    for (const line of wrapped) {
      currentPage.drawText(line, {
        x: margin,
        y: currentY - fontSize,
        size: fontSize,
        font: fontRegular,
        color: rgb(0.15, 0.17, 0.2),
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

  procLogger.info('ENGINE_HTML_TO_PDF_COMPLETED', {
    jobId,
    service: 'html-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: doc.getPageCount(),
  });

  return {
    service: 'html-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: doc.getPageCount(),
  };
}
