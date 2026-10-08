/**
 * PRA PDF — Universal Dropzone Component
 * Multi-layer 50 MB validation, drag-and-drop affordance, file previews,
 * reorder controls (drag & drop + move up/down buttons), and State 7 file-too-large rejection.
 */

import { validateUploadFile, formatBytes, MAX_FILE_SIZE_BYTES } from '../services/core/fileValidator';
import { ICONS } from './icons';

export interface DropzoneConfig {
  containerId: string;
  allowedExtensions: string[];
  multiple?: boolean;
  onFilesChanged: (files: File[]) => void;
  onError: (errorMessage: string) => void;
  onFileTooLarge?: (fileName: string, fileSizeStr: string) => void;
  accentColor?: string;
  selectBtnLabel?: string;
}

export class Dropzone {
  private container: HTMLElement;
  private config: DropzoneConfig;
  private selectedFiles: File[] = [];
  private draggedIndex: number | null = null;

  constructor(config: DropzoneConfig) {
    this.config = config;
    const el = document.getElementById(config.containerId);
    if (!el) throw new Error(`Dropzone container #${config.containerId} not found`);
    this.container = el;
    this.render();
    this.bindEvents();
  }

  public getFiles(): File[] {
    return this.selectedFiles;
  }

  public clearFiles(): void {
    this.selectedFiles = [];
    this.renderFileList();
  }

