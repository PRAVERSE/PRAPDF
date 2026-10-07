/**
 * PRA PDF — Navbar Component
 * Features PRA PDF by PRAVERSE brand, clean navigation links,
 * instant search trigger, editor CTA, and responsive mobile hamburger drawer.
 */

import { ICONS } from './icons';

export function renderNavbar(activeRoute: string = '/'): string {
  const isHome = activeRoute === '/' || activeRoute === '';
  const isTools = activeRoute === '/tools';
  const isEditor = activeRoute === '/editor';
  const isContact = activeRoute === '/contact';

  return `
    <header class="navbar" id="app-navbar">
      <div class="container nav-container">
        <!-- Brand -->
        <a href="#/" class="brand-wrapper" id="nav-brand-logo" aria-label="PRA PDF Homepage">
          <div class="brand-logo-icon">P</div>
          <div class="brand-text-block">
            <span class="brand-title">PRA PDF</span>
            <span class="brand-subtitle">by PRAVERSE</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="nav-links-desktop" aria-label="Main Navigation">
          <a href="#/" class="nav-link ${isHome ? 'active' : ''}">Home</a>
          <a href="#/tools" class="nav-link ${isTools ? 'active' : ''}">PDF Tools</a>
          <a href="#/editor" class="nav-link ${isEditor ? 'active' : ''}">Editor</a>
          <a href="#/contact" class="nav-link ${isContact ? 'active' : ''}">Contact</a>
        </nav>

        <!-- Right Actions -->
        <div class="nav-actions">
          <button type="button" class="nav-search-btn" id="nav-search-trigger" title="Search Tools" aria-label="Search PDF Tools">
            ${ICONS['search']}
            <span class="search-btn-label">Search tools...</span>
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
                <span class="brand-title">PRA PDF</span>
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
            <a href="#/tools" class="mobile-nav-link ${isTools ? 'active' : ''}">
              <span>All PDF Tools (30)</span>
            </a>
            <a href="#/editor" class="mobile-nav-link ${isEditor ? 'active' : ''}">
              <span>Full PDF Editor</span>
            </a>
            <a href="#/privacy" class="mobile-nav-link">
              <span>Privacy Policy</span>
            </a>
            <a href="#/terms" class="mobile-nav-link">
              <span>Terms of Service</span>
            </a>
            <a href="#/contact" class="mobile-nav-link ${isContact ? 'active' : ''}">
              <span>Contact PRA PDF</span>
            </a>
          </nav>

          <div class="mobile-drawer-footer">
            <a href="#/editor" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center; margin-bottom: 12px;">
              Launch PDF Editor
            </a>
            <p style="font-size: 0.8rem; color: var(--pra-text-muted); text-align: center;">
              PRA PDF by PRAVERSE • 50 MB upload limit
            </p>
          </div>
        </div>
      </div>
    </header>
  `;
}
