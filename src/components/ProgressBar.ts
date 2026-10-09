/**
 * PRA PDF — Universal Processing Progress Component
 * A PRAVERSE Company
 *
 * Implements:
 * 1. Immediate visible feedback on user click.
 * 2. Real determinate progress tracking with percentage badge when measurable.
 * 3. Honest animated indeterminate shimmer when exact byte/page progress is unmeasurable.
 * 4. Zero fake intervals or fabricated percentages.
 * 5. Full lifecycle: prepare, validate, upload, process, output, complete, and error recovery.
 * 6. Responsive, premium dark glassmorphism aesthetic matching the redesigned PRA PDF design system.
 */

export interface ProgressShowOptions {
  title?: string;
  message?: string;
  indeterminate?: boolean;
  percent?: number;
  toolId?: string;
}

export class ProgressBar {
  private container: HTMLElement;
  private rootEl: HTMLElement | null = null;
  private barEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private messageEl: HTMLElement | null = null;
  private percentEl: HTMLElement | null = null;
  private detailEl: HTMLElement | null = null;
  private glyphEl: HTMLElement | null = null;
  private footerEl: HTMLElement | null = null;
  private trackEl: HTMLElement | null = null;
  private isShown: boolean = false;

  constructor(container: HTMLElement | string) {
    if (typeof container === 'string') {
      const el = document.getElementById(container);
      this.container = el || document.body;
    } else {
      this.container = container;
    }
  }

  /**
   * Immediately displays the processing progress modal overlay
   */
  public show(options: ProgressShowOptions = {}): void {
    const title = options.title || 'Processing PDF';
    const message = options.message || 'Preparing files…';
    const indeterminate = options.indeterminate ?? (options.percent === undefined);
    const initialPercent = options.percent ?? 0;

    // Ensure the container element is visible in the DOM
    this.container.style.display = 'flex';

    let existing = this.container.querySelector('#pra-progress-root') as HTMLElement;
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'pra-progress-root';
      existing.className = 'pra-processing-overlay';
      existing.setAttribute('role', 'dialog');
      existing.setAttribute('aria-modal', 'true');
      existing.setAttribute('aria-live', 'polite');
      this.container.appendChild(existing);
    }
    this.rootEl = existing;

    this.rootEl.innerHTML = `
      <div class="pra-processing-card">
        <div class="pra-processing-header">
          <div class="pra-processing-icon-wrapper">
            <div class="pra-processing-spinner" id="pra-proc-spinner">
              <svg class="pra-spinner-svg" viewBox="0 0 50 50">
                <circle class="pra-spinner-circle-bg" cx="25" cy="25" r="20" fill="none" stroke-width="3.5"></circle>
                <circle class="pra-spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="3.5"></circle>
              </svg>
              <div class="pra-processing-glyph" id="pra-proc-glyph">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
            </div>
          </div>
          <div class="pra-processing-title-group">
            <h3 class="pra-processing-title" id="pra-proc-title">${title}</h3>
            <p class="pra-processing-status" id="pra-proc-status">${message}</p>
          </div>
        </div>

        <div class="pra-processing-body">
          <div class="pra-progress-meta">
            <span class="pra-progress-indicator-label">Live Processing</span>
            <span class="pra-progress-percent" id="pra-proc-percent">${indeterminate ? 'Working…' : `${initialPercent}%`}</span>
          </div>

          <div class="pra-progress-track ${indeterminate ? 'is-indeterminate' : ''}" id="pra-proc-track">
            <div class="pra-progress-fill" id="pra-proc-fill" style="width: ${indeterminate ? '100%' : `${initialPercent}%`};"></div>
          </div>

          <div class="pra-progress-detail" id="pra-proc-detail" style="display: none;"></div>
        </div>

        <div class="pra-processing-footer" id="pra-proc-footer" style="display: none;"></div>
      </div>
    `;

    this.barEl = this.rootEl.querySelector('#pra-proc-fill');
    this.titleEl = this.rootEl.querySelector('#pra-proc-title');
    this.messageEl = this.rootEl.querySelector('#pra-proc-status');
    this.percentEl = this.rootEl.querySelector('#pra-proc-percent');
    this.detailEl = this.rootEl.querySelector('#pra-proc-detail');
    this.glyphEl = this.rootEl.querySelector('#pra-proc-glyph');
    this.footerEl = this.rootEl.querySelector('#pra-proc-footer');
    this.trackEl = this.rootEl.querySelector('#pra-proc-track');

