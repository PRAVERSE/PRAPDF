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
import { postFormDataWithProgress, NetworkProgressCallback } from './core/networkClient';
import { processDeletePdfAnnotationsWorker } from '../worker/engines/deletePdfAnnotations';
import { processFlipPdfWorker } from '../worker/engines/flipPdf';
import { processSplitPdfInHalfWorker } from '../worker/engines/splitPdfInHalf';
import { processAlternateMixPdfWorker } from '../worker/engines/alternateMixPdf';
import { processNUpPdfWorker } from '../worker/engines/nUpPdf';

/**
 * Parses user range string (e.g., '1-3, 5, 7-9') into 0-based page indices
 * Validates bounds against totalPages and throws clear error for invalid or out-of-range pages
 */
export function parsePageRangeString(
  spec: string,
  totalPages: number,
  preserveOrder: boolean = true
): number[] {
  const result: number[] = [];
  const seen = new Set<number>();
  const chunks = spec.split(',').map((c) => c.trim()).filter(Boolean);

  if (chunks.length === 0) {
    throw new Error('Please enter at least one page number or range (e.g. 1-3, 5).');
  }

  for (const chunk of chunks) {
    if (chunk.includes('-')) {
      const parts = chunk.split('-');
      if (parts.length !== 2) {
        throw new Error(`Invalid range format: "${chunk}". Use format like 1-3.`);
      }
      const start = parseInt(parts[0].trim(), 10);
      const end = parseInt(parts[1].trim(), 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid page numbers in range: "${chunk}".`);
      }
      if (start > end) {
        throw new Error(`Start page (${start}) cannot be greater than end page (${end}) in range: "${chunk}".`);
      }
      // If range is completely out of document bounds, skip it gracefully
      if (start > totalPages || end < 1) {
        continue;
      }
      // Clamp bounds to valid document pages
      const clampedStart = Math.max(1, start);
      const clampedEnd = Math.min(totalPages, end);

      for (let i = clampedStart; i <= clampedEnd; i++) {
        const idx = i - 1;
        if (!seen.has(idx)) {
          seen.add(idx);
          result.push(idx);
        }
      }
    } else {
      const page = parseInt(chunk, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${chunk}". Please enter numbers only.`);
      }
      if (page < 1) {
        throw new Error(`Page numbers must be 1 or greater. Received: ${page}.`);
      }
      if (page > totalPages) {
        throw new Error(
          `Page ${page} is out of range. Document only contains ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }

      const idx = page - 1;
      if (!seen.has(idx)) {
        seen.add(idx);
        result.push(idx);
      }
    }
  }

  if (result.length === 0) {
    throw new Error('No valid pages matched your selection.');
  }

  return preserveOrder ? result : result.sort((a, b) => a - b);
}

/**
 * Tool 14: Merge PDF
 * Merges multiple PDF documents in the exact order provided.
 */
export async function mergePdfs(
  files: File[],
  options: { onProgress?: (percent: number | null, status: string, detail?: string) => void } = {}
): Promise<Uint8Array> {
  if (!files || files.length < 2) {
    throw new Error('Merge requires at least two PDF files.');
  }

  let totalBytes = 0;
  for (const file of files) {
    const check = validateFileSize(file);
    if (!check.valid) throw new Error(`${file.name}: ${check.error}`);
    totalBytes += file.size;
  }

  if (totalBytes > 50 * 1024 * 1024) {
    throw new Error(
      `Total size of files to merge exceeds the 50 MB limit (${(totalBytes / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  options.onProgress?.(5, 'Validating documents…');

  // Try Worker first with real upload progress
  const formData = new FormData();
  formData.append('service', 'merge-pdf');
  files.forEach((f) => formData.append('files', f));

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress: options.onProgress,
      serviceName: 'merge-pdf',
    });

    if (json.success && json.outputBase64) {
      options.onProgress?.(95, 'Preparing download…');
      const binaryString = atob(json.outputBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      options.onProgress?.(100, 'Completed successfully!');
      return bytes;
    }
  } catch (workerErr: any) {
    console.warn('[MERGE] Worker route unavailable, using client-side engine:', workerErr);
  }

  // Graceful client-side fallback using pdf-lib
  options.onProgress?.(15, 'Preparing files…', 'Loading PDF documents in browser…');
  const mergedDoc = await PDFDocument.create();
  const total = files.length;
  let mergedPageCount = 0;

  for (let i = 0; i < total; i++) {
    const pct = Math.round(15 + ((i + 1) / total) * 70);
    options.onProgress?.(pct, 'Processing PDF…', `Merging file ${i + 1} of ${total} (${files[i].name})…`);
    try {
      const buffer = await files[i].arrayBuffer();
      const srcDoc = await loadPDF(buffer);
      const indices = srcDoc.getPageIndices();
      const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => mergedDoc.addPage(p));
      mergedPageCount += indices.length;
    } catch (err: any) {
      throw new Error(`File ${i + 1} (${files[i].name}) is corrupted or unreadable: ${err?.message || ''}`);
    }
  }

  if (mergedPageCount === 0) {
    throw new Error('All input documents were empty or could not be merged.');
  }

  options.onProgress?.(90, 'Generating output…', 'Saving combined PDF document…');
  const outBytes = await mergedDoc.save({ useObjectStreams: true });
  options.onProgress?.(100, 'Completed successfully!');
  return outBytes;
}

export interface SplitPdfOptions {
  mode: 'ranges' | 'every_n' | 'all';
  rangeString?: string;
  everyN?: number;
  onProgress?: (percent: number | null, status: string, detail?: string) => void;
}

export interface SplitPdfResult {
  isZip: boolean;
  data: Uint8Array | Blob;
  filename: string;
  partsCount?: number;
}

/**
 * Tool 15: Split PDF
 * Supports split by page ranges, split every N pages, or split into individual single pages.
 */
export async function splitPdf(
  file: File,
  options: SplitPdfOptions
): Promise<SplitPdfResult> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(5, 'Validating documents…');
  const baseName = file.name.replace(/\.[^/.]+$/, '').trim() || 'document';

  // Try Worker first
  const formData = new FormData();
  formData.append('service', 'split-pdf');
  formData.append('file', file);
  formData.append(
    'options',
    JSON.stringify({
      mode: options.mode,
      rangeString: options.rangeString,
      everyN: options.everyN,
      outputFileName: baseName,
    })
  );

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress: options.onProgress,
      serviceName: 'split-pdf',
    });

    if (json.success && json.outputBase64) {
      options.onProgress?.(95, 'Preparing download…');
      const binaryString = atob(json.outputBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Check whether response is ZIP or PDF based on mimeType, metadata, or magic bytes
      const isZip =
        json.mimeType === 'application/zip' ||
        !!json.metadata?.isZip ||
        (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b);

      let filename = json.outputFileName || '';
      if (isZip) {
        if (!filename.toLowerCase().endsWith('.zip')) {
          filename = `${filename.replace(/\.pdf$/i, '') || `${baseName}_split`}.zip`;
        }
      } else {
        if (!filename.toLowerCase().endsWith('.pdf')) {
          filename = `${filename.replace(/\.zip$/i, '') || `${baseName}_split`}.pdf`;
        }
      }

      options.onProgress?.(100, 'Completed successfully!');
      return {
        isZip,
        data: isZip ? new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }) : bytes,
        filename,
        partsCount: json.metadata?.outputPartsCount || json.metadata?.outputPageCount,
      };
    }
  } catch (workerErr: any) {
    console.warn('[SPLIT] Worker route unavailable, using client-side engine:', workerErr);
  }

  // Graceful client-side fallback
  options.onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  // Mode 1: Split every N pages
  if (options.mode === 'every_n') {
    const everyN = Math.max(1, options.everyN || 1);
    const zip = new JSZip();
    let partNum = 1;

    for (let i = 0; i < totalPages; i += everyN) {
      const chunkEnd = Math.min(i + everyN, totalPages);
      const indices: number[] = [];
      for (let j = i; j < chunkEnd; j++) indices.push(j);

      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => partDoc.addPage(p));
      const bytes = await partDoc.save({ useObjectStreams: true });

      const startPage = i + 1;
      const endPage = chunkEnd;
      zip.file(`${baseName}_part_${partNum}_pages_${startPage}-${endPage}.pdf`, bytes);
      partNum++;
    }

    options.onProgress?.(85, 'Generating output…', 'Packaging split parts into ZIP…');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    options.onProgress?.(100, 'Completed successfully!');
    return {
      isZip: true,
      data: zipBlob,
      filename: `${baseName}_split_every_${everyN}_pages.zip`,
      partsCount: partNum - 1,
    };
  }

  // Mode 2: Split by custom ranges
  if (options.mode === 'ranges' && options.rangeString) {
    const chunks = options.rangeString.split(',').map((c) => c.trim()).filter(Boolean);
    if (chunks.length === 0) {
      throw new Error('Please enter at least one page range (e.g. 1-2, 3-5).');
    }

    // Single range -> single PDF
    if (chunks.length === 1) {
      const indices = parsePageRangeString(chunks[0], totalPages);
      options.onProgress?.(50, 'Processing PDF…', 'Extracting requested page range…');
      const newDoc = await PDFDocument.create();
      const copied = await newDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => newDoc.addPage(p));
      const outBytes = await newDoc.save({ useObjectStreams: true });

      options.onProgress?.(100, 'Completed successfully!');
      return {
        isZip: false,
        data: outBytes,
        filename: `${baseName}_split.pdf`,
        partsCount: 1,
      };
    }

    // Multiple ranges -> ZIP archive
    const zip = new JSZip();
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const indices = parsePageRangeString(chunk, totalPages);
      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => partDoc.addPage(p));
      const bytes = await partDoc.save({ useObjectStreams: true });
      zip.file(`${baseName}_part_${i + 1}_${chunk.replace(/[^0-9-]/g, '')}.pdf`, bytes);
    }

    options.onProgress?.(85, 'Generating output…', 'Packaging ranges into ZIP…');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    options.onProgress?.(100, 'Completed successfully!');
    return {
      isZip: true,
      data: zipBlob,
      filename: `${baseName}_split_ranges.zip`,
      partsCount: chunks.length,
    };
  }

  // Mode 3: Split all pages into individual single-page PDFs in a ZIP
  options.onProgress?.(30, 'Processing PDF…', 'Splitting all individual pages…');
  const zip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const bytes = await singleDoc.save({ useObjectStreams: true });
    const pad = String(i + 1).padStart(3, '0');
    zip.file(`${baseName}_page_${pad}.pdf`, bytes);
  }

  options.onProgress?.(85, 'Generating output…', 'Bundling pages into ZIP archive…');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  options.onProgress?.(100, 'Completed successfully!');
  return {
    isZip: true,
    data: zipBlob,
    filename: `${baseName}_split_all_pages.zip`,
    partsCount: totalPages,
  };
}

