/**
 * PRA PDF — Cloudflare Worker: Word to PDF Engine
 * Pure in-memory execution using JSZip and pdf-lib. Zero filesystem or native dependencies.
 */

import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { WorkerEngineResult } from './types';

interface DocParagraph {
  text: string;
  isHeading: boolean;
  headingLevel: number;
  isBullet: boolean;
}

export async function processWordToPdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  const paragraphs: DocParagraph[] = [];

  const isZip =
    inputBuffer.length >= 4 &&
    inputBuffer[0] === 0x50 &&
    inputBuffer[1] === 0x4b &&
    inputBuffer[2] === 0x03 &&
    inputBuffer[3] === 0x04;

  if (isZip) {
    try {
      const zip = await JSZip.loadAsync(inputBuffer);
      const docXmlEntry = zip.file('word/document.xml');

      if (docXmlEntry) {
        const xmlContent = await docXmlEntry.async('string');

        // Extract paragraphs: <w:p>...</w:p>
        const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gis;
        let pMatch: RegExpExecArray | null;

        while ((pMatch = pRegex.exec(xmlContent)) !== null) {
          const pBody = pMatch[1];

          // Check if paragraph is a heading
          const isHeading1 = /<w:pStyle\b[^>]*w:val=["']Heading1["']/i.test(pBody);
          const isHeading2 = /<w:pStyle\b[^>]*w:val=["']Heading2["']/i.test(pBody);
          const isHeading3 = /<w:pStyle\b[^>]*w:val=["']Heading3["']/i.test(pBody);
          const isBullet = /<w:numPr\b/i.test(pBody);

          // Extract all text elements: <w:t>...</w:t>
          const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/gis;
          let tMatch: RegExpExecArray | null;
          let pText = '';

          while ((tMatch = tRegex.exec(pBody)) !== null) {
            pText += tMatch[1];
          }

          // Decode XML entities
          const cleanText = pText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();

          if (cleanText) {
            paragraphs.push({
              text: cleanText,
              isHeading: isHeading1 || isHeading2 || isHeading3,
              headingLevel: isHeading1 ? 1 : isHeading2 ? 2 : isHeading3 ? 3 : 0,
              isBullet,
            });
          }
        }
      }
    } catch (err: any) {
      console.warn(`[WORD_TO_PDF_WORKER] Warning parsing DOCX XML: ${err?.message}`);
    }
  }

  // Fallback if parsing yielded no paragraphs: treat as plain text / document string
  if (paragraphs.length === 0) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawString = decoder.decode(inputBuffer).replace(/[^\x20-\x7E\r\n\t]/g, ' ');
    const lines = rawString.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    for (const line of lines) {
      paragraphs.push({
        text: line,
        isHeading: false,
        headingLevel: 0,
        isBullet: false,
      });
    }
  }

  if (paragraphs.length === 0) {
    paragraphs.push({
      text: 'Empty document.',
      isHeading: false,
      headingLevel: 0,
      isBullet: false,
    });
  }

  // Render paragraphs into PDF
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 54;
  const printableWidth = pageWidth - margin * 2;

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

  for (const para of paragraphs) {
    if (para.isHeading) {
      const fontSize = para.headingLevel === 1 ? 16 : para.headingLevel === 2 ? 14 : 12;
      const lineHeight = fontSize * 1.35;
      const wrapped = wrapText(para.text, fontBold, fontSize, printableWidth);
      checkPageBreak(wrapped.length * lineHeight + 12);
      currentY -= 8;
      for (const line of wrapped) {
        currentPage.drawText(line, {
          x: margin,
          y: currentY - fontSize,
          size: fontSize,
          font: fontBold,
          color: rgb(0.1, 0.12, 0.18),
        });
        currentY -= lineHeight;
      }
      currentY -= 6;
      continue;
    }

    if (para.isBullet) {
      const fontSize = 10;
      const lineHeight = 14;
      const wrapped = wrapText(`•  ${para.text}`, fontRegular, fontSize, printableWidth - 12);
      checkPageBreak(wrapped.length * lineHeight + 4);
      for (let i = 0; i < wrapped.length; i++) {
        currentPage.drawText(wrapped[i], {
          x: margin + (i === 0 ? 0 : 12),
          y: currentY - fontSize,
          size: fontSize,
          font: fontRegular,
          color: rgb(0.15, 0.18, 0.22),
        });
        currentY -= lineHeight;
      }
      currentY -= 2;
      continue;
    }

    // Standard paragraph
    const fontSize = 10;
    const lineHeight = 14;
    const wrapped = wrapText(para.text, fontRegular, fontSize, printableWidth);
    checkPageBreak(wrapped.length * lineHeight + 6);
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
    currentY -= 5;
  }

  if (doc.getPageCount() === 0) {
    doc.addPage([pageWidth, pageHeight]);
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'word-to-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'converted.pdf',
    metadata: {
      pageCount: doc.getPageCount(),
      paragraphCount: paragraphs.length,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
