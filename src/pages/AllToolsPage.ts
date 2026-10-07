/**
 * PRA PDF — Dedicated All Tools Catalog Page
 * Architectural Swiss Minimalist Catalog of all 30 Tools.
 * Clean search command bar, category tabs, and high-density responsive directory.
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
      <div class="all-tools-page-container">
        <!-- Page Header Block -->
        <div class="home-header" style="margin-bottom: 24px;">
          <div class="home-header-row">
            <div class="home-title-block">
              <h1 class="home-title">All PDF Tools</h1>
              <p class="home-subtitle">
                Complete catalog of 30 client-side document utilities. Search or filter by operation type.
              </p>
            </div>
            <div class="home-quick-actions">
              <span class="font-mono" style="font-size: 0.8125rem; color: var(--pra-text-muted);">
                30 utilities active
              </span>
            </div>
          </div>
        </div>

        <!-- Command Bar: Search & Category Filter Tabs -->
        <section class="command-bar" style="margin-bottom: 24px;">
          <div class="search-input-box">
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

        <!-- Catalog Header Info -->
        <div class="tool-group-header" style="margin-bottom: 14px;">
          <h2 class="tool-group-title" id="catalog-section-title">
            ${this.getCategoryTitle()}
          </h2>
          <span class="tool-group-count font-mono" id="catalog-count-badge">
            Showing ${this.getFilteredTools().length} of ${TOOLS_REGISTRY.length} tools
          </span>
        </div>

        <!-- 30 Tools Directory Grid -->
        <div class="tools-directory-grid" id="tools-grid-container">
          ${this.getFilteredTools().map(renderToolCard).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private getCategoryTitle(): string {
    if (this.currentCategory === 'all') return 'Complete Tool Catalog (30 Tools)';
    return (CATEGORY_LABELS as any)[this.currentCategory] || 'Tools';
  }

  private bindEvents(): void {
    const searchInput = this.container.querySelector('#tools-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase().trim();
        this.updateGrid();
      });
      if (window.location.hash.includes('focus-search')) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }

    const clearBtn = this.container.querySelector('#tools-search-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.updateGrid();
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
        this.updateGrid();
      });
    });
  }

  private getFilteredTools(): ToolDefinition[] {
    return TOOLS_REGISTRY.filter((tool) => {
      const matchesCategory = this.currentCategory === 'all' || tool.category === this.currentCategory;
      const matchesSearch =
        !this.searchQuery ||
        tool.title.toLowerCase().includes(this.searchQuery) ||
        tool.description.toLowerCase().includes(this.searchQuery) ||
        tool.acceptedExtensions.some((ext) => ext.toLowerCase().includes(this.searchQuery));

      return matchesCategory && matchesSearch;
    });
  }

  private updateGrid(): void {
    const gridEl = this.container.querySelector('#tools-grid-container');
    const countBadge = this.container.querySelector('#catalog-count-badge');
    const titleEl = this.container.querySelector('#catalog-section-title');
    const filtered = this.getFilteredTools();

    if (titleEl) {
      titleEl.textContent = this.getCategoryTitle();
    }

    if (gridEl) {
      if (filtered.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background-color: var(--pra-bg-surface); border: 1px solid var(--pra-border); border-radius: var(--pra-radius-md);">
            <div style="color: var(--pra-text-muted); margin-bottom: 8px;">${ICONS['search']}</div>
            <h3 style="font-size: 0.9375rem; color: var(--pra-text-primary); margin-bottom: 4px;">No tools found</h3>
            <p style="font-size: 0.8125rem; color: var(--pra-text-secondary); margin-bottom: 16px;">
              We couldn't find any tool matching "${this.searchQuery}". Try another keyword or reset filters.
            </p>
            <button type="button" class="btn btn-secondary btn-sm" id="reset-search-btn">
              Reset Filters & View All 30 Tools
            </button>
          </div>
        `;

        const resetBtn = gridEl.querySelector('#reset-search-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            this.searchQuery = '';
            this.currentCategory = 'all';
            this.render();
          });
        }
      } else {
        gridEl.innerHTML = filtered.map(renderToolCard).join('');
      }
    }

    if (countBadge) {
      countBadge.textContent = `Showing ${filtered.length} of ${TOOLS_REGISTRY.length} tools`;
    }
  }
}
