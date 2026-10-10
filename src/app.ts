/**
 * PRA PDF — Application Entry Point
 * A PRAVERSE Company
 *
 * Hash-based SPA router. Initialises the app shell and routes to:
 *   #/          → HomePage
 *   #/tools     → AllToolsPage
 *   #/tools/:id → ToolPage
 *   #/editor    → (redirected from full-pdf-editing)
 */

import './index.css';
import { HomePage } from './pages/HomePage';
import { AllToolsPage } from './pages/AllToolsPage';
import { ToolPage } from './pages/ToolPage';
import { renderNavbar } from './components/Navbar';
import { renderFooter } from './components/Footer';
import { findToolById } from './services/toolsRegistry';

function clearPreviousPageState() {
  // Clean up page-level state between route transitions
  const root = document.getElementById('page-content-root');
  if (root) root.innerHTML = '';
}

class App {
  private appElement: HTMLElement = null!;
  private contentElement: HTMLElement = null!;

  constructor() {
    const el = document.getElementById('app');
    if (!el) throw new Error('#app root element not found');
    this.appElement = el;
    this.initLayout();
    this.bindRouting();
    this.bindGlobalKeyboard();
  }

  private initLayout(): void {
    this.appElement.innerHTML = `
      <div class="ambient-glow"></div>
      <div id="navbar-root"></div>
      <main class="main-content container" id="page-content-root"></main>
      <div id="footer-root"></div>
    `;
    this.contentElement = this.appElement.querySelector('#page-content-root') as HTMLElement;
    this.renderNavAndFooter('/');
  }

  private renderNavAndFooter(route: string = '/'): void {
    const navRoot = this.appElement.querySelector('#navbar-root') as HTMLElement;
    const footerRoot = this.appElement.querySelector('#footer-root') as HTMLElement;
    if (navRoot) navRoot.innerHTML = renderNavbar(route);
    if (footerRoot) footerRoot.innerHTML = renderFooter();
    this.bindNavbarEvents();
  }

  private bindNavbarEvents(): void {
    // Mobile drawer & search — implemented inside Navbar component via delegated events
  }

  private bindGlobalKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        } else {
          window.location.hash = '#/tools?focus-search=true';
        }
      }
    });
  }

  private bindRouting(): void {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  private handleRoute(): void {
    clearPreviousPageState();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const hash = window.location.hash.slice(1) || '/';
    const [path] = hash.split('?');

    if (path === '/' || path === '') {
      this.renderNavAndFooter('/');
      new HomePage(this.contentElement).render();
    } else if (path === '/tools') {
      this.renderNavAndFooter('/tools');
      new AllToolsPage(this.contentElement).render();
    } else if (path === '/editor') {
      window.location.hash = '#/tools/full-pdf-editing';
      return;
    } else if (path.startsWith('/tools/')) {
      const toolId = path.replace('/tools/', '');
      this.renderNavAndFooter('/tools');

      const tool = findToolById(toolId);
      if (tool) {
        try {
          new ToolPage(this.contentElement, tool.id).render();
        } catch {
          this.renderNotFound(`Could not load tool: ${toolId}`);
        }
      } else {
        this.renderNotFound(`Tool not found: "${toolId}"`);
      }
    } else {
      this.renderNotFound(`Page not found`);
    }
  }

  private renderNotFound(message: string): void {
    this.contentElement.innerHTML = `
      <div style="text-align: center; padding: 100px 20px;">
        <div style="font-size: 4rem; font-weight: 800; font-family: 'Outfit', sans-serif; color: var(--pra-primary-light); margin-bottom: 8px;">
          404
        </div>
        <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 12px; color: var(--pra-text-primary);">
          Page Not Found
        </h2>
        <p style="color: var(--pra-text-secondary); margin-bottom: 28px; max-width: 480px; margin-left: auto; margin-right: auto;">
          ${message}. The requested document utility does not exist or has moved.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="#/" class="btn btn-primary">Return to Home</a>
          <a href="#/tools" class="btn btn-secondary">Browse All 30 Tools</a>
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