/**
 * Tool 18: Extract PDF Pages
 * Extracts specific pages in user-specified order with strict range validation.
 */
export async function extractPdfPages(
  file: File,
  pagesToExtractSpec: string,
  options: {
    preserveOrder?: boolean;
    onProgress?: (percent: number | null, status: string, detail?: string) => void;
  } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  if (!pagesToExtractSpec || !pagesToExtractSpec.trim()) {
    throw new Error('Please select or enter the pages you want to extract.');
  }

  options.onProgress?.(5, 'Validating documents…');

  try {
    return await callWorkerProcess(
      'extract-pdf-pages',
      file,
      { pagesToExtractSpec, preserveOrder: options.preserveOrder ?? true },
      options.onProgress
    );
  } catch (workerErr: any) {
    console.warn('[EXTRACT] Worker unavailable, using client-side fallback:', workerErr);
    return await extractPdfPagesClient(file, pagesToExtractSpec, options.preserveOrder ?? true, options.onProgress);
  }
}

async function extractPdfPagesClient(
  file: File,
  pagesToExtractSpec: string,
  preserveOrder: boolean,
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();

  const indices = parsePageRangeString(pagesToExtractSpec, totalPages, preserveOrder);

  onProgress?.(50, 'Processing PDF…', `Extracting ${indices.length} selected pages…`);
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  onProgress?.(85, 'Generating output…', 'Saving extracted PDF…');
  const outBytes = await newDoc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return outBytes;
}

