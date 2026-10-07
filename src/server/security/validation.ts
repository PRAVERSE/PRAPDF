/**
 * PRA PDF — Security Validation Module
 * A PRAVERSE Company
 * Enforces strict 50 MB limit, safe filename sanitization,
 * path traversal guards, and canonical service verification.
 */

import path from 'path';
import crypto from 'crypto';
import { CONFIG } from '../config';
import { getServiceById } from '../servicesRegistry';

export interface ValidationResult<T = void> {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  data?: T;
}

export class SecurityValidator {
  /**
   * Validates file size against hard server-side limit
   */
  public static validateFileSize(sizeBytes: number): ValidationResult {
    if (sizeBytes <= 0) {
      return {
        valid: false,
        errorCode: 'EMPTY_FILE',
        errorMessage: 'The uploaded file is empty (0 bytes).',
      };
    }

    if (sizeBytes > CONFIG.maxFileSizeBytes) {
      const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        errorCode: 'FILE_TOO_LARGE',
        errorMessage: `Maximum file size is ${CONFIG.maxFileSizeMb} MB. Received file was ${sizeMb} MB.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates service ID against canonical 30 locked services
   */
  public static validateServiceId(serviceId: string): ValidationResult {
    if (!serviceId || typeof serviceId !== 'string') {
      return {
        valid: false,
        errorCode: 'INVALID_SERVICE',
        errorMessage: 'Service ID is required.',
      };
    }

    const service = getServiceById(serviceId);
    if (!service) {
      return {
        valid: false,
        errorCode: 'INVALID_SERVICE',
        errorMessage: `Service '${serviceId}' is not one of the 30 recognized PRA PDF services.`,
      };
    }

    return { valid: true };
  }

  /**
   * Validates file extension against accepted extensions of the chosen service
   */
  public static validateFileType(serviceId: string, filename: string): ValidationResult {
    const service = getServiceById(serviceId);
    if (!service) {
      return {
        valid: false,
        errorCode: 'INVALID_SERVICE',
        errorMessage: `Unknown service: ${serviceId}`,
      };
    }

    const ext = path.extname(filename).toLowerCase();
    const isAccepted = service.acceptedExtensions.some((e) => e.toLowerCase() === ext);

    if (!isAccepted) {
      return {
        valid: false,
        errorCode: 'INVALID_FILE_TYPE',
        errorMessage: `Service '${service.displayName}' expects file types [${service.acceptedExtensions.join(
          ', '
        )}], but received '${ext || 'unknown'}'.`,
      };
    }

    return { valid: true };
  }

  /**
   * Sanitizes original filename: strips directory traversal, control chars, null bytes
   */
  public static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'document.pdf';
    }

    // Strip path elements
    let base = path.basename(filename);

    // Remove null bytes and control chars
    base = base.replace(/[\0\x00-\x1F\x7F]/g, '');

    // Strip unsafe characters while allowing unicode letters/numbers, dots, dashes, underscores
    base = base.replace(/[<>:"/\\|?*]/g, '_');

    // Prevent hidden files or leading dots
    base = base.replace(/^\.+/, '');

    // Truncate to reasonable length (max 100 chars plus extension)
    if (base.length > 120) {
      const ext = path.extname(base);
      const name = path.basename(base, ext).substring(0, 100);
      base = `${name}${ext}`;
    }

    return base || 'document.pdf';
  }

  /**
   * Validates UUID / Job ID format (alphanumeric and dashes, 16-64 chars)
   */
  public static validateJobId(jobId: string): boolean {
    if (!jobId || typeof jobId !== 'string') return false;
    const safeRegex = /^[a-zA-Z0-9_-]{16,64}$/;
    return safeRegex.test(jobId);
  }

  /**
   * Generates secure unique job ID
   */
  public static generateJobId(): string {
    return crypto.randomUUID();
  }

  /**
   * Generates safe file ID for internal storage
   */
  public static generateFileId(extension: string = ''): string {
    const ext = extension.startsWith('.') ? extension : extension ? `.${extension}` : '';
    return `${crypto.randomBytes(16).toString('hex')}${ext.toLowerCase()}`;
  }

  /**
   * Checks for directory/path traversal attempt in any string
   */
  public static hasPathTraversal(input: string): boolean {
    if (!input || typeof input !== 'string') return false;
    return (
      input.includes('..') ||
      input.includes('/') ||
      input.includes('\\') ||
      input.includes('\0') ||
      input.includes('%2e%2e')
    );
  }
}
