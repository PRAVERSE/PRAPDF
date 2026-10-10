/**
 * PRA PDF — Cloudflare Worker: Header & Footer PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Stretches recurring headers and footers with custom margin positioning,
 * dynamic macros ({page}, {total}, {date}), and typography controls.
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processHeaderFooterPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    headerText?: string;
    footerText?: string;
    fontSize?: number;
    margin?: number;
    alignment?: 'left' | 'center' | 'right';
    color?: { r: number; g: number; b: number };
  }
): Promise<WorkerEngineResult> {
  if (
    inputBuffer.length < 5 ||
    inputBuffer[0] !== 0x25 || // %
    inputBuffer[1] !== 0x50 || // P
    inputBuffer[2] !== 0x44 || // D
    inputBuffer[3] !== 0x46 || // F
    inputBuffer[4] !== 0x2d    // -
  ) {
    throw new Error('Input does not contain a valid PDF document signature (%PDF-).');
  }

  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = options?.fontSize || 9;
  const margin = options?.margin ?? 25;
  const alignment = options?.alignment || 'center';
  const customColor = options?.color || { r: 0.3, g: 0.3, b: 0.3 };
  const textColor = rgb(customColor.r, customColor.g, customColor.b);

  const headerTemplate = options?.headerText ?? '';
  const footerTemplate = options?.footerText ?? 'Page {page} of {total}';
  const dateStr = new Date().toISOString().split('T')[0];

  const formatText = (tmpl: string, pageNum: number) => {
    return tmpl
      .replace(/{page}/gi, String(pageNum))
      .replace(/{total}/gi, String(totalPages))
      .replace(/{date}/gi, dateStr);
  };

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const pageNum = i + 1;

    // Apply Header
    if (headerTemplate.trim()) {
      const headerStr = formatText(headerTemplate, pageNum);
      const textWidth = font.widthOfTextAtSize(headerStr, fontSize);
      let x = margin;
      if (alignment === 'center') {
        x = (width - textWidth) / 2;
      } else if (alignment === 'right') {
        x = width - margin - textWidth;
      }
      const y = height - margin - fontSize;

      page.drawText(headerStr, {
        x: Math.max(margin, x),
        y,
        size: fontSize,
        font,
        color: textColor,
      });
    }

    // Apply Footer
    if (footerTemplate.trim()) {
      const footerStr = formatText(footerTemplate, pageNum);
      const textWidth = font.widthOfTextAtSize(footerStr, fontSize);
      let x = margin;
      if (alignment === 'center') {
        x = (width - textWidth) / 2;
      } else if (alignment === 'right') {
        x = width - margin - textWidth;
      }
      const y = margin;

      page.drawText(footerStr, {
        x: Math.max(margin, x),
        y,
        size: fontSize,
        font,
        color: textColor,
      });
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'header-footer-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'header_footer_added.pdf',
    metadata: {
      pageCount: totalPages,
      headerApplied: !!headerTemplate.trim(),
      footerApplied: !!footerTemplate.trim(),
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
