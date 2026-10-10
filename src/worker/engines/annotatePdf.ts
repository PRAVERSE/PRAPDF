/**
 * PRA PDF — Cloudflare Worker: Annotate PDF Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Embeds visual markup (highlights, rectangles, sticky note text, lines)
 * and writes standard PDF annotation dictionaries.
 */

import { PDFDocument, PDFName, PDFDict, PDFArray, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export interface AnnotationItem {
  type: 'highlight' | 'note' | 'text' | 'rect' | 'circle' | 'line';
  pageIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: { r: number; g: number; b: number };
  opacity?: number;
}

export async function processAnnotatePdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    annotations?: AnnotationItem[];
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
  const annotations = options?.annotations || [
    { type: 'note', pageIndex: 0, x: 50, y: 350, text: 'Note added by PRA PDF' },
  ];

  let appliedCount = 0;

  for (const ann of annotations) {
    const pageIdx = Math.min(Math.max(ann.pageIndex ?? 0, 0), totalPages - 1);
    const page = doc.getPage(pageIdx);
    const { height: pHeight } = page.getSize();
    const c = ann.color || { r: 1, g: 0.85, b: 0 };
    const opacity = ann.opacity ?? 0.6;
    const x = ann.x;
    const y = ann.y;
    const w = ann.width || 120;
    const h = ann.height || 24;

    if (ann.type === 'highlight') {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: rgb(1, 0.95, 0.2),
        opacity: Math.min(0.8, opacity),
      });
      appliedCount++;
    } else if (ann.type === 'rect') {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(c.r, c.g, c.b),
        borderWidth: 1.5,
        opacity,
      });
      appliedCount++;
    } else if ((ann.type === 'note' || ann.type === 'text') && ann.text) {
      // Draw visual note bubble
      page.drawRectangle({
        x,
        y,
        width: Math.max(w, 140),
        height: Math.max(h, 30),
        color: rgb(1, 0.98, 0.77),
        borderColor: rgb(0.8, 0.7, 0.2),
        borderWidth: 1,
      });
      page.drawText(ann.text.substring(0, 80), {
        x: x + 6,
        y: y + 8,
        size: 9,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Also create standard PDF Annotation dictionary
      const annotDict = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Text',
        Rect: [x, y, x + w, y + h],
        Contents: PDFString.of(ann.text),
        C: [c.r, c.g, c.b],
      });
      const annotRef = doc.context.register(annotDict);

      let annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
      if (!annots) {
        annots = doc.context.obj([]) as PDFArray;
        page.node.set(PDFName.of('Annots'), annots);
      }
      annots.push(annotRef);
      appliedCount++;
    } else if (ann.type === 'line') {
      page.drawLine({
        start: { x, y },
        end: { x: x + w, y: y + h },
        thickness: 2,
        color: rgb(c.r, c.g, c.b),
        opacity,
      });
      appliedCount++;
    }
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'annotate-pdf',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'annotated.pdf',
    metadata: {
      pageCount: totalPages,
      annotationsCount: appliedCount,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
