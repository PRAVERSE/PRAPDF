/**
 * PRA PDF — Standardized Universal Completion Screen Component
 * Professional dark appearance consistent across all services:
 * - A. Success Header (centered green check icon, prominent heading, honest processing message)
 * - B. Output File Card (icon, verified filename & extension, real size, details, prominent green download button)
 * - C. Secondary Actions (Convert another file, All PDF tools, Copy text for extraction)
 * - D. WHAT'S NEXT Section (clean, responsive grid of relevant next tools with ephemeral document staging)
 */

import { triggerFileDownload, stageFileForTool } from '../services/core/cleanup';
import { formatBytes } from '../services/core/fileValidator';

export interface ResultCardOptions {
  filename: string;
  data: Uint8Array | Blob | string;
  originalSize?: number;
  newSize?: number;
  reductionRatio?: string;
  toolId?: string;
  toolTitle?: string;
  isBrowserOnly?: boolean;
  operationDetail?: string;
  textResult?: {
    text: string;
    wordCount?: number;
    characterCount?: number;
    pageCount?: number;
    hasText?: boolean;
  };
  onReset: () => void;
}

interface RelatedTool {
  id: string;
  title: string;
  description: string;
  icon: string;
}

function getRelatedTools(currentToolId?: string, isZip?: boolean): RelatedTool[] {
  if (isZip) {
    return [
      { id: 'merge-pdf', title: 'Merge PDF', description: 'Combine extracted PDF files into one', icon: '📑' },
      { id: 'compress-pdf', title: 'Compress PDF', description: 'Reduce document size for fast sharing', icon: '⚡' },
      { id: 'add-page-numbers', title: 'Add page numbers', description: 'Stamp clean page numbers on pages', icon: '🔢' },
      { id: 'password-protect-pdf', title: 'Protect with password', description: 'Lock files with AES-256 encryption', icon: '🔒' },
    ];
  }

  if (currentToolId === 'extract-pdf-text') {
    return [
      { id: 'ocr-pdf', title: 'OCR PDF (Searchable)', description: 'Recognize text from scanned image pages', icon: '🔍' },
      { id: 'txt-to-pdf', title: 'Text to PDF', description: 'Convert extracted text into a PDF file', icon: '📝' },
      { id: 'compress-pdf', title: 'Compress PDF', description: 'Optimize PDF document size', icon: '⚡' },
      { id: 'password-protect-pdf', title: 'Protect with password', description: 'Lock sensitive files with encryption', icon: '🔒' },
    ];
  }

  const pool: RelatedTool[] = [
    { id: 'compress-pdf', title: 'Compress this PDF', description: 'Reduce file size for fast email sharing', icon: '⚡' },
    { id: 'password-protect-pdf', title: 'Protect with password', description: 'Lock with AES-256 military-grade encryption', icon: '🔒' },
    { id: 'add-page-numbers', title: 'Add page numbers', description: 'Stamp clean page numbers on pages', icon: '🔢' },
    { id: 'editor', title: 'Open in PDF editor', description: 'Edit text, draw, sign, and annotate pages', icon: '✏️' },
    { id: 'rotate-pdf', title: 'Rotate PDF', description: 'Rotate pages to proper orientation', icon: '🔄' },
    { id: 'split-pdf', title: 'Split PDF', description: 'Separate pages or extract custom ranges', icon: '✂️' },
    { id: 'organize-pdf', title: 'Organize pages', description: 'Reorder, rotate, or delete pages easily', icon: '📑' },
  ];

  return pool.filter((t) => t.id !== currentToolId).slice(0, 4);
}