/**
 * Reads existing metadata from any PDF file
 */
export async function extractPdfMetadata(file: File): Promise<{
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  pageCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
  return {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: Array.isArray(doc.getKeywords()) ? (doc.getKeywords() as any).join(', ') : (doc.getKeywords() || ''),
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    pageCount: doc.getPageCount(),
  };
}

/**
 * Tool 28: Edit PDF Metadata
 * Updates Title, Author, Subject, Keywords, Creator, and Producer while strictly preserving all pages and content.
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
  options: { onProgress?: (percent: number | null, status: string, detail?: string) => void } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  options.onProgress?.(5, 'Validating documents…');

  try {
    return await callWorkerProcess('edit-pdf-metadata', file, metadata, options.onProgress);
  } catch (workerErr: any) {
    console.warn('[METADATA] Worker unavailable, using client fallback:', workerErr);
    return await editPdfMetadataClient(file, metadata, options.onProgress);
  }
}

async function editPdfMetadataClient(
  file: File,
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creator?: string;
    producer?: string;
  },
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(20, 'Preparing files…', 'Reading PDF metadata dictionary…');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);

  onProgress?.(50, 'Processing PDF…', 'Applying updated metadata fields…');
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

  onProgress?.(85, 'Generating output…', 'Saving PDF with updated metadata…');
  const outBytes = await doc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return outBytes;
}

/**
 * Helper to dispatch PDF organization services to Cloudflare Worker with real upload progress
 */
