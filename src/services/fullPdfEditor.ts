/**
 * PRA PDF — Full PDF Editing Studio Engine (Tool 25)
 * Comprehensive editing: text addition/editing, image insertion, shapes,
 * freehand markup/drawing, highlights, annotations, and export encoding.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadPDF } from './core/pdfEngine';
import { validateFileSize } from './core/fileValidator';

export interface EditorBaseElement {
  id: string;
  pageIndex: number;
  x: number; // in PDF points (from top-left of canvas)
  y: number;
}

export interface EditorTextElement extends EditorBaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  color: { r: number; g: number; b: number };
  isBold?: boolean;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right';
  opacity?: number;
}

export interface EditorImageElement extends EditorBaseElement {
  type: 'image';
  width: number;
  height: number;
  dataUrl?: string; // base64 data url
  imageData?: string; // alias
  isPng?: boolean;
  opacity?: number;
}

export interface EditorShapeElement extends EditorBaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  width: number;
  height: number;
  strokeColor: { r: number; g: number; b: number };
  fillColor?: { r: number; g: number; b: number };
  strokeWidth: number;
  opacity?: number;
}

export interface EditorDrawingElement extends EditorBaseElement {
  type: 'drawing';
  points: { x: number; y: number }[];
  color: { r: number; g: number; b: number };
  strokeWidth: number;
  width?: number;
  height?: number;
  opacity?: number;
}

export interface EditorHighlightElement extends EditorBaseElement {
  type: 'highlight';
  width: number;
  height: number;
  color: { r: number; g: number; b: number };
  opacity: number;
}

export interface EditorCommentElement extends EditorBaseElement {
  type: 'comment';
  text: string;
  color: { r: number; g: number; b: number };
  opacity?: number;
}

export type EditorElement =
  | EditorTextElement
  | EditorImageElement
  | EditorShapeElement
  | EditorDrawingElement
  | EditorHighlightElement
  | EditorCommentElement;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    const g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    const b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    return { r, g, b };
  }
  const num = parseInt(cleanHex, 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return { r, g, b };
}

export function rgbToHex(c: { r: number; g: number; b: number }): string {
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/**
 * Encodes all visual modifications into the PDF document structure
 */
export async function exportEditedPdf(
  fileOrBytes: File | Uint8Array,
  elements: EditorElement[],
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  let buffer: ArrayBuffer | Uint8Array;
  if (fileOrBytes instanceof File) {
    const check = validateFileSize(fileOrBytes);
    if (!check.valid) throw new Error(check.error);
    buffer = await fileOrBytes.arrayBuffer();
  } else {
    buffer = fileOrBytes;
  }

  options.onProgress?.(20, 'Loading document into editing pipeline...');
  const doc = await loadPDF(buffer);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  options.onProgress?.(50, `Encoding ${elements.length} elements across pages...`);

  // Group elements by page index
  const elementsByPage: Map<number, EditorElement[]> = new Map();
  for (const el of elements) {
    const list = elementsByPage.get(el.pageIndex) || [];
    list.push(el);
    elementsByPage.set(el.pageIndex, list);
  }

  for (const [pageIndex, pageElements] of elementsByPage.entries()) {
    if (pageIndex < 0 || pageIndex >= doc.getPageCount()) continue;
    const page = doc.getPage(pageIndex);
    const { height: pageHeight } = page.getSize();

    for (const el of pageElements) {
      // In PDF coordinates, origin (0,0) is bottom-left. Canvas is top-left.
      const pdfY = pageHeight - el.y;

      switch (el.type) {
        case 'text': {
          const font = el.isBold ? fontBold : fontRegular;
          page.drawText(el.text, {
            x: el.x,
            y: pdfY - el.fontSize,
            size: el.fontSize,
            font,
            color: rgb(el.color.r, el.color.g, el.color.b),
            opacity: el.opacity ?? 1,
          });
          break;
        }

        case 'comment': {
          page.drawRectangle({
            x: el.x,
            y: pdfY - 20,
            width: 140,
            height: 20,
            color: rgb(el.color.r, el.color.g, el.color.b),
            opacity: el.opacity ?? 0.9,
          });
          page.drawText(el.text.slice(0, 30), {
            x: el.x + 4,
            y: pdfY - 14,
            size: 9,
            font: fontRegular,
            color: rgb(1, 1, 1),
          });
          break;
        }

        case 'shape': {
          const stroke = rgb(el.strokeColor.r, el.strokeColor.g, el.strokeColor.b);
          const fill = el.fillColor
            ? rgb(el.fillColor.r, el.fillColor.g, el.fillColor.b)
            : undefined;

          if (el.shapeType === 'rectangle') {
            page.drawRectangle({
              x: el.x,
              y: pdfY - el.height,
              width: el.width,
              height: el.height,
              borderColor: stroke,
              borderWidth: el.strokeWidth,
              color: fill,
              opacity: el.opacity ?? 1,
            });
          } else if (el.shapeType === 'circle') {
            const radius = Math.min(el.width, el.height) / 2;
            page.drawCircle({
              x: el.x + radius,
              y: pdfY - radius,
              size: radius,
              borderColor: stroke,
              borderWidth: el.strokeWidth,
              color: fill,
              opacity: el.opacity ?? 1,
            });
          } else if (el.shapeType === 'line') {
            page.drawLine({
              start: { x: el.x, y: pdfY },
              end: { x: el.x + el.width, y: pdfY - el.height },
              thickness: el.strokeWidth,
              color: stroke,
            });
          }
          break;
        }

        case 'highlight': {
          page.drawRectangle({
            x: el.x,
            y: pdfY - el.height,
            width: el.width,
            height: el.height,
            color: rgb(el.color.r, el.color.g, el.color.b),
            opacity: el.opacity || 0.35,
          });
          break;
        }

        case 'image': {
          try {
            const url = el.dataUrl || el.imageData;
            if (!url) break;
            const base64Data = url.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const isPng = url.includes('image/png');
            const embeddedImage = isPng
              ? await doc.embedPng(byteArray)
              : await doc.embedJpg(byteArray);

            page.drawImage(embeddedImage, {
              x: el.x,
              y: pdfY - el.height,
              width: el.width,
              height: el.height,
              opacity: el.opacity ?? 1,
            });
          } catch (imgErr) {
            console.warn('[Full PDF Editor] Failed embedding image element:', imgErr);
          }
          break;
        }

        case 'drawing': {
          if (el.points && el.points.length > 1) {
            const stroke = rgb(el.color.r, el.color.g, el.color.b);
            for (let i = 0; i < el.points.length - 1; i++) {
              const p1 = el.points[i];
              const p2 = el.points[i + 1];
              page.drawLine({
                start: { x: p1.x, y: pageHeight - p1.y },
                end: { x: p2.x, y: pageHeight - p2.y },
                thickness: el.strokeWidth,
                color: stroke,
              });
            }
          }
          break;
        }
      }
    }
  }

  options.onProgress?.(85, 'Finalizing PDF byte stream serialization...');
  const outputBytes = await doc.save();
  options.onProgress?.(100, 'Export complete!');
  return outputBytes;
}
