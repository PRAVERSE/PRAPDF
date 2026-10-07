/**
 * PRA PDF — PDF Organization & Structure Manipulation
 * 14. Merge PDF
 * 15. Split PDF
 * 16. Organize PDF Pages
 * 17. Delete PDF Pages
 * 18. Extract PDF Pages
 * 19. Rotate PDF
 * 20. Crop PDF
 * 28. Edit PDF Metadata
 */

import { PDFDocument, degrees } from 'pdf-lib';
import JSZip from 'jszip';
import { validateFileSize } from './core/fileValidator';
import { loadPDF } from './core/pdfEngine';

/**
 * Parses user range string (e.g., '1-3, 5, 7-9') into 0-based page indices
 */
export function parsePageRangeString(spec: string, totalPages: number): number[] {
  const indices = new Set<number>();
  const chunks = spec.split(',').map((c) => c.trim());

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (chunk.includes('-')) {
      const [startStr, endStr] = chunk.split('-');
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        indices.add(i - 1);
      }
    } else {
      const page = parseInt(chunk, 10);
      if (page >= 1 && page <= totalPages) {
        indices.add(page - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Tool 14: Merge PDF
 */
export async function mergePdfs(
  files: File[],
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  if (!files || files.length < 2) {
    throw new Error('Merge requires at least two PDF files.');
  }

  for (const file of files) {
    const check = validateFileSize(file);
    if (!check.valid) throw new Error(`${file.name}: ${check.error}`);
  }

  options.onProgress?.(10, 'Initializing merge container...');
  const mergedDoc = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    options.onProgress?.(
      Math.round(10 + ((i + 1) / total) * 80),
      `Merging file ${i + 1} of ${total} (${files[i].name})...`
    );
    const buffer = await files[i].arrayBuffer();
    const srcDoc = await loadPDF(buffer);
    const pageIndices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  options.onProgress?.(95, 'Saving merged PDF...');
  return await mergedDoc.save();
}

/**
 * Tool 15: Split PDF
 */
export async function splitPdf(
  file: File,
  options: {
    mode: 'ranges' | 'all';
    rangeString?: string;
    onProgress?: (percent: number, status: string) => void;
  }
): Promise<{ isZip: boolean; data: Uint8Array | Blob; filename: string }> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(15, 'Reading source PDF...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (options.mode === 'ranges' && options.rangeString) {
    options.onProgress?.(50, 'Extracting requested page range...');
    const indices = parsePageRangeString(options.rangeString, totalPages);
    if (indices.length === 0) throw new Error('No valid pages matched the specified range.');

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, indices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    options.onProgress?.(90, 'Finalizing split PDF...');
    const resultBytes = await newDoc.save();
    return { isZip: false, data: resultBytes, filename: `${baseName}-split.pdf` };
  }

  // Split all pages into individual files in a ZIP
  const zip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    options.onProgress?.(
      Math.round(20 + ((i + 1) / totalPages) * 70),
      `Splitting page ${i + 1} of ${totalPages}...`
    );
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const bytes = await singleDoc.save();
    zip.file(`${baseName}-page-${String(i + 1).padStart(3, '0')}.pdf`, bytes);
  }

  options.onProgress?.(95, 'Bundling split pages into ZIP...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { isZip: true, data: zipBlob, filename: `${baseName}-split-pages.zip` };
}

/**
 * Tool 16: Organize PDF Pages
 */
export async function organizePdfPages(
  file: File,
  pageOrder: { pageIndex: number; rotation?: number }[],
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  if (!pageOrder || pageOrder.length === 0) {
    throw new Error('Organized page list cannot be empty.');
  }

  options.onProgress?.(20, 'Reading source document...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);

  options.onProgress?.(50, 'Reorganizing and rotating pages...');
  const newDoc = await PDFDocument.create();

  for (let i = 0; i < pageOrder.length; i++) {
    const item = pageOrder[i];
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.pageIndex]);

    if (item.rotation) {
      const currentAngle = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentAngle + item.rotation) % 360));
    }

    newDoc.addPage(copiedPage);
  }

  options.onProgress?.(90, 'Finalizing organized PDF...');
  return await newDoc.save();
}

/**
 * Tool 17: Delete PDF Pages
 */
export async function deletePdfPages(
  file: File,
  pagesToDeleteSpec: string,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading source PDF...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();

  const toDelete = new Set(parsePageRangeString(pagesToDeleteSpec, totalPages));
  const pagesToKeep: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    if (!toDelete.has(i)) {
      pagesToKeep.push(i);
    }
  }

  if (pagesToKeep.length === 0) {
    throw new Error('Cannot delete all pages from the document.');
  }

  options.onProgress?.(60, 'Deleting requested pages...');
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pagesToKeep);
  copiedPages.forEach((page) => newDoc.addPage(page));

  options.onProgress?.(95, 'Saving updated PDF...');
  return await newDoc.save();
}

/**
 * Tool 18: Extract PDF Pages
 */
export async function extractPdfPages(
  file: File,
  pagesToExtractSpec: string,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Loading document...');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();

  const indices = parsePageRangeString(pagesToExtractSpec, totalPages);
  if (indices.length === 0) {
    throw new Error('No valid pages found in range.');
  }

  options.onProgress?.(60, 'Extracting selected pages...');
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  options.onProgress?.(95, 'Saving extracted PDF...');
  return await newDoc.save();
}

/**
 * Tool 19: Rotate PDF
 */
export async function rotatePdf(
  file: File,
  degreesToRotate: 90 | 180 | 270,
  pageIndices?: number[],
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Loading PDF for rotation...');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const totalPages = doc.getPageCount();

  const targetPages = pageIndices && pageIndices.length > 0 ? pageIndices : Array.from({ length: totalPages }, (_, i) => i);

  options.onProgress?.(50, `Rotating ${targetPages.length} pages by ${degreesToRotate}°...`);
  for (const idx of targetPages) {
    if (idx >= 0 && idx < totalPages) {
      const page = doc.getPage(idx);
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + degreesToRotate) % 360));
    }
  }

  options.onProgress?.(90, 'Saving rotated PDF...');
  return await doc.save();
}

/**
 * Tool 20: Crop PDF
 */
export async function cropPdf(
  file: File,
  cropMargins: { top: number; right: number; bottom: number; left: number },
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Loading PDF for cropping...');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const totalPages = doc.getPageCount();

  options.onProgress?.(50, 'Applying crop boundaries...');
  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();

    const newX = cropMargins.left;
    const newY = cropMargins.bottom;
    const newWidth = Math.max(10, width - cropMargins.left - cropMargins.right);
    const newHeight = Math.max(10, height - cropMargins.top - cropMargins.bottom);

    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  options.onProgress?.(90, 'Saving cropped PDF...');
  return await doc.save();
}

/**
 * Tool 28: Edit PDF Metadata
 */
export async function editPdfMetadata(
  file: File,
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  },
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(20, 'Reading PDF metadata dictionary...');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);

  options.onProgress?.(50, 'Applying updated metadata fields...');
  if (metadata.title !== undefined) doc.setTitle(metadata.title);
  if (metadata.author !== undefined) doc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) doc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) {
    const keywordsList = metadata.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    doc.setKeywords(keywordsList);
  }
  if (metadata.creator !== undefined) doc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) doc.setProducer(metadata.producer);

  doc.setModificationDate(new Date());

  options.onProgress?.(90, 'Saving PDF with updated metadata...');
  return await doc.save();
}