async function callWorkerProcess(
  service: string,
  file: File,
  options?: any,
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(5, 'Validating documents…');
  const formData = new FormData();
  formData.append('service', service);
  formData.append('file', file);
  if (options) {
    formData.append('options', JSON.stringify(options));
  }

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress,
      serviceName: service,
    });

    if (!json.success || !json.outputBase64) {
      throw new Error(json.message || 'Worker processing failed to return valid PDF data.');
    }

    onProgress?.(95, 'Preparing download…');
    const binaryString = atob(json.outputBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    onProgress?.(100, 'Completed successfully!');
    return bytes;
  } catch (workerErr: any) {
    console.warn(`[Worker ${service}] Network error, utilizing client-side fallback:`, workerErr);
    // Graceful in-browser execution fallback
    if (service === 'delete-pdf-pages') {
      return await deletePdfPagesClient(file, options?.pagesToDeleteSpec || '', onProgress);
    }
    if (service === 'rotate-pdf') {
      return await rotatePdfClient(file, options?.degreesToRotate || 90, options?.pageIndices, onProgress);
    }
    if (service === 'crop-pdf') {
      return await cropPdfClient(file, options?.cropMargins || { top: 0, right: 0, bottom: 0, left: 0 }, onProgress);
    }
    if (service === 'organize-pdf') {
      return await organizePdfClient(file, options?.pageOrder || [], onProgress);
    }
    if (service === 'extract-pdf-pages') {
      return await extractPdfPagesClient(file, options?.pagesToExtractSpec || '', options?.preserveOrder ?? true, onProgress);
    }
    if (service === 'edit-pdf-metadata') {
      return await editPdfMetadataClient(file, options || {}, onProgress);
    }
    if (service === 'delete-pdf-annotations') {
      const buf = new Uint8Array(await file.arrayBuffer());
      const res = await processDeletePdfAnnotationsWorker(buf, options);
      return res.outputBuffer;
    }
    if (service === 'flip-pdf') {
      const buf = new Uint8Array(await file.arrayBuffer());
      const res = await processFlipPdfWorker(buf, options);
      return res.outputBuffer;
    }
    if (service === 'split-pdf-in-half') {
      const buf = new Uint8Array(await file.arrayBuffer());
      const res = await processSplitPdfInHalfWorker(buf, options);
      return res.outputBuffer;
    }
    if (service === 'n-up-pdf') {
      const buf = new Uint8Array(await file.arrayBuffer());
      const res = await processNUpPdfWorker(buf, options);
      return res.outputBuffer;
    }
    throw workerErr;
  }
}

