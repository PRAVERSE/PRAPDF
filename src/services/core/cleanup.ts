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

/**
 * Triggers an immediate download of an ArrayBuffer or Blob as a file,
 * then schedules automatic memory cleanup.
 */
export function triggerFileDownload(data: Uint8Array | ArrayBuffer | Blob, filename: string): void {
  let blob: Blob;
  if (data instanceof Blob) {
    blob = data;
  } else {
    blob = new Blob([data as any]);
  }

  const url = URL.createObjectURL(blob);
  registerBlobUrl(url);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
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
