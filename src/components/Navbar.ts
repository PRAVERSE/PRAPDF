/**
 * PRA PDF — Navbar Component
 * Featuring top iLovePDF-style quick action links:
 * Brand, Merge PDF, Split PDF, Compress PDF, Convert PDF, All Tools, Search & Editor CTA.
 */

import { ICONS } from './icons';

export function renderNavbar(activeRoute: string = '/'): string {
  const isHome = activeRoute === '/' || activeRoute === '';
  const isTools = activeRoute === '/tools';
  const isEditor = activeRoute === '/editor';
  const isMerge = activeRoute === '/tools/merge-pdf';
  const isSplit = activeRoute === '/tools/split-pdf';
  const isCompress = activeRoute === '/tools/compress-pdf';

  return `
    <header class="navbar" id="app-navbar">
      <div class="container nav-container">
        <!-- Brand (iLovePDF signature heart/bold feel, PRA PDF style) -->
        <a href="#/" class="brand-wrapper" id="nav-brand-logo" aria-label="PRA PDF Homepage">
          <div class="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div class="brand-text-block">
            <span class="brand-title">PRA <span style="color: #E11D48;">PDF</span></span>
            <span class="brand-subtitle">by PRAVERSE</span>
          </div>
        </a>

        <!-- Desktop Navigation Links (iLovePDF signature primary utilities) -->
        <nav class="nav-links-desktop" aria-label="Main Navigation">
          <a href="#/tools/merge-pdf" class="nav-link ${isMerge ? 'active' : ''}">Merge PDF</a>
          <a href="#/tools/split-pdf" class="nav-link ${isSplit ? 'active' : ''}">Split PDF</a>
          <a href="#/tools/compress-pdf" class="nav-link ${isCompress ? 'active' : ''}">Compress PDF</a>
          <a href="#/tools?cat=convert-to-pdf" class="nav-link">Convert PDF</a>
          <a href="#/tools" class="nav-link ${isTools ? 'active' : ''}">All PDF Tools</a>
        </nav>

        <!-- Right Actions -->
        <div class="nav-actions">
          <button type="button" class="nav-search-btn" id="nav-search-trigger" title="Search Tools" aria-label="Search PDF Tools">
            ${ICONS['search']}
            <span class="search-btn-label">Search...</span>
            <span class="search-btn-shortcut">/</span>
          </button>

          <a href="#/editor" class="btn btn-secondary btn-sm nav-cta-btn" id="nav-editor-cta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span>PDF Editor</span>
          </a>

          <!-- Mobile Hamburger Toggle Button -->
          <button type="button" class="nav-hamburger-btn" id="nav-hamburger-toggle" aria-label="Toggle Mobile Menu" aria-expanded="false">
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
            <span class="hamburger-bar"></span>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div class="mobile-drawer" id="mobile-nav-drawer" style="display: none;">
        <div class="mobile-drawer-backdrop" id="mobile-drawer-backdrop"></div>
        <div class="mobile-drawer-content">
          <div class="mobile-drawer-header">
            <div class="brand-wrapper">
              <div class="brand-logo-icon">P</div>
              <div class="brand-text-block">
                <span class="brand-title">PRA <span style="color: #E11D48;">PDF</span></span>
                <span class="brand-subtitle">by PRAVERSE</span>
              </div>
            </div>
            <button type="button" class="mobile-drawer-close" id="mobile-drawer-close" aria-label="Close menu">
              ${ICONS['close']}
            </button>
          </div>

          <div class="mobile-drawer-search">
            <div class="search-input-box">
              ${ICONS['search']}
              <input type="text" id="mobile-search-input" placeholder="Search 30 PDF tools..." autocomplete="off" />
            </div>
          </div>

          <nav class="mobile-drawer-links">
            <a href="#/" class="mobile-nav-link ${isHome ? 'active' : ''}">
              <span>Home</span>
            </a>
            <a href="#/tools/merge-pdf" class="mobile-nav-link">
              <span>Merge PDF</span>
            </a>
            <a href="#/tools/split-pdf" class="mobile-nav-link">
              <span>Split PDF</span>
            </a>
            <a href="#/tools/compress-pdf" class="mobile-nav-link">
              <span>Compress PDF</span>
            </a>
            <a href="#/tools" class="mobile-nav-link ${isTools ? 'active' : ''}">
              <span>All PDF Tools (30)</span>
            </a>
            <a href="#/editor" class="mobile-nav-link ${isEditor ? 'active' : ''}">
              <span>Full PDF Editor Studio</span>
            </a>
            <a href="#/privacy" class="mobile-nav-link">
              <span>Privacy Policy</span>
            </a>
            <a href="#/terms" class="mobile-nav-link">
              <span>Terms of Service</span>
            </a>
            <a href="#/contact" class="mobile-nav-link">
              <span>Contact PRA PDF</span>
            </a>
          </nav>

          <div class="mobile-drawer-footer">
            <a href="#/editor" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center; margin-bottom: 12px;">
              Launch PDF Editor
            </a>
            <p style="font-size: 0.8rem; color: var(--pra-text-muted); text-align: center;">
              PRA PDF by PRAVERSE • 50 MB upload limit • 100% Client-Side
            </p>
          </div>
        </div>
      </div>
    </header>
  `;
}
