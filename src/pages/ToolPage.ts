/**
 * PRA PDF — Universal Tool Page (All 30 Services)
 * Fully redesigned based on the world-class UX patterns of iLovePDF:
 * 1. Centered Hero & Iconic File Selector with tool-specific vibrant branding
 * 2. Interactive Dual-Pane Workspace (Center Stage Canvas + Sticky Right Sidebar)
 * 3. Real Page Canvas Thumbnails via pdfjs-dist for page-level tools (Split, Rotate, Delete, Extract, Organize)
 * 4. Multi-File Grid with drag-and-drop reordering & quick actions (Merge, Images)
 * 5. Interactive 3x3 Position Grid & Live Canvas Preview for Watermark and Page Numbers
 * 6. Visual Compression Tier Cards with Recommended badge for Compress PDF
 * 7. Live password strength indicator for Password-Protect PDF
 * 8. Celebratory Result Screen with file reduction stats and next-step actions
 */

import { TOOLS_REGISTRY, ToolDefinition, findToolById, getToolVisualMeta } from '../services/toolsRegistry';
import { Dropzone } from '../components/Dropzone';
import { ProgressBar } from '../components/ProgressBar';
import { ResultCard } from '../components/ResultCard';
import { ICONS, getToolIcon } from '../components/icons';
import { formatBytes } from '../services/core/fileValidator';
import {
  renderDocumentPages,
  renderPageThumbnail,
  getPageCountFast,
} from '../services/core/pdfEngine';

// Service Engines
import {
  convertJpgToPdf,
  convertPngToPdf,
  convertImagesToPdf,
  convertWordToPdf,
  convertExcelToPdf,
  convertPowerPointToPdf,
  convertHtmlToPdf,
  convertTxtToPdf,
  convertMarkdownToPdf,
} from '../services/convertToPdf';

import {
  convertPdfToJpg,
  convertPdfToPng,
  convertPdfToMarkdown,
  convertPdfToWord,
  convertPdfToText,
  convertRtfToPdf,
  convertPdfToRtf,
} from '../services/convertFromPdf';

import {
  mergePdfs,
  splitPdf,
  deletePdfPages,
  extractPdfPages,
  rotatePdf,
  cropPdf,
  editPdfMetadata,
} from '../services/organizePdf';

import { addPageNumbersToPdf, watermarkPdf } from '../services/annotatePdf';
import { compressPdf, ocrPdf } from '../services/optimizeAndOcr';
import { passwordProtectPdf, unlockPdf } from '../services/securityPdf';

interface PageThumbnailItem {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  rotation: number;
  selected: boolean;
  markedForDelete: boolean;
}

interface MultiFileItem {
  file: File;
  pageCount?: number;
  thumbnailUrl?: string;
  rotation: number;
}

export class ToolPage {
  private container: HTMLElement;
  private tool: ToolDefinition;
  private dropzone!: Dropzone;
  private progressBar!: ProgressBar;
  private resultCard!: ResultCard;
  private selectedFiles: File[] = [];

  // Dual-mode state (File upload vs Direct Editor for HTML, Markdown, TXT)
  private inputMode: 'file' | 'direct' = 'file';

  // Interactive page thumbnails state
  private pageThumbnails: PageThumbnailItem[] = [];
  private multiFileItems: MultiFileItem[] = [];
  private isRenderingThumbnails: boolean = false;

  // Watermark live preview state
  private liveWatermarkText: string = 'CONFIDENTIAL';
  private liveWatermarkOpacity: number = 0.3;
  private liveWatermarkAngle: number = 45;
  private liveWatermarkPosition: string = 'center';

  // Page Numbers live preview position
  private livePageNumPosition: string = 'bottom-center';

  constructor(container: HTMLElement, toolId: string) {
    this.container = container;
    const found = findToolById(toolId);
    if (!found) {
      throw new Error(`Tool "${toolId}" not found in registry.`);
    }
    this.tool = found;
  }

  public render(): void {
    const isDualInput = ['html-to-pdf', 'markdown-to-pdf', 'txt-to-pdf'].includes(this.tool.id);
    const visual = getToolVisualMeta(this.tool.id);

    this.container.innerHTML = `
      <div class="tool-runner-container" style="--tool-accent: ${visual.accentColor}; --tool-accent-bg: ${visual.accentBg};">
        <!-- Top Navigation Breadcrumb -->
        <div class="tool-nav-breadcrumb">
          <a href="#/tools" class="tool-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            All PDF Tools
          </a>
          <span class="tool-breadcrumb-divider">/</span>
          <span class="tool-breadcrumb-current">${this.tool.title}</span>
        </div>

        <!-- Tool Header Block (iLovePDF signature header) -->
        <div class="tool-header-block" id="tp-hero-header">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag" style="background-color: ${visual.accentBg}; color: ${visual.accentColor}; border: 1px solid ${visual.accentColor}30;">
              SERVICE #${this.tool.serviceNumber}
            </span>
            <span class="tool-category-tag">${this.tool.categoryLabel}</span>
          </div>
          <h1 class="tool-title">${this.tool.title}</h1>
          <p class="tool-subtitle">${this.tool.description}</p>
        </div>

        <!-- Selection Hero State (Initial) -->
        <div class="tool-selection-stage" id="tp-selection-stage">
          ${
            isDualInput
              ? `
            <div class="dual-input-tabs" role="tablist">
              <button type="button" class="dual-tab-btn ${this.inputMode === 'file' ? 'active' : ''}" id="tab-mode-file">
                Upload File (${this.tool.acceptedExtensions.join(', ')})
              </button>
              <button type="button" class="dual-tab-btn ${this.inputMode === 'direct' ? 'active' : ''}" id="tab-mode-direct">
                ${this.tool.id === 'html-to-pdf' ? 'HTML Code Editor' : this.tool.id === 'markdown-to-pdf' ? 'Markdown Editor & Live Preview' : 'Text Editor'}
              </button>
            </div>
          `
              : ''
          }

          <!-- Dropzone Container -->
          <div id="tp-dropzone-wrapper" style="${this.inputMode === 'direct' ? 'display: none;' : ''}">
            <div id="tp-dropzone-container"></div>
          </div>

          <!-- Direct Editor Container (HTML, Markdown, TXT) -->
          ${
            isDualInput
              ? `
            <div id="tp-direct-editor-container" class="direct-editor-panel" style="${this.inputMode === 'file' ? 'display: none;' : ''}">
              ${this.renderDirectEditor()}
            </div>
          `
              : ''
          }
        </div>

        <!-- Active Dual-Pane Workspace (Shown after file selection) -->
        <div class="ilove-workspace-layout" id="tp-workspace-container" style="display: none;">
          <!-- Center / Main Stage: Visual File & Page Canvas -->
          <div class="workspace-main-stage" id="tp-main-stage">
            <div class="main-stage-header">
              <div class="stage-header-left">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-back-to-picker" title="Change or re-select files">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  <span>Change File</span>
                </button>
                <span class="stage-header-title" id="stage-summary-label">Selected Document</span>
              </div>
              <div class="stage-header-actions" id="stage-toolbar-actions"></div>
            </div>

            <!-- Dynamic Interactive Visual Canvas -->
            <div class="stage-interactive-canvas" id="tp-interactive-canvas">
              <div class="canvas-loading-state" id="canvas-loading-indicator" style="display: none;">
                <div class="spinner"></div>
                <p>Generating high-resolution page previews...</p>
              </div>
              <div id="canvas-dynamic-content"></div>
            </div>
          </div>

          <!-- Sticky Right Sidebar: Dedicated Options & Big Action Button -->
          <aside class="workspace-sidebar" id="tp-sidebar">
            <div class="sidebar-header">
              <div class="sidebar-tool-icon" style="background-color: ${visual.accentBg}; color: ${visual.accentColor};">
                ${getToolIcon(this.tool.id)}
              </div>
              <div class="sidebar-tool-info">
                <h3 class="sidebar-tool-title">${this.tool.title}</h3>
                <span class="sidebar-tool-meta" id="sidebar-meta-text">Ready to configure</span>
              </div>
            </div>

            <!-- Purpose-Built Tool Options Panel -->
            <div class="sidebar-options-body">
              ${this.renderToolOptions()}
            </div>

            <!-- Sticky Sidebar Action Footer -->
            <div class="sidebar-action-footer">
              <button type="button" class="btn-ilove-action" id="tp-process-btn" style="background-color: ${visual.accentColor};">
                <span class="btn-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </span>
                <span id="tp-process-label">${visual.actionBtnLabel || this.getPrimaryActionLabel()}</span>
                <span class="btn-arrow-cue">→</span>
              </button>
            </div>
          </aside>
        </div>

        <!-- Processing State (Progress Bar) -->
        <div id="tp-progress-container" class="processing-overlay" style="display: none;"></div>

        <!-- Error Banner -->
        <div id="tp-error-banner" class="error-banner" style="display: none;">
          <div class="error-banner-icon">${ICONS['alert-triangle']}</div>
          <div class="error-banner-text">
            <h4 class="error-banner-title">Something went wrong</h4>
            <p id="tp-error-message" class="error-banner-desc">Please check your document and try again.</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="tp-error-retry-btn">
            Try Again
          </button>
        </div>

        <!-- Success State (Celebration Card) -->
        <div id="tp-result-container"></div>
      </div>
    `;

    this.initSubComponents();
    this.bindEvents();
  }

