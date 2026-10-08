/**
 * PRA PDF — Processing Server Input & Output Validator
 * A PRAVERSE Company
 * Validates magic bytes, file sizes (<= 50 MB), and structural validity across all 30 services.
 */

import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { PROCESSOR_CONFIG } from './config';

export class PdfValidator {
  /**
   * Validates input buffer before processing based on service requirements
   */
  public static validateInput(
    buffer: Buffer,
    serviceId: string = 'compress-pdf'
  ): {
    valid: boolean;
    errorCode?: string;
    errorMessage?: string;
  } {
    if (!buffer || buffer.length === 0) {
      return {
        valid: false,
        errorCode: 'EMPTY_FILE',
        errorMessage: 'The provided input file is empty (0 bytes).',
      };
    }

    if (buffer.length > PROCESSOR_CONFIG.maxFileSizeBytes) {
      return {
        valid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessage: `Input file size (${(buffer.length / (1024 * 1024)).toFixed(
          2
        )} MB) exceeds server limit of ${PROCESSOR_CONFIG.maxFileSizeMb} MB.`,
      };
    }

    const isPdf = buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-';
    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;
    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    const isRtf = buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '{\\rtf';

    // 1. PDF input verification
    const pdfServices = [
      'compress-pdf',
      'pdf-to-jpg',
      'pdf-to-png',
      'pdf-to-markdown',
      'pdf-to-word',
      'split-pdf',
      'organize-pdf',
      'organize-pdf-pages',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'rotate-pdf',
      'crop-pdf',
      'ocr-pdf',
      'add-page-numbers',
      'watermark-pdf',
      'password-protect-pdf',
      'protect-pdf',
      'unlock-pdf',
      'edit-pdf-metadata',
      'extract-pdf-text',
      'full-pdf-editing',
      'editor',
    ];

    if (pdfServices.includes(serviceId)) {
      if (!isPdf) {
        return {
          valid: false,
          errorCode: 'INVALID_PDF',
          errorMessage: 'Input file does not contain a valid PDF signature (%PDF-).',
        };
      }
    }

    // 2. Merge PDF verification (accepts PDF or ZIP bundle)
    if (serviceId === 'merge-pdf') {
      if (!isPdf && !isZip) {
        return {
          valid: false,
          errorCode: 'INVALID_FILE_FORMAT',
          errorMessage: 'Merge PDF accepts either a valid PDF file or a ZIP bundle of PDF documents.',
        };
      }
    }

    // 3. JPG to PDF verification
    if (serviceId === 'jpg-to-pdf') {
      if (!isJpeg) {
        return {
          valid: false,
          errorCode: 'INVALID_IMAGE',
          errorMessage: 'Input file does not contain a valid JPEG signature.',
        };
      }
    }

    // 4. PNG to PDF verification
    if (serviceId === 'png-to-pdf') {
      if (!isPng) {
        return {
          valid: false,
          errorCode: 'INVALID_IMAGE',
          errorMessage: 'Input file does not contain a valid PNG signature.',
        };
      }
    }

    // 5. Images to PDF verification (JPEG, PNG, WebP, BMP, or ZIP)
    if (serviceId === 'images-to-pdf') {
      const isWebp =
        buffer.length >= 12 &&
        buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP';
      const isBmp = buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d;

      if (!isJpeg && !isPng && !isZip && !isWebp && !isBmp) {
        return {
          valid: false,
          errorCode: 'INVALID_IMAGE',
          errorMessage: 'Input file is not a supported image format (JPG, PNG, WebP, BMP) or ZIP archive.',
        };
      }
    }

    // 6. Word to PDF verification
    if (serviceId === 'word-to-pdf') {
      const isDocOle = buffer.length >= 2 && buffer[0] === 0xd0 && buffer[1] === 0xcf;
      if (!isZip && !isDocOle && buffer.length < 10) {
        return {
          valid: false,
          errorCode: 'INVALID_DOCUMENT',
          errorMessage: 'Input file is not a valid Microsoft Word (.docx or .doc) document.',
        };
      }
    }

    // 7. RTF conversion verification
    if (serviceId === 'rtf-conversion') {
      if (!isRtf && !isPdf) {
        // Allow text containing RTF header
        const textStart = buffer.slice(0, 50).toString('utf-8');
        if (!textStart.includes('{\\rtf')) {
          return {
            valid: false,
            errorCode: 'INVALID_DOCUMENT',
            errorMessage: 'Input file must be a valid RTF document or PDF file.',
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validates output file on disk after processing based on expected format
   */
  public static async validateOutputFile(
    filePath: string,
    serviceId: string = 'compress-pdf'
  ): Promise<{
    valid: boolean;
    errorCode?: string;
    errorMessage?: string;
    sizeBytes?: number;
  }> {
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        errorCode: 'PROCESSING_OUTPUT_INVALID',
        errorMessage: 'Output file was not generated by the processing engine.',
      };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return {
        valid: false,
        errorCode: 'PROCESSING_OUTPUT_INVALID',
        errorMessage: 'Output file is 0 bytes.',
      };
    }

    if (stat.size > PROCESSOR_CONFIG.maxFileSizeBytes) {
      return {
        valid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessage: `Output file exceeds maximum limit of ${PROCESSOR_CONFIG.maxFileSizeMb} MB.`,
      };
    }

    const ext = path.extname(filePath).toLowerCase();

    // 1. PDF Output Validation
    if (ext === '.pdf') {
      const fd = fs.openSync(filePath, 'r');
      const headerBuf = Buffer.alloc(5);
      fs.readSync(fd, headerBuf, 0, 5, 0);
      fs.closeSync(fd);

      if (headerBuf.toString('ascii') !== '%PDF-') {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: 'Output file is missing valid PDF header (%PDF-).',
        };
      }

      // Structural integrity test: attempt PDF parsing
      try {
        const fullBuffer = fs.readFileSync(filePath);
        await PDFDocument.load(fullBuffer, { ignoreEncryption: true });
      } catch (err: any) {
        // If password-protected, cantoo pdf-lib might be needed or encrypted flag is set
        if (serviceId === 'password-protect-pdf' || serviceId === 'protect-pdf') {
          // Protected PDFs are valid
          return { valid: true, sizeBytes: stat.size };
        }
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: `Output PDF structure is corrupt or unreadable: ${err?.message}`,
        };
      }
    }

    // 2. ZIP Output Validation (e.g. pdf-to-jpg, pdf-to-png, split-pdf)
    if (ext === '.zip') {
      const fullBuffer = fs.readFileSync(filePath);
      if (
        fullBuffer.length < 4 ||
        fullBuffer[0] !== 0x50 ||
        fullBuffer[1] !== 0x4b ||
        fullBuffer[2] !== 0x03 ||
        fullBuffer[3] !== 0x04
      ) {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: 'Output file is missing valid ZIP archive header.',
        };
      }

      try {
        const zip = await JSZip.loadAsync(fullBuffer);
        const entries = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
        if (entries.length === 0) {
          return {
            valid: false,
            errorCode: 'PROCESSING_OUTPUT_INVALID',
            errorMessage: 'Generated ZIP archive contains zero files.',
          };
        }
      } catch (err: any) {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: `Output ZIP archive is corrupt: ${err?.message}`,
        };
      }
    }

