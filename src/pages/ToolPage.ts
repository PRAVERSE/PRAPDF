/**
 * PRA PDF — Universal Tool Page (Sections 9, 10, 12, 26)
 * Dedicated UI workspace for each of the 30 tools with tailored options,
 * dual-mode inputs (HTML/MD/TXT), 7 visual states, and strict 50 MB validation.
 */

import { TOOLS_REGISTRY, ToolDefinition, findToolById } from '../services/toolsRegistry';
import { Dropzone } from '../components/Dropzone';
import { ProgressBar } from '../components/ProgressBar';
import { ResultCard } from '../components/ResultCard';
import { ICONS, getToolIcon } from '../components/icons';
import { formatBytes } from '../services/core/fileValidator';

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

export class ToolPage {
  private container: HTMLElement;
  private tool: ToolDefinition;
  private dropzone!: Dropzone;
  private progressBar!: ProgressBar;
  private resultCard!: ResultCard;
  private selectedFiles: File[] = [];

  // Dual-mode state (File upload vs Direct Editor for HTML, Markdown, TXT)
  private inputMode: 'file' | 'direct' = 'file';

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

    this.container.innerHTML = `
      <div class="tool-runner-container">
        <!-- Back Navigation Breadcrumb -->
        <div class="tool-nav-breadcrumb">
          <a href="#/tools" class="tool-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            All PDF Tools
          </a>
          <span class="tool-breadcrumb-divider">/</span>
          <span class="tool-breadcrumb-current">${this.tool.title}</span>
        </div>

        <!-- Tool Header -->
        <div class="tool-header-block">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag">UTILITY #${this.tool.serviceNumber}</span>
            <span class="tool-category-tag">${this.tool.categoryLabel}</span>
          </div>
          <h1 class="tool-title">${this.tool.title}</h1>
          <p class="tool-subtitle">${this.tool.description}</p>
        </div>

        <!-- Tool Runner Card (Hosts 7 States) -->
        <div class="card-container tool-workspace-card">
          ${
            isDualInput
              ? `
            <div class="dual-input-tabs" role="tablist">
              <button type="button" class="dual-tab-btn ${this.inputMode === 'file' ? 'active' : ''}" id="tab-mode-file">
                Upload File (${this.tool.acceptedExtensions.join(', ')})
              </button>
              <button type="button" class="dual-tab-btn ${this.inputMode === 'direct' ? 'active' : ''}" id="tab-mode-direct">
                ${this.tool.id === 'html-to-pdf' ? 'HTML Code Editor' : this.tool.id === 'markdown-to-pdf' ? 'Markdown Editor & Preview' : 'Text Editor'}
              </button>
            </div>
          `
              : ''
          }

          <!-- STATE 1: Dropzone Upload Area -->
          <div id="tp-dropzone-wrapper" style="${this.inputMode === 'direct' ? 'display: none;' : ''}">
            <div id="tp-dropzone-container"></div>
          </div>

          <!-- Direct Input Workspace for HTML / Markdown / TXT -->
          ${
            isDualInput
              ? `
            <div id="tp-direct-editor-container" class="direct-editor-panel" style="${this.inputMode === 'file' ? 'display: none;' : ''}">
              ${this.renderDirectEditor()}
            </div>
          `
              : ''
          }

          <!-- STATE 2: Tool Options Panel -->
          <div id="tp-options-container" class="tool-options-panel" style="display: none;">
            <div class="options-header">
              <h3 class="options-title">Configuration Options</h3>
            </div>
            ${this.renderToolOptions()}
          </div>

          <!-- STATE 6: Error State Banner -->
          <div id="tp-error-banner" class="error-banner" style="display: none;">
            <div class="error-banner-icon">${ICONS['alert-triangle']}</div>
            <div class="error-banner-text">
              <h4 class="error-banner-title">Something went wrong.</h4>
              <p id="tp-error-message" class="error-banner-desc">Please check your document and try again.</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="tp-error-retry-btn">
              Try Again
            </button>
          </div>

          <!-- STATE 7: File Too Large Banner (handled by dropzone or tool) -->
          <div id="tp-too-large-banner" class="file-too-large-card" style="display: none;">
            <div class="too-large-icon">${ICONS['alert-triangle']}</div>
            <div class="too-large-content">
              <h4 class="too-large-title">File is too large.</h4>
              <p class="too-large-subtitle" id="tp-too-large-text">Maximum file size is 50 MB per file.</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="tp-too-large-retry-btn">
              Choose Another File
            </button>
          </div>

          <!-- STATE 3: Ready / Primary Action Button -->
          <div class="tool-action-bar" id="tp-action-bar" style="display: none;">
            <button type="button" class="btn btn-primary btn-lg" id="tp-process-btn">
              <span class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </span>
              <span id="tp-process-label">${this.getPrimaryActionLabel()}</span>
            </button>
          </div>

          <!-- STATE 4: Processing State -->
          <div id="tp-progress-container"></div>

          <!-- STATE 5: Success State -->
          <div id="tp-result-container"></div>
        </div>
      </div>
    `;

