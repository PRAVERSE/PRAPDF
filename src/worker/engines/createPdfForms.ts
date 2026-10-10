/**
 * PRA PDF — Cloudflare Worker: Create PDF Forms Engine
 * Pure in-memory execution using pdf-lib. Zero filesystem or native dependencies.
 *
 * Adds interactive AcroForm fields (text fields, checkboxes, dropdowns, radio groups)
 * to PDF documents for standardized document data entry.
 */

import { PDFDocument } from 'pdf-lib';
import { WorkerEngineResult } from './types';

export interface FormFieldDefinition {
  type: 'text' | 'checkbox' | 'dropdown';
  name: string;
  pageIndex?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  defaultValue?: string;
  options?: string[];
}

export async function processCreatePdfFormsWorker(
  inputBuffer: Uint8Array,
  options?: {
    fields?: FormFieldDefinition[];
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

  const form = doc.getForm();
  const fields = options?.fields || [
    { type: 'text', name: 'FullName', x: 50, y: 300, width: 220, height: 24, defaultValue: '' },
    { type: 'checkbox', name: 'AgreementCheck', x: 50, y: 250, width: 20, height: 20 },
    { type: 'dropdown', name: 'CountrySelect', x: 50, y: 200, width: 180, height: 24, options: ['United States', 'Canada', 'United Kingdom', 'Germany'] },
  ];

  const createdFieldNames: string[] = [];

  for (const def of fields) {
    const pageIdx = Math.min(Math.max(def.pageIndex ?? 0, 0), totalPages - 1);
    const page = doc.getPage(pageIdx);
    const name = def.name;

    try {
      if (def.type === 'text') {
        const tf = form.createTextField(name);
        if (def.defaultValue) tf.setText(def.defaultValue);
        tf.addToPage(page, {
          x: def.x,
          y: def.y,
          width: def.width || 200,
          height: def.height || 24,
        });
        createdFieldNames.push(name);
      } else if (def.type === 'checkbox') {
        const cb = form.createCheckBox(name);
        cb.addToPage(page, {
          x: def.x,
          y: def.y,
          width: def.width || 20,
          height: def.height || 20,
        });
        createdFieldNames.push(name);
      } else if (def.type === 'dropdown') {
        const dd = form.createDropdown(name);
        const ddOpts = def.options && def.options.length > 0 ? def.options : ['Option 1', 'Option 2', 'Option 3'];
        dd.addOptions(ddOpts);
        if (def.defaultValue && ddOpts.includes(def.defaultValue)) {
          dd.select(def.defaultValue);
        } else if (ddOpts.length > 0) {
          dd.select(ddOpts[0]);
        }
        dd.addToPage(page, {
          x: def.x,
          y: def.y,
          width: def.width || 180,
          height: def.height || 24,
        });
        createdFieldNames.push(name);
      }
    } catch {
      // Continue creating remaining fields
    }
  }

  try {
    form.updateFieldAppearances();
  } catch {
    // Non-fatal font appearance warning
  }

  const outBytes = await doc.save({ useObjectStreams: true });

  return {
    service: 'create-pdf-forms',
    outputBuffer: outBytes,
    mimeType: 'application/pdf',
    outputFileName: 'form_created.pdf',
    metadata: {
      pageCount: totalPages,
      createdFieldsCount: createdFieldNames.length,
      fieldNames: createdFieldNames,
      inputSizeBytes: inputBuffer.length,
      outputSizeBytes: outBytes.length,
    },
  };
}