  private initSubComponents(): void {
    const errorBanner = this.container.querySelector('#tp-error-banner') as HTMLElement;
    const visual = getToolVisualMeta(this.tool.id);

    this.dropzone = new Dropzone({
      containerId: 'tp-dropzone-container',
      allowedExtensions: this.tool.acceptedExtensions,
      multiple: !!this.tool.multiple,
      accentColor: visual.accentColor,
      selectBtnLabel: visual.selectBtnLabel,
      onFilesChanged: async (files) => {
        this.selectedFiles = files;
        errorBanner.style.display = 'none';

        if (files.length > 0) {
          await this.transitionToWorkspace();
        } else {
          this.transitionToSelection();
        }
      },
      onError: (msg) => {
        const errorDesc = this.container.querySelector('#tp-error-message') as HTMLElement;
        if (errorDesc) errorDesc.textContent = msg;
        errorBanner.style.display = 'flex';
      },
    });

    this.progressBar = new ProgressBar('tp-progress-container');
    this.resultCard = new ResultCard('tp-result-container');
  }

  /**
   * Smoothly switches view into the iLovePDF-style Dual-Pane Workspace
   */
  private async transitionToWorkspace(): Promise<void> {
    const selectionStage = this.container.querySelector('#tp-selection-stage') as HTMLElement;
    const workspaceContainer = this.container.querySelector('#tp-workspace-container') as HTMLElement;
    const heroHeader = this.container.querySelector('#tp-hero-header') as HTMLElement;

    if (selectionStage) selectionStage.style.display = 'none';
    if (workspaceContainer) workspaceContainer.style.display = 'grid';
    if (heroHeader) heroHeader.style.display = 'none';

    this.updateSidebarMeta();
    await this.renderMainStageVisualContent();
  }

  /**
   * Switches view back to the initial Hero / Selection state
   */
  private transitionToSelection(): void {
    const selectionStage = this.container.querySelector('#tp-selection-stage') as HTMLElement;
    const workspaceContainer = this.container.querySelector('#tp-workspace-container') as HTMLElement;
    const heroHeader = this.container.querySelector('#tp-hero-header') as HTMLElement;

    if (selectionStage) selectionStage.style.display = 'block';
    if (workspaceContainer) workspaceContainer.style.display = 'none';
    if (heroHeader) heroHeader.style.display = 'block';

    this.pageThumbnails = [];
    this.multiFileItems = [];
    this.selectedFiles = [];
    this.dropzone.clearFiles();
  }

  private updateSidebarMeta(): void {
    const metaText = this.container.querySelector('#sidebar-meta-text');
    if (metaText) {
      if (this.selectedFiles.length === 1) {
        metaText.textContent = `${this.selectedFiles[0].name} (${formatBytes(this.selectedFiles[0].size)})`;
      } else {
        const totalBytes = this.selectedFiles.reduce((acc, f) => acc + f.size, 0);
        metaText.textContent = `${this.selectedFiles.length} files selected (${formatBytes(totalBytes)})`;
      }
    }
  }

