/**
 * PRA PDF — Cloudflare Worker: Split PDF Engine
 * Pure in-memory execution using pdf-lib and JSZip. Zero filesystem or native dependencies.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { WorkerEngineResult } from './types';

export interface SplitRangeGroup {
  label: string;
  indices: number[]; // 0-based page indices
}

export function parseRangeGroups(spec: string, totalPages: number): SplitRangeGroup[] {
  const groups: SplitRangeGroup[] = [];
  const chunks = spec.split(',').map((c) => c.trim()).filter(Boolean);

  if (chunks.length === 0) {
    throw new Error('Please enter at least one page number or range to split.');
  }

  chunks.forEach((chunk, idx) => {
    const indices: number[] = [];
    if (chunk.includes('-')) {
      const parts = chunk.split('-');
      if (parts.length !== 2) {
        throw new Error(`Invalid range format: "${chunk}". Use format like 1-3.`);
      }
      const start = parseInt(parts[0].trim(), 10);
      const end = parseInt(parts[1].trim(), 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid page range: "${chunk}". Numbers are required.`);
      }
      if (start < 1) {
        throw new Error(`Page numbers must be 1 or greater. Received: ${start}.`);
      }
      if (end > totalPages) {
        throw new Error(
          `Page ${end} in range "${chunk}" is out of range. Document only has ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }
      if (start > end) {
        throw new Error(`Start page cannot be greater than end page in range: "${chunk}".`);
      }

      for (let i = start; i <= end; i++) {
        indices.push(i - 1);
      }
      groups.push({ label: `pages_${start}-${end}`, indices });
    } else {
      const page = parseInt(chunk, 10);
      if (isNaN(page)) {
        throw new Error(`Invalid page number: "${chunk}".`);
      }
      if (page < 1) {
        throw new Error(`Page numbers must be 1 or greater. Received: ${page}.`);
      }
      if (page > totalPages) {
        throw new Error(
          `Page ${page} is out of range. Document only has ${totalPages} page${totalPages > 1 ? 's' : ''}.`
        );
      }
      groups.push({ label: `page_${page}`, indices: [page - 1] });
    }
  });

  return groups;
}

export async function processSplitPdfWorker(
  inputBuffer: Uint8Array,
  options?: {
    mode?: 'ranges' | 'every_n' | 'all';
    rangeString?: string;
    everyN?: number;
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document contains zero pages.');
  }

  const mode = options?.mode || (options?.rangeString ? 'ranges' : 'all');

  // Mode 1: Split every N pages
  if (mode === 'every_n') {
    const everyN = Math.max(1, options?.everyN || 1);
    if (everyN === 1) {
      // Split every page into separate file
      return await splitAllPagesToZip(srcDoc, totalPages, inputBuffer.length, options?.outputFileName);
    }

    const zip = new JSZip();
    let partNum = 1;
    for (let i = 0; i < totalPages; i += everyN) {
      const chunkEnd = Math.min(i + everyN, totalPages);
      const indices: number[] = [];
      for (let j = i; j < chunkEnd; j++) indices.push(j);

      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, indices);
      copied.forEach((p) => partDoc.addPage(p));
      const partBytes = await partDoc.save({ useObjectStreams: true });

      const startPage = i + 1;
      const endPage = chunkEnd;
      zip.file(`part_${partNum}_pages_${startPage}-${endPage}.pdf`, partBytes);
      partNum++;
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

    return {
      service: 'split-pdf',
      outputBuffer: zipBytes,
      mimeType: 'application/zip',
      outputFileName: options?.outputFileName || 'split_parts.zip',
      metadata: {
        sourcePageCount: totalPages,
        mode: 'every_n',
        everyN,
        outputPartsCount: partNum - 1,
        isZip: true,
        inputSizeBytes: inputBuffer.length,
        outputSizeBytes: zipBytes.length,
      },
    };
  }

  // Mode 2: Split by custom ranges
  if (mode === 'ranges' && options?.rangeString) {
    const groups = parseRangeGroups(options.rangeString, totalPages);

    if (groups.length === 0) {
      throw new Error(`No valid pages matched the specified range: ${options.rangeString}`);
    }

    // If only one range was specified: output as a single PDF
    if (groups.length === 1) {
      const group = groups[0];
      const splitDoc = await PDFDocument.create();
      const copiedPages = await splitDoc.copyPages(srcDoc, group.indices);
      copiedPages.forEach((p) => splitDoc.addPage(p));
      const outBytes = await splitDoc.save({ useObjectStreams: true });

      return {
        service: 'split-pdf',
        outputBuffer: outBytes,
        mimeType: 'application/pdf',
        outputFileName: options?.outputFileName || `split_${group.label}.pdf`,
        metadata: {
          sourcePageCount: totalPages,
          outputPageCount: group.indices.length,
          mode: 'ranges',
          isZip: false,
          inputSizeBytes: inputBuffer.length,
          outputSizeBytes: outBytes.length,
        },
      };
    }

    // Multiple ranges specified: output as a ZIP archive containing all parts
    const zip = new JSZip();
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const partDoc = await PDFDocument.create();
      const copied = await partDoc.copyPages(srcDoc, group.indices);
      copied.forEach((p) => partDoc.addPage(p));
      const partBytes = await partDoc.save({ useObjectStreams: true });
      zip.file(`part_${i + 1}_${group.label}.pdf`, partBytes);
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

    return {
      service: 'split-pdf',
      outputBuffer: zipBytes,
      mimeType: 'application/zip',
      outputFileName: options?.outputFileName || 'split_ranges.zip',
      metadata: {
        sourcePageCount: totalPages,
        outputPartsCount: groups.length,
        mode: 'ranges',
        isZip: true,
        inputSizeBytes: inputBuffer.length,
        outputSizeBytes: zipBytes.length,
      },
    };
  }

  // Mode 3: Split all pages into individual single-page PDFs in a ZIP archive
  return await splitAllPagesToZip(srcDoc, totalPages, inputBuffer.length, options?.outputFileName);
}

async function splitAllPagesToZip(
  srcDoc: PDFDocument,
  totalPages: number,
  inputSizeBytes: number,
  outputFileName?: string
): Promise<WorkerEngineResult> {
  const zip = new JSZip();
  for (let i = 0; i < totalPages; i++) {
    const singleDoc = await PDFDocument.create();
    const [page] = await singleDoc.copyPages(srcDoc, [i]);
    singleDoc.addPage(page);
    const singleBytes = await singleDoc.save({ useObjectStreams: true });
    const pad = String(i + 1).padStart(3, '0');
    zip.file(`page_${pad}.pdf`, singleBytes);
  }

  const zipBytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });

  return {
    service: 'split-pdf',
    outputBuffer: zipBytes,
    mimeType: 'application/zip',
    outputFileName: outputFileName || 'split_pages.zip',
    metadata: {
      sourcePageCount: totalPages,
      outputPageCount: totalPages,
      mode: 'all',
      isZip: true,
      inputSizeBytes,
      outputSizeBytes: zipBytes.length,
    },
  };
}
