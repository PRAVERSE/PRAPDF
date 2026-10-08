/**
 * PRA PDF — Cloudflare Worker: PowerPoint to PDF Engine
 * Pure in-memory execution using JSZip and pdf-lib. Zero filesystem or native dependencies.
 */

import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { WorkerEngineResult } from './types';

interface ParsedSlide {
  title: string;
  bullets: string[];
}

export async function processPowerpointToPdfWorker(
  inputBuffer: Uint8Array,
  options?: any
): Promise<WorkerEngineResult> {
  const slides: ParsedSlide[] = [];

  const isZip =
    inputBuffer.length >= 4 &&
    inputBuffer[0] === 0x50 &&
    inputBuffer[1] === 0x4b &&
    inputBuffer[2] === 0x03 &&
    inputBuffer[3] === 0x04;

  if (isZip) {
    try {
      const zip = await JSZip.loadAsync(inputBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.replace(/^[^\d]+(\d+)[^\d]+$/, '$1'), 10) || 0;
          const numB = parseInt(b.replace(/^[^\d]+(\d+)[^\d]+$/, '$1'), 10) || 0;
          return numA - numB;
        });

      for (const slideName of slideFiles) {
        const slideXml = await zip.files[slideName].async('string');

        const pRegex = /<a:p\b[^>]*>(.*?)<\/a:p>/gis;
        let pMatch: RegExpExecArray | null;
        const paragraphs: string[] = [];

        while ((pMatch = pRegex.exec(slideXml)) !== null) {
          const pBody = pMatch[1];
          const tRegex = /<a:t\b[^>]*>(.*?)<\/a:t>/gis;
          let tMatch: RegExpExecArray | null;
          let pText = '';

          while ((tMatch = tRegex.exec(pBody)) !== null) {
            pText += tMatch[1];
          }

          const clean = pText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();

          if (clean) {
            paragraphs.push(clean);
          }
        }

        const title = paragraphs.length > 0 ? paragraphs[0] : `Slide ${slides.length + 1}`;
        const bullets = paragraphs.length > 1 ? paragraphs.slice(1) : [];

        slides.push({ title, bullets });
      }
    } catch (err: any) {
      console.warn(`[PPTX_WORKER] Warning parsing slides: ${err?.message}`);
    }
  }

  if (slides.length === 0) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawString = decoder.decode(inputBuffer).replace(/[^\x20-\x7E\r\n\t]/g, ' ');
    const lines = rawString.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length > 0) {
      slides.push({
        title: lines[0],
        bullets: lines.slice(1, 10),
      });
    } else {
      slides.push({
        title: 'Presentation Slide',
        bullets: ['Standard presentation content.'],
      });
    }
  }

  // Render slides into 16:9 PDF (960 x 540)
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const slideWidth = 960;
  const slideHeight = 540;
  const margin = 50;

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

  for (let sIdx = 0; sIdx < slides.length; sIdx++) {
    const slide = slides[sIdx];
    const page = doc.addPage([slideWidth, slideHeight]);

    // Card border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: slideWidth - 40,
      height: slideHeight - 40,
      color: rgb(0.98, 0.99, 1.0),
      borderColor: rgb(0.88, 0.91, 0.95),
      borderWidth: 1,
    });

    // Slide Number (bottom-right)
    page.drawText(`${sIdx + 1} / ${slides.length}`, {
      x: slideWidth - margin - 40,
      y: 35,
      size: 10,
      font: fontRegular,
      color: rgb(0.6, 0.65, 0.72),
    });

    // Title
    const titleLines = wrapText(slide.title, fontBold, 22, slideWidth - margin * 2);
    let currentY = slideHeight - margin - 20;

    for (const tl of titleLines) {
      page.drawText(tl, {
        x: margin,
        y: currentY,
        size: 22,
        font: fontBold,
        color: rgb(0.1, 0.14, 0.22),
      });
      currentY -= 30;
    }

    currentY -= 5;
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: slideWidth - margin, y: currentY },
      thickness: 1.5,
      color: rgb(0.3, 0.5, 0.8),
    });
    currentY -= 25;

    // Bullets
    for (const b of slide.bullets) {
      const bulletLines = wrapText(`•   ${b}`, fontRegular, 13, slideWidth - margin * 2 - 20);
      for (let i = 0; i < bulletLines.length; i++) {
        if (currentY < 60) break;
        page.drawText(bulletLines[i], {
          x: margin + (i === 0 ? 0 : 20),
          y: currentY,
          size: 13,
          font: fontRegular,
          color: rgb(0.2, 0.24, 0.3),
        });
        currentY -= 20;
      }
      currentY -= 6;
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'powerpoint-to-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'converted.pdf',
    metadata: {
      slideCount: slides.length,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
