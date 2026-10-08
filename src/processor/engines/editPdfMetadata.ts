/**
 * PRA PDF — Real Edit PDF Metadata Engine
 * A PRAVERSE Company
 * Updates document properties (Title, Author, Subject, Keywords, Creator) cleanly.
 *
 * CRITICAL POLICY ENFORCEMENT:
 * Zero unsolicited branding or promotional stamps added.
 */

import fs from 'fs';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { procLogger } from '../logger';

export interface EditPdfMetadataResult {
  service: 'edit-pdf-metadata';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  metadataUpdated: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[];
    creator?: string;
    producer?: string;
  };
}

export async function processEditPdfMetadata(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string[] | string;
    creator?: string;
    producer?: string;
  }
): Promise<EditPdfMetadataResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_EDIT_PDF_METADATA_STARTED', {
    jobId,
    service: 'edit-pdf-metadata',
    inputSizeBytes: inputSize,
  });

  const doc = await PDFDocument.load(new Uint8Array(rawInput), { ignoreEncryption: true });
  const totalPages = doc.getPageCount();

  if (totalPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  const updated: EditPdfMetadataResult['metadataUpdated'] = {};

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

  const outBytes = await doc.save({ useObjectStreams: true });
  const outputBuffer = Buffer.from(outBytes);
  const outputSize = outputBuffer.length;
  const sha256 = crypto.createHash('sha256').update(outputBuffer).digest('hex');

  fs.writeFileSync(outputPath, outputBuffer);

  procLogger.info('ENGINE_EDIT_PDF_METADATA_COMPLETED', {
    jobId,
    service: 'edit-pdf-metadata',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: totalPages,
  });

  return {
    service: 'edit-pdf-metadata',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: totalPages,
    metadataUpdated: updated,
  };
}
