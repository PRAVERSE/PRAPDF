/**
 * PRA PDF — Cloudflare Worker Engine Types
 * A PRAVERSE Company
 */

export type WorkerServiceName =
  // Phase 1 (8 services)
  | 'jpg-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'word-to-pdf'
  | 'pdf-to-word'
  | 'watermark-pdf'
  | 'full-pdf-editing'
  // Phase 2 (18 services)
  | 'png-to-pdf'
  | 'rotate-pdf'
  | 'crop-pdf'
  | 'organize-pdf'
  | 'delete-pdf-pages'
  | 'extract-pdf-pages'
  | 'add-page-numbers'
  | 'password-protect-pdf'
  | 'unlock-pdf'
  | 'extract-pdf-text'
  | 'pdf-to-markdown'
  | 'edit-pdf-metadata'
  | 'rtf-conversion'
  | 'excel-to-pdf'
  | 'powerpoint-to-pdf'
  | 'html-to-pdf'
  | 'txt-to-pdf'
  | 'markdown-to-pdf'
  // Wave 1 Easiest Services
  | 'delete-pdf-annotations'
  | 'flip-pdf'
  | 'split-pdf-in-half'
  | 'alternate-mix-pdf'
  | 'n-up-pdf'
  // Wave 2 Services & Aliases
  | 'images-to-pdf'
  | 'rtf-to-pdf'
  | 'pdf-to-rtf'
  | 'pdf-to-jpg'
  | 'pdf-to-png'
  | 'organize-pdf-pages'
  // Wave 3 Services
  | 'ocr-pdf'
  | 'scan-to-pdf'
  | 'pdf-to-tiff'
  | 'pdf-to-excel'
  | 'pdf-to-csv'
  | 'pdf-to-powerpoint'
  | 'grayscale-pdf'
  | 'deskew-pdf';

export interface WorkerEngineResult {
  service: WorkerServiceName;
  outputBuffer: Uint8Array;
  mimeType: string;
  outputFileName: string;
  metadata: Record<string, any>;
}

export interface EditOperation {
  type: 'addText' | 'addRectangle' | 'addHighlight' | 'addLine' | 'addPage' | 'deletePage';
  pageIndex?: number;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  size?: number;
  color?: { r: number; g: number; b: number };
  borderColor?: { r: number; g: number; b: number };
  borderWidth?: number;
  thickness?: number;
  opacity?: number;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}