    this.initSubComponents();
    this.bindEvents();
  }

  private getPrimaryActionLabel(): string {
    switch (this.tool.id) {
      case 'merge-pdf':
        return 'Merge PDFs';
      case 'split-pdf':
        return 'Split PDF';
      case 'organize-pdf':
      case 'organize-pdf-pages':
        return 'Open Page Organizer';
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

  private initSubComponents(): void {
    const errorBanner = this.container.querySelector('#tp-error-banner') as HTMLElement;
    const tooLargeBanner = this.container.querySelector('#tp-too-large-banner') as HTMLElement;
    const tooLargeText = this.container.querySelector('#tp-too-large-text') as HTMLElement;
    const actionBar = this.container.querySelector('#tp-action-bar') as HTMLElement;
    const optionsPanel = this.container.querySelector('#tp-options-container') as HTMLElement;

    this.dropzone = new Dropzone({
      containerId: 'tp-dropzone-container',
      allowedExtensions: this.tool.acceptedExtensions,
      multiple: !!this.tool.multiple,
      onFilesChanged: (files) => {
        this.selectedFiles = files;
        errorBanner.style.display = 'none';
        tooLargeBanner.style.display = 'none';

        if (files.length > 0) {
          actionBar.style.display = 'block';
          optionsPanel.style.display = 'block';
        } else {
          actionBar.style.display = 'none';
          optionsPanel.style.display = 'none';
        }
      },
      onError: (msg) => {
        const errorDesc = this.container.querySelector('#tp-error-message') as HTMLElement;
        if (errorDesc) errorDesc.textContent = msg;
        errorBanner.style.display = 'flex';
      },
      onFileTooLarge: (name, sizeStr) => {
        if (tooLargeText) {
          tooLargeText.textContent = `"${name}" is ${sizeStr}. Maximum file size is 50 MB per file.`;
        }
        tooLargeBanner.style.display = 'flex';
      },
    });

    this.progressBar = new ProgressBar('tp-progress-container');
    this.resultCard = new ResultCard('tp-result-container');
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
    h1 { color: #4338ca; }
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

  private renderToolOptions(): string {
    switch (this.tool.id) {
      // 1. JPG to PDF / 2. PNG to PDF
      case 'jpg-to-pdf':
      case 'png-to-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-img-pagesize">
                <option value="a4">A4 (Standard 210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="fit">Fit to Image Dimensions</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Page Orientation</label>
              <select class="form-select" id="opt-img-orientation">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="auto">Auto-detect from image</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Margin</label>
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
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-images-pagesize">
                <option value="a4">A4 Standard</option>
                <option value="letter">US Letter</option>
                <option value="fit">Fit to each image</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Orientation</label>
              <select class="form-select" id="opt-images-orientation">
                <option value="auto">Auto (per image aspect ratio)</option>
                <option value="portrait">All Portrait</option>
                <option value="landscape">All Landscape</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Margin</label>
              <select class="form-select" id="opt-images-margin">
                <option value="none">None</option>
                <option value="small" selected>Small (10 mm)</option>
                <option value="large">Big (25 mm)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Image Fit</label>
              <select class="form-select" id="opt-images-fit">
                <option value="fit">Fit page</option>
                <option value="fill">Fill page</option>
              </select>
            </div>
          </div>
        `;

      // 5. Excel to PDF
      case 'excel-to-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Sheet Selection</label>
              <select class="form-select" id="opt-excel-sheets">
                <option value="all">Convert All Sheets</option>
                <option value="first">First Sheet Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Orientation</label>
              <select class="form-select" id="opt-excel-orientation">
                <option value="landscape">Landscape (Recommended for wide tables)</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fit to Page</label>
              <select class="form-select" id="opt-excel-fit">
                <option value="width">Fit All Columns to Page Width</option>
                <option value="actual">Actual Scale (Multi-page wrap)</option>
              </select>
            </div>
          </div>
        `;

      // 8. TXT to PDF
      case 'txt-to-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Font Family</label>
              <select class="form-select" id="opt-txt-font">
                <option value="Helvetica">Helvetica (Clean Sans)</option>
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
                <option value="16">16 pt (Extra Large)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Page Size</label>
              <select class="form-select" id="opt-txt-pagesize">
                <option value="a4">A4</option>
                <option value="letter">US Letter</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Margins</label>
              <select class="form-select" id="opt-txt-margins">
                <option value="normal">Normal (20 mm)</option>
                <option value="compact">Compact (10 mm)</option>
                <option value="wide">Wide (30 mm)</option>
              </select>
            </div>
          </div>
        `;

      // 10. PDF to JPG / 11. PDF to PNG
      case 'pdf-to-jpg':
      case 'pdf-to-png':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Page Selection</label>
              <select class="form-select" id="opt-pdf2img-pages">
                <option value="all">Convert All Pages</option>
                <option value="first">First Page Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Resolution / Quality</label>
              <select class="form-select" id="opt-pdf2img-quality">
                <option value="high">High Resolution (300 DPI — Print Quality)</option>
                <option value="medium" selected>Balanced (150 DPI — Standard Web)</option>
                <option value="low">Compact (72 DPI — Smallest ZIP)</option>
              </select>
            </div>
          </div>
        `;

      // 15. Split PDF
      case 'split-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Split Mode</label>
              <select class="form-select" id="opt-split-mode">
                <option value="ranges">Extract Page Ranges (e.g. 1-3, 5)</option>
                <option value="all">Separate Every Page into Standalone PDF</option>
              </select>
            </div>
            <div class="form-group" id="opt-split-range-group">
              <label class="form-label">Page Range</label>
              <input type="text" class="form-input" id="opt-split-ranges" placeholder="e.g. 1-2, 4" value="1" />
              <small style="color: var(--pra-text-muted); font-size: 0.8rem;">Use commas and hyphens to define ranges.</small>
            </div>
          </div>
        `;

      // 17. Delete PDF Pages
      case 'delete-pdf-pages':
        return `
          <div class="form-group">
            <label class="form-label">Pages to Delete</label>
            <input type="text" class="form-input" id="opt-delete-pages" placeholder="e.g. 1, 3-5" value="1" />
            <small style="color: var(--pra-text-muted); font-size: 0.8rem;">Specify page numbers or ranges to permanently remove.</small>
          </div>
        `;

      // 18. Extract PDF Pages
      case 'extract-pdf-pages':
        return `
          <div class="form-group">
            <label class="form-label">Pages to Extract</label>
            <input type="text" class="form-input" id="opt-extract-pages" placeholder="e.g. 1-3, 5" value="1" />
            <small style="color: var(--pra-text-muted); font-size: 0.8rem;">Specify page numbers or ranges to extract into a new document.</small>
          </div>
        `;

      // 19. Rotate PDF
      case 'rotate-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Rotation Angle</label>
              <select class="form-select" id="opt-rotate-angle">
                <option value="90">90° Clockwise</option>
                <option value="180">180° Flip</option>
                <option value="270">270° Counter-Clockwise</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Target Pages</label>
              <select class="form-select" id="opt-rotate-target">
                <option value="all">All Pages</option>
                <option value="odd">Odd Pages Only</option>
                <option value="even">Even Pages Only</option>
              </select>
            </div>
          </div>
        `;

      // 20. Crop PDF
      case 'crop-pdf':
        return `
          <p style="font-size: 0.85rem; color: var(--pra-text-secondary); margin-bottom: 12px;">
            Set margins in points to crop out borders or headers/footers:
          </p>
          <div class="crop-margins-grid">
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

      // 21. Compress PDF
      case 'compress-pdf':
        return `
          <div class="form-group">
            <label class="form-label">Select Compression Profile</label>
            <div class="compression-profiles-grid">
              <label class="compression-card">
                <input type="radio" name="comp-level" value="low" />
                <div class="comp-card-content">
                  <div class="comp-card-title">Low Compression</div>
                  <div class="comp-card-desc">Pristine visual quality. Light file size reduction.</div>
                </div>
              </label>

              <label class="compression-card active">
                <input type="radio" name="comp-level" value="medium" checked />
                <div class="comp-card-content">
                  <div class="comp-card-title">Balanced (Recommended)</div>
                  <div class="comp-card-desc">Good quality, strong size reduction for email and web.</div>
                </div>
              </label>

              <label class="compression-card">
                <input type="radio" name="comp-level" value="high" />
                <div class="comp-card-content">
                  <div class="comp-card-title">High Compression</div>
                  <div class="comp-card-desc">Smallest file size. May lightly reduce image crispness.</div>
                </div>
              </label>
            </div>
          </div>
        `;

      // 22. OCR PDF
      case 'ocr-pdf':
        return `
          <div class="form-group">
            <label class="form-label">Document OCR Language</label>
            <select class="form-select" id="opt-ocr-lang">
              <option value="eng" selected>English (eng)</option>
              <option value="spa">Spanish (spa)</option>
              <option value="fra">French (fra)</option>
              <option value="deu">German (deu)</option>
              <option value="hin">Hindi (hin)</option>
            </select>
            <div class="spec-note-box" style="margin-top: 10px;">
              <span>⚡ WebAssembly OCR engine — 100% private optical character recognition.</span>
            </div>
          </div>
        `;

      // 23. Add Page Numbers
      case 'add-page-numbers':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Position</label>
              <select class="form-select" id="opt-page-num-pos">
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
            <div class="form-group">
              <label class="form-label">Starting Number</label>
              <input type="number" class="form-input" id="opt-page-num-start" value="1" min="1" />
            </div>
          </div>
        `;

      // 24. Watermark PDF
      case 'watermark-pdf':
        return `
          <div class="form-group">
            <label class="form-label">Watermark Text</label>
            <input type="text" class="form-input" id="opt-watermark-text" value="CONFIDENTIAL" />
          </div>
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Opacity (0.1 to 1.0)</label>
              <input type="number" step="0.1" min="0.1" max="1.0" class="form-input" id="opt-watermark-opacity" value="0.3" />
            </div>
            <div class="form-group">
              <label class="form-label">Rotation Angle (°)</label>
              <select class="form-select" id="opt-watermark-angle">
                <option value="45" selected>45° Diagonal</option>
                <option value="0">0° Horizontal</option>
                <option value="90">90° Vertical</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Font Size (pt)</label>
              <input type="number" class="form-input" id="opt-watermark-size" value="48" min="12" max="120" />
            </div>
            <div class="form-group">
              <label class="form-label">Target Pages</label>
              <select class="form-select" id="opt-watermark-pages">
                <option value="all">All Pages</option>
                <option value="odd">Odd Pages Only</option>
                <option value="even">Even Pages Only</option>
              </select>
            </div>
          </div>
        `;

      // 25. Full PDF Editing
      case 'full-pdf-editing':
        return `
          <div style="text-align: center; padding: 20px 0;">
            <p style="color: var(--pra-text-secondary); margin-bottom: 16px;">
              Full PDF Editing Studio provides an advanced 4-panel document workspace with freehand drawing, shapes, images, and text annotations.
            </p>
            <a href="#/editor" class="btn btn-primary btn-lg">
              Launch Full PDF Editor Studio →
            </a>
          </div>
        `;

      // 26. Password-Protect PDF
      case 'password-protect-pdf':
        return `
          <div class="options-grid">
            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="password-input-wrapper">
                <input type="password" class="form-input" id="opt-protect-pass" placeholder="Enter secure password" />
                <button type="button" class="pwd-toggle-btn" id="btn-toggle-protect-pwd" title="Show / Hide Password">
                  👁️
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input type="password" class="form-input" id="opt-protect-pass-confirm" placeholder="Re-enter password" />
            </div>
          </div>
        `;

      // 27. Unlock PDF
      case 'unlock-pdf':
        return `
          <div class="form-group">
            <label class="form-label">Password to Remove Protection (if encrypted)</label>
            <input type="password" class="form-input" id="opt-unlock-pass" placeholder="Enter PDF password" />
            <div class="spec-note-box" style="margin-top: 10px;">
              <span>ℹ️ Notice: Only unlock PDF documents that you are authorized to access and modify.</span>
            </div>
          </div>
        `;

      // 28. Edit PDF Metadata
      case 'edit-pdf-metadata':
        return `
          <div class="options-grid">
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
              <label class="form-label">Keywords (comma-separated)</label>
              <input type="text" class="form-input" id="opt-meta-keywords" placeholder="pdf, report, praverse" />
            </div>
          </div>
        `;

      // 29. Extract PDF Text
      case 'extract-pdf-text':
        return `
          <div class="spec-note-box">
            <span>Extract all plaintext blocks from your PDF. Preview and copy or download as a .txt document.</span>
          </div>
        `;

      // 30. RTF Conversion
      case 'rtf-conversion':
        return `
          <div class="form-group">
            <label class="form-label">Conversion Mode</label>
            <select class="form-select" id="opt-rtf-mode">
              <option value="auto">Auto-detect (RTF to PDF or PDF to RTF)</option>
              <option value="rtf-to-pdf">RTF → PDF</option>
              <option value="pdf-to-rtf">PDF → RTF</option>
            </select>
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
    const tooLargeRetryBtn = this.container.querySelector('#tp-too-large-retry-btn');

    // Retry buttons
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        errorBanner.style.display = 'none';
        if (this.selectedFiles.length > 0) {
          processBtn.click();
        }
      });
    }

    if (tooLargeRetryBtn) {
      tooLargeRetryBtn.addEventListener('click', () => {
        const tooLargeBanner = this.container.querySelector('#tp-too-large-banner') as HTMLElement;
        if (tooLargeBanner) tooLargeBanner.style.display = 'none';
        this.dropzone.openPicker();
      });
    }

    // Dual Input tab switcher
    const tabFile = this.container.querySelector('#tab-mode-file');
    const tabDirect = this.container.querySelector('#tab-mode-direct');
    const dropzoneWrapper = this.container.querySelector('#tp-dropzone-wrapper') as HTMLElement;
    const directEditorWrapper = this.container.querySelector('#tp-direct-editor-container') as HTMLElement;
    const actionBar = this.container.querySelector('#tp-action-bar') as HTMLElement;
    const optionsPanel = this.container.querySelector('#tp-options-container') as HTMLElement;

    if (tabFile && tabDirect) {
      tabFile.addEventListener('click', () => {
        this.inputMode = 'file';
        tabFile.classList.add('active');
        tabDirect.classList.remove('active');
        if (dropzoneWrapper) dropzoneWrapper.style.display = 'block';
        if (directEditorWrapper) directEditorWrapper.style.display = 'none';
        if (this.selectedFiles.length > 0) {
          actionBar.style.display = 'block';
          optionsPanel.style.display = 'block';
        } else {
          actionBar.style.display = 'none';
          optionsPanel.style.display = 'none';
        }
      });

      tabDirect.addEventListener('click', () => {
        this.inputMode = 'direct';
        tabDirect.classList.add('active');
        tabFile.classList.remove('active');
        if (dropzoneWrapper) dropzoneWrapper.style.display = 'none';
        if (directEditorWrapper) directEditorWrapper.style.display = 'block';
        // Always show action button in direct editor mode
        actionBar.style.display = 'block';
        optionsPanel.style.display = 'block';
      });
    }

    // Markdown Live Preview updater
    const mdInput = this.container.querySelector('#direct-md-input') as HTMLTextAreaElement;
    const mdPreview = this.container.querySelector('#direct-md-preview');
    if (mdInput && mdPreview) {
      mdInput.addEventListener('input', () => {
        // Simple client-side Markdown rendering preview
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

    // Password show/hide toggle
    const pwdToggle = this.container.querySelector('#btn-toggle-protect-pwd');
    const pwdInput = this.container.querySelector('#opt-protect-pass') as HTMLInputElement;
    if (pwdToggle && pwdInput) {
      pwdToggle.addEventListener('click', () => {
        pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
      });
    }

    // Compression profiles selection card active state
    this.container.querySelectorAll('.compression-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.container.querySelectorAll('.compression-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    // Primary Action Button Execution
    processBtn.addEventListener('click', async () => {
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
    this.resultCard.show({
      filename,
      data,
      originalSize,
      newSize,
      reductionRatio: ratio,
      onReset: () => {
        this.dropzone.clearFiles();
        this.selectedFiles = [];
        (this.container.querySelector('#tp-action-bar') as HTMLElement).style.display = 'none';
        (this.container.querySelector('#tp-options-container') as HTMLElement).style.display = 'none';
      },
    });
  }
}
