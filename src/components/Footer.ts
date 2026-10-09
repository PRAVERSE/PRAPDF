/**
 * PRA PDF — Footer Component
 * A PRAVERSE Company
 */

export function renderFooter(): string {
  return `
    <footer class="app-footer">
      <div class="container footer-inner">
        <div class="footer-brand">
          <span class="footer-brand-name">PRA PDF</span>
          <span class="footer-brand-sub">by PRAVERSE</span>
        </div>
        <div class="footer-links">
          <a href="#/privacy" class="footer-link">Privacy</a>
          <a href="#/terms" class="footer-link">Terms</a>
          <a href="#/contact" class="footer-link">Contact</a>
        </div>
        <div class="footer-copy">
          &copy; ${new Date().getFullYear()} PRAVERSE. All rights reserved.
        </div>
      </div>
    </footer>
  `;
}
