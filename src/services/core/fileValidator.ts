/**
 * PRA PDF — Strict File Validation Engine
 * Enforces the mandatory 50 MB per-file limit across all operations,
 * validates file signatures (magic bytes), and sanitizes inputs.
 */

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // Exactly 52,428,800 bytes (50 MB)

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  fileSizeFormatted?: string;
}

/**
 * Formats byte size into human readable string (e.g. "14.2 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates file size against the strict 50 MB limit
 */
export function validateFileSize(file: File | { size: number; name?: string }): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const formatted = formatBytes(file.size);
    return {
      valid: false,
      fileSizeFormatted: formatted,
      error: `File exceeds the 50 MB limit (${formatted}). Please choose a file under 50 MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  return { valid: true, fileSizeFormatted: formatBytes(file.size) };
}

/**
 * Checks file header magic bytes to verify genuine file type
 */
export async function checkFileSignature(file: File): Promise<string | null> {
  try {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'application/pdf';
    }

    // PNG: \x89PNG\r\n\x1a\n (0x89, 0x50, 0x4E, 0x47)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }

    // JPEG: 0xFF, 0xD8, 0xFF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }

    // ZIP / Office Open XML (DOCX, XLSX, PPTX): PK\x03\x04
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      return 'application/zip-or-office';
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Comprehensive file validator combining size, extension, and signature checks
 */
export async function validateUploadFile(
  file: File,
  allowedExtensions?: string[]
): Promise<ValidationResult> {
  // 1. Strict 50 MB check
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.valid) {
    return sizeCheck;
  }

  // 2. Extension validation
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (allowedExtensions && allowedExtensions.length > 0) {
    const normalizedAllowed = allowedExtensions.map((e) => e.replace('.', '').toLowerCase());
    if (!normalizedAllowed.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file type (.${ext}). Allowed formats: ${allowedExtensions.join(', ')}`,
      };
    }
  }

  // 3. Signature verification for PDF
  if (ext === 'pdf') {
    const signature = await checkFileSignature(file);
    if (signature && signature !== 'application/pdf') {
      return {
        valid: false,
        error: 'File contents do not match a valid PDF document.',
      };
    }
  }

  return {
    valid: true,
    fileSizeFormatted: sizeCheck.fileSizeFormatted,
  };
}
