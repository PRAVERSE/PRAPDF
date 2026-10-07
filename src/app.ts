/**
 * PRA PDF — Main Application Entry & Client-Side Router
 * by PRAVERSE
 */

import './index.css';
import { renderNavbar } from './components/Navbar';
import { renderFooter } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AllToolsPage } from './pages/AllToolsPage';
import { ToolPage } from './pages/ToolPage';
import { EditorPage } from './pages/EditorPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ContactPage } from './pages/ContactPage';
import { cleanupAllBlobs } from './services/core/cleanup';
import { findToolById } from './services/toolsRegistry';

class App {
  private appElement: HTMLElement;
  private contentElement!: HTMLElement;

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

  private renderNavAndFooter(currentPath: string = '/'): void {
    const navRoot = this.appElement.querySelector('#navbar-root') as HTMLElement;
    const footerRoot = this.appElement.querySelector('#footer-root') as HTMLElement;

    navRoot.innerHTML = renderNavbar(currentPath);
    footerRoot.innerHTML = renderFooter();

    this.bindNavbarEvents();
  }

  private bindNavbarEvents(): void {
    const navRoot = this.appElement.querySelector('#navbar-root') as HTMLElement;

    // Mobile Hamburger Toggle
    const hamburgerBtn = navRoot.querySelector('#nav-hamburger-toggle');
    const drawer = navRoot.querySelector('#mobile-nav-drawer') as HTMLElement;
    const drawerBackdrop = navRoot.querySelector('#mobile-drawer-backdrop');
    const drawerClose = navRoot.querySelector('#mobile-drawer-close');

    const openDrawer = () => {
      if (drawer) {
        drawer.style.display = 'block';
        drawer.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    };

    const closeDrawer = () => {
      if (drawer) {
        drawer.classList.remove('open');
        setTimeout(() => {
          drawer.style.display = 'none';
          document.body.style.overflow = '';
        }, 250);
      }
    };

    hamburgerBtn?.addEventListener('click', openDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);
    drawerClose?.addEventListener('click', closeDrawer);

    // Close drawer when any mobile link is clicked
    drawer?.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    // Search Trigger in Navbar
    const searchTrigger = navRoot.querySelector('#nav-search-trigger');
    searchTrigger?.addEventListener('click', () => {
      window.location.hash = '#/tools?focus-search=true';
    });

    // Mobile Drawer Search Input
    const mobileSearchInput = navRoot.querySelector('#mobile-search-input') as HTMLInputElement;
    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = encodeURIComponent(mobileSearchInput.value.trim());
          closeDrawer();
          window.location.hash = `#/tools?q=${q}`;
        }
      });
    }
  }

  private bindGlobalKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Shortcut '/' to focus search input if not inside input/textarea
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const activeSearch = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (activeSearch) {
          activeSearch.focus();
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
    // Ephemeral blob cleanups upon navigation
    cleanupAllBlobs();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const rawHash = window.location.hash.slice(1) || '/';
    const [path] = rawHash.split('?');

    // Route matching
    if (path === '/' || path === '') {
      this.renderNavAndFooter('/');
      const home = new HomePage(this.contentElement);
      home.render();
    } else if (path === '/tools') {
      this.renderNavAndFooter('/tools');
      const allTools = new AllToolsPage(this.contentElement);
      allTools.render();
    } else if (path.startsWith('/tools/')) {
      const toolSlug = path.replace('/tools/', '');
      this.renderNavAndFooter('/tools');

      // Check if redirecting to editor
      if (toolSlug === 'full-pdf-editing') {
        window.location.hash = '#/editor';
        return;
      }

      const toolDef = findToolById(toolSlug);
      if (toolDef) {
        try {
          const toolPage = new ToolPage(this.contentElement, toolDef.id);
          toolPage.render();
        } catch (err: any) {
          this.renderNotFound(`Could not load tool: ${toolSlug}`);
        }
      } else {
        this.renderNotFound(`Tool not found: "${toolSlug}"`);
      }
    } else if (path === '/editor') {
      this.renderNavAndFooter('/editor');
      const editor = new EditorPage(this.contentElement);
      editor.render();
    } else if (path === '/privacy') {
      this.renderNavAndFooter('/privacy');
      const privacy = new PrivacyPage(this.contentElement);
      privacy.render();
    } else if (path === '/terms') {
      this.renderNavAndFooter('/terms');
      const terms = new TermsPage(this.contentElement);
      terms.render();
    } else if (path === '/contact') {
      this.renderNavAndFooter('/contact');
      const contact = new ContactPage(this.contentElement);
      contact.render();
    } else {
      this.renderNotFound('Page not found');
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

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
