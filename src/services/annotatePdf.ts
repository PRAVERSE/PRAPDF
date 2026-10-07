/**
 * PRA PDF — PDF Annotation & Page Numbering Services
 * 23. Add Page Numbers
 * 24. Watermark PDF
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { validateFileSize } from './core/fileValidator';
import { loadPDF } from './core/pdfEngine';

export interface PageNumberOptions {
  position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
  format?: 'n' | 'Page n' | 'Page n of total' | 'n/total';
  startNumber?: number;
  fontSize?: number;
  margin?: number;
  color?: { r: number; g: number; b: number };
  onProgress?: (percent: number, status: string) => void;
}

export interface WatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  imageFile?: File;
  fontSize?: number;
  rotation?: number;
  opacity?: number;
  color?: { r: number; g: number; b: number };
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Tool 23: Add Page Numbers
 */
export async function addPageNumbersToPdf(
  file: File,
  options: PageNumberOptions = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading PDF document...');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const totalPages = doc.getPageCount();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const position = options.position || 'bottom-center';
  const format = options.format || 'Page n of total';
  const startNum = options.startNumber !== undefined ? options.startNumber : 1;
  const fontSize = options.fontSize || 10;
  const margin = options.margin || 30;
  const c = options.color || { r: 0.3, g: 0.35, b: 0.45 };
  const textColor = rgb(c.r, c.g, c.b);

  options.onProgress?.(50, `Inserting page numbers across ${totalPages} pages...`);

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const currentNum = startNum + i;

    let text = `${currentNum}`;
    if (format === 'Page n') text = `Page ${currentNum}`;
    else if (format === 'Page n of total') text = `Page ${currentNum} of ${startNum + totalPages - 1}`;
    else if (format === 'n/total') text = `${currentNum}/${startNum + totalPages - 1}`;

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = width / 2 - textWidth / 2;
    let y = margin;

    if (position === 'bottom-left') {
      x = margin;
      y = margin;
    } else if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    } else if (position === 'top-center') {
      x = width / 2 - textWidth / 2;
      y = height - margin;
    } else if (position === 'top-left') {
      x = margin;
      y = height - margin;
    } else if (position === 'top-right') {
      x = width - textWidth - margin;
      y = height - margin;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  options.onProgress?.(90, 'Saving numbered PDF...');
  return await doc.save();
}

/**
 * Tool 24: Watermark PDF
 */
export async function watermarkPdf(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading PDF document...');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const totalPages = doc.getPageCount();

  const opacity = options.opacity !== undefined ? options.opacity : 0.3;
  const rotationAngle = options.rotation !== undefined ? options.rotation : 45;

  if (options.type === 'text') {
    const watermarkText = options.text || 'CONFIDENTIAL';
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = options.fontSize || 48;
    const c = options.color || { r: 0.6, g: 0.1, b: 0.1 };
    const watermarkColor = rgb(c.r, c.g, c.b);

    options.onProgress?.(50, `Drawing text watermark on ${totalPages} pages...`);

    for (let i = 0; i < totalPages; i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

      page.drawText(watermarkText, {
        x: width / 2 - textWidth / 3,
        y: height / 2 - fontSize / 2,
        size: fontSize,
        font,
        color: watermarkColor,
        opacity,
        rotate: degrees(rotationAngle),
      });
    }
  } else if (options.type === 'image' && options.imageFile) {
    options.onProgress?.(40, 'Embedding watermark image...');
    const imgBuffer = await options.imageFile.arrayBuffer();
    const isPng = options.imageFile.name.toLowerCase().endsWith('.png');
    const image = isPng ? await doc.embedPng(imgBuffer) : await doc.embedJpg(imgBuffer);
    const imgDims = image.scale(0.5);

    options.onProgress?.(60, 'Stamping image watermark on all pages...');
    for (let i = 0; i < totalPages; i++) {
      const page = doc.getPage(i);
      const { width, height } = page.getSize();

      page.drawImage(image, {
        x: width / 2 - imgDims.width / 2,
        y: height / 2 - imgDims.height / 2,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
        rotate: degrees(rotationAngle),
      });
    }
  }

  options.onProgress?.(90, 'Saving watermarked PDF...');
  return await doc.save();
}
