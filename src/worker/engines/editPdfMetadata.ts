/**
 * PRA PDF — Cloudflare Worker: Edit PDF Metadata Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * CRITICAL POLICY ENFORCEMENT:
 * Zero unsolicited branding or promotional stamps added.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export async function processEditPdfMetadataWorker(
  inputBuffer: Uint8Array,
  options?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[] | string;
    creator?: string;
    producer?: string;
    outputFileName?: string;
  }
): Promise<WorkerEngineResult> {
  const doc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const updated: Record<string, any> = {};

  if (options?.title !== undefined) {
    doc.setTitle(options.title);
    updated.title = options.title;
  }

  if (options?.author !== undefined) {
    doc.setAuthor(options.author);
    updated.author = options.author;
  }

  if (options?.subject !== undefined) {
    doc.setSubject(options.subject);
    updated.subject = options.subject;
  }

  if (options?.keywords !== undefined) {
    const kwList = Array.isArray(options.keywords)
      ? options.keywords
      : options.keywords.split(',').map((k) => k.trim()).filter(Boolean);
    doc.setKeywords(kwList);
    updated.keywords = kwList;
  }

  if (options?.creator !== undefined) {
    doc.setCreator(options.creator);
    updated.creator = options.creator;
  }

  if (options?.producer !== undefined) {
    doc.setProducer(options.producer);
    updated.producer = options.producer;
  }

  doc.setModificationDate(new Date());

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'edit-pdf-metadata',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: options?.outputFileName || 'metadata_updated.pdf',
    metadata: {
      pageCount: totalPages,
      metadataUpdated: updated,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