  public openPicker(): void {
    const fileInput = this.container.querySelector('#dz-file-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  private render(): void {
    const extList = this.config.allowedExtensions.join(', ');
    const accent = this.config.accentColor || '#E11D48';
    const label = this.config.selectBtnLabel || `Select ${this.config.multiple ? 'files' : 'file'}`;

    this.container.innerHTML = `
      <div class="ilove-hero-uploader" id="dz-drop-area" tabindex="0" role="button" aria-label="Upload files drop area">
        <input 
          type="file" 
          id="dz-file-input" 
          style="display: none;" 
          accept="${this.config.allowedExtensions.join(',')}" 
          ${this.config.multiple ? 'multiple' : ''} 
        />
        
        <div class="uploader-btn-wrapper">
          <button type="button" class="btn-ilove-select" id="dz-choose-files-btn" style="background-color: ${accent};">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>${label}</span>
          </button>
        </div>

        <div class="ilove-drop-caption">or drop ${this.config.multiple ? 'files' : 'file'} here</div>

        <div class="ilove-drop-meta">
          <span class="meta-tag">Formats: <strong>${extList}</strong></span>
          <span class="meta-sep">•</span>
          <span class="meta-tag">Up to 50 MB</span>
          <span class="meta-sep">•</span>
          <span class="meta-tag">Private & Secure</span>
        </div>
      </div>

      <!-- State 7: File Too Large Banner -->
      <div id="dz-too-large-card" class="file-too-large-card" style="display: none;">
        <div class="too-large-icon">
          ${ICONS['alert-triangle']}
        </div>
        <div class="too-large-content">
          <h4 class="too-large-title">File is too large.</h4>
          <p class="too-large-subtitle" id="dz-too-large-desc">Maximum file size is 50 MB per file.</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="dz-too-large-pick-btn">
          Choose Another File
        </button>
      </div>

      <div class="selected-file-list" id="dz-file-list"></div>
    `;
  }

  private bindEvents(): void {
    const dropArea = this.container.querySelector('#dz-drop-area') as HTMLElement;
    const fileInput = this.container.querySelector('#dz-file-input') as HTMLInputElement;
    const tooLargePickBtn = this.container.querySelector('#dz-too-large-pick-btn') as HTMLElement;

    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    if (tooLargePickBtn) {
      tooLargePickBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTooLargeCard();
        fileInput.click();
      });
    }

    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        this.handleFileList(Array.from(fileInput.files));
        fileInput.value = '';
      }
    });

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      if (e.dataTransfer?.files) {
        this.handleFileList(Array.from(e.dataTransfer.files));
      }
    });
  }

  private showTooLargeCard(fileName: string, sizeStr: string): void {
    const card = this.container.querySelector('#dz-too-large-card') as HTMLElement;
    const desc = this.container.querySelector('#dz-too-large-desc') as HTMLElement;
    if (card && desc) {
      desc.textContent = `"${fileName}" is ${sizeStr}. Maximum file size is 50 MB per file.`;
      card.style.display = 'flex';
    }
  }

  private hideTooLargeCard(): void {
    const card = this.container.querySelector('#dz-too-large-card') as HTMLElement;
    if (card) {
      card.style.display = 'none';
    }
  }

  private async handleFileList(incoming: File[]): Promise<void> {
    this.hideTooLargeCard();
    const validBatch: File[] = [];

    for (const file of incoming) {
      // Immediate 50 MB check
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const formatted = formatBytes(file.size);
        this.flashError(`"${file.name}" exceeds the 50 MB limit.`);
        this.showTooLargeCard(file.name, formatted);
        if (this.config.onFileTooLarge) {
          this.config.onFileTooLarge(file.name, formatted);
        } else {
          this.config.onError(`"${file.name}" is ${formatted}. Maximum file size is 50 MB per file.`);
        }
        return;
      }

      const validation = await validateUploadFile(file, this.config.allowedExtensions);
      if (!validation.valid) {
        this.flashError(validation.error || 'Invalid file format.');
        this.config.onError(validation.error || 'Invalid file format.');
        return;
      }

      validBatch.push(file);
    }

    if (this.config.multiple) {
      this.selectedFiles = [...this.selectedFiles, ...validBatch];
    } else {
      this.selectedFiles = validBatch.slice(0, 1);
    }

    this.renderFileList();
    this.config.onFilesChanged(this.selectedFiles);
  }

  private flashError(msg: string): void {
    const dropArea = this.container.querySelector('#dz-drop-area') as HTMLElement;
    dropArea.classList.add('error');
    setTimeout(() => dropArea.classList.remove('error'), 800);
  }

  private getFileType(name: string): string {
    const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
    return `${ext} Document`;
  }

  private renderFileList(): void {
    const listEl = this.container.querySelector('#dz-file-list') as HTMLElement;
    if (!listEl) return;

    if (this.selectedFiles.length === 0) {
      listEl.innerHTML = '';
      return;
    }

    const isMultiple = !!this.config.multiple && this.selectedFiles.length > 1;

    let headerHtml = '';
    if (this.config.multiple) {
      headerHtml = `
        <div class="file-list-header">
          <div style="font-size: 0.9rem; font-weight: 600; color: var(--pra-text-secondary);">
            Selected Documents (${this.selectedFiles.length})
            ${isMultiple ? '<span style="font-weight: 400; font-size: 0.8rem; color: var(--pra-text-muted); margin-left: 8px;">(Drag or use arrows to reorder)</span>' : ''}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="dz-add-more-btn">
            + Add More Files
          </button>
        </div>
      `;
    }

    const itemsHtml = this.selectedFiles
      .map(
        (file, idx) => `
        <div class="file-preview-card" data-index="${idx}" draggable="${isMultiple ? 'true' : 'false'}">
          <div class="file-preview-left">
            ${
              isMultiple
                ? `
              <div class="file-order-badge" title="File Position">${idx + 1}</div>
              <div class="file-reorder-buttons">
                <button type="button" class="file-move-btn move-up" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move Up">
                  ${ICONS['arrow-up']}
                </button>
                <button type="button" class="file-move-btn move-down" data-index="${idx}" ${idx === this.selectedFiles.length - 1 ? 'disabled' : ''} title="Move Down">
                  ${ICONS['arrow-down']}
                </button>
              </div>
            `
                : ''
            }
            <div class="file-doc-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div class="file-meta-info">
              <div class="file-preview-name" title="${file.name}">${file.name}</div>
              <div class="file-preview-details">
                <span class="file-preview-size">${formatBytes(file.size)}</span>
                <span class="file-preview-divider">•</span>
                <span class="file-preview-type">${this.getFileType(file.name)}</span>
              </div>
            </div>
          </div>
          <button type="button" class="file-remove-btn" data-index="${idx}" title="Remove file" aria-label="Remove ${file.name}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="6"></line>
            </svg>
          </button>
        </div>
      `
      )
      .join('');

    listEl.innerHTML = headerHtml + itemsHtml;

    // Bind Add More button
    const addMoreBtn = listEl.querySelector('#dz-add-more-btn');
    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPicker();
      });
    }

    // Bind Remove buttons
    listEl.querySelectorAll('.file-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.selectedFiles.splice(index, 1);
        this.renderFileList();
        this.config.onFilesChanged(this.selectedFiles);
      });
    });

    // Bind Move Up / Move Down buttons
    listEl.querySelectorAll('.file-move-btn.move-up').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (index > 0) {
          const item = this.selectedFiles.splice(index, 1)[0];
          this.selectedFiles.splice(index - 1, 0, item);
          this.renderFileList();
          this.config.onFilesChanged(this.selectedFiles);
        }
      });
    });

    listEl.querySelectorAll('.file-move-btn.move-down').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (index < this.selectedFiles.length - 1) {
          const item = this.selectedFiles.splice(index, 1)[0];
          this.selectedFiles.splice(index + 1, 0, item);
          this.renderFileList();
          this.config.onFilesChanged(this.selectedFiles);
        }
      });
    });

    // HTML5 Drag & Drop reordering
    if (isMultiple) {
      listEl.querySelectorAll('.file-preview-card').forEach((cardEl) => {
        cardEl.addEventListener('dragstart', (e) => {
          this.draggedIndex = parseInt((cardEl as HTMLElement).dataset.index || '0', 10);
          (cardEl as HTMLElement).classList.add('dragging');
        });

        cardEl.addEventListener('dragend', () => {
          (cardEl as HTMLElement).classList.remove('dragging');
          this.draggedIndex = null;
        });

        cardEl.addEventListener('dragover', (e) => {
          e.preventDefault();
        });

        cardEl.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetIndex = parseInt((cardEl as HTMLElement).dataset.index || '0', 10);
          if (this.draggedIndex !== null && this.draggedIndex !== targetIndex) {
            const moved = this.selectedFiles.splice(this.draggedIndex, 1)[0];
            this.selectedFiles.splice(targetIndex, 0, moved);
            this.renderFileList();
            this.config.onFilesChanged(this.selectedFiles);
          }
        });
      });
    }
  }
}