    // 3. DOCX Output Validation (pdf-to-word)
    if (ext === '.docx') {
      const fullBuffer = fs.readFileSync(filePath);
      if (
        fullBuffer.length < 4 ||
        fullBuffer[0] !== 0x50 ||
        fullBuffer[1] !== 0x4b ||
        fullBuffer[2] !== 0x03 ||
        fullBuffer[3] !== 0x04
      ) {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: 'Output DOCX file is missing valid OpenXML ZIP header.',
        };
      }

      try {
        const zip = await JSZip.loadAsync(fullBuffer);
        if (!zip.file('word/document.xml')) {
          return {
            valid: false,
            errorCode: 'PROCESSING_OUTPUT_INVALID',
            errorMessage: 'Output DOCX archive is missing word/document.xml.',
          };
        }
      } catch (err: any) {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: `Output DOCX archive is corrupt: ${err?.message}`,
        };
      }
    }

    // 4. Plain Text / Markdown / RTF Validation
    if (ext === '.txt' || ext === '.md' || ext === '.rtf') {
      if (stat.size === 0) {
        return {
          valid: false,
          errorCode: 'PROCESSING_OUTPUT_INVALID',
          errorMessage: 'Output text document is empty.',
        };
      }
    }

    return { valid: true, sizeBytes: stat.size };
  }
}
