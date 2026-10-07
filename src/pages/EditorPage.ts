/**
 * PRA PDF — Full PDF Editing Studio (Tool 25)
 * Master 4-Panel Professional Document Editor (Section 11)
 * Top Toolbar + Left Thumbnails Sidebar + Main Canvas + Editor Tools + Right Contextual Inspector.
 */

import * as pdfjsLib from 'pdfjs-dist';
import { validateFileSize } from '../services/core/fileValidator';
import {
  exportEditedPdf,
  EditorElement,
  hexToRgb,
  rgbToHex,
} from '../services/fullPdfEditor';
import { triggerFileDownload } from '../services/core/cleanup';
import { ICONS } from '../components/icons';

export class EditorPage {
  private container: HTMLElement;
  private currentPdfBytes: Uint8Array | null = null;
  private pdfDoc: any = null;
  private documentName: string = 'document.pdf';
  private currentPageIndex: number = 0;
  private totalPages: number = 0;
  private currentScale: number = 1.2;

  // Active Tool
  private activeTool: 'select' | 'text' | 'pen' | 'highlight' | 'rectangle' | 'circle' | 'comment' = 'select';

  // Contextual Inspector Properties
  private currentColor: string = '#6366F1';
  private currentFontSize: number = 18;
  private currentFontFamily: string = 'Inter';
  private currentAlignment: 'left' | 'center' | 'right' = 'left';
  private currentOpacity: number = 1.0;
  private currentStrokeWidth: number = 2;

  // Document Elements
  private elements: EditorElement[] = [];
  private selectedElementId: string | null = null;

