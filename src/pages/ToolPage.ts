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
import { consumeStagedFile } from '../services/core/cleanup';
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
  organizePdfPages,
  deletePdfPages,
  extractPdfPages,
  rotatePdf,
  cropPdf,
  editPdfMetadata,
  extractPdfMetadata,
  deletePdfAnnotations,
  flipPdf,
  splitPdfInHalf,
  alternateMixPdf,
  nUpPdf,
} from '../services/organizePdf';

import { addPageNumbersToPdf, watermarkPdf, fullPdfEdit } from '../services/annotatePdf';
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
  private isProcessing: boolean = false;

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
    if (this.tool.status === 'coming-soon') {
      this.renderComingSoon();
      return;
    }

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

    // Ephemeral document staging (auto-preload document from previous tool workflow)
    const staged = consumeStagedFile();
    if (staged && this.tool.acceptedExtensions.some((ext) => staged.name.toLowerCase().endsWith(ext.toLowerCase()))) {
      this.selectedFiles = [staged];
      this.dropzone.setFiles([staged]);
      setTimeout(() => {
        this.transitionToWorkspace();
      }, 50);
    }
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
    const resultContainer = this.container.querySelector('#tp-result-container') as HTMLElement;

    if (selectionStage) selectionStage.style.display = 'block';
    if (workspaceContainer) workspaceContainer.style.display = 'none';
    if (heroHeader) heroHeader.style.display = 'block';
    if (resultContainer) resultContainer.style.display = 'none';

    this.pageThumbnails = [];
    this.multiFileItems = [];
    this.selectedFiles = [];
    this.dropzone.clearFiles();
    this.resultCard.hide();
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

    // 1. Multi-file tools: Merge PDF, Images to PDF, JPG to PDF, PNG to PDF
    if (
      this.tool.id === 'merge-pdf' ||
      this.tool.id === 'images-to-pdf' ||
      this.tool.id === 'jpg-to-pdf' ||
      this.tool.id === 'png-to-pdf'
    ) {
      const typeLabel =
        this.tool.id === 'merge-pdf'
          ? 'Document'
          : this.tool.id === 'jpg-to-pdf'
          ? 'JPG Image'
          : this.tool.id === 'png-to-pdf'
          ? 'PNG Image'
          : 'Image';
      const actionLabel = this.tool.id === 'merge-pdf' ? 'Merge' : 'Convert to PDF';

      summaryLabel.textContent = `${this.selectedFiles.length} ${typeLabel}${this.selectedFiles.length > 1 ? 's' : ''} to ${actionLabel}`;
      toolbarActions.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-add-more-files">
          + Add ${this.tool.id === 'merge-pdf' ? 'Files' : 'Images'}
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

    // 7. Pre-fill existing metadata if tool is Edit PDF Metadata
    if (this.tool.id === 'edit-pdf-metadata') {
      const file = this.selectedFiles[0];
      if (file) {
        try {
          const meta = await extractPdfMetadata(file);
          const titleInput = this.container.querySelector('#opt-meta-title') as HTMLInputElement;
          const authorInput = this.container.querySelector('#opt-meta-author') as HTMLInputElement;
          const subjectInput = this.container.querySelector('#opt-meta-subject') as HTMLInputElement;
          const keywordsInput = this.container.querySelector('#opt-meta-keywords') as HTMLInputElement;
          const creatorInput = this.container.querySelector('#opt-meta-creator') as HTMLInputElement;
          const producerInput = this.container.querySelector('#opt-meta-producer') as HTMLInputElement;

          if (titleInput && meta.title) titleInput.value = meta.title;
          if (authorInput && meta.author) authorInput.value = meta.author;
          if (subjectInput && meta.subject) subjectInput.value = meta.subject;
          if (keywordsInput && meta.keywords) keywordsInput.value = meta.keywords;
          if (creatorInput && meta.creator) creatorInput.value = meta.creator;
          if (producerInput && meta.producer) producerInput.value = meta.producer;
        } catch (e) {
          console.warn('Could not read existing PDF metadata:', e);
        }
      }
    }
  }

  /**
   * Renders multi-file grid for Merge PDF and Images to PDF
   */
  private updateMultiFileSummary(): void {
    const summaryLabel = this.container.querySelector('#stage-summary-label') as HTMLElement;
    if (!summaryLabel) return;
    const typeLabel =
      this.tool.id === 'merge-pdf'
        ? 'Document'
        : this.tool.id === 'jpg-to-pdf'
        ? 'JPG Image'
        : this.tool.id === 'png-to-pdf'
        ? 'PNG Image'
        : 'Image';
    const actionLabel = this.tool.id === 'merge-pdf' ? 'Merge' : 'Convert to PDF';
    summaryLabel.textContent = `${this.selectedFiles.length} ${typeLabel}${this.selectedFiles.length > 1 ? 's' : ''} to ${actionLabel}`;
  }

  /**
   * Renders multi-file grid for Merge PDF, Images to PDF, JPG to PDF, and PNG to PDF
   */
  private async renderMultiFileGrid(): Promise<void> {
    const canvasContent = this.container.querySelector('#canvas-dynamic-content') as HTMLElement;
    if (!canvasContent) return;

    const isImageTool = ['jpg-to-pdf', 'png-to-pdf', 'images-to-pdf'].includes(this.tool.id);

    let cardsHtml = '';
    for (let idx = 0; idx < this.selectedFiles.length; idx++) {
      const file = this.selectedFiles[idx];
      let thumbUrl = '';

      if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
        thumbUrl = URL.createObjectURL(file);
      }

      cardsHtml += `
        <div class="ilove-file-card" data-index="${idx}" draggable="true" title="Drag to reorder">
          <div class="file-card-order-badge" title="PDF Page ${idx + 1}">${idx + 1}</div>
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
                <span class="file-fallback-ext">${file.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
              </div>
            `
            }
          </div>
          <div class="file-card-info">
            <div class="file-card-name" title="${file.name}">${file.name}</div>
            <div class="file-card-size">
              ${formatBytes(file.size)}
              <span class="file-card-pages-badge" id="file-pages-badge-${idx}"></span>
            </div>
          </div>
          <div class="file-card-actions">
            <button type="button" class="file-action-icon move-left" data-index="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move left">
              ←
            </button>
            <button type="button" class="file-action-icon move-right" data-index="${idx}" ${idx === this.selectedFiles.length - 1 ? 'disabled' : ''} title="Move right">
              →
            </button>
            <button type="button" class="file-action-icon delete" data-index="${idx}" title="Remove image">
              ✕
            </button>
          </div>
        </div>
      `;
    }

    // Add "+" card at end of grid
    const addLabel = isImageTool ? 'Add more images' : 'Add more files';

    cardsHtml += `
      <div class="ilove-add-file-tile" id="tile-add-more-files" role="button" tabindex="0" title="${addLabel}">
        <div class="add-tile-icon">+</div>
        <div class="add-tile-label">${addLabel}</div>
      </div>
    `;

    canvasContent.innerHTML = `<div class="ilove-file-cards-grid">${cardsHtml}</div>`;
    this.bindMultiFileCardActions();

    // Asynchronously resolve and display page counts for PDF files (Merge PDF)
    if (this.tool.id === 'merge-pdf') {
      this.selectedFiles.forEach((file, idx) => {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          file.arrayBuffer().then((buf) => {
            getPageCountFast(buf).then((pgCount) => {
              const badge = this.container.querySelector(`#file-pages-badge-${idx}`);
              if (badge) {
                badge.textContent = ` • ${pgCount} pg${pgCount > 1 ? 's' : ''}`;
              }
            }).catch(() => {});
          }).catch(() => {});
        }
      });
    }
  }

  private bindMultiFileToolbar(): void {
    const addMoreBtn = this.container.querySelector('#btn-add-more-files');
    const sortBtn = this.container.querySelector('#btn-sort-files-az');
    const reverseBtn = this.container.querySelector('#btn-reverse-files');

    addMoreBtn?.addEventListener('click', () => this.dropzone.openPicker());

    sortBtn?.addEventListener('click', () => {
      this.selectedFiles.sort((a, b) => a.name.localeCompare(b.name));
      this.dropzone.setFiles(this.selectedFiles);
      this.renderMultiFileGrid();
      this.updateSidebarMeta();
      this.updateMultiFileSummary();
    });

    reverseBtn?.addEventListener('click', () => {
      this.selectedFiles.reverse();
      this.dropzone.setFiles(this.selectedFiles);
      this.renderMultiFileGrid();
      this.updateSidebarMeta();
      this.updateMultiFileSummary();
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
        this.dropzone.setFiles(this.selectedFiles);
        if (this.selectedFiles.length === 0) {
          this.transitionToSelection();
        } else {
          this.renderMultiFileGrid();
          this.updateSidebarMeta();
          this.updateMultiFileSummary();
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
          this.dropzone.setFiles(this.selectedFiles);
          this.renderMultiFileGrid();
          this.updateSidebarMeta();
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
          this.dropzone.setFiles(this.selectedFiles);
          this.renderMultiFileGrid();
          this.updateSidebarMeta();
        }
      });
    });

    // HTML5 Drag-and-Drop Reordering across cards
    let draggedIndex: number | null = null;
    const cardEls = this.container.querySelectorAll('.ilove-file-card');

    cardEls.forEach((cardEl) => {
      cardEl.addEventListener('dragstart', (e: Event) => {
        const de = e as DragEvent;
        draggedIndex = parseInt((cardEl as HTMLElement).dataset.index || '0', 10);
        (cardEl as HTMLElement).classList.add('dragging');
        if (de.dataTransfer) {
          de.dataTransfer.effectAllowed = 'move';
          de.dataTransfer.setData('text/plain', String(draggedIndex));
        }
      });

      cardEl.addEventListener('dragend', () => {
        (cardEl as HTMLElement).classList.remove('dragging');
        draggedIndex = null;
      });

      cardEl.addEventListener('dragover', (e: Event) => {
        e.preventDefault();
        const de = e as DragEvent;
        if (de.dataTransfer) de.dataTransfer.dropEffect = 'move';
        (cardEl as HTMLElement).classList.add('drag-over');
      });

      cardEl.addEventListener('dragleave', () => {
        (cardEl as HTMLElement).classList.remove('drag-over');
      });

      cardEl.addEventListener('drop', (e: Event) => {
        e.preventDefault();
        (cardEl as HTMLElement).classList.remove('drag-over');
        const targetIndex = parseInt((cardEl as HTMLElement).dataset.index || '0', 10);
        if (draggedIndex !== null && draggedIndex !== targetIndex) {
          const moved = this.selectedFiles.splice(draggedIndex, 1)[0];
          this.selectedFiles.splice(targetIndex, 0, moved);
          this.dropzone.setFiles(this.selectedFiles);
          this.renderMultiFileGrid();
          this.updateSidebarMeta();
        }
        draggedIndex = null;
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
            1
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
    const fmtSelect = this.container.querySelector('#opt-page-num-fmt') as HTMLSelectElement;
    const startNumInput = this.container.querySelector('#opt-page-num-start-num') as HTMLInputElement;
    const fontSizeInput = this.container.querySelector('#opt-page-num-size') as HTMLInputElement;
    const fontSelect = this.container.querySelector('#opt-page-num-font') as HTMLSelectElement;
    const tag = this.container.querySelector('#live-pagenum-tag') as HTMLElement;

    const updateTag = () => {
      if (!tag) return;
      const fmt = fmtSelect?.value || '{n}';
      const num = parseInt(startNumInput?.value || '1', 10) || 1;
      const total = 12;
      let text = String(num);

      if (fmt === '{n}' || fmt === 'n') {
        text = String(num);
      } else if (fmt.includes('{n}') || fmt.includes('{total}')) {
        text = fmt.replace(/\{n\}/g, String(num)).replace(/\{total\}/g, String(total));
      } else if (fmt === 'Page n') {
        text = `Page ${num}`;
      } else if (fmt === 'Page n of total') {
        text = `Page ${num} of ${total}`;
      } else if (fmt === 'n of total') {
        text = `${num} of ${total}`;
      } else if (fmt === 'n/total') {
        text = `${num} / ${total}`;
      }
      tag.textContent = text;
      const sz = parseInt(fontSizeInput?.value || '10', 10) || 10;
      tag.style.fontSize = `${Math.min(20, Math.max(8, sz))}px`;
      if (fontSelect?.value === 'Courier') {
        tag.style.fontFamily = 'monospace';
      } else if (fontSelect?.value === 'Times') {
        tag.style.fontFamily = 'Georgia, serif';
      } else {
        tag.style.fontFamily = 'inherit';
      }
    };

    posSelect?.addEventListener('change', () => {
      this.livePageNumPosition = posSelect.value;
      if (tag) {
        tag.className = `pagenum-overlay-tag pos-${this.livePageNumPosition}`;
      }
    });

    fmtSelect?.addEventListener('change', updateTag);
    startNumInput?.addEventListener('input', updateTag);
    fontSizeInput?.addEventListener('input', updateTag);
    fontSelect?.addEventListener('change', updateTag);
    updateTag();

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
                <option value="ranges" selected>Extract Custom Ranges</option>
                <option value="every_n">Split Every N Pages</option>
                <option value="all">Separate Every Page into PDF</option>
              </select>
            </div>
            <div class="form-group" id="opt-split-range-group">
              <label class="form-label">Page Ranges</label>
              <input type="text" class="form-input" id="opt-split-ranges" placeholder="e.g. 1-2, 4" value="1" />
              <small class="form-hint">Separate multiple ranges with commas (e.g. 1-3, 5-8). Multiple ranges produce a ZIP.</small>
            </div>
            <div class="form-group" id="opt-split-every-group" style="display: none;">
              <label class="form-label">Pages per Output PDF</label>
              <input type="number" class="form-input" id="opt-split-every-n" min="1" max="100" value="1" />
              <small class="form-hint">Splits document into equal chunks of N pages each (packaged as a ZIP).</small>
            </div>
            <div class="sidebar-info-box" id="opt-split-summary-box">
              <div class="info-box-icon">📦</div>
              <div class="info-box-text" id="opt-split-summary-text">
                Extracts custom range(s). Single range produces a PDF, multiple ranges produce a ZIP.
              </div>
            </div>
          </div>
        `;

      // 16. Organize PDF Pages
      case 'organize-pdf':
      case 'organize-pdf-pages':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">📑</div>
              <div class="info-box-text">
                Review and reorder pages in the interactive canvas, then apply changes.
              </div>
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
                <option value="{n}" selected>Simple Number (1, 2, 3...)</option>
                <option value="Page {n}">Page {n}</option>
                <option value="{n} of {total}">{n} of {total}</option>
                <option value="Page {n} of {total}">Page {n} of {total}</option>
                <option value="{n} / {total}">{n} / {total}</option>
              </select>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">First Number</label>
                <input type="number" class="form-input" id="opt-page-num-start-num" min="1" value="1" />
              </div>
              <div class="form-group">
                <label class="form-label">Start on Page</label>
                <input type="number" class="form-input" id="opt-page-num-start-page" min="1" value="1" />
              </div>
            </div>

            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label class="form-label">Font Family</label>
                <select class="form-select" id="opt-page-num-font">
                  <option value="Helvetica" selected>Helvetica</option>
                  <option value="Times">Times New Roman</option>
                  <option value="Courier">Courier</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Font Size (pt)</label>
                <input type="number" class="form-input" id="opt-page-num-size" min="6" max="36" value="10" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Margin from Edge (pt)</label>
              <input type="number" class="form-input" id="opt-page-num-margin" min="5" max="100" value="20" />
            </div>

            <div class="form-group">
              <label class="form-label">Pages to Number</label>
              <input type="text" class="form-input" id="opt-page-num-range" placeholder="e.g. 1-10 or leave blank for all" />
              <small class="form-hint">Leave blank to number all document pages.</small>
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

      // 25. Full PDF Editing
      case 'full-pdf-editing':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">✏️</div>
              <div class="info-box-text">
                PDF Studio: Annotate, add text overlay, highlight passages, or sanitize your document.
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Add Text Annotation</label>
              <input type="text" class="form-input" id="opt-studio-text" placeholder="e.g. APPROVED or Confidential" />
            </div>
            <div class="form-group">
              <label class="form-label">Highlight Passage</label>
              <div class="checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="opt-studio-highlight" style="cursor: pointer;" />
                <span style="font-size: 0.9rem; color: var(--pra-text-secondary);">Add Header Highlight</span>
              </div>
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
            <div class="form-group">
              <label class="form-label">Creator</label>
              <input type="text" class="form-input" id="opt-meta-creator" placeholder="Application or Creator" />
            </div>
            <div class="form-group">
              <label class="form-label">Producer</label>
              <input type="text" class="form-input" id="opt-meta-producer" placeholder="Producer / PDF Engine" />
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

      // WAVE 1 TOOLS (5)
      case 'delete-pdf-annotations':
        return `
          <div class="options-stack">
            <div class="sidebar-info-box">
              <div class="info-box-icon">🧹</div>
              <div class="info-box-text">
                Removes all comments, sticky notes, highlights, and markup while preserving all document text and images.
              </div>
            </div>
          </div>
        `;

      case 'flip-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Flip Direction</label>
              <select class="form-select" id="opt-flip-direction">
                <option value="horizontal" selected>Horizontal (Mirror Left-to-Right)</option>
                <option value="vertical">Vertical (Mirror Top-to-Bottom)</option>
                <option value="both">Both (180° Inversion)</option>
              </select>
            </div>
          </div>
        `;

      case 'split-pdf-in-half':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Cut Direction</label>
              <select class="form-select" id="opt-split-half-dir">
                <option value="vertical" selected>Vertical (Split Down Middle)</option>
                <option value="horizontal">Horizontal (Split Top & Bottom)</option>
              </select>
            </div>
            <div class="sidebar-info-box">
              <div class="info-box-icon">✂️</div>
              <div class="info-box-text">
                Perfect for scanned book spreads. Splits each 2-page spread into two separate sequential pages.
              </div>
            </div>
          </div>
        `;

      case 'alternate-mix-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Second Document Order</label>
              <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--pra-text-secondary); cursor: pointer;">
                <input type="checkbox" id="opt-mix-reverse" />
                Reverse second document (for back-page scans)
              </label>
            </div>
            <div class="form-group">
              <label class="form-label">Page Step Interval</label>
              <input type="number" class="form-input" id="opt-mix-step" value="1" min="1" max="10" />
            </div>
          </div>
        `;

      case 'n-up-pdf':
        return `
          <div class="options-stack">
            <div class="form-group">
              <label class="form-label">Pages Per Sheet</label>
              <select class="form-select" id="opt-nup-pages">
                <option value="2" selected>2 Pages per Sheet (2-up)</option>
                <option value="4">4 Pages per Sheet (4-up)</option>
                <option value="8">8 Pages per Sheet (8-up)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Output Sheet Size</label>
              <select class="form-select" id="opt-nup-size">
                <option value="A4" selected>A4 (210 × 297 mm)</option>
                <option value="LETTER">US Letter (8.5 × 11 in)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Sheet Orientation</label>
              <select class="form-select" id="opt-nup-orient">
                <option value="landscape" selected>Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  private getProcessingTitle(): string {
    const titles: Record<string, string> = {
      'delete-pdf-pages': 'Deleting Selected Pages…',
      'extract-pdf-pages': 'Extracting Pages…',
      'rotate-pdf': 'Rotating PDF…',
      'merge-pdf': 'Merging PDF Files…',
      'split-pdf': 'Splitting PDF…',
      'organize-pdf': 'Organizing PDF Pages…',
      'organize-pdf-pages': 'Organizing PDF Pages…',
      'compress-pdf': 'Compressing PDF…',
      'ocr-pdf': 'Recognizing Text (OCR)…',
      'crop-pdf': 'Cropping PDF Pages…',
      'watermark-pdf': 'Applying Watermark…',
      'add-page-numbers': 'Adding Page Numbers…',
      'password-protect-pdf': 'Protecting PDF…',
      'unlock-pdf': 'Unlocking PDF…',
      'full-pdf-editing': 'Saving PDF Studio Document…',
      'edit-pdf-metadata': 'Updating Metadata…',
      'extract-pdf-text': 'Extracting Text…',
      'jpg-to-pdf': 'Converting JPG to PDF…',
      'png-to-pdf': 'Converting PNG to PDF…',
      'images-to-pdf': 'Converting Images to PDF…',
      'word-to-pdf': 'Converting Word to PDF…',
      'excel-to-pdf': 'Converting Excel to PDF…',
      'powerpoint-to-pdf': 'Converting PowerPoint to PDF…',
      'html-to-pdf': 'Converting HTML to PDF…',
      'txt-to-pdf': 'Converting TXT to PDF…',
      'markdown-to-pdf': 'Converting Markdown to PDF…',
      'pdf-to-jpg': 'Converting PDF to JPG…',
      'pdf-to-png': 'Converting PDF to PNG…',
      'pdf-to-word': 'Converting PDF to Word…',
      'pdf-to-markdown': 'Converting PDF to Markdown…',
      'rtf-conversion': 'Converting RTF…',
    };
    return titles[this.tool.id] || `Processing ${this.tool.title}…`;
  }

  private bindEvents(): void {
    const processBtn = this.container.querySelector('#tp-process-btn') as HTMLElement;
    const errorBanner = this.container.querySelector('#tp-error-banner') as HTMLElement;
    const backToPickerBtn = this.container.querySelector('#btn-back-to-picker');

    backToPickerBtn?.addEventListener('click', () => {
      this.transitionToSelection();
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

    // Split Mode selector toggle
    const splitModeSelect = this.container.querySelector('#opt-split-mode') as HTMLSelectElement;
    const splitRangeGroup = this.container.querySelector('#opt-split-range-group') as HTMLElement;
    const splitEveryGroup = this.container.querySelector('#opt-split-every-group') as HTMLElement;
    const splitSummaryText = this.container.querySelector('#opt-split-summary-text') as HTMLElement;

    if (splitModeSelect) {
      splitModeSelect.addEventListener('change', () => {
        const mode = splitModeSelect.value;
        if (mode === 'every_n') {
          if (splitRangeGroup) splitRangeGroup.style.display = 'none';
          if (splitEveryGroup) splitEveryGroup.style.display = 'block';
          if (splitSummaryText) {
            splitSummaryText.textContent = 'Splits the document into equal parts of N pages each (packaged as a ZIP).';
          }
        } else if (mode === 'all') {
          if (splitRangeGroup) splitRangeGroup.style.display = 'none';
          if (splitEveryGroup) splitEveryGroup.style.display = 'none';
          if (splitSummaryText) {
            splitSummaryText.textContent = 'Separates every individual page into its own PDF and packages all pages into a ZIP.';
          }
        } else {
          if (splitRangeGroup) splitRangeGroup.style.display = 'block';
          if (splitEveryGroup) splitEveryGroup.style.display = 'none';
          if (splitSummaryText) {
            splitSummaryText.textContent = 'Extracts custom range(s). Single range produces a PDF, multiple ranges produce a ZIP.';
          }
        }
      });
    }

    // Extract PDF Pages: sync manual input with thumbnails
    const extPagesInput = this.container.querySelector('#opt-extract-pages') as HTMLInputElement;
    if (extPagesInput && this.tool.id === 'extract-pdf-pages') {
      extPagesInput.addEventListener('input', () => {
        const val = extPagesInput.value.trim();
        if (!val || this.pageThumbnails.length === 0) return;
        const requested = new Set<number>();
        const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
        for (const p of parts) {
          if (p.includes('-')) {
            const [s, e] = p.split('-').map((n) => parseInt(n.trim(), 10));
            if (!isNaN(s) && !isNaN(e)) {
              for (let i = Math.min(s, e); i <= Math.max(s, e); i++) requested.add(i);
            }
          } else {
            const num = parseInt(p, 10);
            if (!isNaN(num)) requested.add(num);
          }
        }
        this.pageThumbnails.forEach((p) => {
          p.selected = requested.has(p.pageNumber);
        });
        this.renderPageLevelGrid();
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

    // Primary Action Button Execution & Universal Lifecycle Handling
    const origBtnHtml = processBtn?.innerHTML || '';
    const workspaceContainer = this.container.querySelector('#tp-workspace-container') as HTMLElement;
    const retryBtn = this.container.querySelector('#tp-error-retry-btn') as HTMLElement;

    const handleProcess = async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      // 1. Immediate visual feedback on the button
      if (processBtn) {
        processBtn.setAttribute('disabled', 'true');
        processBtn.classList.add('is-loading');
        processBtn.innerHTML = `
          <span class="btn-spinner"></span>
          <span id="tp-process-label">Processing…</span>
        `;
      }

      // 2. Lock workspace to prevent conflicting user interactions during processing
      if (workspaceContainer) workspaceContainer.classList.add('workspace-locked');
      errorBanner.style.display = 'none';

      // 3. Show universal progress modal immediately
      this.progressBar.show({
        title: this.getProcessingTitle(),
        message: 'Preparing files…',
        indeterminate: true,
        toolId: this.tool.id,
      });

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
        // Reset button
        if (processBtn) {
          processBtn.classList.remove('is-loading');
          processBtn.removeAttribute('disabled');
          processBtn.innerHTML = origBtnHtml;
        }
        if (workspaceContainer) workspaceContainer.classList.remove('workspace-locked');
      } finally {
        this.isProcessing = false;
      }
    };

    processBtn?.addEventListener('click', handleProcess);
    retryBtn?.addEventListener('click', handleProcess);
  }

  private async executeService(): Promise<void> {
    const onProgress = (percent: number | null, status: string, detail?: string) => {
      this.progressBar.update(percent, status, detail);
      const procLabel = this.container.querySelector('#tp-process-label');
      if (procLabel && status) procLabel.textContent = status;
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
        const pageSize = ((document.getElementById('opt-img-pagesize') as HTMLSelectElement)?.value?.toUpperCase() || 'A4') as any;
        const orientation = ((document.getElementById('opt-img-orientation') as HTMLSelectElement)?.value || 'portrait') as any;
        const bytes = await convertJpgToPdf(this.selectedFiles, {
          pageSize,
          orientation,
          onProgress,
        });
        const outName = this.selectedFiles.length > 1 ? `${baseName}-combined.pdf` : `${baseName}.pdf`;
        this.finishResult(outName, bytes);
        break;
      }
      // 2. PNG to PDF
      case 'png-to-pdf': {
        const pageSize = ((document.getElementById('opt-img-pagesize') as HTMLSelectElement)?.value?.toUpperCase() || 'A4') as any;
        const orientation = ((document.getElementById('opt-img-orientation') as HTMLSelectElement)?.value || 'portrait') as any;
        const bytes = await convertPngToPdf(this.selectedFiles, {
          pageSize,
          orientation,
          onProgress,
        });
        const outName = this.selectedFiles.length > 1 ? `${baseName}-combined.pdf` : `${baseName}.pdf`;
        this.finishResult(outName, bytes);
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
        const everyN = parseInt((document.getElementById('opt-split-every-n') as HTMLInputElement)?.value || '1', 10) || 1;
        const res = await splitPdf(file, { mode, rangeString: range, everyN, onProgress });
        await this.finishResult(res.filename, res.data);
        break;
      }
      // 16. Organize PDF Pages
      case 'organize-pdf':
      case 'organize-pdf-pages': {
        const pageOrder = this.pageThumbnails.length > 0
          ? this.pageThumbnails.map((p) => ({ pageIndex: p.pageNumber - 1, rotation: p.rotation || 0 }))
          : Array.from({ length: 1 }, (_, i) => ({ pageIndex: i, rotation: 0 }));
        const res = await organizePdfPages(file, pageOrder, { onProgress });
        await this.finishResult(`${baseName}-organized.pdf`, res);
        break;
      }
      // 17. Delete PDF Pages
      case 'delete-pdf-pages': {
        const inputVal = (document.getElementById('opt-delete-pages') as HTMLInputElement)?.value?.trim();
        const markedFromGrid = this.pageThumbnails.filter((p) => p.markedForDelete).map((p) => p.pageNumber);
        const delSpec = inputVal || (markedFromGrid.length > 0 ? markedFromGrid.join(',') : '');
        if (!delSpec) {
          throw new Error('Please select at least one page to delete (click on a page preview or enter page numbers).');
        }
        if (this.pageThumbnails.length > 0 && markedFromGrid.length >= this.pageThumbnails.length) {
          throw new Error('Cannot delete all pages in the document. At least one page must remain.');
        }
        const res = await deletePdfPages(file, delSpec, { onProgress });
        await this.finishResult(`${baseName}-pages-removed.pdf`, res);
        break;
      }
      // 18. Extract PDF Pages
      case 'extract-pdf-pages': {
        const inputVal = (document.getElementById('opt-extract-pages') as HTMLInputElement)?.value?.trim();
        const selectedFromGrid = this.pageThumbnails.filter((p) => p.selected).map((p) => p.pageNumber);
        const extSpec = inputVal || (selectedFromGrid.length > 0 ? selectedFromGrid.join(',') : '1');
        if (!extSpec) {
          throw new Error('Please select at least one page or enter a page range to extract.');
        }
        const res = await extractPdfPages(file, extSpec, { onProgress });
        await this.finishResult(`${baseName}-extracted.pdf`, res);
        break;
      }
      // 19. Rotate PDF
      case 'rotate-pdf': {
        const angle = parseInt((document.getElementById('opt-rotate-angle') as HTMLSelectElement)?.value || '90', 10) as any;
        const res = await rotatePdf(file, angle, undefined, { onProgress });
        await this.finishResult(`${baseName}-rotated.pdf`, res);
        break;
      }
      // 20. Crop PDF
      case 'crop-pdf': {
        const top = parseInt((document.getElementById('opt-crop-top') as HTMLInputElement)?.value, 10) || 0;
        const right = parseInt((document.getElementById('opt-crop-right') as HTMLInputElement)?.value, 10) || 0;
        const bottom = parseInt((document.getElementById('opt-crop-bottom') as HTMLInputElement)?.value, 10) || 0;
        const left = parseInt((document.getElementById('opt-crop-left') as HTMLInputElement)?.value, 10) || 0;
        const res = await cropPdf(file, { top, right, bottom, left }, { onProgress });
        await this.finishResult(`${baseName}-cropped.pdf`, res);
        break;
      }
      // 21. Compress PDF
      case 'compress-pdf': {
        const checkedRadio = document.querySelector('input[name="comp-level"]:checked') as HTMLInputElement;
        const level = (checkedRadio?.value || 'medium') as any;
        const res = await compressPdf(file, { level, onProgress });
        await this.finishResult(`${baseName}-compressed.pdf`, res.data, res.originalSize, res.newSize, res.ratio);
        break;
      }
      // 22. OCR PDF
      case 'ocr-pdf': {
        const lang = (document.getElementById('opt-ocr-lang') as HTMLSelectElement)?.value || 'eng';
        const res = await ocrPdf(file, { language: lang, onProgress });
        await this.finishResult(`${baseName}-searchable-ocr.pdf`, res.data);
        break;
      }
      // 23. Add Page Numbers
      case 'add-page-numbers': {
        const pos = (document.getElementById('opt-page-num-pos') as HTMLSelectElement)?.value as any || 'bottom-center';
        const fmt = (document.getElementById('opt-page-num-fmt') as HTMLSelectElement)?.value as any || '{n}';
        const startNumber = parseInt((document.getElementById('opt-page-num-start-num') as HTMLInputElement)?.value || '1', 10) || 1;
        const startPage = parseInt((document.getElementById('opt-page-num-start-page') as HTMLInputElement)?.value || '1', 10) || 1;
        const font = (document.getElementById('opt-page-num-font') as HTMLSelectElement)?.value as any || 'Helvetica';
        const fontSize = parseInt((document.getElementById('opt-page-num-size') as HTMLInputElement)?.value || '10', 10) || 10;
        const margin = parseInt((document.getElementById('opt-page-num-margin') as HTMLInputElement)?.value || '20', 10) || 20;
        const pagesToNumber = (document.getElementById('opt-page-num-range') as HTMLInputElement)?.value?.trim() || undefined;
        const res = await addPageNumbersToPdf(file, {
          position: pos,
          format: fmt,
          startNumber,
          startPage,
          font,
          fontSize,
          margin,
          pagesToNumber,
          onProgress,
        });
        await this.finishResult(`${baseName}-numbered.pdf`, res);
        break;
      }
      // 24. Watermark PDF
      case 'watermark-pdf': {
        const text = (document.getElementById('opt-watermark-text') as HTMLInputElement)?.value || 'CONFIDENTIAL';
        const opacity = parseFloat((document.getElementById('opt-watermark-opacity') as HTMLInputElement)?.value) || 0.3;
        const rotation = parseInt((document.getElementById('opt-watermark-angle') as HTMLSelectElement)?.value, 10) || 45;
        const res = await watermarkPdf(file, { type: 'text', text, opacity, rotation, onProgress });
        await this.finishResult(`${baseName}-watermarked.pdf`, res);
        break;
      }
      // 25. Full PDF Editing
      case 'full-pdf-editing': {
        const textAnnotation = (document.getElementById('opt-studio-text') as HTMLInputElement)?.value?.trim();
        const addHighlight = (document.getElementById('opt-studio-highlight') as HTMLInputElement)?.checked;
        const operations: any[] = [];
        if (textAnnotation) {
          operations.push({
            type: 'addText',
            text: textAnnotation,
            x: 50,
            y: 50,
            size: 14,
            color: { r: 0.1, g: 0.2, b: 0.8 },
          });
        }
        if (addHighlight) {
          operations.push({
            type: 'addHighlight',
            x: 40,
            y: 720,
            width: 200,
            height: 24,
          });
        }
        const res = await fullPdfEdit(file, { operations, onProgress });
        await this.finishResult(`${baseName}-edited.pdf`, res);
        break;
      }
      // 26. Password-Protect PDF
      case 'password-protect-pdf': {
        const pass = (document.getElementById('opt-protect-pass') as HTMLInputElement)?.value || '';
        const confirm = (document.getElementById('opt-protect-pass-confirm') as HTMLInputElement)?.value || '';
        if (!pass) throw new Error('Please enter a password to protect your document.');
        if (pass !== confirm) throw new Error('Passwords do not match. Please verify your entry.');
        const res = await passwordProtectPdf(file, { userPassword: pass, onProgress });
        await this.finishResult(`${baseName}-protected.pdf`, res);
        break;
      }
      // 27. Unlock PDF
      case 'unlock-pdf': {
        const pass = (document.getElementById('opt-unlock-pass') as HTMLInputElement)?.value || '';
        const res = await unlockPdf(file, pass, { onProgress });
        await this.finishResult(`${baseName}-unlocked.pdf`, res);
        break;
      }
      // 28. Edit PDF Metadata
      case 'edit-pdf-metadata': {
        const title = (document.getElementById('opt-meta-title') as HTMLInputElement)?.value || '';
        const author = (document.getElementById('opt-meta-author') as HTMLInputElement)?.value || '';
        const subject = (document.getElementById('opt-meta-subject') as HTMLInputElement)?.value || '';
        const keywords = (document.getElementById('opt-meta-keywords') as HTMLInputElement)?.value || '';
        const creator = (document.getElementById('opt-meta-creator') as HTMLInputElement)?.value || '';
        const producer = (document.getElementById('opt-meta-producer') as HTMLInputElement)?.value || '';
        const res = await editPdfMetadata(file, { title, author, subject, keywords, creator, producer }, { onProgress });
        await this.finishResult(`${baseName}-metadata-updated.pdf`, res);
        break;
      }
      // 29. Extract PDF Text
      case 'extract-pdf-text': {
        const res = await convertPdfToText(file, { onProgress });
        await this.finishResult(res.filename, res.text, undefined, undefined, undefined, {
          text: res.text,
          wordCount: res.wordCount,
          characterCount: res.characterCount,
          pageCount: res.pageCount,
          hasText: res.hasText,
        });
        break;
      }
      // 30. RTF Conversion
      case 'rtf-conversion': {
        if (file.name.toLowerCase().endsWith('.rtf')) {
          const res = await convertRtfToPdf(file, { onProgress });
          await this.finishResult(`${baseName}.pdf`, res);
        } else {
          const rtf = await convertPdfToRtf(file, { onProgress });
          await this.finishResult(`${baseName}.rtf`, rtf);
        }
        break;
      }

      // WAVE 1 SERVICES (5)
      case 'delete-pdf-annotations': {
        const res = await deletePdfAnnotations(file, { onProgress });
        await this.finishResult(`${baseName}-clean.pdf`, res);
        break;
      }
      case 'flip-pdf': {
        const dir = ((document.getElementById('opt-flip-direction') as HTMLSelectElement)?.value || 'horizontal') as any;
        const res = await flipPdf(file, dir, { onProgress });
        await this.finishResult(`${baseName}-flipped.pdf`, res);
        break;
      }
      case 'split-pdf-in-half': {
        const dir = ((document.getElementById('opt-split-half-dir') as HTMLSelectElement)?.value || 'vertical') as any;
        const res = await splitPdfInHalf(file, dir, { onProgress });
        await this.finishResult(`${baseName}-split-in-half.pdf`, res);
        break;
      }
      case 'alternate-mix-pdf': {
        if (this.selectedFiles.length < 2) {
          throw new Error('Alternate & Mix requires at least two PDF documents.');
        }
        const reverseSecond = (document.getElementById('opt-mix-reverse') as HTMLInputElement)?.checked ?? false;
        const step = parseInt((document.getElementById('opt-mix-step') as HTMLInputElement)?.value || '1', 10) || 1;
        const res = await alternateMixPdf(this.selectedFiles, {
          reverseSecondDocument: reverseSecond,
          step,
          onProgress,
        });
        await this.finishResult('mixed-document.pdf', res);
        break;
      }
      case 'n-up-pdf': {
        const pagesPerSheet = parseInt((document.getElementById('opt-nup-pages') as HTMLSelectElement)?.value || '2', 10) as any;
        const sheetSize = ((document.getElementById('opt-nup-size') as HTMLSelectElement)?.value || 'A4') as any;
        const orientation = ((document.getElementById('opt-nup-orient') as HTMLSelectElement)?.value || 'landscape') as any;
        const res = await nUpPdf(file, pagesPerSheet, { sheetSize, orientation, onProgress });
        await this.finishResult(`${baseName}-${pagesPerSheet}up.pdf`, res);
        break;
      }

      default:
        throw new Error(`Tool "${this.tool.title}" is being routed.`);
    }
  }

  private async finishResult(
    filename: string,
    data: Uint8Array | Blob | string,
    originalSize?: number,
    newSize?: number,
    ratio?: string,
    textResult?: {
      text: string;
      wordCount?: number;
      characterCount?: number;
      pageCount?: number;
      hasText?: boolean;
    }
  ): Promise<void> {
    await this.progressBar.success('Completed successfully!');
    this.progressBar.hide();

    // Reset action button state
    const processBtn = this.container.querySelector('#tp-process-btn') as HTMLElement;
    if (processBtn) {
      processBtn.classList.remove('is-loading');
      processBtn.removeAttribute('disabled');
      const visual = getToolVisualMeta(this.tool.id);
      processBtn.innerHTML = `
        <span class="btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </span>
        <span id="tp-process-label">${visual.actionBtnLabel || this.getPrimaryActionLabel()}</span>
        <span class="btn-arrow-cue">→</span>
      `;
    }

    // Unlock workspace
    const workspaceContainer = this.container.querySelector('#tp-workspace-container') as HTMLElement;
    if (workspaceContainer) {
      workspaceContainer.classList.remove('workspace-locked');
      workspaceContainer.style.display = 'none';
    }

    this.resultCard.show({
      filename,
      data,
      originalSize,
      newSize,
      reductionRatio: ratio,
      toolId: this.tool.id,
      toolTitle: this.tool.title,
      textResult,
      onReset: () => {
        this.transitionToSelection();
      },
    });
  }

  private renderComingSoon(): void {
    const visual = getToolVisualMeta(this.tool.id);
    this.container.innerHTML = `
      <div class="tool-runner-container" style="--tool-accent: ${visual.accentColor}; --tool-accent-bg: ${visual.accentBg};">
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

        <div class="tool-header-block" id="tp-hero-header">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag" style="background-color: rgba(234, 179, 8, 0.15); color: #EAB308; border: 1px solid rgba(234, 179, 8, 0.3);">
              SERVICE #${this.tool.serviceNumber} • COMING SOON
            </span>
            <span class="tool-category-tag">${this.tool.categoryLabel}</span>
          </div>
          <h1 class="tool-title">${this.tool.title}</h1>
          <p class="tool-subtitle">${this.tool.description}</p>
        </div>

        <div style="max-width: 680px; margin: 40px auto; background: var(--pra-bg-surface); border: 1px solid var(--pra-border); border-radius: 16px; padding: 40px 32px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <div style="width: 72px; height: 72px; border-radius: 18px; background: ${visual.accentBg}; color: ${visual.accentColor}; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            ${getToolIcon(this.tool.id)}
          </div>
          <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 12px; color: var(--pra-text-primary);">
            In Development — Wave ${this.tool.wave || '2–5'} Roadmap
          </h3>
          <p style="color: var(--pra-text-secondary); line-height: 1.6; margin-bottom: 24px; font-size: 0.95rem;">
            ${this.tool.title} is an officially planned service in the canonical 56-service PRA PDF suite.
            In strict accordance with our engineering standards, services are only deployed once they pass full lossless verification, zero-AI privacy checks, and 50 MB upload stress tests.
          </p>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--pra-border); border-radius: 12px; padding: 16px 20px; margin-bottom: 32px; text-align: left; font-size: 0.9rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--pra-text-secondary);">Accepted Extensions:</span>
              <strong style="color: var(--pra-text-primary); font-family: monospace;">${this.tool.acceptedExtensions.join(', ')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: var(--pra-text-secondary);">Target Runtime:</span>
              <strong style="color: var(--pra-text-primary);">Zero-AI Client / Edge Worker</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--pra-text-secondary);">Upload Limit:</span>
              <strong style="color: var(--pra-text-primary);">50 MB (Strict Free Limit)</strong>
            </div>
          </div>
          <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
            <a href="#/tools?cat=live" class="btn btn-primary" style="padding: 12px 24px;">Browse 17 Verified Live Tools</a>
            <a href="#/tools" class="btn btn-secondary" style="padding: 12px 24px;">View All 56 Tools</a>
          </div>
        </div>
      </div>
    `;
  }
}
