/**
 * PRA PDF — Real Markdown to PDF Engine
 * A PRAVERSE Company
 * Parses Markdown documents and renders styled, paginated PDF pages.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { procLogger } from '../logger';

export interface MarkdownToPdfResult {
  service: 'markdown-to-pdf';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
}

interface RenderBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'code' | 'list' | 'hr';
  text: string;
}

export async function processMarkdownToPdf(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<MarkdownToPdfResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;
  const content = rawInput.toString('utf-8');

  procLogger.info('ENGINE_MARKDOWN_TO_PDF_STARTED', {
    jobId,
    service: 'markdown-to-pdf',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontCode = await doc.embedFont(StandardFonts.Courier);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const printableWidth = pageWidth - (margin * 2);

  // Parse markdown lines into structured blocks
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: RenderBlock[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', text: codeBuffer.join('\n') });
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'hr', text: '' });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      const cleanBullet = trimmed.replace(/^[-*]\s+|\d+\.\s+/, '');
      blocks.push({ type: 'list', text: `•  ${cleanBullet}` });
    } else {
      // Standard paragraph
      blocks.push({ type: 'p', text: trimmed });
    }
  }

  if (codeBuffer.length > 0) {
    blocks.push({ type: 'code', text: codeBuffer.join('\n') });
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
      checkPageBreak(20);
      currentY -= 8;
      currentPage.drawLine({
        start: { x: margin, y: currentY },
        end: { x: pageWidth - margin, y: currentY },
        thickness: 0.75,
        color: rgb(0.8, 0.82, 0.85),
      });
      currentY -= 12;
      continue;
    }

    if (block.type === 'h1') {
      const fontSize = 18;
      const lineHeight = 24;
      const wrapped = wrapText(block.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 16);
      currentY -= 12;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontBold,
          color: rgb(0.08, 0.1, 0.14),
        });
        currentY -= lineHeight;
      }
      currentY -= 8;
      continue;
    }

    if (block.type === 'h2') {
      const fontSize = 14;
      const lineHeight = 19;
      const wrapped = wrapText(block.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 12);
      currentY -= 10;
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
      currentY -= 6;
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

    if (block.type === 'code') {
      const fontSize = 9;
      const lineHeight = 12;
      const codeLines = block.text.split('\n');
      checkPageBreak(codeLines.length * lineHeight + 16);
      currentY -= 6;

      const boxHeight = codeLines.length * lineHeight + 12;
      currentPage.drawRectangle({
        x: margin,
        y: currentY - boxHeight,
        width: printableWidth,
        height: boxHeight,
        color: rgb(0.96, 0.97, 0.98),
        borderColor: rgb(0.85, 0.88, 0.92),
        borderWidth: 0.5,
      });

      let codeY = currentY - 8;
      for (const cl of codeLines) {
        const safeLine = cl.slice(0, 95); // truncate or wrap if extreme
        currentPage.drawText(safeLine, {
          x: margin + 8,
          y: codeY - fontSize,
          size: fontSize,
          font: fontCode,
          color: rgb(0.15, 0.2, 0.3),
        });
        codeY -= lineHeight;
      }
      currentY -= boxHeight + 8;
      continue;
    }

    if (block.type === 'list') {
      const fontSize = 10;
      const lineHeight = 14;
      const wrapped = wrapText(block.text, fontRegular, fontSize, printableWidth - 14);
      checkPageBreak(wrapped.length * lineHeight + 4);
      for (let i = 0; i < wrapped.length; i++) {
        currentPage.drawText(wrapped[i], {
          x: margin + (i === 0 ? 0 : 14),
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

    // Standard Paragraph
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

  // Ensure at least one page
  if (doc.getPageCount() === 0) {
    doc.addPage([pageWidth, pageHeight]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_MARKDOWN_TO_PDF_COMPLETED', {
    jobId,
    service: 'markdown-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: doc.getPageCount(),
  });

  return {
    service: 'markdown-to-pdf',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: doc.getPageCount(),
  };
}
