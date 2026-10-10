/**
 * PRA PDF — Homepage View
 * Redesigned based on the best UX patterns of iLovePDF:
 * Welcoming hero, fast live search, responsive category filters,
 * beautiful prominent tool cards with distinctive color badges,
 * and trust/security highlights.
 *
 * Full 56-Service Inventory:
 *   - 17 Verified Live production services
 *   - 18 Implemented & client-ready services
 *   - 21 Coming Soon services (Waves 2–5)
 */

import { TOOLS_REGISTRY, ToolDefinition, ToolCategory, CATEGORY_LABELS } from '../services/toolsRegistry';
import { renderToolCard } from '../components/ToolCard';
import { ICONS } from '../components/icons';

interface EditorialGroup {
  id: string;
  category: ToolCategory;
  title: string;
  description: string;
  toolIds: string[];
}

const EDITORIAL_GROUPS: EditorialGroup[] = [
  {
    id: 'organize-pages',
    category: 'organize',
    title: 'Organize PDF',
    description: 'Merge multiple documents, split ranges, extract pages, rotate, crop, interleave, and impose sheets (All 11 Verified Live).',
    toolIds: [
      'merge-pdf',
      'split-pdf',
      'organize-pdf-pages',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'rotate-pdf',
      'crop-pdf',
      'alternate-mix-pdf',
      'split-pdf-in-half',
      'n-up-pdf',
      'flip-pdf',
    ],
  },
  {
    id: 'optimize-ocr',
    category: 'optimize',
    title: 'Optimize PDF',
    description: 'Compress file sizes for distribution, extract text with WebAssembly OCR, deskew, and repair documents.',
    toolIds: [
      'compress-pdf',
      'ocr-pdf',
      'grayscale-pdf',
      'deskew-pdf',
      'repair-pdf',
    ],
  },
  {
    id: 'convert-to',
    category: 'convert-to-pdf',
    title: 'Convert to PDF',
    description: 'Transform images, office spreadsheets, presentations, HTML, markdown, plain text, and camera scans into PDF.',
    toolIds: [
      'jpg-to-pdf',
      'png-to-pdf',
      'images-to-pdf',
      'word-to-pdf',
      'excel-to-pdf',
      'powerpoint-to-pdf',
      'html-to-pdf',
      'txt-to-pdf',
      'markdown-to-pdf',
      'rtf-to-pdf',
      'scan-to-pdf',
    ],
  },
  {
    id: 'convert-from',
    category: 'convert-from-pdf',
    title: 'Convert from PDF',
    description: 'Export PDF documents to Word, high-res images, TIFF, Excel tables, CSV data, slides, and Markdown.',
    toolIds: [
      'pdf-to-jpg',
      'pdf-to-png',
      'pdf-to-tiff',
      'pdf-to-markdown',
      'pdf-to-word',
      'pdf-to-excel',
      'pdf-to-csv',
      'pdf-to-powerpoint',
      'pdf-to-rtf',
    ],
  },
  {
    id: 'annotate-edit',
    category: 'edit',
    title: 'Edit & Annotate PDF',
    description: 'Add page numbers, dynamic watermarks, delete annotations, stamps, headers, and full interactive studio.',
    toolIds: [
      'full-pdf-editing',
      'add-page-numbers',
      'watermark-pdf',
      'header-footer-pdf',
      'bates-numbering-pdf',
      'annotate-pdf',
      'delete-pdf-annotations',
      'flatten-pdf',
      'resize-pdf',
    ],
  },
  {
    id: 'forms-signatures',
    category: 'forms-signatures',
    title: 'Forms & Signatures',
    description: 'Fill AcroForms, create fillable form elements, and securely sign documents.',
    toolIds: [
      'fill-pdf-forms',
      'create-pdf-forms',
      'sign-pdf',
    ],
  },
  {
    id: 'security-protect',
    category: 'security',
    title: 'PDF Security',
    description: 'Encrypt documents with password protection, remove restrictions, or sanitize sensitive text.',
    toolIds: [
      'password-protect-pdf',
      'unlock-pdf',
      'redact-pdf',
    ],
  },
  {
    id: 'extract-metadata',
    category: 'extract-manage',
    title: 'Extract & Metadata',
    description: 'Inspect document properties, extract raw text or images, convert to PDF/A, and compare versions.',
    toolIds: [
      'extract-pdf-text',
      'edit-pdf-metadata',
      'extract-images-from-pdf',
      'pdf-to-pdfa',
      'compare-pdf',
    ],
  },
];