  /**
   * Renders the center stage visual content based on the active tool
   */
  private async renderMainStageVisualContent(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    const loadingIndicator = this.container.querySelector('#canvas-loading-indicator') as HTMLElement;
    const toolbarActions = this.container.querySelector('#stage-toolbar-actions') as HTMLElement;
    const summaryLabel = this.container.querySelector('#stage-summary-label') as HTMLElement;

    if (!canvasContent) return;

    // 1. Multi-file tools: Merge PDF, Images to PDF
    if (this.tool.id === 'merge-pdf' || this.tool.id === 'images-to-pdf') {
      summaryLabel.textContent = `${this.selectedFiles.length} Document${this.selectedFiles.length > 1 ? 's' : ''} to ${this.tool.id === 'merge-pdf' ? 'Merge' : 'Convert'}`;
      toolbarActions.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-more-files">
          + Add Files
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-sort-files-az" title="Sort files alphabetically">
          Sort A-Z
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reverse-files" title="Reverse order">
          Reverse
        </button>
      `;

      this.bindMultiFileToolbar();
      await this.renderMultiFileGrid();
      return;
    }

    // 2. Page-level PDF tools: Split, Delete, Extract, Rotate, Organize
    const isPageLevelTool = [
      'split-pdf',
      'rotate-pdf',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'organize-pdf-pages',
      'organize-pdf',
    ].includes(this.tool.id);

    if (isPageLevelTool) {
      const file = this.selectedFiles[0];
      if (!file) return;

      loadingIndicator.style.display = 'flex';
      canvasContent.innerHTML = '';

      try {
        const buffer = await file.arrayBuffer();
        const pages = await renderDocumentPages(new Uint8Array(buffer), 50, 160);
        this.pageThumbnails = pages.map((p) => ({
          pageNumber: p.pageNumber,
          dataUrl: p.dataUrl,
          width: p.width,
          height: p.height,
          rotation: 0,
          selected: true,
          markedForDelete: false,
        }));
      } catch (err) {
        console.warn('Could not generate canvas thumbnails:', err);
      } finally {
        loadingIndicator.style.display = 'none';
      }

      this.renderPageLevelGrid();
      return;
    }

    // 3. Watermark PDF: Live Interactive Canvas
    if (this.tool.id === 'watermark-pdf') {
      summaryLabel.textContent = 'Live Watermark Preview';
      toolbarActions.innerHTML = `
        <span class="preview-badge-live">⚡ Live Dynamic Preview</span>
      `;
      await this.renderWatermarkLivePreview();
      return;
    }

    // 4. Add Page Numbers: Live Interactive Canvas
    if (this.tool.id === 'add-page-numbers') {
      summaryLabel.textContent = 'Live Page Numbering Preview';
      toolbarActions.innerHTML = `
        <span class="preview-badge-live">⚡ Live Position Preview</span>
      `;
      await this.renderPageNumberLivePreview();
      return;
    }

    // 5. Compress PDF: Visual Document Card & Savings Target
    if (this.tool.id === 'compress-pdf') {
      summaryLabel.textContent = 'Document Compression Profile';
      toolbarActions.innerHTML = `
        <span class="stage-tag-badge">Web & Email Ready</span>
      `;
      await this.renderCompressPreview();
      return;
    }

    // 6. Generic Document Card Preview for single-file tools
    await this.renderStandardDocumentCard();
  }

  /**
   * Renders multi-file grid for Merge PDF and Images to PDF
   */
  private async renderMultiFileGrid(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    let cardsHtml = '';
    for (let idx = 0; idx < this.selectedFiles.length; idx++) {
      const file = this.selectedFiles[idx];
      let thumbUrl = '';

      if (file.type.startsWith('image/')) {
        thumbUrl = URL.createObjectURL(file);
      }

      cardsHtml += `
        <div class="ilove-file-card" data-index="${idx}" draggable="true">
          <div class="file-card-order-badge">${idx + 1}</div>
          <div class="file-card-preview-box">
            ${
              thumbUrl
                ? `<img src="${thumbUrl}" alt="${file.name}" class="file-card-img" />`
                : `
              <div class="file-card-fallback-doc">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="file-fallback-ext">${file.name.split('.').pop()?.toUpperCase() || 'PDF'}</span>
              </div>
            `
            }
          </div>
          <div class="file-card-info">
            <div class="file-card-name" title="${file.name}">${file.name}</div>
            <div class="file-card-size">${formatBytes(file.size)}</div>
          </div>
          <div class="file-card-actions">
            <button type="button" class="file-action-icon move-left" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move left">
              ←
            </button>
            <button type="button" class="file-action-icon move-right" data-index="${idx}" ${idx === this.selectedFiles.length - 1 ? 'disabled' : ''} title="Move right">
              →
            </button>
            <button type="button" class="file-action-icon delete" data-index="${idx}" title="Remove document">
              ✕
            </button>
          </div>
        </div>
      `;
    }

    // Add "+" card at end of grid
    cardsHtml += `
      <div class="ilove-add-file-tile" id="tile-add-more-files" role="button" tabindex="0">
        <div class="add-tile-icon">+</div>
        <div class="add-tile-label">Add more files</div>
      </div>
    `;

    canvasContent.innerHTML = `<div class="ilove-file-cards-grid">${cardsHtml}</div>`;
    this.bindMultiFileCardActions();
  }

  private bindMultiFileToolbar(): void {
    const addMoreBtn = this.container.querySelector('#btn-add-more-files');
    const sortBtn = this.container.querySelector('#btn-sort-files-az');
    const reverseBtn = this.container.querySelector('#btn-reverse-files');

    addMoreBtn?.addEventListener('click', () => this.dropzone.openPicker());

    sortBtn?.addEventListener('click', () => {
      this.selectedFiles.sort((a, b) => a.name.localeCompare(b.name));
      this.renderMultiFileGrid();
      this.updateSidebarMeta();
    });

    reverseBtn?.addEventListener('click', () => {
      this.selectedFiles.reverse();
      this.renderMultiFileGrid();
      this.updateSidebarMeta();
    });
  }

  private bindMultiFileCardActions(): void {
    const tileAdd = this.container.querySelector('#tile-add-more-files');
    tileAdd?.addEventListener('click', () => this.dropzone.openPicker());

    this.container.querySelectorAll('.file-action-icon.delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        this.selectedFiles.splice(idx, 1);
        if (this.selectedFiles.length === 0) {
          this.transitionToSelection();
        } else {
          this.renderMultiFileGrid();
          this.updateSidebarMeta();
        }
      });
    });

    this.container.querySelectorAll('.file-action-icon.move-left').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (idx > 0) {
          const item = this.selectedFiles.splice(idx, 1)[0];
          this.selectedFiles.splice(idx - 1, 0, item);
          this.renderMultiFileGrid();
        }
      });
    });

    this.container.querySelectorAll('.file-action-icon.move-right').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (idx < this.selectedFiles.length - 1) {
          const item = this.selectedFiles.splice(idx, 1)[0];
          this.selectedFiles.splice(idx + 1, 0, item);
          this.renderMultiFileGrid();
        }
      });
    });
  }

  /**
   * Renders page thumbnail grid for page-level tools (Rotate, Delete, Extract, Split, Organize)
   */
  private renderPageLevelGrid(): void {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    const toolbarActions = this.container.querySelector('#stage-toolbar-actions') as HTMLElement;
    const summaryLabel = this.container.querySelector('#stage-summary-label') as HTMLElement;

    if (!canvasContent) return;

    summaryLabel.textContent = `${this.pageThumbnails.length} Page${this.pageThumbnails.length > 1 ? 's' : ''} in Document`;

    // Tool-specific toolbar
    if (this.tool.id === 'rotate-pdf') {
      toolbarActions.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-rotate-all-right">
          Rotate All Right ↻ (90°)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-rotate-all-left">
          Rotate All Left ↺ (90°)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-rotation">
          Reset
        </button>
      `;
    } else if (this.tool.id === 'delete-pdf-pages') {
      toolbarActions.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-del-odd">Select Odd</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-del-even">Select Even</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-del-clear">Clear All</button>
      `;
    } else if (this.tool.id === 'extract-pdf-pages') {
      toolbarActions.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-ext-all">Select All</button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-ext-none">Deselect All</button>
      `;
    }

    const cardsHtml = this.pageThumbnails
      .map((p, idx) => {
        const isDeleteTool = this.tool.id === 'delete-pdf-pages';
        const isExtractTool = this.tool.id === 'extract-pdf-pages';
        const isRotateTool = this.tool.id === 'rotate-pdf';

        return `
          <div 
            class="ilove-page-tile ${p.markedForDelete ? 'marked-delete' : ''} ${p.selected && isExtractTool ? 'marked-extract' : ''}" 
            data-index="${idx}"
            data-page="${p.pageNumber}"
          >
            <div class="page-tile-header">
              <span class="page-number-pill">Page ${p.pageNumber}</span>
              ${
                isDeleteTool && p.markedForDelete
                  ? `<span class="page-state-badge delete">DELETED</span>`
                  : ''
              }
              ${
                isExtractTool && p.selected
                  ? `<span class="page-state-badge extract">EXTRACT</span>`
                  : ''
              }
            </div>

            <div class="page-tile-canvas-wrap">
              <img 
                src="${p.dataUrl}" 
                alt="Page ${p.pageNumber}" 
                class="page-tile-img" 
                style="transform: rotate(${p.rotation}deg);" 
              />
              ${
                isDeleteTool && p.markedForDelete
                  ? `<div class="page-delete-overlay">✕</div>`
                  : ''
              }
            </div>

            ${
              isRotateTool
                ? `
              <div class="page-tile-rotate-controls">
                <button type="button" class="btn-tile-rot rot-left" data-index="${idx}" title="Rotate 90° Left">↺</button>
                <button type="button" class="btn-tile-rot rot-right" data-index="${idx}" title="Rotate 90° Right">↻</button>
              </div>
            `
                : ''
            }
          </div>
        `;
      })
      .join('');

    canvasContent.innerHTML = `<div class="ilove-page-tiles-grid">${cardsHtml}</div>`;
    this.bindPageLevelGridEvents();
  }

