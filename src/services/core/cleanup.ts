/**
 * PRA PDF — Memory & Storage Cleanup Manager
 * Safely tracks and revokes ephemeral blob URLs, garbage collects buffers,
 * and enforces the 10-minute maximum client retention policy.
 */

const activeBlobUrls: Set<string> = new Set();
const cleanupTimers: Map<string, number> = new Map();

/**
 * Default cleanup timeout: 10 minutes (600,000 ms)
 */
export const DEFAULT_CLEANUP_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Registers an ephemeral blob URL for tracking and automatic revocation
 */
export function registerBlobUrl(url: string, timeoutMs: number = DEFAULT_CLEANUP_TIMEOUT_MS): string {
  activeBlobUrls.add(url);

  // Set automatic revocation timer
  const timerId = window.setTimeout(() => {
    revokeBlobUrl(url);
  }, timeoutMs);

  cleanupTimers.set(url, timerId);
  return url;
}

/**
 * Immediately revokes an object URL and frees associated memory
 */
export function revokeBlobUrl(url: string): void {
  if (activeBlobUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[Cleanup] Error revoking blob URL:', e);
    }
    activeBlobUrls.delete(url);
  }

  const timerId = cleanupTimers.get(url);
  if (timerId !== undefined) {
    clearTimeout(timerId);
    cleanupTimers.delete(url);
  }
}

let stagedFileForNextTool: File | null = null;

/**
 * Stages an output document in memory so the next navigated tool can immediately preload it.
 */
export function stageFileForTool(file: File): void {
  stagedFileForNextTool = file;
}

/**
 * Consumes the staged document and clears the ephemeral staging reference.
 */
export function consumeStagedFile(): File | null {
  const f = stagedFileForNextTool;
  stagedFileForNextTool = null;
  return f;
}

/**
 * Triggers an immediate download of an ArrayBuffer, Uint8Array, or Blob as a file,
 * enforces correct MIME types and filename extensions, then schedules automatic memory cleanup.
 */
export function triggerFileDownload(
  data: Uint8Array | ArrayBuffer | Blob,
  filename: string,
  mimeType?: string
): void {
  let blob: Blob;
  let finalFilename = filename || 'document';

  // Detect signature from Uint8Array if available
  let isPdfBytes = false;
  let isZipBytes = false;

  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      isPdfBytes = true;
    } else if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
      isZipBytes = true;
    }
  }

  if (data instanceof Blob) {
    let effectiveType = data.type;
    if (!effectiveType || effectiveType === 'application/octet-stream') {
      if (finalFilename.toLowerCase().endsWith('.pdf') || isPdfBytes) effectiveType = 'application/pdf';
      else if (finalFilename.toLowerCase().endsWith('.zip') || isZipBytes) effectiveType = 'application/zip';
      else if (finalFilename.toLowerCase().endsWith('.txt')) effectiveType = 'text/plain;charset=utf-8';
    }
    blob = effectiveType && effectiveType !== data.type ? new Blob([data], { type: effectiveType }) : data;
  } else {
    let type = mimeType;
    if (!type) {
      if (isPdfBytes || finalFilename.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
      else if (isZipBytes || finalFilename.toLowerCase().endsWith('.zip')) type = 'application/zip';
      else if (finalFilename.toLowerCase().endsWith('.txt')) type = 'text/plain;charset=utf-8';
      else type = 'application/octet-stream';
    }
    blob = new Blob([data as any], { type });
  }

  // Ensure filename has proper extension matching the actual file content
  if (blob.type === 'application/pdf' || isPdfBytes) {
    if (!finalFilename.toLowerCase().endsWith('.pdf')) {
      finalFilename = `${finalFilename.replace(/\.zip$/i, '')}.pdf`;
    }
  } else if (blob.type === 'application/zip' || isZipBytes) {
    if (!finalFilename.toLowerCase().endsWith('.zip')) {
      finalFilename = `${finalFilename.replace(/\.pdf$/i, '')}.zip`;
    }
  } else if (blob.type.startsWith('text/plain')) {
    if (!finalFilename.toLowerCase().endsWith('.txt')) {
      finalFilename = `${finalFilename}.txt`;
    }
  }

  const url = URL.createObjectURL(blob);
  registerBlobUrl(url);

  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up after 60 seconds of trigger
  setTimeout(() => {
    revokeBlobUrl(url);
  }, 60000);
}

/**
 * Clears all active blob URLs (e.g. upon application unmount or page navigation)
 */
export function cleanupAllBlobs(): void {
  for (const url of Array.from(activeBlobUrls)) {
    revokeBlobUrl(url);
  }
  activeBlobUrls.clear();
  cleanupTimers.clear();
}