  // History Stack for Undo / Redo
  private historyStack: EditorElement[][] = [];
  private redoStack: EditorElement[][] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    if (!this.currentPdfBytes) {
      this.renderUploadState();
    } else {
      this.renderStudioState();
    }
  }

  private renderUploadState(): void {
    this.container.innerHTML = `
      <div class="tool-runner-container" style="max-width: 800px; margin: 40px auto;">
        <div class="tool-header-block">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag">STUDIO WORKSPACE #25</span>
            <span class="tool-category-tag">FULL PDF EDITOR</span>
          </div>
          <h1 class="tool-title">Full PDF Editing Studio</h1>
          <p class="tool-subtitle">
            Client-side interactive document workspace. Insert and edit text, add shapes, draw freehand annotations, and highlights.
          </p>
        </div>

        <div class="card-container">
          <div class="dropzone-box" id="editor-dropzone" tabindex="0" role="button" aria-label="Upload PDF to launch studio">
            <input type="file" id="editor-file-input" style="display: none;" accept=".pdf" />
            <div class="dropzone-icon">
              ${ICONS['full-pdf-editing']}
            </div>
            <div class="dropzone-title">Upload a PDF to Open Studio</div>
            <div class="dropzone-hint">
              or <button type="button" class="btn btn-secondary btn-sm" style="pointer-events: none;">Choose PDF File</button>
            </div>
            <div class="dropzone-supported-formats">Supported format: <strong>.pdf</strong></div>
            <div class="limit-badge-50mb">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Maximum file size: 50 MB per file
            </div>
          </div>

          <div id="editor-upload-error" class="error-banner" style="display: none; margin-top: 16px;"></div>
        </div>
      </div>
    `;

    const dropArea = this.container.querySelector('#editor-dropzone') as HTMLElement;
    const fileInput = this.container.querySelector('#editor-file-input') as HTMLInputElement;
    const errorBanner = this.container.querySelector('#editor-upload-error') as HTMLElement;

    dropArea.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      if (fileInput.files?.[0]) {
        await this.handleFile(fileInput.files[0], errorBanner);
      }
    });

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropArea.classList.remove('drag-over');
      if (e.dataTransfer?.files?.[0]) {
        await this.handleFile(e.dataTransfer.files[0], errorBanner);
      }
    });
  }

  private async handleFile(file: File, errorBanner: HTMLElement): Promise<void> {
    const check = validateFileSize(file);
    if (!check.valid) {
      errorBanner.textContent = check.error || 'File exceeds the 50 MB limit.';
      errorBanner.style.display = 'flex';
      return;
    }

    try {
      this.documentName = file.name;
      const buffer = await file.arrayBuffer();
      this.currentPdfBytes = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: this.currentPdfBytes });
      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;
      this.currentPageIndex = 0;
      this.elements = [];
      this.historyStack = [];
      this.redoStack = [];
      this.render();
    } catch (err: any) {
      errorBanner.textContent = 'Could not load PDF document: ' + (err?.message || 'Invalid format');
      errorBanner.style.display = 'flex';
    }
  }

  private renderStudioState(): void {
    this.container.innerHTML = `
      <div class="editor-studio-wrapper">
        <!-- 1. TOP TOOLBAR -->
        <header class="studio-top-toolbar">
          <div class="studio-top-left">
            <a href="#/" class="btn btn-secondary btn-sm" title="Exit to Home">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Exit Studio
            </a>
            <div class="studio-doc-name-badge" title="Document Name">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              </svg>
              <span id="studio-doc-name">${this.documentName}</span>
            </div>
          </div>

          <!-- Undo / Redo Actions -->
          <div class="studio-history-controls">
            <button type="button" class="studio-tool-btn" id="studio-undo-btn" title="Undo" ${this.historyStack.length === 0 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            </button>
            <button type="button" class="studio-tool-btn" id="studio-redo-btn" title="Redo" ${this.redoStack.length === 0 ? 'disabled' : ''}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
          </div>

          <!-- Zoom & Page Controls -->
          <div class="studio-zoom-controls">
            <button type="button" class="studio-tool-btn" id="studio-zoom-out" title="Zoom Out">−</button>
            <span class="studio-zoom-level" id="studio-zoom-label">${Math.round(this.currentScale * 100)}%</span>
            <button type="button" class="studio-tool-btn" id="studio-zoom-in" title="Zoom In">+</button>
          </div>

          <!-- Save / Export Action -->
          <div class="studio-top-right">
            <button type="button" class="btn btn-primary btn-sm" id="studio-export-btn">
              ${ICONS['download']}
              Save & Export PDF
            </button>
          </div>
        </header>

        <!-- STUDIO 3-COLUMN MAIN WORKSPACE -->
        <div class="studio-workspace-grid">
          <!-- 2. LEFT SIDEBAR: Page Thumbnails -->
          <aside class="studio-left-rail" aria-label="Page Thumbnails">
            <div class="rail-header">
              <span class="rail-title">Pages (${this.totalPages})</span>
            </div>
            <div class="rail-thumbnails-list" id="studio-thumbnails-list">
              ${Array.from({ length: this.totalPages })
                .map(
                  (_, i) => `
                <div class="page-thumb-item ${i === this.currentPageIndex ? 'active' : ''}" data-page="${i}">
                  <div class="thumb-canvas-box">
                    <span class="thumb-page-num">Page ${i + 1}</span>
                  </div>
                  <span class="thumb-label">${i + 1} of ${this.totalPages}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </aside>

          <!-- 3. MAIN CANVAS VIEWPORT + EDITOR TOOLBAR -->
          <main class="studio-canvas-stage">
            <!-- Floated Editor Toolbar -->
            <div class="studio-floating-toolbar" role="toolbar" aria-label="Editor Tools">
              <button type="button" class="studio-tool-btn ${this.activeTool === 'select' ? 'active' : ''}" data-tool="select" title="Select / Move">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3l7 18 3-7 7-3L3 3z"></path>
                </svg>
                <span>Select</span>
              </button>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'text' ? 'active' : ''}" data-tool="text" title="Add Text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 7 4 4 20 4 20 7"></polyline>
                  <line x1="9" y1="20" x2="15" y2="20"></line>
                  <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
                <span>Text</span>
              </button>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'pen' ? 'active' : ''}" data-tool="pen" title="Drawing / Signature">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                </svg>
                <span>Draw</span>
              </button>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'highlight' ? 'active' : ''}" data-tool="highlight" title="Highlight">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                <span>Highlight</span>
              </button>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'rectangle' ? 'active' : ''}" data-tool="rectangle" title="Rectangle Shape">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="5" width="18" height="14" rx="1"></rect>
                </svg>
                <span>Shape</span>
              </button>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'circle' ? 'active' : ''}" data-tool="circle" title="Circle Shape">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="9"></circle>
                </svg>
                <span>Circle</span>
              </button>

              <label class="studio-tool-btn" style="cursor: pointer;" title="Insert Image Stamp">
                <input type="file" id="studio-img-input" style="display: none;" accept="image/png,image/jpeg" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Image</span>
              </label>

              <button type="button" class="studio-tool-btn ${this.activeTool === 'comment' ? 'active' : ''}" data-tool="comment" title="Add Note / Comment">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Comment</span>
              </button>
            </div>

            <!-- Scrollable Canvas Viewport -->
            <div class="studio-viewport-scroll" id="studio-canvas-viewport">
              <div class="studio-canvas-sheet" id="studio-sheet-wrapper">
                <canvas id="studio-pdf-canvas"></canvas>
                <div id="studio-interactive-overlay" class="studio-overlay-layer"></div>
              </div>
            </div>
          </main>

          <!-- 4. RIGHT PANEL: Contextual Settings Inspector -->
          <aside class="studio-right-inspector" aria-label="Inspector Panel">
            <div class="inspector-header">
              <span class="inspector-title">Properties</span>
              <span class="inspector-active-label" id="inspector-tool-label">Tool: ${this.activeTool}</span>
            </div>

            <div class="inspector-body">
              <!-- Color Setting -->
              <div class="inspector-field">
                <label class="inspector-label">Color & Stroke</label>
                <div class="color-picker-row">
                  <input type="color" id="insp-color-input" value="${this.currentColor}" class="inspector-color-swatch" />
                  <div class="preset-colors">
                    <span class="color-dot" data-color="#6366F1" style="background: #6366F1;"></span>
                    <span class="color-dot" data-color="#06B6D4" style="background: #06B6D4;"></span>
                    <span class="color-dot" data-color="#10B981" style="background: #10B981;"></span>
                    <span class="color-dot" data-color="#EF4444" style="background: #EF4444;"></span>
                    <span class="color-dot" data-color="#F59E0B" style="background: #F59E0B;"></span>
                    <span class="color-dot" data-color="#F8FAFC" style="background: #F8FAFC;"></span>
                  </div>
                </div>
              </div>

              <!-- Font Family & Size (For Text / Note) -->
              <div class="inspector-field">
                <label class="inspector-label">Typography</label>
                <select id="insp-font-family" class="form-select form-select-sm" style="margin-bottom: 8px;">
                  <option value="Inter" ${this.currentFontFamily === 'Inter' ? 'selected' : ''}>Inter Sans</option>
                  <option value="Helvetica" ${this.currentFontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                  <option value="Times" ${this.currentFontFamily === 'Times' ? 'selected' : ''}>Times Roman</option>
                  <option value="Courier" ${this.currentFontFamily === 'Courier' ? 'selected' : ''}>Courier Mono</option>
                </select>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <div>
                    <label style="font-size: 0.75rem; color: var(--pra-text-muted);">Size</label>
                    <select id="insp-font-size" class="form-select form-select-sm">
                      <option value="12" ${this.currentFontSize === 12 ? 'selected' : ''}>12 px</option>
                      <option value="14" ${this.currentFontSize === 14 ? 'selected' : ''}>14 px</option>
                      <option value="18" ${this.currentFontSize === 18 ? 'selected' : ''}>18 px</option>
                      <option value="24" ${this.currentFontSize === 24 ? 'selected' : ''}>24 px</option>
                      <option value="32" ${this.currentFontSize === 32 ? 'selected' : ''}>32 px</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; color: var(--pra-text-muted);">Align</label>
                    <select id="insp-font-align" class="form-select form-select-sm">
                      <option value="left" ${this.currentAlignment === 'left' ? 'selected' : ''}>Left</option>
                      <option value="center" ${this.currentAlignment === 'center' ? 'selected' : ''}>Center</option>
                      <option value="right" ${this.currentAlignment === 'right' ? 'selected' : ''}>Right</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Stroke Width & Opacity -->
              <div class="inspector-field">
                <label class="inspector-label">Stroke & Opacity</label>
                <div style="margin-bottom: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--pra-text-muted); margin-bottom: 4px;">
                    <span>Stroke Width</span>
                    <span id="insp-stroke-val">${this.currentStrokeWidth}px</span>
                  </div>
                  <input type="range" id="insp-stroke-slider" min="1" max="10" value="${this.currentStrokeWidth}" class="form-range" style="width: 100%;" />
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--pra-text-muted); margin-bottom: 4px;">
                    <span>Opacity</span>
                    <span id="insp-opacity-val">${Math.round(this.currentOpacity * 100)}%</span>
                  </div>
                  <input type="range" id="insp-opacity-slider" min="10" max="100" value="${Math.round(this.currentOpacity * 100)}" class="form-range" style="width: 100%;" />
                </div>
              </div>

              <!-- Element Actions -->
              <div class="inspector-field" style="margin-top: auto; border-top: 1px solid var(--pra-border); padding-top: 16px;">
                <button type="button" class="btn btn-secondary btn-sm" id="insp-delete-btn" style="width: 100%; color: var(--pra-error); border-color: rgba(239, 68, 68, 0.3);" ${!this.selectedElementId ? 'disabled' : ''}>
                  Delete Selected Element
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this.bindStudioEvents();
    this.renderCurrentPage();
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.pdfDoc) return;
    const canvas = this.container.querySelector('#studio-pdf-canvas') as HTMLCanvasElement;
    const overlay = this.container.querySelector('#studio-interactive-overlay') as HTMLElement;
    const wrapper = this.container.querySelector('#studio-sheet-wrapper') as HTMLElement;

    const page = await this.pdfDoc.getPage(this.currentPageIndex + 1);
    const viewport = page.getViewport({ scale: this.currentScale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;

    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const renderContext = { canvasContext: ctx, viewport };
      await page.render(renderContext).promise;
    }

    this.renderOverlayElements();
  }

  private renderOverlayElements(): void {
    const overlay = this.container.querySelector('#studio-interactive-overlay') as HTMLElement;
    if (!overlay) return;

    overlay.innerHTML = '';
    const pageElems = this.elements.filter((el) => el.pageIndex === this.currentPageIndex);

    pageElems.forEach((el) => {
      const isSelected = el.id === this.selectedElementId;
      const elDiv = document.createElement('div');
      elDiv.className = `editor-canvas-element ${isSelected ? 'selected' : ''}`;
      elDiv.style.left = `${el.x * this.currentScale}px`;
      elDiv.style.top = `${el.y * this.currentScale}px`;
      elDiv.style.position = 'absolute';

      if (el.type === 'text') {
        const hex = rgbToHex(el.color);
        elDiv.innerHTML = `
          <div contenteditable="true" class="editable-canvas-text" style="color: ${hex}; font-size: ${(el.fontSize || 18) * (this.currentScale / 1.2)}px; font-family: ${el.fontFamily || 'Inter'}; text-align: ${el.alignment || 'left'}; opacity: ${el.opacity ?? 1};">
            ${el.text || 'Click to edit text'}
          </div>
        `;
        elDiv.addEventListener('input', (e) => {
          el.text = (e.target as HTMLElement).innerText;
        });
      } else if (el.type === 'comment') {
        const hex = rgbToHex(el.color);
        elDiv.innerHTML = `
          <div class="canvas-comment-badge" style="background: ${hex}; opacity: ${el.opacity ?? 1};">
            💬 <span contenteditable="true" class="comment-text">${el.text || 'Add comment...'}</span>
          </div>
        `;
        elDiv.addEventListener('input', (e) => {
          el.text = (e.target as HTMLElement).innerText;
        });
      } else if (el.type === 'highlight') {
        const hex = rgbToHex(el.color);
        elDiv.style.width = `${(el.width || 120) * this.currentScale}px`;
        elDiv.style.height = `${(el.height || 24) * this.currentScale}px`;
        elDiv.style.backgroundColor = hex;
        elDiv.style.opacity = `${el.opacity || 0.35}`;
        elDiv.style.borderRadius = '2px';
      } else if (el.type === 'shape') {
        const strokeHex = rgbToHex(el.strokeColor);
        elDiv.style.width = `${(el.width || 100) * this.currentScale}px`;
        elDiv.style.height = `${(el.height || 60) * this.currentScale}px`;
        elDiv.style.border = `${(el.strokeWidth || 2)}px solid ${strokeHex}`;
        elDiv.style.borderRadius = el.shapeType === 'circle' ? '50%' : '4px';
        elDiv.style.opacity = `${el.opacity ?? 1}`;
      } else if (el.type === 'image') {
        const src = el.dataUrl || el.imageData;
        if (src) {
          elDiv.innerHTML = `<img src="${src}" style="width: ${(el.width || 120) * this.currentScale}px; height: auto; opacity: ${el.opacity ?? 1}; pointer-events: none;" />`;
        }
      } else if (el.type === 'drawing' && el.points) {
        const strokeHex = rgbToHex(el.color);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', `${(el.width || 200) * this.currentScale}`);
        svg.setAttribute('height', `${(el.height || 200) * this.currentScale}`);
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute(
          'points',
          el.points.map((p) => `${p.x * this.currentScale},${p.y * this.currentScale}`).join(' ')
        );
        polyline.setAttribute('stroke', strokeHex);
        polyline.setAttribute('stroke-width', `${(el.strokeWidth || 2)}`);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke-linecap', 'round');
        svg.appendChild(polyline);
        elDiv.appendChild(svg);
      }

      elDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectElement(el.id);
      });

      overlay.appendChild(elDiv);
    });
  }

  private selectElement(id: string | null): void {
    this.selectedElementId = id;
    const deleteBtn = this.container.querySelector('#insp-delete-btn') as HTMLButtonElement;
    if (deleteBtn) {
      deleteBtn.disabled = !id;
    }
    this.renderOverlayElements();
  }

  private pushHistory(): void {
    this.historyStack.push(JSON.parse(JSON.stringify(this.elements)));
    this.redoStack = [];
    this.updateHistoryButtons();
  }

  private updateHistoryButtons(): void {
    const undoBtn = this.container.querySelector('#studio-undo-btn') as HTMLButtonElement;
    const redoBtn = this.container.querySelector('#studio-redo-btn') as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = this.historyStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }

  private bindStudioEvents(): void {
    // Left rail thumbnail selection
    const thumbItems = this.container.querySelectorAll('.page-thumb-item');
    thumbItems.forEach((item) => {
      item.addEventListener('click', () => {
        const pageIdx = parseInt((item as HTMLElement).dataset.page || '0', 10);
        this.currentPageIndex = pageIdx;
        thumbItems.forEach((t) => t.classList.remove('active'));
        item.classList.add('active');
        this.selectElement(null);
        this.renderCurrentPage();
      });
    });

    // Tool bar selection
    const toolBtns = this.container.querySelectorAll('.studio-floating-toolbar .studio-tool-btn');
    const toolLabel = this.container.querySelector('#inspector-tool-label');
    toolBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = (btn as HTMLElement).dataset.tool as any;
        if (tool) {
          this.activeTool = tool;
          toolBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          if (toolLabel) toolLabel.textContent = `Tool: ${tool}`;
        }
      });
    });

    // Zoom controls
    const zoomIn = this.container.querySelector('#studio-zoom-in');
    const zoomOut = this.container.querySelector('#studio-zoom-out');
    const zoomLabel = this.container.querySelector('#studio-zoom-label');

    zoomIn?.addEventListener('click', () => {
      if (this.currentScale < 2.5) {
        this.currentScale += 0.2;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(this.currentScale * 100)}%`;
        this.renderCurrentPage();
      }
    });

    zoomOut?.addEventListener('click', () => {
      if (this.currentScale > 0.6) {
        this.currentScale -= 0.2;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(this.currentScale * 100)}%`;
        this.renderCurrentPage();
      }
    });

    // Undo / Redo
    const undoBtn = this.container.querySelector('#studio-undo-btn');
    const redoBtn = this.container.querySelector('#studio-redo-btn');

    undoBtn?.addEventListener('click', () => {
      if (this.historyStack.length > 0) {
        this.redoStack.push(JSON.parse(JSON.stringify(this.elements)));
        this.elements = this.historyStack.pop() || [];
        this.updateHistoryButtons();
        this.selectElement(null);
        this.renderOverlayElements();
      }
    });

    redoBtn?.addEventListener('click', () => {
      if (this.redoStack.length > 0) {
        this.historyStack.push(JSON.parse(JSON.stringify(this.elements)));
        this.elements = this.redoStack.pop() || [];
        this.updateHistoryButtons();
        this.selectElement(null);
        this.renderOverlayElements();
      }
    });

    // Inspector Color Presets
    const colorInput = this.container.querySelector('#insp-color-input') as HTMLInputElement;
    this.container.querySelectorAll('.color-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const c = (dot as HTMLElement).dataset.color || '#6366F1';
        this.currentColor = c;
        if (colorInput) colorInput.value = c;
      });
    });

    colorInput?.addEventListener('input', (e) => {
      this.currentColor = (e.target as HTMLInputElement).value;
    });

    // Typography
    const fontSizeSelect = this.container.querySelector('#insp-font-size') as HTMLSelectElement;
    fontSizeSelect?.addEventListener('change', () => {
      this.currentFontSize = parseInt(fontSizeSelect.value, 10);
    });

    const fontAlignSelect = this.container.querySelector('#insp-font-align') as HTMLSelectElement;
    fontAlignSelect?.addEventListener('change', () => {
      this.currentAlignment = fontAlignSelect.value as any;
    });

    // Stroke & Opacity Sliders
    const strokeSlider = this.container.querySelector('#insp-stroke-slider') as HTMLInputElement;
    const strokeVal = this.container.querySelector('#insp-stroke-val');
    strokeSlider?.addEventListener('input', () => {
      this.currentStrokeWidth = parseInt(strokeSlider.value, 10);
      if (strokeVal) strokeVal.textContent = `${this.currentStrokeWidth}px`;
    });

    const opacitySlider = this.container.querySelector('#insp-opacity-slider') as HTMLInputElement;
    const opacityVal = this.container.querySelector('#insp-opacity-val');
    opacitySlider?.addEventListener('input', () => {
      this.currentOpacity = parseInt(opacitySlider.value, 10) / 100;
      if (opacityVal) opacityVal.textContent = `${Math.round(this.currentOpacity * 100)}%`;
    });

    // Delete selected element
    const deleteBtn = this.container.querySelector('#insp-delete-btn');
    deleteBtn?.addEventListener('click', () => {
      if (this.selectedElementId) {
        this.pushHistory();
        this.elements = this.elements.filter((el) => el.id !== this.selectedElementId);
        this.selectElement(null);
        this.renderOverlayElements();
      }
    });

    // Image Stamp Input
    const imgInput = this.container.querySelector('#studio-img-input') as HTMLInputElement;
    imgInput?.addEventListener('change', () => {
      if (imgInput.files?.[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.pushHistory();
          this.elements.push({
            id: 'elem_' + Date.now(),
            pageIndex: this.currentPageIndex,
            type: 'image',
            x: 50,
            y: 50,
            width: 150,
            height: 100,
            imageData: e.target?.result as string,
            dataUrl: e.target?.result as string,
            isPng: imgInput.files?.[0].type === 'image/png',
            opacity: this.currentOpacity,
          });
          this.renderOverlayElements();
        };
        reader.readAsDataURL(imgInput.files[0]);
      }
    });

    // Interactive Canvas Overlay Clicks
    const overlay = this.container.querySelector('#studio-interactive-overlay') as HTMLElement;
    overlay?.addEventListener('click', (e) => {
      if (this.activeTool === 'select') {
        this.selectElement(null);
        return;
      }

      const rect = overlay.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / this.currentScale;
      const clickY = (e.clientY - rect.top) / this.currentScale;

      this.pushHistory();

      if (this.activeTool === 'text') {
        this.elements.push({
          id: 'elem_' + Date.now(),
          pageIndex: this.currentPageIndex,
          type: 'text',
          x: clickX,
          y: clickY,
          text: 'Type text here...',
          color: hexToRgb(this.currentColor),
          fontSize: this.currentFontSize,
          fontFamily: this.currentFontFamily,
          alignment: this.currentAlignment,
          opacity: this.currentOpacity,
        });
      } else if (this.activeTool === 'comment') {
        this.elements.push({
          id: 'elem_' + Date.now(),
          pageIndex: this.currentPageIndex,
          type: 'comment',
          x: clickX,
          y: clickY,
          text: 'Add note here...',
          color: hexToRgb(this.currentColor),
          opacity: this.currentOpacity,
        });
      } else if (this.activeTool === 'highlight') {
        this.elements.push({
          id: 'elem_' + Date.now(),
          pageIndex: this.currentPageIndex,
          type: 'highlight',
          x: clickX,
          y: clickY,
          width: 140,
          height: 24,
          color: hexToRgb(this.currentColor),
          opacity: 0.35,
        });
      } else if (this.activeTool === 'rectangle' || this.activeTool === 'circle') {
        this.elements.push({
          id: 'elem_' + Date.now(),
          pageIndex: this.currentPageIndex,
          type: 'shape',
          shapeType: this.activeTool,
          x: clickX,
          y: clickY,
          width: 120,
          height: 70,
          strokeColor: hexToRgb(this.currentColor),
          strokeWidth: this.currentStrokeWidth,
          opacity: this.currentOpacity,
        });
      }

      this.renderOverlayElements();
    });

    // Save & Export to PDF
    const exportBtn = this.container.querySelector('#studio-export-btn');
    exportBtn?.addEventListener('click', async () => {
      if (!this.currentPdfBytes) return;
      exportBtn.setAttribute('disabled', 'true');
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = 'Rendering PDF...';

      try {
        const editedBytes = await exportEditedPdf(this.currentPdfBytes, this.elements);
        const outName = this.documentName.replace(/\.pdf$/i, '') + '-edited.pdf';
        triggerFileDownload(editedBytes, outName);
      } catch (err: any) {
        alert('Could not export PDF: ' + err?.message);
      } finally {
        exportBtn.removeAttribute('disabled');
        exportBtn.innerHTML = originalText;
      }
    });
  }
}