export function renderResultCardHtml(options: ResultCardOptions): string {
  let sizeDisplay = '';
  if (options.newSize !== undefined) {
    sizeDisplay = formatBytes(options.newSize);
  } else if (options.data instanceof Uint8Array) {
    sizeDisplay = formatBytes(options.data.byteLength);
  } else if (options.data instanceof Blob) {
    sizeDisplay = formatBytes(options.data.size);
  } else if (typeof options.data === 'string') {
    sizeDisplay = `${options.data.length.toLocaleString()} chars`;
  }

  const lowerName = options.filename.toLowerCase();
  const isZip = lowerName.endsWith('.zip');
  const isPdf = lowerName.endsWith('.pdf');
  const isTxt = lowerName.endsWith('.txt');

  // Header Heading
  let mainHeading = 'Your PDF is ready';
  if (isZip) {
    mainHeading = 'Your ZIP archive is ready';
  } else if (isTxt || options.toolId === 'extract-pdf-text') {
    mainHeading = 'Your text is ready';
  } else if (!isPdf) {
    mainHeading = 'Your document is ready';
  }

  // Honest Supporting Text: Accurate privacy and edge execution claims
  const supportingText = options.isBrowserOnly
    ? 'Converted privately in your browser. Nothing was uploaded.'
    : 'Processed securely via Cloudflare edge. Ready for instant high-speed download.';

  const hasCompression = !!(options.originalSize && options.newSize && options.originalSize > options.newSize);
  const origSizeStr = options.originalSize ? formatBytes(options.originalSize) : '';

  const textContent = typeof options.data === 'string' ? options.data : options.textResult?.text || '';
  const isTextExtract = options.toolId === 'extract-pdf-text' || !!options.textResult || typeof options.data === 'string';
  const hasText = options.textResult?.hasText !== undefined ? options.textResult.hasText : textContent.trim().length > 0;
  const wordCount = options.textResult?.wordCount ?? (textContent.trim() ? textContent.split(/\s+/).filter(Boolean).length : 0);
  const charCount = options.textResult?.characterCount ?? textContent.length;
  const pageCount = options.textResult?.pageCount;

  // Operation Detail Pill
  let detailPill = options.operationDetail || '';
  if (!detailPill) {
    if (isZip) detailPill = 'ZIP Archive';
    else if (isPdf) detailPill = 'PDF Document';
    else if (isTxt) detailPill = 'Plain Text (.txt)';
    else detailPill = 'Ready to save';
  }

  const relatedTools = getRelatedTools(options.toolId, isZip);

  return `
    <div class="ilove-result-view">
      <!-- A. Success Header -->
      <div class="result-celebration-badge">
        <div class="result-check-circle" aria-label="Success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      <h2 class="result-main-title">${mainHeading}</h2>
      <p class="result-main-subtitle">${supportingText}</p>

      <!-- B. Output File Card -->
      <div class="result-output-card">
        <div class="output-card-file-row">
          <div class="output-file-icon-badge ${isZip ? 'is-zip' : isTxt ? 'is-txt' : 'is-pdf'}">
            ${
              isZip
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`
                : isTxt
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`
            }
          </div>
          <div class="output-file-info-col">
            <span class="output-file-name" title="${options.filename}">${options.filename}</span>
            <div class="output-file-badges-row">
              <span class="output-file-size-tag">${sizeDisplay}</span>
              <span class="output-file-sep">•</span>
              <span class="output-file-type-tag">${detailPill}</span>
            </div>
          </div>
        </div>

        ${
          hasCompression
            ? `
          <div class="compression-savings-banner">
            <div class="savings-percent">${options.reductionRatio || 'Compression Complete'}</div>
            <div class="savings-details">
              <span>Original: <del>${origSizeStr}</del></span>
              <span class="savings-arrow">➔</span>
              <span class="savings-new">New: <strong>${sizeDisplay}</strong></span>
            </div>
          </div>
        `
            : ''
        }

        ${
          isTextExtract && !hasText
            ? `
          <div class="result-warning-banner">
            <div class="result-warning-header">
              <span>⚠️</span> No Extractable Text Found
            </div>
            <div class="result-warning-body">
              This PDF appears to contain scanned image pages or rasterized artwork without an embedded digital font/text layer.
              Standard text extraction cannot read text stored purely as pixels.
              Please use our <strong><a href="#/tools/ocr-pdf" class="warning-link">OCR PDF (Searchable)</a></strong> tool to recognize text from scanned documents via optical character recognition.
            </div>
          </div>
        `
            : ''
        }

        ${
          isTextExtract && hasText
            ? `
          <div class="result-text-stats-pill">
            <span>📊 <strong>${charCount.toLocaleString()}</strong> characters</span>
            <span style="opacity: 0.4;">•</span>
            <span>📝 <strong>${wordCount.toLocaleString()}</strong> words</span>
            ${pageCount ? `<span style="opacity: 0.4;">•</span><span>📄 <strong>${pageCount}</strong> pages</span>` : ''}
          </div>

          <div class="result-textarea-box">
            <div class="result-textarea-header">
              <span class="result-textarea-label">Extracted Text Content</span>
              <span class="result-textarea-sub">Selectable &amp; ready to copy</span>
            </div>
            <textarea id="rc-extracted-textarea" class="form-input font-mono result-textarea" readonly>${textContent}</textarea>
          </div>
        `
            : ''
        }

        <!-- Prominent Green Download Button -->
        <button type="button" class="btn-download-success" id="rc-download-btn" aria-label="Download generated file">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Download ${options.filename}</span>
        </button>
      </div>

      <!-- C. Secondary Actions -->
      <div class="result-secondary-row">
        <button type="button" class="btn btn-secondary" id="rc-reset-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          <span>Convert another file</span>
        </button>
        ${
          isTextExtract && hasText
            ? `
          <button type="button" class="btn btn-secondary" id="rc-copy-text-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="rc-copy-label">Copy Text</span>
          </button>
        `
            : ''
        }
        <a href="#/tools" class="btn btn-secondary" id="rc-all-tools-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>All PDF tools</span>
        </a>
      </div>

      <!-- D. WHAT'S NEXT Section -->
      <div class="result-next-steps">
        <div class="next-steps-title">WHAT'S NEXT</div>
        <div class="whats-next-grid" id="rc-whats-next-grid">
          ${relatedTools
            .map(
              (tool) => `
            <a href="#/tools/${tool.id}" class="whats-next-card" data-tool-id="${tool.id}">
              <div class="whats-next-card-top">
                <span class="whats-next-card-icon">${tool.icon}</span>
                <span class="whats-next-card-arrow">→</span>
              </div>
              <div class="whats-next-card-title">${tool.title}</div>
              <div class="whats-next-card-desc">${tool.description}</div>
            </a>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

export class ResultCard {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
    if (!el) {
      if (typeof document === 'undefined') {
        this.container = { style: {}, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] } as any;
        return;
      }
      throw new Error(`ResultCard container #${containerId} not found`);
    }
    this.container = el;
    this.container.style.display = 'none';
  }

  public show(options: ResultCardOptions): void {
    const isZip = options.filename.toLowerCase().endsWith('.zip');
    const isPdf = options.filename.toLowerCase().endsWith('.pdf');
    const textContent = typeof options.data === 'string' ? options.data : options.textResult?.text || '';

    this.container.innerHTML = renderResultCardHtml(options);

    const dlBtn = this.container.querySelector('#rc-download-btn') as HTMLElement;
    const resetBtn = this.container.querySelector('#rc-reset-btn') as HTMLElement;
    const copyBtn = this.container.querySelector('#rc-copy-text-btn') as HTMLElement;

    dlBtn?.addEventListener('click', () => {
      if (typeof options.data === 'string') {
        const blob = new Blob([options.data], { type: 'text/plain;charset=utf-8' });
        triggerFileDownload(blob, options.filename, 'text/plain;charset=utf-8');
      } else if (options.data instanceof Blob && options.filename.toLowerCase().endsWith('.txt')) {
        triggerFileDownload(options.data, options.filename, 'text/plain;charset=utf-8');
      } else {
        const mimeType = isPdf ? 'application/pdf' : isZip ? 'application/zip' : undefined;
        triggerFileDownload(options.data, options.filename, mimeType);
      }
    });

    resetBtn?.addEventListener('click', () => {
      this.hide();
      options.onReset();
    });

    if (copyBtn && textContent) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(textContent);
          const lbl = this.container.querySelector('#rc-copy-label');
          if (lbl) {
            lbl.textContent = 'Copied to Clipboard!';
            setTimeout(() => {
              lbl.textContent = 'Copy Text';
            }, 2000);
          }
        } catch {
          // Ignore clipboard errors
        }
      });
    }

    // Bind next tool chaining: stage the generated document for immediate load in the next tool
    this.container.querySelectorAll('.whats-next-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (
          typeof options.data !== 'string' &&
          (options.filename.toLowerCase().endsWith('.pdf') ||
            options.filename.toLowerCase().endsWith('.jpg') ||
            options.filename.toLowerCase().endsWith('.png'))
        ) {
          try {
            const blob =
              options.data instanceof Blob
                ? options.data
                : new Blob([options.data as any], {
                    type: options.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
                  });
            const file = new File([blob], options.filename, {
              type: blob.type,
              lastModified: Date.now(),
            });
            stageFileForTool(file);
          } catch {
            // Ignore staging errors
          }
        }
      });
    });

    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }
}
