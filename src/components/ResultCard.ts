/**
 * PRA PDF — Result Card Component
 * Presents downloadable output file, reduction stats, and reset actions.
 */

import { triggerFileDownload } from '../services/core/cleanup';
import { formatBytes } from '../services/core/fileValidator';

export interface ResultCardOptions {
  filename: string;
  data: Uint8Array | Blob | string;
  originalSize?: number;
  newSize?: number;
  reductionRatio?: string;
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

    const ratioText = options.reductionRatio ? `<span style="color: var(--pra-success); font-weight: 600; margin-left: 8px;">(${options.reductionRatio})</span>` : '';

    this.container.innerHTML = `
      <div class="result-card">
        <div class="result-info-block">
          <div class="result-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div>
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--pra-text-primary); margin-bottom: 4px;">
              Ready to Download!
            </div>
            <div style="font-size: 0.9rem; color: var(--pra-text-secondary);">
              <strong>${options.filename}</strong> — ${sizeDisplay} ${ratioText}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="rc-reset-btn">
            Process Another
          </button>
          <button type="button" class="btn btn-success" id="rc-download-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Result
          </button>
        </div>
      </div>
    `;

    const dlBtn = this.container.querySelector('#rc-download-btn') as HTMLElement;
    const resetBtn = this.container.querySelector('#rc-reset-btn') as HTMLElement;

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

    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'none';
  }
}
