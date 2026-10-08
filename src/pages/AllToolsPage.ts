/**
 * PRA PDF — Dedicated All Tools Catalog Page
 * Complete catalog of all 30 PDF Tools with instant search and category filter.
 */

import { TOOLS_REGISTRY, ToolDefinition, CATEGORY_LABELS, ToolCategory } from '../services/toolsRegistry';
import { renderToolCard } from '../components/ToolCard';
import { ICONS } from '../components/icons';

export class AllToolsPage {
  private container: HTMLElement;
  private currentCategory: string = 'all';
  private searchQuery: string = '';

  constructor(container: HTMLElement, initialCategory: string = 'all') {
    this.container = container;
    this.currentCategory = initialCategory;
  }

  public render(): void {
    const filterCategories: { key: ToolCategory | 'all'; label: string }[] = [
      { key: 'all', label: 'All Tools (30)' },
      { key: 'organize', label: 'Organize PDF' },
      { key: 'optimize', label: 'Optimize PDF' },
      { key: 'convert-to-pdf', label: 'Convert to PDF' },
      { key: 'convert-from-pdf', label: 'Convert from PDF' },
      { key: 'edit', label: 'Annotate & Edit' },
      { key: 'security', label: 'Security' },
      { key: 'extract-manage', label: 'Extract & Metadata' },
      { key: 'other-conversions', label: 'RTF' },
    ];

    this.container.innerHTML = `
      <div class="all-tools-page-container">
        <!-- Page Header Block -->
        <div class="ilove-hero-section" style="padding: 24px 0 32px;">
          <h1 class="ilove-hero-title" style="font-size: 2.2rem;">All PDF Tools</h1>
          <p class="ilove-hero-subtitle">
            Explore all 30 online PDF and document tools. Fast, secure, and 100% free.
          </p>

          <!-- Command Bar: Search & Category Filter Tabs -->
          <div class="ilove-command-bar">
            <div class="ilove-search-box">
              ${ICONS['search']}
              <input 
                type="text" 
                id="tools-search-input" 
                placeholder="Search tools... (e.g. merge, compress, word, jpg, ocr, watermark, protect)" 
                value="${this.searchQuery}"
                autocomplete="off"
                aria-label="Search all tools"
              />
              ${
                this.searchQuery
                  ? `<button type="button" id="tools-search-clear" class="search-clear-btn" title="Clear Search">${ICONS['close']}</button>`
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
        </div>

        <!-- Catalog Header Info -->
        <div class="ilove-group-header" style="margin-bottom: 20px;">
          <h2 class="ilove-group-title" id="catalog-section-title">
            ${this.getCategoryTitle()}
          </h2>
          <span class="ilove-group-badge font-mono" id="catalog-count-badge">
            Showing ${this.getFilteredTools().length} of ${TOOLS_REGISTRY.length} tools
          </span>
        </div>

        <!-- Catalog Grid -->
        <div class="ilove-card-grid" id="catalog-tools-grid">
          ${this.renderToolsGrid()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderToolsGrid(): string {
    const filtered = this.getFilteredTools();

    if (filtered.length === 0) {
      return `
        <div class="directory-empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon-circle">${ICONS['alert-triangle']}</div>
          <h3>No matching tools found</h3>
          <p>No tools matched "${this.searchQuery}". Try different keywords or reset your filters.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="catalog-reset-search-btn">
            Reset Filters & Show All 30 Tools
          </button>
        </div>
      `;
    }

    return filtered.map(renderToolCard).join('');
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
    const searchInput = this.container.querySelector('#tools-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.trim();
        this.updateView();
      });
    }

    const clearBtn = this.container.querySelector('#tools-search-clear');
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

    const resetBtn = this.container.querySelector('#catalog-reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.render();
      });
    }
  }

  private updateView(): void {
    const gridEl = this.container.querySelector('#catalog-tools-grid');
    const titleEl = this.container.querySelector('#catalog-section-title');
    const badgeEl = this.container.querySelector('#catalog-count-badge');

    if (gridEl) gridEl.innerHTML = this.renderToolsGrid();
    if (titleEl) titleEl.textContent = this.searchQuery ? `Search Results: "${this.searchQuery}"` : this.getCategoryTitle();
    if (badgeEl) badgeEl.textContent = `Showing ${this.getFilteredTools().length} of ${TOOLS_REGISTRY.length} tools`;

    const resetBtn = this.container.querySelector('#catalog-reset-search-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.currentCategory = 'all';
        this.render();
      });
    }
  }
}