/**
 * Tool 16: Organize PDF Pages
 */
export async function organizePdfPages(
  file: File,
  pageOrder: { pageIndex: number; rotation?: number }[],
  options: { onProgress?: NetworkProgressCallback } = {}
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
 */
export async function deletePdfPages(
  file: File,
  pagesToDeleteSpec: string,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('delete-pdf-pages', file, { pagesToDeleteSpec }, options.onProgress);
}

/**
 * Tool 19: Rotate PDF
 */
export async function rotatePdf(
  file: File,
  degreesToRotate: 90 | 180 | 270,
  pageIndices?: number[],
  options: { onProgress?: NetworkProgressCallback } = {}
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
 */
export async function cropPdf(
  file: File,
  cropMargins: { top: number; right: number; bottom: number; left: number },
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('crop-pdf', file, { cropMargins }, options.onProgress);
}

// Client helper implementations for rotate, crop, delete, organize
async function rotatePdfClient(
  file: File,
  degreesToRotate: number,
  pageIndices?: number[],
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const total = doc.getPageCount();
  const targets = pageIndices && pageIndices.length > 0 ? pageIndices : Array.from({ length: total }, (_, i) => i);

  onProgress?.(50, 'Processing PDF…', `Rotating pages by ${degreesToRotate}°…`);
  for (const idx of targets) {
    if (idx >= 0 && idx < total) {
      const page = doc.getPage(idx);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + degreesToRotate) % 360));
    }
  }

  onProgress?.(85, 'Generating output…', 'Saving rotated document…');
  const out = await doc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return out;
}

async function organizePdfClient(
  file: File,
  pageOrder: { pageIndex: number; rotation?: number }[],
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const total = srcDoc.getPageCount();
  const newDoc = await PDFDocument.create();

  onProgress?.(50, 'Processing PDF…', 'Arranging pages in specified order…');
  for (let i = 0; i < pageOrder.length; i++) {
    const item = pageOrder[i];
    if (item.pageIndex >= 0 && item.pageIndex < total) {
      const [copied] = await newDoc.copyPages(srcDoc, [item.pageIndex]);
      if (item.rotation) {
        const cur = copied.getRotation().angle;
        copied.setRotation(degrees((cur + item.rotation) % 360));
      }
      newDoc.addPage(copied);
    }
  }

  onProgress?.(85, 'Generating output…', 'Saving reordered document…');
  const out = await newDoc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return out;
}

async function cropPdfClient(
  file: File,
  cropMargins: { top: number; right: number; bottom: number; left: number },
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const doc = await loadPDF(buffer);
  const pages = doc.getPages();

  onProgress?.(50, 'Processing PDF…', 'Applying crop boundaries…');
  for (const page of pages) {
    const { width, height } = page.getSize();
    const newX = Math.max(0, cropMargins.left);
    const newY = Math.max(0, cropMargins.bottom);
    const newWidth = Math.max(10, width - cropMargins.left - cropMargins.right);
    const newHeight = Math.max(10, height - cropMargins.top - cropMargins.bottom);
    page.setCropBox(newX, newY, newWidth, newHeight);
  }

  onProgress?.(85, 'Generating output…', 'Saving cropped document…');
  const out = await doc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return out;
}

async function deletePdfPagesClient(
  file: File,
  pagesToDeleteSpec: string,
  onProgress?: (percent: number | null, status: string, detail?: string) => void
): Promise<Uint8Array> {
  onProgress?.(15, 'Preparing files…', 'Loading source PDF in browser…');
  const buffer = await file.arrayBuffer();
  const srcDoc = await loadPDF(buffer);
  const totalPages = srcDoc.getPageCount();
  const toDelete = new Set(parsePageRangeString(pagesToDeleteSpec, totalPages));

  if (toDelete.size >= totalPages) {
    throw new Error('Cannot delete all pages from document. At least one page must remain.');
  }

  onProgress?.(50, 'Processing PDF…', 'Removing specified pages…');
  const newDoc = await PDFDocument.create();
  const keepIndices: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!toDelete.has(i)) keepIndices.push(i);
  }
  const copied = await newDoc.copyPages(srcDoc, keepIndices);
  copied.forEach((p) => newDoc.addPage(p));

  onProgress?.(85, 'Generating output…', 'Saving updated document…');
  const out = await newDoc.save({ useObjectStreams: true });
  onProgress?.(100, 'Completed successfully!');
  return out;
}

