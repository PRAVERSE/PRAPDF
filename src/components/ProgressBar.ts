/**
 * PRA PDF — Progress Bar Component
 * Displays real-time progress percentages and operational status strings.
 */

export class ProgressBar {
  private container: HTMLElement;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`ProgressBar container #${containerId} not found`);
    this.container = el;
    this.render();
  }

  public update(percent: number, statusText: string): void {
    const fill = this.container.querySelector('.progress-fill') as HTMLElement;
    const percentEl = this.container.querySelector('.progress-percent') as HTMLElement;
    const statusEl = this.container.querySelector('.progress-status') as HTMLElement;

    if (fill) fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (statusEl) statusEl.textContent = statusText;
  }

  public show(): void {
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public reset(): void {
    this.update(0, 'Preparing...');
    this.hide();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="progress-container">
        <div class="progress-header">
          <span class="progress-status" style="color: var(--pra-text-secondary);">Initializing engine...</span>
          <span class="progress-percent" style="color: var(--pra-primary-light);">0%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: 0%;"></div>
        </div>
      </div>
    `;
    this.container.style.display = 'none';
  }
}
