/**
 * PRA PDF — Homepage View
 * Redesigned based on the best UX patterns of iLovePDF:
 * Welcoming hero, fast live search, responsive category filters,
 * beautiful prominent tool cards with distinctive color badges,
 * and trust/security highlights.
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
    description: 'Merge multiple documents, split ranges, extract pages, rotate orientations, and reorder.',
    toolIds: [
      'merge-pdf',
      'split-pdf',
      'organize-pdf-pages',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'rotate-pdf',
      'crop-pdf',
    ],
  },
  {
    id: 'optimize-ocr',
    category: 'optimize',
    title: 'Optimize PDF',
    description: 'Compress file sizes for distribution and extract searchable text with WebAssembly OCR.',
    toolIds: ['compress-pdf', 'ocr-pdf'],
  },
  {
    id: 'convert-to',
    category: 'convert-to-pdf',
    title: 'Convert to PDF',
    description: 'Transform images, office spreadsheets, presentations, HTML, and markup into PDF.',
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
    ],
  },
  {
    id: 'convert-from',
    category: 'convert-from-pdf',
    title: 'Convert from PDF',
    description: 'Export PDF documents to editable Word docs, images, and Markdown formats.',
    toolIds: [
      'pdf-to-jpg',
      'pdf-to-png',
      'pdf-to-word',
      'pdf-to-markdown',
    ],
  },
  {
    id: 'annotate-edit',
    category: 'edit',
    title: 'Edit & Annotate PDF',
    description: 'Add page numbers, dynamic watermarks, or launch the interactive full PDF studio.',
    toolIds: ['full-pdf-editing', 'add-page-numbers', 'watermark-pdf'],
  },
  {
    id: 'security-protect',
    category: 'security',
    title: 'PDF Security',
    description: 'Encrypt documents with password protection or remove view restrictions.',
    toolIds: ['password-protect-pdf', 'unlock-pdf'],
  },
  {
    id: 'extract-metadata',
    category: 'extract-manage',
    title: 'Extract & Metadata',
    description: 'Inspect and edit document properties or extract clean raw plaintext.',
    toolIds: ['extract-pdf-text', 'edit-pdf-metadata'],
  },
  {
    id: 'rich-text',
    category: 'other-conversions',
    title: 'Other Conversions',
    description: 'Convert Rich Text Format (.rtf) to PDF or export PDF documents into RTF.',
    toolIds: ['rtf-conversion'],
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
    const filterCategories: { key: ToolCategory | 'all'; label: string }[] = [
      { key: 'all', label: 'All (30)' },
      { key: 'organize', label: 'Organize PDF' },
      { key: 'optimize', label: 'Optimize PDF' },
      { key: 'convert-to-pdf', label: 'Convert to PDF' },
      { key: 'convert-from-pdf', label: 'Convert from PDF' },
      { key: 'edit', label: 'Edit & Annotate' },
      { key: 'security', label: 'PDF Security' },
      { key: 'extract-manage', label: 'Extract & Metadata' },
      { key: 'other-conversions', label: 'RTF' },
    ];

    this.container.innerHTML = `
      <!-- Hero Section (iLovePDF signature inspiring header) -->
      <section class="ilove-hero-section">
        <div class="hero-badge-pill">
          <span class="hero-badge-dot"></span>
          <span>PRA PDF by PRAVERSE • 100% Client-Side Productivity</span>
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
              placeholder="Search 30 PDF tools... (e.g. merge, compress, word, jpg, protect, watermark)" 
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

      <!-- Tool Directory Container -->
      <section id="home-tools-container" class="ilove-tools-section">
        ${this.renderToolsView()}
      </section>

      <!-- Trust & Features Banner (iLovePDF Gold Standard) -->
      <section class="ilove-trust-section">
        <div class="trust-grid">
          <div class="trust-item">
            <div class="trust-icon-box" style="background: rgba(16, 185, 129, 0.12); color: #10B981;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div class="trust-content">
              <h4>100% Private & Secure</h4>
              <p>Files are processed entirely within your browser or memory. Zero document tracking or storage.</p>
            </div>
          </div>

          <div class="trust-item">
            <div class="trust-icon-box" style="background: rgba(37, 99, 235, 0.12); color: #2563EB;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div class="trust-content">
              <h4>Blazing Fast Engines</h4>
              <p>Powered by WebAssembly and client-side vector libraries for instant document manipulation.</p>
            </div>
          </div>

          <div class="trust-item">
            <div class="trust-icon-box" style="background: rgba(225, 29, 72, 0.12); color: #E11D48;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
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
              Reset Filters & Show All 30 Tools
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
            <span class="ilove-group-badge font-mono">${filtered.length} of 30 tools</span>
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
    return (CATEGORY_LABELS as any)[this.currentCategory] || 'Tools';
  }

  private getFilteredTools(): ToolDefinition[] {
    return TOOLS_REGISTRY.filter((tool) => {
      const matchesCategory = this.currentCategory === 'all' || tool.category === this.currentCategory;
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