export class HomePage {
  private container: HTMLElement;
  private currentCategory: string = 'all';
  private searchQuery: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    const liveCount = TOOLS_REGISTRY.filter((t) => t.status === 'live').length;
    const filterCategories: { key: string; label: string }[] = [
      { key: 'all', label: `All (${TOOLS_REGISTRY.length})` },
      { key: 'live', label: `Verified Live (${liveCount})` },
      { key: 'organize', label: 'Organize PDF' },
      { key: 'convert-to-pdf', label: 'Convert to PDF' },
      { key: 'convert-from-pdf', label: 'Convert from PDF' },
      { key: 'edit', label: 'Edit & Annotate' },
      { key: 'optimize', label: 'Optimize PDF' },
      { key: 'security', label: 'PDF Security' },
      { key: 'extract-manage', label: 'Extract & Metadata' },
      { key: 'forms-signatures', label: 'Forms & Signatures' },
    ];

    this.container.innerHTML = `
      <!-- Hero Section (iLovePDF signature inspiring header) -->
      <section class="ilove-hero-section">
        <div class="hero-badge-pill">
          <span class="hero-badge-dot"></span>
          <span>PRA PDF by PRAVERSE • 56 Planned Services • 17 Verified Live • 100% Client & Edge Powered</span>
        </div>
        <h1 class="ilove-hero-title">Every tool you need to work with PDFs in one place</h1>
        <p class="ilove-hero-subtitle">
          Every tool you need to use PDFs, at your fingertips. All 100% free and private.
          Merge, split, compress, convert, rotate, unlock, watermark and edit PDFs in just a few clicks.
        </p>

        <!-- Command Bar: Live Search & Category Pills -->
        <div class="ilove-command-bar">
          <div class="ilove-search-box">
            ${ICONS['search']}
            <input 
              type="text" 
              id="hero-search-input" 
              placeholder="Search ${TOOLS_REGISTRY.length} PDF tools... (e.g. merge, compress, word, annotations, flip, n-up)" 
              value="${this.searchQuery}"
              autocomplete="off"
              aria-label="Search all PDF tools"
            />
            ${
              this.searchQuery
                ? `<button type="button" id="hero-search-clear" class="search-clear-btn" title="Clear Search">${ICONS['close']}</button>`
                : ''
            }
          </div>

          <div class="ilove-category-tabs" role="tablist" aria-label="Tool Categories">
            ${filterCategories
              .map(
                (cat) => `
              <button 
                type="button" 
                class="ilove-cat-tab ${this.currentCategory === cat.key ? 'active' : ''}" 
                data-cat="${cat.key}"
                role="tab"
                aria-selected="${this.currentCategory === cat.key ? 'true' : 'false'}"
              >
                ${cat.label}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </section>

      <!-- Main Directory Section -->
      <section class="ilove-directory-section">
        <div id="home-tools-container">
          ${this.renderToolsView()}
        </div>
      </section>

      <!-- Trust & Security Value Proposition -->
      <section class="ilove-trust-strip">
        <div class="trust-grid">
          <div class="trust-card">
            <div class="trust-icon-box" style="color: #10B981;">
              ${ICONS['shield']}
            </div>
            <div class="trust-content">
              <h4>100% Zero-Cloud AI Privacy</h4>
              <p>Your documents never train third-party AI models. Local in-browser & zero-logging edge execution.</p>
            </div>
          </div>

          <div class="trust-card">
            <div class="trust-icon-box" style="color: #6366F1;">
              ${ICONS['file-check']}
            </div>
            <div class="trust-content">
              <h4>Zero Unsolicited Watermarking</h4>
              <p>Clean, unaltered vector and raster outputs. We never stamp logos or branding onto your files.</p>
            </div>
          </div>

