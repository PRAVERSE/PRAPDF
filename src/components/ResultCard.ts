/**
 * PRA PDF — Result Card Component
 * Redesigned based on iLovePDF signature download & celebration experience:
 * Animated success badge, huge primary download button, file savings badge,
 * reset controls, and suggested next tool workflows.
 */

import { triggerFileDownload } from '../services/core/cleanup';
import { formatBytes } from '../services/core/fileValidator';

export interface ResultCardOptions {
  filename: string;
  data: Uint8Array | Blob | string;
  originalSize?: number;
  newSize?: number;
  reductionRatio?: string;
  toolId?: string;
  toolTitle?: string;
  onReset: () => void;
}

export class ResultCard {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`ResultCard container #${containerId} not found`);
    this.container = el;
    this.container.style.display = 'none';
  }

  public show(options: ResultCardOptions): void {
    let sizeDisplay = '';
    if (options.newSize !== undefined) {
      sizeDisplay = formatBytes(options.newSize);
    } else if (options.data instanceof Uint8Array) {
      sizeDisplay = formatBytes(options.data.byteLength);
    } else if (options.data instanceof Blob) {
      sizeDisplay = formatBytes(options.data.size);
    }

    const hasCompression = !!(options.originalSize && options.newSize && options.originalSize > options.newSize);
    const origSizeStr = options.originalSize ? formatBytes(options.originalSize) : '';

    this.container.innerHTML = `
      <div class="ilove-result-view">
        <div class="result-celebration-badge">
          <div class="result-check-circle">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>

        <h2 class="result-main-title">
          ${options.toolTitle ? `${options.toolTitle} Complete!` : 'Your document is ready!'}
        </h2>
        <p class="result-main-subtitle">
          Processed securely in your browser. Ready for instant high-speed download.
        </p>

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
            : `
          <div class="result-file-pill">
            <span class="file-pill-icon">📄</span>
            <span class="file-pill-name">${options.filename}</span>
            <span class="file-pill-sep">•</span>
            <span class="file-pill-size">${sizeDisplay}</span>
          </div>
        `
        }

        <!-- Primary Giant Download Button (iLovePDF signature) -->
        <div class="result-action-row">
          <button type="button" class="btn-ilove-download" id="rc-download-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download ${options.filename}</span>
          </button>
        </div>

        <!-- Secondary Controls -->
        <div class="result-secondary-row">
          <button type="button" class="btn btn-secondary" id="rc-reset-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Process Another File
          </button>
          ${
            typeof options.data === 'string'
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
          <a href="#/tools" class="btn btn-secondary">
            All PDF Tools
          </a>
        </div>

        <!-- Suggested Next Tools (iLovePDF signature cross-tool workflow) -->
        <div class="result-next-steps">
          <div class="next-steps-title">Recommended next actions:</div>
          <div class="next-steps-chips">
            <a href="#/tools/compress-pdf" class="next-step-chip">
              <span>⚡ Compress this PDF</span>
            </a>
            <a href="#/tools/password-protect-pdf" class="next-step-chip">
              <span>🔒 Protect with Password</span>
            </a>
            <a href="#/tools/add-page-numbers" class="next-step-chip">
              <span>🔢 Add Page Numbers</span>
            </a>
            <a href="#/editor" class="next-step-chip">
              <span>✏️ Open in PDF Editor</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const dlBtn = this.container.querySelector('#rc-download-btn') as HTMLElement;
    const resetBtn = this.container.querySelector('#rc-reset-btn') as HTMLElement;
    const copyBtn = this.container.querySelector('#rc-copy-text-btn') as HTMLElement;

    dlBtn.addEventListener('click', () => {
      if (typeof options.data === 'string') {
        const blob = new Blob([options.data], { type: 'text/plain;charset=utf-8' });
        triggerFileDownload(blob, options.filename);
      } else {
        triggerFileDownload(options.data, options.filename);
      }
    });

    resetBtn.addEventListener('click', () => {
      this.hide();
      options.onReset();
    });

    if (copyBtn && typeof options.data === 'string') {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(options.data as string);
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

    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }
}
