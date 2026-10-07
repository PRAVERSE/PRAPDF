/**
 * PRA PDF — Streaming Multipart & Binary Upload Parser
 * A PRAVERSE Company
 * Enforces hard 50 MB limit during streaming. Rejects oversized payloads immediately.
 */

import { IncomingMessage } from 'http';
import { CONFIG } from '../config';

export interface ParsedUpload {
  serviceId: string;
  originalFilename: string;
  mimeType: string;
  fileBuffer: Buffer;
  options: Record<string, any>;
}

export class UploadParser {
  /**
   * Parses incoming upload request while enforcing hard 50 MB byte limit during streaming
   */
  public static async parse(req: IncomingMessage): Promise<ParsedUpload> {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > CONFIG.maxFileSizeBytes) {
      const err = new Error(`File exceeds maximum size of ${CONFIG.maxFileSizeMb} MB.`);
      (err as any).code = 'FILE_TOO_LARGE';
      throw err;
    }

    const contentType = req.headers['content-type'] || '';

    // Case 1: Binary direct upload with headers
    if (!contentType.includes('multipart/form-data')) {
      const serviceId = (req.headers['x-service-id'] as string) || '';
      const originalFilename =
        (req.headers['x-filename'] as string) ||
        (req.headers['x-original-filename'] as string) ||
        'document.pdf';

      const fileBuffer = await this.readStreamWithLimit(req, CONFIG.maxFileSizeBytes);

      return {
        serviceId,
        originalFilename,
        mimeType: contentType || 'application/octet-stream',
        fileBuffer,
        options: {},
      };
    }

    // Case 2: Multipart form-data
    return this.parseMultipart(req, contentType);
  }

  /**
   * Reads stream into buffer with strict streaming byte counter
   */
  private static async readStreamWithLimit(
    req: IncomingMessage,
    maxBytes: number
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      req.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > maxBytes) {
          req.destroy();
          const err = new Error(`File exceeds maximum size of ${CONFIG.maxFileSizeMb} MB.`);
          (err as any).code = 'FILE_TOO_LARGE';
          reject(err);
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Parses multipart/form-data safely
   */
  private static async parseMultipart(
    req: IncomingMessage,
    contentType: string
  ): Promise<ParsedUpload> {
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) {
      const err = new Error('Invalid multipart request: missing boundary.');
      (err as any).code = 'INVALID_MULTIPART';
      throw err;
    }

    const boundary = match[1] || match[2];
    const fullBuffer = await this.readStreamWithLimit(req, CONFIG.maxFileSizeBytes);

    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

    let serviceId = '';
    let originalFilename = '';
    let mimeType = 'application/octet-stream';
    let fileBuffer: Buffer | null = null;
    const options: Record<string, any> = {};

    let startIndex = fullBuffer.indexOf(boundaryBuffer);
    while (startIndex !== -1) {
      startIndex += boundaryBuffer.length;
      if (fullBuffer.slice(startIndex, startIndex + 2).toString() === '--') {
        break; // End boundary
      }

      // Skip CRLF
      if (fullBuffer.slice(startIndex, startIndex + 2).toString() === '\r\n') {
        startIndex += 2;
      }

      const nextBoundary = fullBuffer.indexOf(boundaryBuffer, startIndex);
      if (nextBoundary === -1) break;

      const partBuffer = fullBuffer.slice(startIndex, nextBoundary - 2); // Exclude \r\n before next boundary
      const headerEndIndex = partBuffer.indexOf(Buffer.from('\r\n\r\n'));

      if (headerEndIndex !== -1) {
        const headerString = partBuffer.slice(0, headerEndIndex).toString('utf-8');
        const bodyBuffer = partBuffer.slice(headerEndIndex + 4);

        // Parse Content-Disposition
        const nameMatch = headerString.match(/name="([^"]+)"/i);
        const filenameMatch = headerString.match(/filename="([^"]+)"/i);
        const typeMatch = headerString.match(/Content-Type:\s*([^\r\n]+)/i);

        const fieldName = nameMatch ? nameMatch[1] : '';

        if (filenameMatch) {
          originalFilename = filenameMatch[1];
          mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
          fileBuffer = bodyBuffer;
        } else if (fieldName === 'serviceId') {
          serviceId = bodyBuffer.toString('utf-8').trim();
        } else if (fieldName === 'options') {
          try {
            Object.assign(options, JSON.parse(bodyBuffer.toString('utf-8')));
          } catch {
            // Ignore malformed optional options
          }
        }
      }

      startIndex = nextBoundary;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      const err = new Error('No file was found in upload request.');
      (err as any).code = 'EMPTY_FILE';
      throw err;
    }

    return {
      serviceId,
      originalFilename: originalFilename || 'uploaded_document.pdf',
      mimeType,
      fileBuffer,
      options,
    };
  }
}