          <div class="trust-card">
            <div class="trust-icon-box" style="color: #EC4899;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div class="trust-content">
              <h4>50 MB Free File Limit</h4>
              <p>Generous 50 MB document size threshold per file with zero subscription locks.</p>
            </div>
          </div>
        </div>
      </section>
    `;

    this.bindEvents();
  }

  private renderToolsView(): string {
    // Search or filtered view
    if (this.searchQuery.trim() !== '' || this.currentCategory !== 'all') {
      const filtered = this.getFilteredTools();

      if (filtered.length === 0) {
        return `
          <div class="directory-empty-state">
            <div class="empty-icon-circle">${ICONS['alert-triangle']}</div>
            <h3>No matching tools found</h3>
            <p>No tools matched "${this.searchQuery}". Try keywords like "merge", "convert", "compress", or "protect".</p>
            <button type="button" class="btn btn-secondary btn-sm" id="home-reset-search-btn">
              Reset Filters & Show All ${TOOLS_REGISTRY.length} Tools
            </button>
          </div>
        `;
      }

      return `
        <div class="ilove-group-block">
          <div class="ilove-group-header">
            <h2 class="ilove-group-title">
              ${this.searchQuery ? `Search Results (${filtered.length})` : this.getCategoryTitle()}
            </h2>
            <span class="ilove-group-badge font-mono">${filtered.length} of ${TOOLS_REGISTRY.length} tools</span>
          </div>
          <div class="ilove-card-grid">
            ${filtered.map(renderToolCard).join('')}
          </div>
        </div>
      `;
    }

    // Default: Grouped sections matching iLovePDF categorization
    return EDITORIAL_GROUPS.map((group) => {
      const toolsInGroup = group.toolIds
        .map((id) => TOOLS_REGISTRY.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t);

      if (toolsInGroup.length === 0) return '';

      return `
        <div class="ilove-group-block" id="group-${group.id}">
          <div class="ilove-group-header">
            <div>
              <h2 class="ilove-group-title">${group.title}</h2>
              <p class="ilove-group-desc">${group.description}</p>
            </div>
            <span class="ilove-group-badge font-mono">${toolsInGroup.length} tools</span>
          </div>
          <div class="ilove-card-grid">
            ${toolsInGroup.map(renderToolCard).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private getCategoryTitle(): string {
    if (this.currentCategory === 'live') {
      const liveCount = TOOLS_REGISTRY.filter((t) => t.status === 'live').length;
      return `Verified Live Production Services (${liveCount})`;
    }
    return (CATEGORY_LABELS as any)[this.currentCategory] || 'Tools';
  }

  private getFilteredTools(): ToolDefinition[] {
    return TOOLS_REGISTRY.filter((tool) => {
      let matchesCategory = false;
      if (this.currentCategory === 'all') {
        matchesCategory = true;
      } else if (this.currentCategory === 'live') {
        matchesCategory = tool.status === 'live';
      } else {
        matchesCategory = tool.category === this.currentCategory;
      }

      const q = this.searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        tool.title.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.acceptedExtensions.some((ext) => ext.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }

  private bindEvents(): void {
    const searchInput = this.container.querySelector('#hero-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.trim();
        this.updateView();
      });
    }

    const clearBtn = this.container.querySelector('#hero-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.updateView();
      });
    }

    const catChips = this.container.querySelectorAll('.ilove-cat-tab');
    catChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const cat = (chip as HTMLElement).dataset.cat || 'all';
        this.currentCategory = cat;
        catChips.forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        this.updateView();
      });
    });

    const resetBtn = this.container.querySelector('#home-reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.render();
      });
    }
  }

  private updateView(): void {
    const toolsContainer = this.container.querySelector('#home-tools-container');
    if (toolsContainer) {
      toolsContainer.innerHTML = this.renderToolsView();
      const resetBtn = this.container.querySelector('#home-reset-search-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.currentCategory = 'all';
          this.render();
        });
      }
    }
  }
}
