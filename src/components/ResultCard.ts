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
  svgIcon: string;
}

const GREEN_ICON_COLOR = '#2EE59D';

function getRelatedTools(currentToolId?: string, isZip?: boolean): RelatedTool[] {
  const pool: RelatedTool[] = [
    {
      id: 'compress-pdf',
      title: 'Compress this PDF',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
    },
    {
      id: 'password-protect-pdf',
      title: 'Protect with password',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
    },
    {
      id: 'add-page-numbers',
      title: 'Add page numbers',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`,
    },
    {
      id: 'editor',
      title: 'Open in PDF editor',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
    },
    {
      id: 'merge-pdf',
      title: 'Merge PDF',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
    },
    {
      id: 'split-pdf',
      title: 'Split PDF',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
    },
    {
      id: 'rotate-pdf',
      title: 'Rotate PDF',
      svgIcon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${GREEN_ICON_COLOR}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`,
    },
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
    else if (isPdf) detailPill = 'Combined from PNG';
    else if (isTxt) detailPill = 'Plain Text';
    else detailPill = 'Ready to save';
  }

  // Download button text
  const downloadBtnText = isZip ? 'Download ZIP' : isTxt ? 'Download Text' : 'Download PDF';

  const badgeText = isZip ? 'ZIP' : isTxt ? 'TXT' : 'PDF';
  const badgeClass = isZip ? 'is-zip' : isTxt ? 'is-txt' : 'is-pdf';

  const relatedTools = getRelatedTools(options.toolId, isZip);

  return `
    <div class="ilove-result-view">
      <!-- A. Success Header -->
      <div class="result-celebration-badge">
        <div class="result-check-squircle result-check-circle" aria-label="Success">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2EE59D" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>

      <h2 class="result-main-title">${mainHeading}</h2>
      <p class="result-main-subtitle">${supportingText}</p>

      <!-- B. Output File Card (Dark Professional Theme) -->
      <div class="result-output-card">
        <div class="output-card-file-row">
          <div class="output-file-badge ${badgeClass}">
            <span>${badgeText}</span>
          </div>
          <div class="output-file-info-col">
            <span class="output-file-name" title="${options.filename}">${options.filename}</span>
            <div class="output-file-badges-row">${sizeDisplay} · <span class="output-file-type-tag">${detailPill}</span></div>
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

        <!-- Prominent Vibrant Green Download Button -->
        <button type="button" class="btn-download-success" id="rc-download-btn" aria-label="Download ${options.filename}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#062817" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>${downloadBtnText}</span>
        </button>

        <!-- Secondary Actions (Inside the card) -->
        <div class="result-card-secondary-row">
          <button type="button" class="btn-card-secondary" id="rc-reset-btn">
            Convert another file
          </button>
          <a href="#/tools" class="btn-card-secondary" id="rc-all-tools-btn">
            All PDF tools
          </a>
        </div>

        ${
          isTextExtract && hasText
            ? `
          <div style="margin-top: 10px;">
            <button type="button" class="btn-card-secondary" id="rc-copy-text-btn" style="width: 100%;">
              <span id="rc-copy-label">Copy Text</span>
            </button>
          </div>
        `
            : ''
        }
      </div>

      <!-- C. WHAT'S NEXT Section (Below the card) -->
      <div class="result-next-steps">
        <div class="next-steps-title">WHAT'S NEXT</div>
        <div class="whats-next-grid" id="rc-whats-next-grid">
          ${relatedTools
            .map(
              (tool) => `
            <a href="#/tools/${tool.id}" class="whats-next-card" data-tool-id="${tool.id}">
              <span class="whats-next-icon-wrap">${tool.svgIcon}</span>
              <span class="whats-next-label">${tool.title}</span>
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