  private bindPageLevelGridEvents(): void {
    // Rotate tool buttons
    const rotRightAll = this.container.querySelector('#btn-rotate-all-right');
    const rotLeftAll = this.container.querySelector('#btn-rotate-all-left');
    const resetRot = this.container.querySelector('#btn-reset-rotation');

    rotRightAll?.addEventListener('click', () => {
      this.pageThumbnails.forEach((p) => (p.rotation = (p.rotation + 90) % 360));
      this.renderPageLevelGrid();
    });

    rotLeftAll?.addEventListener('click', () => {
      this.pageThumbnails.forEach((p) => (p.rotation = (p.rotation + 270) % 360));
      this.renderPageLevelGrid();
    });

    resetRot?.addEventListener('click', () => {
      this.pageThumbnails.forEach((p) => (p.rotation = 0));
      this.renderPageLevelGrid();
    });

    // Individual rotate buttons on tiles
    this.container.querySelectorAll('.btn-tile-rot.rot-right').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (this.pageThumbnails[idx]) {
          this.pageThumbnails[idx].rotation = (this.pageThumbnails[idx].rotation + 90) % 360;
          this.renderPageLevelGrid();
        }
      });
    });

    this.container.querySelectorAll('.btn-tile-rot.rot-left').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0', 10);
        if (this.pageThumbnails[idx]) {
          this.pageThumbnails[idx].rotation = (this.pageThumbnails[idx].rotation + 270) % 360;
          this.renderPageLevelGrid();
        }
      });
    });

    // Delete Pages interactive selection
    if (this.tool.id === 'delete-pdf-pages') {
      const delInput = this.container.querySelector('#opt-delete-pages') as HTMLInputElement;

      const syncDeleteInput = () => {
        const deletedNums = this.pageThumbnails.filter((p) => p.markedForDelete).map((p) => p.pageNumber);
        if (delInput) {
          delInput.value = deletedNums.join(', ') || '';
        }
      };

      this.container.querySelectorAll('.ilove-page-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          const idx = parseInt((tile as HTMLElement).dataset.index || '0', 10);
          if (this.pageThumbnails[idx]) {
            this.pageThumbnails[idx].markedForDelete = !this.pageThumbnails[idx].markedForDelete;
            this.renderPageLevelGrid();
            syncDeleteInput();
          }
        });
      });

      this.container.querySelector('#btn-del-odd')?.addEventListener('click', () => {
        this.pageThumbnails.forEach((p) => (p.markedForDelete = p.pageNumber % 2 !== 0));
        this.renderPageLevelGrid();
        syncDeleteInput();
      });

      this.container.querySelector('#btn-del-even')?.addEventListener('click', () => {
        this.pageThumbnails.forEach((p) => (p.markedForDelete = p.pageNumber % 2 === 0));
        this.renderPageLevelGrid();
        syncDeleteInput();
      });

      this.container.querySelector('#btn-del-clear')?.addEventListener('click', () => {
        this.pageThumbnails.forEach((p) => (p.markedForDelete = false));
        this.renderPageLevelGrid();
        syncDeleteInput();
      });
    }

    // Extract Pages interactive selection
    if (this.tool.id === 'extract-pdf-pages') {
      const extInput = this.container.querySelector('#opt-extract-pages') as HTMLInputElement;

      const syncExtractInput = () => {
        const extNums = this.pageThumbnails.filter((p) => p.selected).map((p) => p.pageNumber);
        if (extInput) {
          extInput.value = extNums.join(', ') || '';
        }
      };

      this.container.querySelectorAll('.ilove-page-tile').forEach((tile) => {
        tile.addEventListener('click', () => {
          const idx = parseInt((tile as HTMLElement).dataset.index || '0', 10);
          if (this.pageThumbnails[idx]) {
            this.pageThumbnails[idx].selected = !this.pageThumbnails[idx].selected;
            this.renderPageLevelGrid();
            syncExtractInput();
          }
        });
      });

      this.container.querySelector('#btn-ext-all')?.addEventListener('click', () => {
        this.pageThumbnails.forEach((p) => (p.selected = true));
        this.renderPageLevelGrid();
        syncExtractInput();
      });

      this.container.querySelector('#btn-ext-none')?.addEventListener('click', () => {
        this.pageThumbnails.forEach((p) => (p.selected = false));
        this.renderPageLevelGrid();
        syncExtractInput();
      });
    }
  }

  /**
   * Watermark Live Interactive Preview
   */
  private async renderWatermarkLivePreview(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    const file = this.selectedFiles[0];
    let pageThumb = '';
    if (file) {
      try {
        const buf = await file.arrayBuffer();
        pageThumb = await renderPageThumbnail(new Uint8Array(buf), 0, 340);
      } catch (e) {
        console.warn('Thumbnail render error:', e);
      }
    }

    canvasContent.innerHTML = `
      <div class="watermark-preview-stage">
        <div class="watermark-sheet-box" id="watermark-sheet-container">
          ${
            pageThumb
              ? `<img src="${pageThumb}" alt="Watermark Preview Page" class="watermark-bg-img" />`
              : `<div class="watermark-blank-paper">Page 1</div>`
          }
          <div 
            class="watermark-text-overlay" 
            id="watermark-live-text-overlay"
            style="
              opacity: ${this.liveWatermarkOpacity}; 
              transform: rotate(${this.liveWatermarkAngle}deg);
            "
          >
            ${this.liveWatermarkText}
          </div>
        </div>
        <div class="watermark-live-hint">
          Changes in the sidebar update this preview instantly.
        </div>
      </div>
    `;

    this.bindWatermarkLiveEvents();
  }

  private bindWatermarkLiveEvents(): void {
    const textInput = this.container.querySelector('#opt-watermark-text') as HTMLInputElement;
    const opacityInput = this.container.querySelector('#opt-watermark-opacity') as HTMLInputElement;
    const angleSelect = this.container.querySelector('#opt-watermark-angle') as HTMLSelectElement;
    const overlay = this.container.querySelector('#watermark-live-text-overlay') as HTMLElement;

    textInput?.addEventListener('input', () => {
      this.liveWatermarkText = textInput.value || 'CONFIDENTIAL';
      if (overlay) overlay.textContent = this.liveWatermarkText;
    });

    opacityInput?.addEventListener('input', () => {
      this.liveWatermarkOpacity = parseFloat(opacityInput.value) || 0.3;
      if (overlay) overlay.style.opacity = `${this.liveWatermarkOpacity}`;
    });

    angleSelect?.addEventListener('change', () => {
      this.liveWatermarkAngle = parseInt(angleSelect.value, 10) || 45;
      if (overlay) overlay.style.transform = `rotate(${this.liveWatermarkAngle}deg)`;
    });
  }

  /**
   * Add Page Numbers Live Interactive Preview
   */
  private async renderPageNumberLivePreview(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    const file = this.selectedFiles[0];
    let pageThumb = '';
    if (file) {
      try {
        const buf = await file.arrayBuffer();
        pageThumb = await renderPageThumbnail(new Uint8Array(buf), 0, 340);
      } catch (e) {
        console.warn('Page thumbnail error:', e);
      }
    }

    canvasContent.innerHTML = `
      <div class="watermark-preview-stage">
        <div class="watermark-sheet-box" id="page-num-sheet-container">
          ${
            pageThumb
              ? `<img src="${pageThumb}" alt="Page numbering preview" class="watermark-bg-img" />`
              : `<div class="watermark-blank-paper">Page 1</div>`
          }
          <div class="pagenum-overlay-tag pos-${this.livePageNumPosition}" id="live-pagenum-tag">
            Page 1 of 12
          </div>
        </div>
        <div class="watermark-live-hint">
          Use the 3x3 position grid in the sidebar to choose placement.
        </div>
      </div>
    `;

    this.bindPageNumberLiveEvents();
  }

  private bindPageNumberLiveEvents(): void {
    const posSelect = this.container.querySelector('#opt-page-num-pos') as HTMLSelectElement;
    const tag = this.container.querySelector('#live-pagenum-tag') as HTMLElement;

    posSelect?.addEventListener('change', () => {
      this.livePageNumPosition = posSelect.value;
      if (tag) {
        tag.className = `pagenum-overlay-tag pos-${this.livePageNumPosition}`;
      }
    });

    // 3x3 position matrix buttons in sidebar
    this.container.querySelectorAll('.pos-grid-cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const pos = (cell as HTMLElement).dataset.pos || 'bottom-center';
        this.livePageNumPosition = pos;
        if (posSelect) posSelect.value = pos;
        this.container.querySelectorAll('.pos-grid-cell').forEach((c) => c.classList.remove('active'));
        cell.classList.add('active');
        if (tag) {
          tag.className = `pagenum-overlay-tag pos-${pos}`;
        }
      });
    });
  }

  /**
   * Compress PDF Visual Preview & Target Estimator
   */
  private async renderCompressPreview(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    const file = this.selectedFiles[0];
    let pageThumb = '';
    if (file) {
      try {
        const buf = await file.arrayBuffer();
        pageThumb = await renderPageThumbnail(new Uint8Array(buf), 0, 240);
      } catch (e) {
        console.warn('Compress thumb error:', e);
      }
    }

    canvasContent.innerHTML = `
      <div class="compress-hero-card">
        <div class="compress-preview-col">
          <div class="compress-sheet-wrap">
            ${
              pageThumb
                ? `<img src="${pageThumb}" alt="${file?.name}" class="compress-doc-img" />`
                : `<div class="watermark-blank-paper">${file?.name}</div>`
            }
          </div>
        </div>
        <div class="compress-info-col">
          <div class="compress-stat-pill">
            <span class="stat-label">Initial Size:</span>
            <span class="stat-val font-mono">${formatBytes(file?.size || 0)}</span>
          </div>
          <div class="compress-estimator-box">
            <div class="estimator-header">
              <span class="estimator-title">Optimization Level</span>
              <span class="estimator-badge" id="compress-estimate-badge">~50% - 70% Reduction</span>
            </div>
            <p class="estimator-desc" id="compress-estimate-desc">
              Balanced compression maintains crisp font vector curves while compressing background raster bitmaps.
            </p>
          </div>
        </div>
      </div>
    `;

    // Bind compression card selection updates
    this.container.querySelectorAll('.ilove-comp-card').forEach((card) => {
      card.addEventListener('click', () => {
        const level = (card as HTMLElement).dataset.level;
        const badge = this.container.querySelector('#compress-estimate-badge');
        const desc = this.container.querySelector('#compress-estimate-desc');

        if (level === 'high') {
          if (badge) badge.textContent = '~70% - 85% Reduction';
          if (desc) desc.textContent = 'Extreme compression mode: ideal for email attachments and mobile web distribution.';
        } else if (level === 'low') {
          if (badge) badge.textContent = '~20% - 40% Reduction';
          if (desc) desc.textContent = 'High visual quality mode: optimal for printing, portfolios, and design documents.';
        } else {
          if (badge) badge.textContent = '~50% - 70% Reduction';
          if (desc) desc.textContent = 'Balanced compression: the gold standard combination of high crispness and small file size.';
        }
      });
    });
  }

  /**
   * Standard Document Card for other tools (Word, Excel, PowerPoint, Text, etc.)
   */
  private async renderStandardDocumentCard(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    const file = this.selectedFiles[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toUpperCase() || 'DOC';
    let thumbUrl = '';

    if (file.type.startsWith('image/')) {
      thumbUrl = URL.createObjectURL(file);
    } else if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        const buf = await file.arrayBuffer();
        thumbUrl = await renderPageThumbnail(new Uint8Array(buf), 0, 220);
      } catch (e) {
        // Fallback icon
      }
    }

    canvasContent.innerHTML = `
      <div class="standard-doc-stage">
        <div class="standard-doc-card">
          <div class="doc-card-visual">
            ${
              thumbUrl
                ? `<img src="${thumbUrl}" alt="${file.name}" class="standard-doc-thumb" />`
                : `
              <div class="standard-doc-icon-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="standard-doc-ext font-mono">${ext}</span>
              </div>
            `
            }
          </div>
          <div class="doc-card-details">
            <h4 class="doc-card-filename" title="${file.name}">${file.name}</h4>
            <div class="doc-card-meta-row">
              <span class="meta-item font-mono">${formatBytes(file.size)}</span>
              <span class="meta-sep">•</span>
              <span class="meta-item">${ext} Document</span>
              <span class="meta-sep">•</span>
              <span class="meta-item" style="color: var(--pra-success);">Verified Ready</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getPrimaryActionLabel(): string {
    switch (this.tool.id) {
      case 'merge-pdf':
        return 'Merge PDF';
      case 'split-pdf':
        return 'Split PDF';
      case 'organize-pdf':
      case 'organize-pdf-pages':
        return 'Organize PDF Pages';
      case 'delete-pdf-pages':
        return 'Delete Selected Pages';
      case 'extract-pdf-pages':
        return 'Extract Pages';
      case 'rotate-pdf':
        return 'Rotate PDF';
      case 'crop-pdf':
        return 'Crop PDF';
      case 'compress-pdf':
        return 'Compress PDF';
      case 'ocr-pdf':
        return 'Run OCR';
      case 'add-page-numbers':
        return 'Add Page Numbers';
      case 'watermark-pdf':
        return 'Apply Watermark';
      case 'full-pdf-editing':
        return 'Open PDF Studio';
      case 'password-protect-pdf':
        return 'Protect PDF';
      case 'unlock-pdf':
        return 'Unlock PDF';
      case 'edit-pdf-metadata':
        return 'Save Metadata';
      case 'extract-pdf-text':
        return 'Extract Text';
      case 'pdf-to-jpg':
        return 'Convert to JPG';
      case 'pdf-to-png':
        return 'Convert to PNG';
      case 'pdf-to-word':
        return 'Convert to Word';
      case 'pdf-to-markdown':
        return 'Convert to Markdown';
      case 'rtf-conversion':
        return 'Convert Document';
      default:
        return 'Convert to PDF';
    }
  }

  private renderDirectEditor(): string {
    if (this.tool.id === 'html-to-pdf') {
      return `
        <div class="direct-editor-header">
          <label class="form-label">HTML Code Input</label>
          <span style="font-size: 0.8rem; color: var(--pra-text-muted);">Enter or paste valid HTML markup</span>
        </div>
        <textarea id="direct-html-input" class="form-textarea code-editor" rows="12" placeholder="<!DOCTYPE html>&#10;<html>&#10;<body>&#10;  <h1>My Document</h1>&#10;  <p>Created with PRA PDF by PRAVERSE.</p>&#10;</body>&#10;</html>"><!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 24px; color: #1e293b; }
    h1 { color: #E11D48; }
  </style>
</head>
<body>
  <h1>Document Heading</h1>
  <p>This document was formatted with PRA PDF by PRAVERSE.</p>
</body>
</html></textarea>
      `;
    }

    if (this.tool.id === 'markdown-to-pdf') {
      return `
        <div class="markdown-two-panel">
          <div class="markdown-input-col">
            <label class="form-label">Markdown Input</label>
            <textarea id="direct-md-input" class="form-textarea code-editor" rows="14" placeholder="# Document Title&#10;&#10;Write your markdown here..."># Project Specification
## Created with PRA PDF by PRAVERSE

### Features
- **Deterministic** PDF rendering
- **Strict 50 MB** file limit
- **Zero AI** tracking

### Next Steps
1. Review document
2. Download PDF</textarea>
          </div>
          <div class="markdown-preview-col">
            <label class="form-label">Live Preview</label>
            <div id="direct-md-preview" class="markdown-preview-box">
              <h1>Project Specification</h1>
              <h2>Created with PRA PDF by PRAVERSE</h2>
              <h3>Features</h3>
              <ul>
                <li><strong>Deterministic</strong> PDF rendering</li>
                <li><strong>Strict 50 MB</strong> file limit</li>
                <li><strong>Zero AI</strong> tracking</li>
              </ul>
              <h3>Next Steps</h3>
              <ol>
                <li>Review document</li>
                <li>Download PDF</li>
              </ol>
            </div>
          </div>
        </div>
      `;
    }

    if (this.tool.id === 'txt-to-pdf') {
      return `
        <div class="direct-editor-header">
          <label class="form-label">Plain Text Input</label>
          <span style="font-size: 0.8rem; color: var(--pra-text-muted);">Type or paste plain text content</span>
        </div>
        <textarea id="direct-txt-input" class="form-textarea" rows="12" placeholder="Type plain text content here...">PRA PDF Document Toolkit
A PRAVERSE Company

This text will be formatted and paginated into a clean PDF document.
- Maximum file size: 50 MB
- Zero AI data retention
- Precision conversion</textarea>
      `;
    }

    return '';
  }

  /**
   * Purpose-built sidebar configuration options for each of the 30 tools
   */
  private renderToolOptions(): string {
    switch (this.tool.id) {
      // 1. JPG to PDF / 2. PNG to PDF
      case 'jpg-to-pdf':
      case 'png-to-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-img-pagesize">
                <option value="a4" selected>A4 (Standard 210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="fit">Fit to Image Dimensions</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Page Orientation</label>
              <select class="form-select" id="opt-img-orientation">
                <option value="portrait" selected>Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="auto">Auto-detect from image</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Margins</label>
              <select class="form-select" id="opt-img-margin">
                <option value="none">No Margin (Full Bleed)</option>
                <option value="small" selected>Small Margin (10 mm)</option>
                <option value="large">Big Margin (25 mm)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Image Fit</label>
              <select class="form-select" id="opt-img-fit">
                <option value="fit" selected>Fit Entire Image</option>
                <option value="fill">Fill Page (Crop Overflow)</option>
              </select>
            </div>
          </div>
        `;

      // 3. Images to PDF
      case 'images-to-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-images-pagesize">
                <option value="a4" selected>A4 Standard</option>
                <option value="letter">US Letter</option>
                <option value="fit">Fit to each image</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Orientation</label>
              <select class="form-select" id="opt-images-orientation">
                <option value="auto" selected>Auto (Per image aspect)</option>
                <option value="portrait">All Portrait</option>
                <option value="landscape">All Landscape</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Margins</label>
              <select class="form-select" id="opt-images-margin">
                <option value="none">None</option>
                <option value="small" selected>Small (10 mm)</option>
                <option value="large">Big (25 mm)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Image Fit</label>
              <select class="form-select" id="opt-images-fit">
                <option value="fit" selected>Fit page</option>
                <option value="fill">Fill page</option>
              </select>
            </div>
          </div>
        `;

      // 4. Word to PDF
      case 'word-to-pdf':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">ℹ️</div>
              <div class="info-box-text">
                Direct Word to PDF conversion preserves headers, paragraphs, styling, and embedded tables.
              </div>
            </div>
          </div>
        `;

      // 5. Excel to PDF
      case 'excel-to-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Sheet Selection</label>
              <select class="form-select" id="opt-excel-sheets">
                <option value="all" selected>Convert All Sheets</option>
                <option value="first">First Sheet Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Orientation</label>
              <select class="form-select" id="opt-excel-orientation">
                <option value="landscape" selected>Landscape (Recommended for tables)</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fit to Page</label>
              <select class="form-select" id="opt-excel-fit">
                <option value="width" selected>Fit All Columns to Width</option>
                <option value="actual">Actual Scale</option>
              </select>
            </div>
          </div>
        `;

      // 6. PowerPoint to PDF
      case 'powerpoint-to-pdf':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">📊</div>
              <div class="info-box-text">
                PowerPoint slides are rendered sequentially into widescreen PDF pages.
              </div>
            </div>
          </div>
        `;

      // 8. TXT to PDF
      case 'txt-to-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Font Family</label>
              <select class="form-select" id="opt-txt-font">
                <option value="Helvetica" selected>Helvetica (Clean Sans)</option>
                <option value="Courier">Courier (Monospace)</option>
                <option value="Times">Times Roman (Serif)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Font Size</label>
              <select class="form-select" id="opt-txt-size">
                <option value="10">10 pt (Compact)</option>
                <option value="12" selected>12 pt (Standard)</option>
                <option value="14">14 pt (Large)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-txt-pagesize">
                <option value="a4" selected>A4</option>
                <option value="letter">US Letter</option>
              </select>
            </div>
          </div>
        `;

      // 10. PDF to JPG / 11. PDF to PNG
      case 'pdf-to-jpg':
      case 'pdf-to-png':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Pages to Convert</label>
              <select class="form-select" id="opt-pdf2img-pages">
                <option value="all" selected>Convert All Pages</option>
                <option value="first">First Page Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Resolution / Quality</label>
              <select class="form-select" id="opt-pdf2img-quality">
                <option value="high" selected>High (300 DPI — Print Quality)</option>
                <option value="medium">Balanced (150 DPI — Standard Web)</option>
                <option value="low">Compact (72 DPI — Smallest ZIP)</option>
              </select>
            </div>
          </div>
        `;

      // 14. Merge PDF
      case 'merge-pdf':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">📑</div>
              <div class="info-box-text">
                Drag cards or use arrow buttons in the canvas to arrange your desired merge order.
              </div>
            </div>
          </div>
        `;

      // 15. Split PDF
      case 'split-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Split Mode</label>
              <select class="form-select" id="opt-split-mode">
                <option value="ranges" selected>Extract Page Ranges</option>
                <option value="all">Separate Every Page into PDF</option>
              </select>
            </div>
            <div class="form-group" id="opt-split-range-group">
              <label class="form-label">Page Ranges</label>
              <input type="text" class="form-input" id="opt-split-ranges" placeholder="e.g. 1-2, 4" value="1" />
              <small class="form-hint">Separate multiple ranges with commas (e.g. 1-3, 5-8).</small>
            </div>
          </div>
        `;

      // 17. Delete PDF Pages
      case 'delete-pdf-pages':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Pages to Remove</label>
              <input type="text" class="form-input" id="opt-delete-pages" placeholder="e.g. 1, 3-5" value="" />
              <small class="form-hint">Click thumbnails on the left canvas to select pages to delete.</small>
            </div>
          </div>
        `;

      // 18. Extract PDF Pages
      case 'extract-pdf-pages':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Pages to Extract</label>
              <input type="text" class="form-input" id="opt-extract-pages" placeholder="e.g. 1-3, 5" value="1" />
              <small class="form-hint">Click thumbnails on the left canvas to select pages to extract.</small>
            </div>
          </div>
        `;

      // 19. Rotate PDF
      case 'rotate-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Default Rotation Angle</label>
              <select class="form-select" id="opt-rotate-angle">
                <option value="90" selected>90° Clockwise</option>
                <option value="180">180° Flip</option>
                <option value="270">270° Counter-Clockwise</option>
              </select>
            </div>
            <div class="sidebar-info-box">
              <div class="info-box-icon">🔄</div>
              <div class="info-box-text">
                Hover over any thumbnail on the left canvas to rotate that individual page.
              </div>
            </div>
          </div>
        `;

      // 20. Crop PDF
      case 'crop-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Top Margin (pt)</label>
              <input type="number" class="form-input" id="opt-crop-top" value="20" min="0" max="200" />
            </div>
            <div class="form-group">
              <label class="form-label">Right Margin (pt)</label>
              <input type="number" class="form-input" id="opt-crop-right" value="20" min="0" max="200" />
            </div>
            <div class="form-group">
              <label class="form-label">Bottom Margin (pt)</label>
              <input type="number" class="form-input" id="opt-crop-bottom" value="20" min="0" max="200" />
            </div>
            <div class="form-group">
              <label class="form-label">Left Margin (pt)</label>
              <input type="number" class="form-input" id="opt-crop-left" value="20" min="0" max="200" />
            </div>
          </div>
        `;

      // 21. Compress PDF (iLovePDF signature 3 compression cards)
      case 'compress-pdf':
        return `
          <div class="options-stack">
            <label class="form-label">Compression Level</label>
            <div class="ilove-comp-cards-list">
              <label class="ilove-comp-card" data-level="high">
                <input type="radio" name="comp-level" value="high" />
                <div class="comp-card-body">
                  <div class="comp-card-title">Extreme Compression</div>
                  <div class="comp-card-sub">Less quality, high file reduction</div>
                </div>
              </label>

              <label class="ilove-comp-card active" data-level="medium">
                <input type="radio" name="comp-level" value="medium" checked />
                <div class="comp-card-body">
                  <div class="comp-card-title-row">
                    <span class="comp-card-title">Recommended Compression</span>
                    <span class="comp-badge-rec">RECOMMENDED</span>
                  </div>
                  <div class="comp-card-sub">Good quality, strong compression</div>
                </div>
              </label>

              <label class="ilove-comp-card" data-level="low">
                <input type="radio" name="comp-level" value="low" />
                <div class="comp-card-body">
                  <div class="comp-card-title">Low Compression</div>
                  <div class="comp-card-sub">High quality, light compression</div>
                </div>
              </label>
            </div>
          </div>
        `;

      // 22. OCR PDF
      case 'ocr-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">OCR Document Language</label>
              <select class="form-select" id="opt-ocr-lang">
                <option value="eng" selected>English (eng)</option>
                <option value="spa">Spanish (spa)</option>
                <option value="fra">French (fra)</option>
                <option value="deu">German (deu)</option>
                <option value="hin">Hindi (hin)</option>
              </select>
            </div>
            <div class="sidebar-info-box">
              <div class="info-box-icon">⚡</div>
              <div class="info-box-text">
                WebAssembly client-side engine. Recognizes scanned text into a searchable layer.
              </div>
            </div>
          </div>
        `;

      // 23. Add Page Numbers (iLovePDF 3x3 position matrix)
      case 'add-page-numbers':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Position Grid</label>
              <div class="pos-3x3-grid">
                <button type="button" class="pos-grid-cell" data-pos="top-left" title="Top Left">↖</button>
                <button type="button" class="pos-grid-cell" data-pos="top-center" title="Top Center">↑</button>
                <button type="button" class="pos-grid-cell" data-pos="top-right" title="Top Right">↗</button>
                <button type="button" class="pos-grid-cell" data-pos="center-left" title="Center Left">←</button>
                <button type="button" class="pos-grid-cell" data-pos="center" title="Center">•</button>
                <button type="button" class="pos-grid-cell" data-pos="center-right" title="Center Right">→</button>
                <button type="button" class="pos-grid-cell" data-pos="bottom-left" title="Bottom Left">↙</button>
                <button type="button" class="pos-grid-cell active" data-pos="bottom-center" title="Bottom Center">↓</button>
                <button type="button" class="pos-grid-cell" data-pos="bottom-right" title="Bottom Right">↘</button>
              </div>
              <select class="form-select" id="opt-page-num-pos" style="display: none;">
                <option value="bottom-center" selected>Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Format Style</label>
              <select class="form-select" id="opt-page-num-fmt">
                <option value="Page n of total" selected>Page X of Y</option>
                <option value="Page n">Page X</option>
                <option value="n/total">X / Y</option>
                <option value="n">Numbers Only (1, 2, 3...)</option>
              </select>
            </div>
          </div>
        `;

      // 24. Watermark PDF
      case 'watermark-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Watermark Text</label>
              <input type="text" class="form-input" id="opt-watermark-text" value="CONFIDENTIAL" />
            </div>

            <div class="form-group">
              <label class="form-label">Opacity (<span id="wm-opacity-display">30%</span>)</label>
              <input type="range" class="form-range" id="opt-watermark-opacity" min="0.1" max="1.0" step="0.05" value="0.3" />
            </div>

            <div class="form-group">
              <label class="form-label">Rotation Angle</label>
              <select class="form-select" id="opt-watermark-angle">
                <option value="45" selected>45° Diagonal</option>
                <option value="0">0° Horizontal</option>
                <option value="90">90° Vertical</option>
              </select>
            </div>
          </div>
        `;

      // 26. Password-Protect PDF
      case 'password-protect-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Set Password</label>
              <div class="password-input-wrapper">
                <input type="password" class="form-input" id="opt-protect-pass" placeholder="Enter secure password" />
                <button type="button" class="pwd-toggle-btn" id="btn-toggle-protect-pwd" title="Show / Hide">👁️</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input type="password" class="form-input" id="opt-protect-pass-confirm" placeholder="Re-enter password" />
            </div>

            <div class="password-strength-box" id="pwd-strength-container" style="display: none;">
              <div class="strength-bar-track">
                <div class="strength-bar-fill" id="pwd-strength-bar"></div>
              </div>
              <span class="strength-label" id="pwd-strength-label">Password Strength</span>
            </div>
          </div>
        `;

      // 27. Unlock PDF
      case 'unlock-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Document Password (if encrypted)</label>
              <input type="password" class="form-input" id="opt-unlock-pass" placeholder="Enter PDF password" />
            </div>
            <div class="sidebar-info-box">
              <div class="info-box-icon">🔒</div>
              <div class="info-box-text">
                Removes encryption and print/copy restrictions from authorized documents.
              </div>
            </div>
          </div>
        `;

      // 28. Edit PDF Metadata
      case 'edit-pdf-metadata':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Document Title</label>
              <input type="text" class="form-input" id="opt-meta-title" placeholder="Document Title" />
            </div>
            <div class="form-group">
              <label class="form-label">Author</label>
              <input type="text" class="form-input" id="opt-meta-author" placeholder="Author Name" />
            </div>
            <div class="form-group">
              <label class="form-label">Subject</label>
              <input type="text" class="form-input" id="opt-meta-subject" placeholder="Document Subject" />
            </div>
            <div class="form-group">
              <label class="form-label">Keywords</label>
              <input type="text" class="form-input" id="opt-meta-keywords" placeholder="e.g. report, pdf, praverse" />
            </div>
          </div>
        `;

      // 29. Extract PDF Text
      case 'extract-pdf-text':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">📝</div>
              <div class="info-box-text">
                Extracts clean plaintext formatting. Download as .txt or copy directly to clipboard.
              </div>
            </div>
          </div>
        `;

      // 30. RTF Conversion
      case 'rtf-conversion':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Conversion Mode</label>
              <select class="form-select" id="opt-rtf-mode">
                <option value="auto" selected>Auto-detect (RTF to PDF / PDF to RTF)</option>
                <option value="rtf-to-pdf">RTF → PDF</option>
                <option value="pdf-to-rtf">PDF → RTF</option>
              </select>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  private bindEvents(): void {
    const processBtn = this.container.querySelector('#tp-process-btn') as HTMLElement;
    const errorBanner = this.container.querySelector('#tp-error-banner') as HTMLElement;
    const retryBtn = this.container.querySelector('#tp-error-retry-btn');
    const backToPickerBtn = this.container.querySelector('#btn-back-to-picker');

    backToPickerBtn?.addEventListener('click', () => {
      this.transitionToSelection();
    });

    retryBtn?.addEventListener('click', () => {
      errorBanner.style.display = 'none';
      if (this.selectedFiles.length > 0) {
        processBtn?.click();
      }
    });

    // Dual Input tab switcher
    const tabFile = this.container.querySelector('#tab-mode-file');
    const tabDirect = this.container.querySelector('#tab-mode-direct');
    const dropzoneWrapper = this.container.querySelector('#tp-dropzone-wrapper') as HTMLElement;
    const directEditorWrapper = this.container.querySelector('#tp-direct-editor-container') as HTMLElement;

    if (tabFile && tabDirect) {
      tabFile.addEventListener('click', () => {
        this.inputMode = 'file';
        tabFile.classList.add('active');
        tabDirect.classList.remove('active');
        if (dropzoneWrapper) dropzoneWrapper.style.display = 'block';
        if (directEditorWrapper) directEditorWrapper.style.display = 'none';
      });

      tabDirect.addEventListener('click', () => {
        this.inputMode = 'direct';
        tabDirect.classList.add('active');
        tabFile.classList.remove('active');
        if (dropzoneWrapper) dropzoneWrapper.style.display = 'none';
        if (directEditorWrapper) directEditorWrapper.style.display = 'block';
        this.transitionToWorkspace();
      });
    }

    // Markdown Live Preview updater
    const mdInput = this.container.querySelector('#direct-md-input') as HTMLTextAreaElement;
    const mdPreview = this.container.querySelector('#direct-md-preview');
    if (mdInput && mdPreview) {
      mdInput.addEventListener('input', () => {
        const raw = mdInput.value;
        const html = raw
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/\n$/gim, '<br />');
        mdPreview.innerHTML = html;
      });
    }

    // Password show/hide toggle & strength meter
    const pwdToggle = this.container.querySelector('#btn-toggle-protect-pwd');
    const pwdInput = this.container.querySelector('#opt-protect-pass') as HTMLInputElement;
    const pwdStrengthBox = this.container.querySelector('#pwd-strength-container') as HTMLElement;
    const pwdStrengthBar = this.container.querySelector('#pwd-strength-bar') as HTMLElement;
    const pwdStrengthLabel = this.container.querySelector('#pwd-strength-label') as HTMLElement;

    if (pwdToggle && pwdInput) {
      pwdToggle.addEventListener('click', () => {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      });
    }

    if (pwdInput && pwdStrengthBox) {
      pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        if (!val) {
          pwdStrengthBox.style.display = 'none';
          return;
        }
        pwdStrengthBox.style.display = 'block';

        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        if (score <= 1) {
          if (pwdStrengthBar) {
            pwdStrengthBar.style.width = '25%';
            pwdStrengthBar.style.backgroundColor = '#EF4444';
          }
          if (pwdStrengthLabel) pwdStrengthLabel.textContent = 'Weak Password';
        } else if (score === 2 || score === 3) {
          if (pwdStrengthBar) {
            pwdStrengthBar.style.width = '65%';
            pwdStrengthBar.style.backgroundColor = '#F59E0B';
          }
          if (pwdStrengthLabel) pwdStrengthLabel.textContent = 'Medium Password';
        } else {
          if (pwdStrengthBar) {
            pwdStrengthBar.style.width = '100%';
            pwdStrengthBar.style.backgroundColor = '#10B981';
          }
          if (pwdStrengthLabel) pwdStrengthLabel.textContent = 'Strong Password';
        }
      });
    }

    // Watermark Opacity slider readout
    const wmOpacityRange = this.container.querySelector('#opt-watermark-opacity') as HTMLInputElement;
    const wmOpacityDisplay = this.container.querySelector('#wm-opacity-display');
    if (wmOpacityRange && wmOpacityDisplay) {
      wmOpacityRange.addEventListener('input', () => {
        const pct = Math.round(parseFloat(wmOpacityRange.value) * 100);
        wmOpacityDisplay.textContent = `${pct}%`;
      });
    }

    // Compression profiles selection card active state
    this.container.querySelectorAll('.ilove-comp-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.container.querySelectorAll('.ilove-comp-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input[type="radio"]') as HTMLInputElement;
        if (radio) radio.checked = true;
      });
    });

    // Primary Action Button Execution
    processBtn?.addEventListener('click', async () => {
      errorBanner.style.display = 'none';
      processBtn.setAttribute('disabled', 'true');
      this.progressBar.reset();
      this.progressBar.show();

      try {
        await this.executeService();
      } catch (err: any) {
        console.error(`[Tool Execution: ${this.tool.id}] Error:`, err);
        this.progressBar.hide();
        const errorDesc = this.container.querySelector('#tp-error-message') as HTMLElement;
        if (errorDesc) {
          errorDesc.textContent = err?.message || 'Processing failed. Please check your document and try again.';
        }
        errorBanner.style.display = 'flex';
      } finally {
        processBtn.removeAttribute('disabled');
      }
    });
  }

  private async executeService(): Promise<void> {
    const onProgress = (percent: number, status: string) => {
      this.progressBar.update(percent, status);
    };

    // Handle Direct Editor Inputs for HTML, Markdown, and TXT
    if (this.inputMode === 'direct') {
      if (this.tool.id === 'html-to-pdf') {
        const htmlCode = (this.container.querySelector('#direct-html-input') as HTMLTextAreaElement)?.value || '';
        const syntheticFile = new File([htmlCode], 'document.html', { type: 'text/html' });
        const bytes = await convertHtmlToPdf(syntheticFile, { onProgress });
        this.finishResult('document.pdf', bytes);
        return;
      }
      if (this.tool.id === 'markdown-to-pdf') {
        const mdText = (this.container.querySelector('#direct-md-input') as HTMLTextAreaElement)?.value || '';
        const syntheticFile = new File([mdText], 'document.md', { type: 'text/markdown' });
        const bytes = await convertMarkdownToPdf(syntheticFile, { onProgress });
        this.finishResult('document.pdf', bytes);
        return;
      }
      if (this.tool.id === 'txt-to-pdf') {
        const txtText = (this.container.querySelector('#direct-txt-input') as HTMLTextAreaElement)?.value || '';
        const syntheticFile = new File([txtText], 'document.txt', { type: 'text/plain' });
        const bytes = await convertTxtToPdf(syntheticFile, { onProgress });
        this.finishResult('document.pdf', bytes);
        return;
      }
    }

    const file = this.selectedFiles[0];
    if (!file && this.tool.id !== 'full-pdf-editing') {
      throw new Error('Please select at least one file before processing.');
    }

    const baseName = file?.name?.replace(/\.[^/.]+$/, '') || 'document';

    switch (this.tool.id) {
      // 1. JPG to PDF
      case 'jpg-to-pdf': {
        const bytes = await convertJpgToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 2. PNG to PDF
      case 'png-to-pdf': {
        const bytes = await convertPngToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 3. Images to PDF
      case 'images-to-pdf': {
        const bytes = await convertImagesToPdf(this.selectedFiles, { onProgress });
        this.finishResult('compiled-images.pdf', bytes);
        break;
      }
      // 4. Word to PDF
      case 'word-to-pdf': {
        const bytes = await convertWordToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 5. Excel to PDF
      case 'excel-to-pdf': {
        const bytes = await convertExcelToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 6. PowerPoint to PDF
      case 'powerpoint-to-pdf': {
        const bytes = await convertPowerPointToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 7. HTML to PDF
      case 'html-to-pdf': {
        const bytes = await convertHtmlToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 8. TXT to PDF
      case 'txt-to-pdf': {
        const bytes = await convertTxtToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 9. Markdown to PDF
      case 'markdown-to-pdf': {
        const bytes = await convertMarkdownToPdf(file, { onProgress });
        this.finishResult(`${baseName}.pdf`, bytes);
        break;
      }
      // 10. PDF to JPG
      case 'pdf-to-jpg': {
        const res = await convertPdfToJpg(file, { onProgress });
        this.finishResult(res.filename, res.data);
        break;
      }
      // 11. PDF to PNG
      case 'pdf-to-png': {
        const res = await convertPdfToPng(file, { onProgress });
        this.finishResult(res.filename, res.data);
        break;
      }
      // 12. PDF to Markdown
      case 'pdf-to-markdown': {
        const mdText = await convertPdfToMarkdown(file, { onProgress });
        this.finishResult(`${baseName}.md`, mdText);
        break;
      }
      // 13. PDF to Word
      case 'pdf-to-word': {
        const docxBlob = await convertPdfToWord(file, { onProgress });
        this.finishResult(`${baseName}.docx`, docxBlob);
        break;
      }
      // 14. Merge PDF
      case 'merge-pdf': {
        if (this.selectedFiles.length < 2) {
          throw new Error('Merge PDF requires at least two PDF documents.');
        }
        const mergedBytes = await mergePdfs(this.selectedFiles, { onProgress });
        this.finishResult('merged-document.pdf', mergedBytes);
        break;
      }
      // 15. Split PDF
      case 'split-pdf': {
        const mode = (document.getElementById('opt-split-mode') as HTMLSelectElement)?.value as any || 'ranges';
        const range = (document.getElementById('opt-split-ranges') as HTMLInputElement)?.value || '1';
        const res = await splitPdf(file, { mode, rangeString: range, onProgress });
        this.finishResult(res.filename, res.data);
        break;
      }
      // 16. Organize PDF Pages
      case 'organize-pdf':
      case 'organize-pdf-pages': {
        window.location.hash = '#/editor';
        break;
      }
      // 17. Delete PDF Pages
      case 'delete-pdf-pages': {
        const delSpec = (document.getElementById('opt-delete-pages') as HTMLInputElement)?.value || '1';
        const res = await deletePdfPages(file, delSpec, { onProgress });
        this.finishResult(`${baseName}-pages-removed.pdf`, res);
        break;
      }
      // 18. Extract PDF Pages
      case 'extract-pdf-pages': {
        const extSpec = (document.getElementById('opt-extract-pages') as HTMLInputElement)?.value || '1';
        const res = await extractPdfPages(file, extSpec, { onProgress });
        this.finishResult(`${baseName}-extracted.pdf`, res);
        break;
      }
      // 19. Rotate PDF
      case 'rotate-pdf': {
        const angle = parseInt((document.getElementById('opt-rotate-angle') as HTMLSelectElement)?.value || '90', 10) as any;
        const res = await rotatePdf(file, angle, undefined, { onProgress });
        this.finishResult(`${baseName}-rotated.pdf`, res);
        break;
      }
      // 20. Crop PDF
      case 'crop-pdf': {
        const top = parseInt((document.getElementById('opt-crop-top') as HTMLInputElement)?.value, 10) || 0;
        const right = parseInt((document.getElementById('opt-crop-right') as HTMLInputElement)?.value, 10) || 0;
        const bottom = parseInt((document.getElementById('opt-crop-bottom') as HTMLInputElement)?.value, 10) || 0;
        const left = parseInt((document.getElementById('opt-crop-left') as HTMLInputElement)?.value, 10) || 0;
        const res = await cropPdf(file, { top, right, bottom, left }, { onProgress });
        this.finishResult(`${baseName}-cropped.pdf`, res);
        break;
      }
      // 21. Compress PDF
      case 'compress-pdf': {
        const checkedRadio = document.querySelector('input[name="comp-level"]:checked') as HTMLInputElement;
        const level = (checkedRadio?.value || 'medium') as any;
        const res = await compressPdf(file, { level, onProgress });
        this.finishResult(`${baseName}-compressed.pdf`, res.data, res.originalSize, res.newSize, res.ratio);
        break;
      }
      // 22. OCR PDF
      case 'ocr-pdf': {
        const lang = (document.getElementById('opt-ocr-lang') as HTMLSelectElement)?.value || 'eng';
        const res = await ocrPdf(file, { language: lang, onProgress });
        this.finishResult(`${baseName}-searchable-ocr.pdf`, res.data);
        break;
      }
      // 23. Add Page Numbers
      case 'add-page-numbers': {
        const pos = (document.getElementById('opt-page-num-pos') as HTMLSelectElement)?.value as any || 'bottom-center';
        const fmt = (document.getElementById('opt-page-num-fmt') as HTMLSelectElement)?.value as any || 'Page n of total';
        const res = await addPageNumbersToPdf(file, { position: pos, format: fmt, onProgress });
        this.finishResult(`${baseName}-numbered.pdf`, res);
        break;
      }
      // 24. Watermark PDF
      case 'watermark-pdf': {
        const text = (document.getElementById('opt-watermark-text') as HTMLInputElement)?.value || 'CONFIDENTIAL';
        const opacity = parseFloat((document.getElementById('opt-watermark-opacity') as HTMLInputElement)?.value) || 0.3;
        const rotation = parseInt((document.getElementById('opt-watermark-angle') as HTMLSelectElement)?.value, 10) || 45;
        const res = await watermarkPdf(file, { type: 'text', text, opacity, rotation, onProgress });
        this.finishResult(`${baseName}-watermarked.pdf`, res);
        break;
      }
      // 25. Full PDF Editing
      case 'full-pdf-editing': {
        window.location.hash = '#/editor';
        break;
      }
      // 26. Password-Protect PDF
      case 'password-protect-pdf': {
        const pass = (document.getElementById('opt-protect-pass') as HTMLInputElement)?.value || '';
        const confirm = (document.getElementById('opt-protect-pass-confirm') as HTMLInputElement)?.value || '';
        if (!pass) throw new Error('Please enter a password to protect your document.');
        if (pass !== confirm) throw new Error('Passwords do not match. Please verify your entry.');
        const res = await passwordProtectPdf(file, { userPassword: pass, onProgress });
        this.finishResult(`${baseName}-protected.pdf`, res);
        break;
      }
      // 27. Unlock PDF
      case 'unlock-pdf': {
        const pass = (document.getElementById('opt-unlock-pass') as HTMLInputElement)?.value || '';
        const res = await unlockPdf(file, pass, { onProgress });
        this.finishResult(`${baseName}-unlocked.pdf`, res);
        break;
      }
      // 28. Edit PDF Metadata
      case 'edit-pdf-metadata': {
        const title = (document.getElementById('opt-meta-title') as HTMLInputElement)?.value || '';
        const author = (document.getElementById('opt-meta-author') as HTMLInputElement)?.value || '';
        const subject = (document.getElementById('opt-meta-subject') as HTMLInputElement)?.value || '';
        const keywords = (document.getElementById('opt-meta-keywords') as HTMLInputElement)?.value || '';
        const res = await editPdfMetadata(file, { title, author, subject, keywords }, { onProgress });
        this.finishResult(`${baseName}-metadata-updated.pdf`, res);
        break;
      }
      // 29. Extract PDF Text
      case 'extract-pdf-text': {
        const text = await convertPdfToText(file, { onProgress });
        this.finishResult(`${baseName}.txt`, text);
        break;
      }
      // 30. RTF Conversion
      case 'rtf-conversion': {
        if (file.name.toLowerCase().endsWith('.rtf')) {
          const res = await convertRtfToPdf(file, { onProgress });
          this.finishResult(`${baseName}.pdf`, res);
        } else {
          const rtf = await convertPdfToRtf(file, { onProgress });
          this.finishResult(`${baseName}.rtf`, rtf);
        }
        break;
      }
      default:
        throw new Error(`Tool "${this.tool.title}" is being routed.`);
    }
  }

  private finishResult(
    filename: string,
    data: Uint8Array | Blob | string,
    originalSize?: number,
    newSize?: number,
    ratio?: string
  ): void {
    this.progressBar.update(100, 'Processing complete!');
    this.progressBar.hide();

    // Hide workspace
    const workspaceContainer = this.container.querySelector('#tp-workspace-container') as HTMLElement;
    if (workspaceContainer) workspaceContainer.style.display = 'none';

    this.resultCard.show({
      filename,
      data,
      originalSize,
      newSize,
      reductionRatio: ratio,
      toolId: this.tool.id,
      toolTitle: this.tool.title,
      onReset: () => {
        this.transitionToSelection();
      },
    });
  }
}