    this.isShown = true;
  }

  /**
   * Updates progress state.
   * If percent is a positive number (0-100), shows determinate progress bar with real percentage.
   * If percent is null or negative, shows honest indeterminate animation with truthful message.
   */
  public update(percent: number | null, message?: string, detail?: string): void {
    if (!this.isShown) {
      this.show({ message, percent: percent ?? undefined });
    }

    if (message && this.messageEl) {
      this.messageEl.textContent = message;
    }

    if (this.detailEl) {
      if (detail) {
        this.detailEl.textContent = detail;
        this.detailEl.style.display = 'block';
      } else {
        this.detailEl.style.display = 'none';
      }
    }

    if (percent === null || percent < 0) {
      // Indeterminate mode (unmeasurable stage)
      if (this.trackEl) this.trackEl.classList.add('is-indeterminate');
      if (this.barEl) this.barEl.style.width = '100%';
      if (this.percentEl) this.percentEl.textContent = 'Working…';
    } else {
      // Determinate mode (measurable stage)
      const clamped = Math.min(100, Math.max(0, percent));
      if (this.trackEl) this.trackEl.classList.remove('is-indeterminate');
      if (this.barEl) this.barEl.style.width = `${clamped}%`;
      if (this.percentEl) this.percentEl.textContent = `${clamped}%`;
    }
  }

  /**
   * Shows success completion with checkmark and status message before hiding
   */
  public async success(message: string = 'Completed successfully!'): Promise<void> {
    if (!this.isShown) return;

    if (this.trackEl) this.trackEl.classList.remove('is-indeterminate');
    if (this.barEl) {
      this.barEl.style.width = '100%';
      this.barEl.classList.add('is-success');
    }
    if (this.percentEl) this.percentEl.textContent = '100%';
    if (this.messageEl) this.messageEl.textContent = message;
    if (this.detailEl) this.detailEl.style.display = 'none';

    if (this.glyphEl) {
      this.glyphEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }

    const spinner = this.rootEl?.querySelector('#pra-proc-spinner');
    if (spinner) spinner.classList.add('is-success');

    // Hold success state for 250ms for user feedback
    await new Promise((res) => setTimeout(res, 250));
  }

  /**
   * Displays an error state inside the progress container with a retry button
   */
  public error(message: string, onRetry?: () => void): void {
    if (!this.isShown) {
      this.show({ title: 'Processing Error', message });
    }

    if (this.trackEl) this.trackEl.classList.remove('is-indeterminate');
    if (this.barEl) {
      this.barEl.style.width = '100%';
      this.barEl.classList.add('is-error');
    }
    if (this.percentEl) this.percentEl.textContent = 'Error';
    if (this.titleEl) this.titleEl.textContent = 'Processing Failed';
    if (this.messageEl) this.messageEl.textContent = message;

    if (this.glyphEl) {
      this.glyphEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    const spinner = this.rootEl?.querySelector('#pra-proc-spinner');
    if (spinner) spinner.classList.add('is-error');

    if (this.footerEl && onRetry) {
      this.footerEl.style.display = 'flex';
      this.footerEl.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm" id="pra-proc-retry-btn">
          Try Again
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="pra-proc-close-btn">
          Dismiss
        </button>
      `;
      this.footerEl.querySelector('#pra-proc-retry-btn')?.addEventListener('click', () => {
        onRetry();
      });
      this.footerEl.querySelector('#pra-proc-close-btn')?.addEventListener('click', () => {
        this.hide();
      });
    }
  }

  /**
   * Hides the progress overlay
   */
  public hide(): void {
    if (this.rootEl) {
      this.rootEl.remove();
      this.rootEl = null;
    }
    this.container.style.display = 'none';
    this.barEl = null;
    this.titleEl = null;
    this.messageEl = null;
    this.percentEl = null;
    this.detailEl = null;
    this.glyphEl = null;
    this.footerEl = null;
    this.trackEl = null;
    this.isShown = false;
  }

  /**
   * Resets progress to 0%
   */
  public reset(): void {
    if (this.barEl) {
      this.barEl.style.width = '0%';
      this.barEl.classList.remove('is-success', 'is-error');
    }
    if (this.percentEl) this.percentEl.textContent = '0%';
    if (this.trackEl) this.trackEl.classList.remove('is-indeterminate');
    if (this.messageEl) this.messageEl.textContent = 'Preparing files…';
    if (this.detailEl) {
      this.detailEl.textContent = '';
      this.detailEl.style.display = 'none';
    }
    if (this.footerEl) this.footerEl.style.display = 'none';
  }

  public isVisible(): boolean {
    return this.isShown;
  }
}