/**
 * Service #42: Delete Annotations
 */
export async function deletePdfAnnotations(
  file: File,
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('delete-pdf-annotations', file, {}, options.onProgress);
}

/**
 * Service #31: Flip PDF
 */
export async function flipPdf(
  file: File,
  direction: 'horizontal' | 'vertical' | 'both' = 'horizontal',
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('flip-pdf', file, { direction }, options.onProgress);
}

/**
 * Service #29: Split PDF in Half
 */
export async function splitPdfInHalf(
  file: File,
  splitDirection: 'vertical' | 'horizontal' = 'vertical',
  options: { onProgress?: NetworkProgressCallback } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess('split-pdf-in-half', file, { splitDirection }, options.onProgress);
}

/**
 * Service #28: Alternate & Mix PDF
 */
export async function alternateMixPdf(
  files: File[],
  options: {
    reverseSecondDocument?: boolean;
    step?: number;
    onProgress?: NetworkProgressCallback;
  } = {}
): Promise<Uint8Array> {
  if (!files || files.length < 2) {
    throw new Error('Alternate & Mix requires at least two PDF files.');
  }

  let totalBytes = 0;
  for (const file of files) {
    const check = validateFileSize(file);
    if (!check.valid) throw new Error(`${file.name}: ${check.error}`);
    totalBytes += file.size;
  }

  if (totalBytes > 50 * 1024 * 1024) {
    throw new Error(
      `Total size of files to mix exceeds the 50 MB limit (${(totalBytes / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  options.onProgress?.(5, 'Validating documents…');

  const formData = new FormData();
  formData.append('service', 'alternate-mix-pdf');
  files.forEach((f) => formData.append('files', f));
  formData.append(
    'options',
    JSON.stringify({
      reverseSecondDocument: options.reverseSecondDocument ?? false,
      step: options.step || 1,
    })
  );

  try {
    const json = await postFormDataWithProgress<any>('/api/v1/cf/process', formData, {
      onProgress: options.onProgress,
      serviceName: 'alternate-mix-pdf',
    });

    if (json.success && json.outputBase64) {
      options.onProgress?.(95, 'Preparing download…');
      const binaryString = atob(json.outputBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      options.onProgress?.(100, 'Completed successfully!');
      return bytes;
    }
    throw new Error(json.message || 'Worker processing failed.');
  } catch (workerErr: any) {
    console.warn('[alternate-mix-pdf] Worker error, executing client fallback:', workerErr);
    options.onProgress?.(25, 'Preparing files…', 'Processing in browser…');
    const buffers: Uint8Array[] = [];
    for (const f of files) {
      buffers.push(new Uint8Array(await f.arrayBuffer()));
    }
    const res = await processAlternateMixPdfWorker(buffers, {
      reverseSecondDocument: options.reverseSecondDocument,
      step: options.step,
    });
    options.onProgress?.(100, 'Completed successfully!');
    return res.outputBuffer;
  }
}

/**
 * Service #30: N-up PDF
 */
export async function nUpPdf(
  file: File,
  pagesPerSheet: 2 | 4 | 8 = 2,
  options: {
    sheetSize?: 'A4' | 'LETTER';
    orientation?: 'portrait' | 'landscape';
    onProgress?: NetworkProgressCallback;
  } = {}
): Promise<Uint8Array> {
  const check = validateFileSize(file);
  if (!check.valid) throw new Error(check.error);

  return await callWorkerProcess(
    'n-up-pdf',
    file,
    {
      pagesPerSheet,
      sheetSize: options.sheetSize,
      orientation: options.orientation,
    },
    options.onProgress
  );
}
