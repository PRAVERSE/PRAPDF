/**
 * PRA PDF — Homepage View
 * Product Type: Document Productivity Tool & Utility Platform
 * Philosophy: Classic Established Software Directory / High Information Density
 * Fast utility directory with natural grouping of all 30 tools.
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
    id: 'convert-to',
    category: 'convert-to-pdf',
    title: 'Convert to PDF',
    description: 'Transform images, office spreadsheets, presentations, and markup files into clean PDF documents.',
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
      'pdf-to-markdown',
      'pdf-to-word',
    ],
  },
  {
    id: 'organize-pages',
    category: 'organize',
    title: 'Organize & Pages',
    description: 'Merge multiple documents, split ranges, extract pages, rotate orientations, and edit metadata.',
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
    title: 'Optimize & OCR',
    description: 'Compress file sizes for distribution and extract searchable text layers with client-side OCR.',
    toolIds: ['compress-pdf', 'ocr-pdf'],
  },
  {
    id: 'annotate-edit',
    category: 'edit',
    title: 'Annotate & Edit',
    description: 'Apply page numbers, stamp dynamic watermarks, or launch the interactive PDF studio.',
    toolIds: ['add-page-numbers', 'watermark-pdf', 'full-pdf-editing'],
  },
  {
    id: 'security-protect',
    category: 'security',
    title: 'Security & Protection',
    description: 'Encrypt documents with password protection and remove access restrictions.',
    toolIds: ['password-protect-pdf', 'unlock-pdf'],
  },
  {
    id: 'extract-metadata',
    category: 'extract-manage',
    title: 'Extract & Metadata',
    description: 'Inspect and modify document metadata properties or extract clean raw plaintext.',
    toolIds: ['edit-pdf-metadata', 'extract-pdf-text'],
  },
  {
    id: 'rich-text',
    category: 'other-conversions',
    title: 'Rich Text Conversion',
    description: 'Convert Rich Text Format (.rtf) files to PDF or export PDF documents into RTF.',
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
      { key: 'all', label: 'All Tools (30)' },
      { key: 'convert-to-pdf', label: 'Convert to PDF' },
      { key: 'convert-from-pdf', label: 'Convert from PDF' },
      { key: 'organize', label: 'Organize & Pages' },
      { key: 'optimize', label: 'Optimize & OCR' },
      { key: 'edit', label: 'Annotate & Edit' },
      { key: 'security', label: 'Security' },
      { key: 'extract-manage', label: 'Extract & Metadata' },
      { key: 'other-conversions', label: 'RTF Conversion' },
    ];

    this.container.innerHTML = `
      <!-- Product Header & Command Strip -->
      <section class="home-header">
        <div class="home-header-row">
          <div class="home-title-block">
            <h1 class="home-title">PRA PDF</h1>
            <p class="home-subtitle">
              Professional document utility suite. Fast, client-side PDF operations with zero tracking.
            </p>
          </div>
          <div class="home-quick-actions">
            <a href="#/editor" class="btn btn-secondary btn-sm" id="home-editor-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Full PDF Editor</span>
            </a>
          </div>
        </div>
      </section>

      <!-- Command Bar (Search + Category Filter Tabs) -->
      <section class="command-bar" id="command-bar">
        <div class="search-input-box">
          ${ICONS['search']}
          <input 
            type="text" 
            id="hero-search-input" 
            placeholder="Search 30 PDF tools... (e.g. merge, compress, word, jpg, protect, ocr, watermark)" 
            value="${this.searchQuery}"
            autocomplete="off"
            aria-label="Search PDF tools"
          />
          ${
            this.searchQuery
              ? `<button type="button" id="hero-search-clear" class="search-clear-btn" title="Clear Search">${ICONS['close']}</button>`
              : ''
          }
        </div>

        <div class="category-filter-chips" role="tablist" aria-label="Tool Categories">
          ${filterCategories
            .map(
              (cat) => `
            <button 
              type="button" 
              class="filter-chip ${this.currentCategory === cat.key ? 'active' : ''}" 
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
      </section>

      <!-- Tool Directory Container -->
      <section id="home-tools-container" class="editorial-catalog">
        ${this.renderToolsView()}
      </section>

      <!-- Utility Specifications Strip -->
      <section class="home-spec-strip">
        <div class="spec-strip-left">
          <span>Client-side processing</span>
          <span class="spec-sep">•</span>
          <span>50 MB per file limit</span>
          <span class="spec-sep">•</span>
          <span>Zero document retention</span>
        </div>
        <div class="spec-strip-right">
          <span>PRA PDF by <strong>PRAVERSE</strong></span>
        </div>
      </section>
    `;

    this.bindEvents();
  }

  private renderToolsView(): string {
    // If the user is actively searching or selected a specific category filter
    if (this.searchQuery.trim() !== '' || this.currentCategory !== 'all') {
      const filtered = this.getFilteredTools();

      if (filtered.length === 0) {
        return `
          <div class="directory-empty-state">
            <h3 style="font-size: 0.9375rem; color: var(--pra-text-primary); margin-bottom: 4px;">No matching tools</h3>
            <p style="font-size: 0.8125rem; color: var(--pra-text-secondary); margin-bottom: 12px;">
              No tools match "${this.searchQuery}". Try keywords like "merge", "convert", "compress", or "protect".
            </p>
            <button type="button" class="btn btn-secondary btn-sm" id="home-reset-search-btn">
              Reset Filters & Show All 30 Tools
            </button>
          </div>
        `;
      }

      return `
        <div class="tool-group-section">
          <div class="tool-group-header">
            <h2 class="tool-group-title">
              ${this.searchQuery ? `Search Results (${filtered.length})` : this.getCategoryTitle()}
            </h2>
            <span class="tool-group-count font-mono">${filtered.length} of 30 tools</span>
          </div>
          <div class="tools-directory-grid">
            ${filtered.map(renderToolCard).join('')}
          </div>
        </div>
      `;
    }

    // Default: Clean editorial directory of all 30 tools grouped logically
    return EDITORIAL_GROUPS.map((group) => {
      const toolsInGroup = group.toolIds
        .map((id) => TOOLS_REGISTRY.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t);

      if (toolsInGroup.length === 0) return '';

      return `
        <div class="tool-group-section" id="group-${group.id}">
          <div class="tool-group-header">
            <div>
              <h2 class="tool-group-title">${group.title}</h2>
              <p class="tool-group-desc">${group.description}</p>
            </div>
            <span class="tool-group-count font-mono">${toolsInGroup.length} tools</span>
          </div>
          <div class="tools-directory-grid">
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

    const chips = this.container.querySelectorAll('.filter-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        this.currentCategory = (chip as HTMLElement).dataset.cat || 'all';
        this.updateView();
      });
    });

    // Keyboard shortcut '/' focuses search bar
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput?.focus();
      }
    };
    document.addEventListener('keydown', handleKeydown);
  }

  private updateView(): void {
    const containerEl = this.container.querySelector('#home-tools-container');
    if (containerEl) {
      containerEl.innerHTML = this.renderToolsView();

      const resetBtn = containerEl.querySelector('#home-reset-search-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.searchQuery = '';
          this.currentCategory = 'all';
          const searchInput = this.container.querySelector('#hero-search-input') as HTMLInputElement;
          if (searchInput) searchInput.value = '';
          const chips = this.container.querySelectorAll('.filter-chip');
          chips.forEach((c) => {
            const isAll = (c as HTMLElement).dataset.cat === 'all';
            c.classList.toggle('active', isAll);
            c.setAttribute('aria-selected', isAll ? 'true' : 'false');
          });
          this.updateView();
        });
      }
    }
  }
}
