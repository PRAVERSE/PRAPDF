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
 * Helper to dispatch PDF organization services to Cloudflare Worker
 */
async function callWorkerProcess(
  service: string,
  file: File,
  options?: any,
  onProgress?: (percent: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, `Uploading document to Cloudflare Worker (${service})...`);
  const formData = new FormData();
  formData.append('service', service);
  formData.append('file', file);
  if (options) {
    formData.append('options', JSON.stringify(options));
  }

  onProgress?.(45, 'Processing in Cloudflare Worker runtime...');
  const response = await fetch('/api/v1/cf/process', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Processing failed with HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.message) {
        errorDetail = errJson.message;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(`Cloudflare Worker error: ${errorDetail}`);
  }

  onProgress?.(85, 'Receiving generated PDF...');
  const json = await response.json();
  if (!json.success || !json.outputBase64) {
    throw new Error(json.message || 'Worker processing failed to return valid PDF data.');
  }

  const binaryString = atob(json.outputBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  onProgress?.(100, 'Complete');
  return bytes;
}

/**
 * Tool 16: Organize PDF Pages
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
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

  return await callWorkerProcess('organize-pdf', file, { pageOrder }, options.onProgress);
}

/**
 * Tool 17: Delete PDF Pages
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
 */
export async function deletePdfPages(
  file: File,
  pagesToDeleteSpec: string,
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('delete-pdf-pages', file, { pagesToDeleteSpec }, options.onProgress);
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
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
 */
export async function rotatePdf(
  file: File,
  degreesToRotate: 90 | 180 | 270,
  pageIndices?: number[],
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess(
    'rotate-pdf',
    file,
    { degreesToRotate, pageIndices },
    options.onProgress
  );
}

/**
 * Tool 20: Crop PDF
 * Production Processing: Routes via Cloudflare Worker endpoint POST /api/v1/cf/process
 */
export async function cropPdf(
  file: File,
  cropMargins: { top: number; right: number; bottom: number; left: number },
  options: { onProgress?: (percent: number, status: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('crop-pdf', file, { cropMargins }, options.onProgress);
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
